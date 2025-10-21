#!/usr/bin/env node
/*
  Migrate itineraries from Firestore -> Postgres (Prisma)

  Usage:
    # dry run (default) - prints summary and samples
    node functions/scripts/migrateItinerariesFromFirestore.js

    # apply changes (will upsert into Postgres)
    node functions/scripts/migrateItinerariesFromFirestore.js --apply

  Requirements:
    - In functions/: npm install @prisma/client firebase-admin dotenv
    - Auth: set GOOGLE_APPLICATION_CREDENTIALS or use gcloud auth application-default login
    - Ensure DATABASE_URL is set in functions/.env (or in env)

*/

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load functions/.env if present
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const admin = require('firebase-admin');
const { PrismaClient } = require('@prisma/client');

const APPLY = process.argv.includes('--apply');

async function ensureFirebase() {
  if (!admin.apps.length) {
    // Initialize with default credentials (ADC) or service account if provided
    try {
      admin.initializeApp();
    } catch (e) {
      console.error('Failed to initialize firebase-admin. Ensure GOOGLE_APPLICATION_CREDENTIALS or ADC is set.');
      throw e;
    }
  }
}

function convertTimestamps(obj) {
  // Recursively replace Firestore Timestamp objects with ISO strings
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map(convertTimestamps);
  if (typeof obj === 'object') {
    // Firestore Timestamp check
    if (obj._seconds !== undefined && obj._nanoseconds !== undefined) {
      // Firestore JSON representation (if returned that way) -> convert to ISO
      const d = new Date(obj._seconds * 1000 + Math.round(obj._nanoseconds / 1e6));
      return d.toISOString();
    }
    // admin.firestore.Timestamp instance
    if (obj.toDate && typeof obj.toDate === 'function') {
      return obj.toDate().toISOString();
    }
    const out = {};
    for (const k of Object.keys(obj)) {
      try {
        out[k] = convertTimestamps(obj[k]);
      } catch (e) {
        out[k] = String(obj[k]);
      }
    }
    return out;
  }
  return obj;
}

async function main() {
  console.log('\nFirestore -> Postgres migration (itineraries)');
  console.log('Dry run mode by default. Use --apply to perform writes.\n');

  await ensureFirebase();
  const db = admin.firestore();
  const prisma = new PrismaClient();

  const snapshot = await db.collection('itineraries').get();
  console.log(`Found ${snapshot.size} documents in Firestore 'itineraries'.`);

  let migrated = 0;
  let errors = 0;
  const samples = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const id = doc.id;

    // Build the Prisma record object - keep many fields as JSON
    const record = {
      id: id,
      userId: data?.userInfo?.uid || null,
      destination: data?.destination || data?.title || null,
      title: data?.title || null,
      description: data?.description || null,
      startDate: data?.startDate ? new Date(data.startDate) : null,
      endDate: data?.endDate ? new Date(data.endDate) : null,
      startDay: data?.startDay ? Number(data.startDay) : null,
      endDay: data?.endDay ? Number(data.endDay) : null,
      lowerRange: data?.lowerRange ?? null,
      upperRange: data?.upperRange ?? null,
      gender: data?.gender || null,
      sexualOrientation: data?.sexualOrientation || null,
      status: data?.status || null,
      likes: data?.likes ? convertTimestamps(data.likes) : null,
      activities: data?.activities ? convertTimestamps(data.activities) : null,
      userInfo: data?.userInfo ? convertTimestamps(data.userInfo) : null,
      response: data?.response ? convertTimestamps(data.response) : null,
      metadata: (data?.response && data.response.data && data.response.data.metadata) ? convertTimestamps(data.response.data.metadata) : (data?.metadata ? convertTimestamps(data.metadata) : null),
      externalData: data?.externalData ? convertTimestamps(data.externalData) : null,
      recommendations: data?.recommendations ? convertTimestamps(data.recommendations) : null,
      costBreakdown: data?.costBreakdown ? convertTimestamps(data.costBreakdown) : null,
      dailyPlans: data?.dailyPlans ? convertTimestamps(data.dailyPlans) : (data?.days ? convertTimestamps(data.days) : null),
      days: data?.days ? convertTimestamps(data.days) : (data?.dailyPlans ? convertTimestamps(data.dailyPlans) : null),
      flights: data?.flights ? convertTimestamps(data.flights) : null,
      accommodations: data?.accommodations ? convertTimestamps(data.accommodations) : null,
      ai_status: data?.ai_status || null,
      createdAt: data?.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt)) : undefined,
      updatedAt: data?.updatedAt ? (data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt)) : undefined,
    };

    // Keep a small sample for reporting
    samples.push({ id, destination: record.destination, userId: record.userId });

    if (APPLY) {
      try {
        await prisma.itinerary.upsert({
          where: { id },
          update: record,
          create: record,
        });
        migrated++;
      } catch (e) {
        console.error(`Error upserting ${id}:`, e.message || e);
        errors++;
      }
    }
  }

  console.log('\nSamples:', samples.slice(0, 5));
  if (APPLY) {
    console.log(`\nMigration complete. Upserted ${migrated} documents. Errors: ${errors}`);
  } else {
    console.log(`\nDry run complete. ${snapshot.size} documents would be processed. Run with --apply to upsert into Postgres.`);
  }

  await prisma.$disconnect();
  process.exit(errors > 0 ? 2 : 0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
