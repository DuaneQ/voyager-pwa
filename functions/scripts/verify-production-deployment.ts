/**
 * Post-Deployment Verification Script
 * 
 * Tests critical functionality after production deployment
 * 
 * Usage:
 *   FIREBASE_PROJECT=mundo1-1 npx ts-node scripts/verify-production-deployment.ts
 */

import * as admin from 'firebase-admin';
import prisma from '../src/db/prismaClient';
import * as dotenv from 'dotenv';

dotenv.config();

const FIREBASE_PROJECT = process.env.FIREBASE_PROJECT || 'mundo1-1';
const TEST_USER_ID = 'production-test-user';

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: FIREBASE_PROJECT
  });
}

interface VerificationResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message: string;
  duration?: number;
}

const results: VerificationResult[] = [];

async function verifyCloudSQLConnection() {
  console.log('\n� Testing Cloud SQL connection...');
  const startTime = Date.now();
  
  try {
    const count = await prisma.itinerary.count();
    const duration = Date.now() - startTime;
    
    results.push({
      test: 'Cloud SQL connection',
      status: 'PASS',
      message: `Connected successfully (${count} itineraries found)`,
      duration
    });
  } catch (error) {
    results.push({
      test: 'Cloud SQL connection',
      status: 'FAIL',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

async function verifySearchQuery() {
  console.log('\n🔍 Testing search query...');
  const startTime = Date.now();
  
  try {
    const results = await prisma.itinerary.findMany({
      where: {
        destination: { contains: 'Miami' },
        gender: 'Female',
        status: 'couple'
      },
      take: 10
    });
    
    const duration = Date.now() - startTime;
    
    results.push({
      test: 'Search query',
      status: 'PASS',
      message: `Query executed successfully (${results.length} results)`,
      duration
    });
  } catch (error) {
    results.push({
      test: 'Search query',
      status: 'FAIL',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

async function verifyDatabaseConnection() {
  console.log('\n🔗 Testing database connection...');
  
  try {
    const firestore = admin.firestore();
    await firestore.collection('_health_check').doc('test').set({ timestamp: new Date() });
    
    results.push({
      test: 'Firestore connection',
      status: 'PASS',
      message: 'Connected successfully'
    });
  } catch (error) {
    results.push({
      test: 'Firestore connection',
      status: 'FAIL',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

async function verifyResponseTimes() {
  console.log('\n⏱️  Testing query performance...');
  const times: number[] = [];
  
  try {
    for (let i = 0; i < 3; i++) {
      const start = Date.now();
      await prisma.itinerary.findMany({
        where: { destination: { contains: 'Miami' } },
        take: 10
      });
      times.push(Date.now() - start);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    
    if (avgTime < 1000) {
      results.push({
        test: 'Query performance',
        status: 'PASS',
        message: `Average: ${avgTime.toFixed(0)}ms`,
        duration: avgTime
      });
    } else {
      results.push({
        test: 'Query performance',
        status: 'FAIL',
        message: `Too slow: ${avgTime.toFixed(0)}ms (should be < 1000ms)`,
        duration: avgTime
      });
    }
  } catch (error) {
    results.push({
      test: 'Query performance',
      status: 'FAIL',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

async function runVerification() {
  console.log('🚀 Post-Deployment Verification');
  console.log(`📊 Project: ${FIREBASE_PROJECT}`);
  console.log('='.repeat(60));

  await verifyDatabaseConnection();
  await verifyCloudSQLConnection();
  await verifySearchQuery();
  await verifyResponseTimes();

  // Print results
  console.log('\n' + '='.repeat(60));
  console.log('📊 Verification Results');
  console.log('='.repeat(60));

  let passCount = 0;
  let failCount = 0;

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : '❌';
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`${icon} ${result.test}: ${result.message}${duration}`);
    
    if (result.status === 'PASS') passCount++;
    else failCount++;
  });

  console.log('='.repeat(60));
  console.log(`Total: ${results.length} | Passed: ${passCount} | Failed: ${failCount}`);
  console.log('='.repeat(60));

  if (failCount > 0) {
    console.log('\n❌ Deployment verification FAILED');
    console.log('⚠️  Review failed tests and consider rollback');
    process.exit(1);
  } else {
    console.log('\n✅ All verification tests PASSED');
    console.log('🎉 Production deployment successful!');
    process.exit(0);
  }
}

runVerification()
  .catch(error => {
    console.error('\n❌ Verification script failed:', error);
    process.exit(1);
  });
