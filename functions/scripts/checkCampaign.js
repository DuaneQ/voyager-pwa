#!/usr/bin/env node
'use strict';
const admin = require('firebase-admin');
const path = require('path');

const campaignId = process.argv[2];
if (!campaignId) {
  console.error('Usage: node scripts/checkCampaign.js <campaignId>');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(
      path.resolve(__dirname, '../../../voyager-RN/mundo1-dev-firebase-adminsdk-fbsvc-bb26c2ec85.json')
    ),
  });
}

admin
  .firestore()
  .collection('ads_campaigns')
  .doc(campaignId)
  .get()
  .then((doc) => {
    if (!doc.exists) {
      console.error('Campaign not found:', campaignId);
      process.exit(1);
    }
    const f = doc.data();
    console.log('Campaign:', campaignId);
    console.log('  muxAssetId:   ', f.muxAssetId || '(none)');
    console.log('  muxStatus:    ', f.muxStatus || '(none)');
    console.log('  muxPlaybackUrl:', f.muxPlaybackUrl || '(none)');
    console.log('  status:       ', f.status || '(none)');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  });
