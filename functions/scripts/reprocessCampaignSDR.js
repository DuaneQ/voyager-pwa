/**
 * Re-process an ad campaign video through Mux with FFmpeg color normalization.
 *
 * Problem diagnosed via ffprobe:
 *   color_transfer = arib-std-b67  (HLG — Hybrid Log-Gamma, wide dynamic range)
 *   color_primaries = bt2020       (Rec. 2020 wide color gamut)
 *
 * The source .mov was recorded on an iPhone with HLG/BT.2020 metadata embedded
 * in the H.264 VUI parameters. iOS AVFoundation reads these tags and renders using
 * EDR (Extended Dynamic Range), making the video appear brighter than intended.
 * Web browsers ignore H.264 VUI color parameters and assume Rec.709 SDR.
 *
 * Fix: Re-submit to Mux with an FFmpeg filter that strips/converts the HLG color
 * transfer to Rec.709 SDR before encoding.
 *
 * Usage:
 *   node scripts/reprocessCampaignSDR.js <campaignId>
 */

const admin = require('firebase-admin');
const Mux = require('@mux/mux-node').default;
const path = require('path');

const CAMPAIGN_ID = process.argv[2];
if (!CAMPAIGN_ID) {
  console.error('Usage: node scripts/reprocessCampaignSDR.js <campaignId>');
  process.exit(1);
}

// Sanitize to prevent shell metacharacters from escaping into temp file paths
// or execSync command strings (belt-and-suspenders for a dev-only script).
const SAFE_CAMPAIGN_ID = CAMPAIGN_ID.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
if (SAFE_CAMPAIGN_ID !== CAMPAIGN_ID) {
  console.warn(`[reprocessCampaignSDR] campaignId sanitized: "${CAMPAIGN_ID}" → "${SAFE_CAMPAIGN_ID}"`);
}

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID;
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET;
if (!MUX_TOKEN_ID || !MUX_TOKEN_SECRET) {
  console.error('Missing MUX_TOKEN_ID or MUX_TOKEN_SECRET in .env');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(
    path.resolve(__dirname, '../../../voyager-RN/mundo1-dev-firebase-adminsdk-fbsvc-bb26c2ec85.json')
  ),
  storageBucket: 'mundo1-dev.firebasestorage.app',
});

const db = admin.firestore();
const mux = new Mux({ tokenId: MUX_TOKEN_ID, tokenSecret: MUX_TOKEN_SECRET });

async function main() {
  console.log(`\n[reprocessCampaignSDR] Campaign: ${CAMPAIGN_ID}`);

  const campaignRef = db.collection('ads_campaigns').doc(CAMPAIGN_ID);
  const snap = await campaignRef.get();
  if (!snap.exists) {
    console.error(`Campaign ${CAMPAIGN_ID} not found`);
    process.exit(1);
  }

  const data = snap.data();
  console.log(`  name: ${data.name}`);
  console.log(`  muxStatus: ${data.muxStatus}`);
  console.log(`  assetUrl: ${data.assetUrl}`);

  // Resolve the Firebase Storage path
  const storagePath = data.assetStoragePath || (() => {
    const m = data.assetUrl && data.assetUrl.match(/\/o\/(.+?)(\?|$)/);
    return m ? decodeURIComponent(m[1]) : null;
  })();

  if (!storagePath) {
    console.error('Could not resolve storagePath from Firestore. Set assetStoragePath field manually.');
    process.exit(1);
  }
  console.log(`  storagePath: ${storagePath}`);

  const file = admin.storage().bucket().file(storagePath);
  const [exists] = await file.exists();
  if (!exists) {
    console.error(`Source file not found in Storage: ${storagePath}`);
    process.exit(1);
  }

  const [signedUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 2 * 3600 * 1000,
  });

  console.log('\n[reprocessCampaignSDR] Submitting to Mux with SDR normalization overlay...');

  // Mux does not have a direct "normalize color space" parameter, but we can
  // use the `inputs` array with a video_codec override approach. The primary
  // practical fix is to delete the old asset and create a new one — Mux baseline
  // encoding re-tags to H.264 High but preserves source VUI. The source VUI is
  // the problem, so we need to remove the HLG/BT.2020 tags at ingest.
  //
  // The Mux API supports passing raw ffmpeg-compatible input options via
  // `input.overlay_settings` for watermarks, but not arbitrary vf filters.
  //
  // APPROACH: We create the asset, and THEN use the Mux static renditions or
  // master access to download+re-upload stripped. But that's complex.
  //
  // PRAGMATIC APPROACH for now: Submit the same source. Mux baseline encodes to
  // H.264 + preserves VUI. We need to pre-process with ffmpeg locally to strip
  // HLG metadata, then upload a clean version to a temp Storage path.
  //
  // Let's do it: pipe through ffmpeg to strip color metadata before uploading.

  console.log('\n[reprocessCampaignSDR] Running FFmpeg locally to strip HLG/BT.2020 color metadata...');

  const { execFileSync } = require('child_process');
  const os = require('os');
  const fs = require('fs');

  const tmpInput = path.join(os.tmpdir(), `ad_source_${SAFE_CAMPAIGN_ID}.mov`);
  const tmpOutput = path.join(os.tmpdir(), `ad_sdr_${SAFE_CAMPAIGN_ID}.mp4`);

  // Download source via signed URL
  console.log(`  Downloading source to ${tmpInput}...`);
  execFileSync('curl', ['-s', '-L', '-o', tmpInput, signedUrl], { stdio: 'inherit' });
  const sizeMB = (fs.statSync(tmpInput).size / 1024 / 1024).toFixed(1);
  console.log(`  Downloaded: ${sizeMB} MB`);

  // Strip HLG/BT.2020 VUI and re-tag as BT.709 SDR
  // -vf colorspace: convert HLG BT.2020 → Rec.709
  // -color_primaries bt709 -color_trc bt709 -colorspace bt709: force BT.709 tags
  console.log(`  Converting to SDR BT.709...`);
  execFileSync('ffmpeg', [
    '-y', '-i', tmpInput,
    '-vf', 'colorspace=bt709:iall=bt2020:fast=1',
    '-color_primaries', 'bt709',
    '-color_trc', 'bt709',
    '-colorspace', 'bt709',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '18',
    '-c:a', 'copy',
    tmpOutput,
  ], { stdio: 'inherit' });
  console.log(`  SDR output written to ${tmpOutput}`);

  // Upload the SDR version to a new Storage path
  const sdrStoragePath = storagePath.replace(/(\.[^.]+)$/, '_sdr.mp4');
  console.log(`\n  Uploading SDR version to Storage: ${sdrStoragePath}...`);
  await admin.storage().bucket().upload(tmpOutput, {
    destination: sdrStoragePath,
    metadata: { contentType: 'video/mp4' },
  });

  const [sdrSignedUrl] = await admin.storage().bucket().file(sdrStoragePath).getSignedUrl({
    action: 'read',
    expires: Date.now() + 2 * 3600 * 1000,
  });

  // Submit the SDR version to Mux
  console.log('\n  Submitting SDR version to Mux...');
  const asset = await mux.video.assets.create({
    inputs: [{ url: sdrSignedUrl }],
    playback_policy: ['public'],
    encoding_tier: 'baseline',
    max_resolution_tier: '1080p',
    passthrough: JSON.stringify({ campaignId: CAMPAIGN_ID, type: 'ad' }),
  });

  console.log(`\n✅ New Mux asset: ${asset.id} (status: ${asset.status})`);

  await campaignRef.update({
    muxAssetId: asset.id,
    muxPlaybackUrl: null,
    muxPlaybackId: asset.playback_ids?.[0]?.id || null,
    muxStatus: 'preparing',
    assetStoragePath: sdrStoragePath,
    muxProcessingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('[reprocessCampaignSDR] Firestore updated. Waiting for muxWebhook to fire...');
  console.log(`Monitor: https://dashboard.mux.com/environments/default/video/assets/${asset.id}`);

  // Clean up temp files
  fs.unlinkSync(tmpInput);
  fs.unlinkSync(tmpOutput);
  process.exit(0);
}

main().catch(err => {
  console.error('[reprocessCampaignSDR] Fatal:', err.message);
  process.exit(1);
});
