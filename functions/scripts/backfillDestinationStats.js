#!/usr/bin/env node
'use strict';
/**
 * One-time admin backfill script: reads all Firestore itineraries and
 * rebuilds the destinationStats collection from scratch.
 *
 * Usage:
 *   node scripts/backfillDestinationStats.js [--project mundo1-dev|mundo1-prod]
 */
const admin = require('firebase-admin');
const path = require('path');

const arg = process.argv.find((a) => a.startsWith('--project='));
const project = arg ? arg.split('=')[1] : 'mundo1-dev';

const PROJECT_IDS = {
  'mundo1-dev': 'mundo1-dev',
  'production': 'mundo1-1',
};

const KEY_MAP = {
  'mundo1-dev': '../../../voyager-RN/mundo1-dev-firebase-adminsdk-fbsvc-bb26c2ec85.json',
};

if (!PROJECT_IDS[project]) {
  console.error(`Unknown project: ${project}. Available: ${Object.keys(PROJECT_IDS).join(', ')}`);
  process.exit(1);
}

if (!admin.apps.length) {
  const keyPath = KEY_MAP[project];
  if (keyPath) {
    // Use service-account key file when available (dev)
    admin.initializeApp({
      credential: admin.credential.cert(path.resolve(__dirname, keyPath)),
    });
  } else {
    // Fall back to application-default credentials (production)
    // Run: gcloud auth application-default login
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId: PROJECT_IDS[project],
    });
  }
}

const db = admin.firestore();

async function backfill() {
  console.log(`Reading itineraries from project: ${PROJECT_IDS[project]} (${project}) ...`);
  const snapshot = await db.collection('itineraries').get();
  console.log(`Found ${snapshot.size} itinerary documents.`);

  const counts = new Map();
  let skipped = 0;

  snapshot.docs.forEach((doc) => {
    const dest = doc.data().destination;
    if (dest && typeof dest === 'string' && dest.trim()) {
      const key = dest.trim();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    } else {
      skipped++;
    }
  });

  console.log(`Unique destinations: ${counts.size} (${skipped} docs skipped — no destination field)`);

  if (counts.size === 0) {
    console.log('Nothing to write. Exiting.');
    return;
  }

  const batch = db.batch();
  counts.forEach((count, destination) => {
    const ref = db.collection('destinationStats').doc(encodeURIComponent(destination));
    batch.set(ref, {
      destination,
      count,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();
  console.log(`✅ destinationStats updated — ${counts.size} destinations written.`);

  // Print summary
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  console.log('\nTop destinations:');
  sorted.slice(0, 10).forEach(([dest, count]) => {
    console.log(`  ${dest}: ${count}`);
  });
}

backfill().catch((err) => {
  console.error('Backfill failed:', err.message);
  process.exit(1);
});
