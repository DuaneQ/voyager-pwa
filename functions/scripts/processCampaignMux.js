/**
 * Admin script: submit an ad campaign video to Mux for processing.
 * 
 * Usage:
 *   node scripts/processCampaignMux.js <campaignId>
 * 
 * Reads the campaign's assetUrl from Firestore, generates a signed URL,
 * submits to Mux, and writes muxAssetId/muxStatus back to the campaign doc.
 */

const admin = require('firebase-admin');
const Mux = require('@mux/mux-node').default;
const path = require('path');
const fs = require('fs');

const CAMPAIGN_ID = process.argv[2];
if (!CAMPAIGN_ID) {
  console.error('Usage: node scripts/processCampaignMux.js <campaignId>');
  process.exit(1);
}

// Load env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;
if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
  console.error('Missing MUX_TOKEN_ID or MUX_TOKEN_SECRET in .env');
  process.exit(1);
}

// Init Firebase Admin with service account
const serviceAccountPath = path.resolve(
  __dirname,
  '../../../voyager-RN/mundo1-dev-firebase-adminsdk-fbsvc-bb26c2ec85.json'
);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountPath),
  storageBucket: 'mundo1-dev.firebasestorage.app',
});

const db = admin.firestore();
const mux = new Mux({ tokenId: MUX_TOKEN_ID, tokenSecret: MUX_TOKEN_SECRET });

async function main() {
  console.log(`\n[processCampaignMux] Fetching campaign: ${CAMPAIGN_ID}`);

  const campaignRef = db.collection('ads_campaigns').doc(CAMPAIGN_ID);
  const snap = await campaignRef.get();
  if (!snap.exists) {
    console.error(`Campaign ${CAMPAIGN_ID} not found in Firestore.`);
    process.exit(1);
  }

  const data = snap.data();
  console.log(`  name: ${data.name}`);
  console.log(`  status: ${data.status}`);
  console.log(`  creativeType: ${data.creativeType}`);
  console.log(`  muxAssetId: ${data.muxAssetId || '(none)'}`);
  console.log(`  muxStatus: ${data.muxStatus || '(none)'}`);
  console.log(`  assetUrl: ${data.assetUrl}`);

  if (data.muxPlaybackUrl) {
    console.log(`\n✅ Campaign already has muxPlaybackUrl: ${data.muxPlaybackUrl}`);
    console.log('Nothing to do.');
    process.exit(0);
  }

  if (data.creativeType !== 'video') {
    console.error(`\nCreativeType is "${data.creativeType}", not "video". Nothing to process.`);
    process.exit(1);
  }

  if (!data.assetUrl) {
    console.error('\nassetUrl is empty — cannot locate the video file in Storage.');
    process.exit(1);
  }

  // Extract the Firebase Storage object path from the download URL
  // e.g. https://firebasestorage.googleapis.com/v0/b/BUCKET/o/ENCODED_PATH?...
  const match = data.assetUrl.match(/\/o\/(.+?)(\?|$)/);
  if (!match) {
    console.error('\nCould not parse storage path from assetUrl:', data.assetUrl);
    process.exit(1);
  }
  const storagePath = decodeURIComponent(match[1]);
  console.log(`\n  storagePath: ${storagePath}`);

  // Generate a 2-hour signed URL so Mux can fetch the file
  const bucket = admin.storage().bucket();
  const file = bucket.file(storagePath);

  const [exists] = await file.exists();
  if (!exists) {
    console.error(`\nFile does not exist in Storage: ${storagePath}`);
    process.exit(1);
  }

  console.log('\n[processCampaignMux] Generating signed URL...');
  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 2 * 3600 * 1000, // 2 hours
  });

  console.log('[processCampaignMux] Submitting to Mux...');
  const asset = await mux.video.assets.create({
    inputs: [{ url: signedUrl }],
    playback_policy: ['public'],
    encoding_tier: 'baseline',
    max_resolution_tier: '1080p',
    passthrough: JSON.stringify({ campaignId: CAMPAIGN_ID, type: 'ad' }),
  });

  console.log(`\n✅ Mux asset created: ${asset.id} (status: ${asset.status})`);

  // Write back to Firestore so the webhook knows the asset ID
  await campaignRef.update({
    muxAssetId: asset.id,
    muxStatus: 'preparing',
    muxPlaybackId: asset.playback_ids?.[0]?.id || null,
    muxProcessingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('[processCampaignMux] Firestore updated with muxAssetId.');
  console.log('\nNext: wait for the Mux webhook to fire (video.asset.ready).');
  console.log('The webhook will write muxPlaybackUrl to the campaign doc automatically.');
  console.log('Monitor in Firestore: ads_campaigns/' + CAMPAIGN_ID);
  console.log('\nMux asset polling URL (Mux dashboard):');
  console.log(`  https://dashboard.mux.com/environments/default/video/assets/${asset.id}`);
}

main().catch((err) => {
  console.error('[processCampaignMux] Fatal error:', err);
  process.exit(1);
});
