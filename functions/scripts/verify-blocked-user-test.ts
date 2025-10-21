/**
 * Verify Blocked User Test Data
 * 
 * Checks if the blocked user test itinerary exists and shows its details
 */

import prisma from '../src/db/prismaClient';
import * as dotenv from 'dotenv';

dotenv.config();

const CURRENT_USER_ID = 'OPoJ6tPN3DaCAXxCmXwGFjOF7SI3';

async function verifyBlockedUserTest() {
  console.log('🔍 Verifying blocked user test data...\n');

  try {
    // Find the test itinerary
    const itinerary = await prisma.itinerary.findUnique({
      where: { id: 'test-blocked-user-has-joy-blocked' }
    });

    if (!itinerary) {
      console.log('❌ Test itinerary not found!');
      return;
    }

    console.log('✅ Found test itinerary:', itinerary.id);
    console.log('   Destination:', itinerary.destination);
    console.log('   Dates:', itinerary.startDate, 'to', itinerary.endDate);
    console.log('   Gender:', itinerary.gender);
    console.log('   Status:', itinerary.status);
    console.log('   Sexual Orientation:', itinerary.sexualOrientation);
    console.log('   Age:', itinerary.age);
    console.log('\n📋 UserInfo:', JSON.stringify(itinerary.userInfo, null, 2));
    
    // Parse userInfo if it's a string
    let userInfo = itinerary.userInfo;
    if (typeof userInfo === 'string') {
      userInfo = JSON.parse(userInfo);
    }

    console.log('\n🚫 Blocked users in array:', (userInfo as any)?.blocked || []);
    
    if (Array.isArray((userInfo as any)?.blocked) && (userInfo as any).blocked.includes(CURRENT_USER_ID)) {
      console.log('✅ VERIFIED: Current user ID is in blocked array');
      console.log('   This itinerary should NOT appear in search results');
    } else {
      console.log('❌ WARNING: Current user ID is NOT in blocked array');
    }

  } catch (error) {
    console.error('❌ Error verifying test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyBlockedUserTest()
  .then(() => {
    console.log('\n✅ Verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  });
