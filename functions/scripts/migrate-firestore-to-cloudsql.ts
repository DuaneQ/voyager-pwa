/**
 * Firestore to Cloud SQL Migration Script
 * 
 * Migrates all itineraries from Firestore to Cloud SQL (Prisma)
 * 
 * Usage:
 *   DATABASE_URL="postgresql://..." FIREBASE_PROJECT=mundo1-1 npx ts-node scripts/migrate-firestore-to-cloudsql.ts
 * 
 * Options:
 *   --dry-run: Preview migration without writing to database
 *   --batch-size=50: Number of records to process at once
 *   --skip-existing: Skip itineraries that already exist in Cloud SQL
 */

import * as admin from 'firebase-admin';
import prisma from '../src/db/prismaClient';
import * as dotenv from 'dotenv';

dotenv.config();

const BATCH_SIZE = parseInt(process.argv.find(arg => arg.startsWith('--batch-size='))?.split('=')[1] || '50');
const DRY_RUN = process.argv.includes('--dry-run');
const SKIP_EXISTING = process.argv.includes('--skip-existing');
const FIREBASE_PROJECT = process.env.FIREBASE_PROJECT || 'mundo1-dev';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: FIREBASE_PROJECT
  });
}

const firestore = admin.firestore();

interface FirestoreItinerary {
  id: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  startDay?: number;
  endDay?: number;
  gender?: string;
  status?: string;
  sexualOrientation?: string;
  age?: number;
  lowerRange?: number;
  upperRange?: number;
  description?: string;
  activities?: string[];
  likes?: string[];
  userInfo?: {
    uid: string;
    username: string;
    email: string;
    gender: string;
    status: string;
    sexualOrientation: string;
    dob: string;
    blocked?: string[];
  };
  ai_status?: string;
  response?: any;
  metadata?: any;
  externalData?: any;
  recommendations?: any;
  costBreakdown?: any;
  dailyPlans?: any;
  days?: any;
  flights?: any;
  accommodations?: any;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
}

async function migrateFirestoreToCloudSQL() {
  console.log('🚀 Starting Firestore → Cloud SQL Migration');
  console.log(`📊 Project: ${FIREBASE_PROJECT}`);
  console.log(`📦 Batch Size: ${BATCH_SIZE}`);
  console.log(`🔍 Dry Run: ${DRY_RUN ? 'YES' : 'NO'}`);
  console.log(`⏭️  Skip Existing: ${SKIP_EXISTING ? 'YES' : 'NO'}`);
  console.log('');

  const stats = {
    total: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [] as Array<{ id: string; error: string }>
  };

  try {
    // Fetch all itineraries from Firestore
    console.log('📖 Reading itineraries from Firestore...');
    const snapshot = await firestore.collection('itineraries').get();
    stats.total = snapshot.size;
    console.log(`✅ Found ${stats.total} itineraries in Firestore\n`);

    if (stats.total === 0) {
      console.log('⚠️  No itineraries found in Firestore. Nothing to migrate.');
      return;
    }

    // Process in batches
    const itineraries: FirestoreItinerary[] = [];
    snapshot.forEach(doc => {
      itineraries.push({ id: doc.id, ...doc.data() } as FirestoreItinerary);
    });

    for (let i = 0; i < itineraries.length; i += BATCH_SIZE) {
      const batch = itineraries.slice(i, i + BATCH_SIZE);
      console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} items)...`);

      for (const itinerary of batch) {
        try {
          // Check if already exists in Cloud SQL
          if (SKIP_EXISTING || DRY_RUN) {
            const existing = await prisma.itinerary.findUnique({
              where: { id: itinerary.id }
            });

            if (existing && SKIP_EXISTING) {
              console.log(`  ⏭️  Skipping ${itinerary.id} (already exists)`);
              stats.skipped++;
              continue;
            }

            if (existing && DRY_RUN) {
              console.log(`  ℹ️  Would skip ${itinerary.id} (already exists)`);
              stats.skipped++;
              continue;
            }
          }

          // Transform Firestore data to Prisma schema
          const prismaData = transformItinerary(itinerary);

          if (DRY_RUN) {
            console.log(`  ✓ Would migrate ${itinerary.id}:`, {
              destination: prismaData.destination,
              userId: prismaData.userId,
              dates: `${prismaData.startDate} to ${prismaData.endDate}`
            });
            stats.migrated++;
          } else {
            // Upsert to handle duplicates gracefully
            await prisma.itinerary.upsert({
              where: { id: itinerary.id },
              update: prismaData,
              create: { id: itinerary.id, ...prismaData }
            });

            console.log(`  ✅ Migrated ${itinerary.id}`);
            stats.migrated++;
          }

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`  ❌ Error migrating ${itinerary.id}:`, errorMsg);
          stats.errors++;
          stats.errorDetails.push({ id: itinerary.id, error: errorMsg });
        }
      }

      // Small delay between batches to avoid overwhelming the database
      if (i + BATCH_SIZE < itineraries.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

  } catch (error) {
    console.error('\n❌ Fatal error during migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    await admin.app().delete();
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`Total Itineraries:    ${stats.total}`);
  console.log(`Successfully Migrated: ${stats.migrated}`);
  console.log(`Skipped (existing):   ${stats.skipped}`);
  console.log(`Errors:               ${stats.errors}`);
  console.log('='.repeat(60));

  if (stats.errors > 0) {
    console.log('\n❌ Errors:');
    stats.errorDetails.forEach(({ id, error }) => {
      console.log(`  - ${id}: ${error}`);
    });
  }

  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No data was written to the database');
  }

  console.log('\n✅ Migration complete!');
}

function transformItinerary(firestoreData: FirestoreItinerary): any {
  // Calculate age from DOB if available
  let age = firestoreData.age;
  if (!age && firestoreData.userInfo?.dob) {
    const dob = new Date(firestoreData.userInfo.dob);
    const today = new Date();
    age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
  }

  // Parse dates
  const startDate = firestoreData.startDate ? new Date(firestoreData.startDate) : new Date();
  const endDate = firestoreData.endDate ? new Date(firestoreData.endDate) : new Date();
  const startDay = firestoreData.startDay ? BigInt(firestoreData.startDay) : BigInt(startDate.getTime());
  const endDay = firestoreData.endDay ? BigInt(firestoreData.endDay) : BigInt(endDate.getTime());

  // Extract userId from userInfo
  const userId = firestoreData.userInfo?.uid || 'unknown';

  return {
    userId,
    destination: firestoreData.destination || 'Unknown',
    startDate,
    endDate,
    startDay,
    endDay,
    gender: firestoreData.gender || 'Any',
    status: firestoreData.status || 'Any',
    sexualOrientation: firestoreData.sexualOrientation || 'Any',
    age: age || 30,
    lowerRange: firestoreData.lowerRange || 18,
    upperRange: firestoreData.upperRange || 100,
    description: firestoreData.description || '',
    activities: firestoreData.activities || [],
    likes: firestoreData.likes || [],
    userInfo: firestoreData.userInfo || {
      uid: userId,
      username: 'Unknown',
      email: '',
      gender: 'Any',
      status: 'Any',
      sexualOrientation: 'Any',
      dob: '1990-01-01',
      blocked: []
    },
    ai_status: firestoreData.ai_status || null,
    response: firestoreData.response || null,
    metadata: firestoreData.metadata || null,
    externalData: firestoreData.externalData || null,
    recommendations: firestoreData.recommendations || null,
    costBreakdown: firestoreData.costBreakdown || null,
    dailyPlans: firestoreData.dailyPlans || null,
    days: firestoreData.days || null,
    flights: firestoreData.flights || null,
    accommodations: firestoreData.accommodations || null,
    createdAt: firestoreData.createdAt?.toDate() || new Date(),
    updatedAt: firestoreData.updatedAt?.toDate() || new Date()
  };
}

// Run migration
migrateFirestoreToCloudSQL()
  .then(() => {
    console.log('\n✅ Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration script failed:', error);
    process.exit(1);
  });
