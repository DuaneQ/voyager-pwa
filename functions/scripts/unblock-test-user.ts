/**
 * Unblock Test User Script
 * 
 * Removes the current user's ID from the blocked array of the test itinerary
 * so it will appear in search results (to verify blocking was working)
 */

import prisma from '../src/db/prismaClient';
import * as dotenv from 'dotenv';

dotenv.config();

const CURRENT_USER_ID = 'OPoJ6tPN3DaCAXxCmXwGFjOF7SI3';
const TEST_ITINERARY_ID = 'test-blocked-user-has-joy-blocked';

async function unblockTestUser() {
  console.log('🔓 Unblocking test user...');
  console.log(`   Removing ${CURRENT_USER_ID} from blocked array`);

  try {
    // Get the current itinerary
    const itinerary = await prisma.itinerary.findUnique({
      where: { id: TEST_ITINERARY_ID }
    });

    if (!itinerary) {
      console.log('❌ Test itinerary not found!');
      return;
    }

    // Parse userInfo
    let userInfo = itinerary.userInfo;
    if (typeof userInfo === 'string') {
      userInfo = JSON.parse(userInfo);
    }

    console.log('\n📋 Current userInfo:', JSON.stringify(userInfo, null, 2));

    // Remove current user from blocked array
    const blockedArray = Array.isArray((userInfo as any)?.blocked) ? (userInfo as any).blocked : [];
    const updatedBlocked = blockedArray.filter((id: string) => id !== CURRENT_USER_ID);

    console.log('\n🚫 Blocked array before:', blockedArray);
    console.log('✅ Blocked array after:', updatedBlocked);

    // Update userInfo with empty blocked array
    const updatedUserInfo = {
      ...(userInfo as any),
      blocked: updatedBlocked
    };

    // Update the itinerary
    await prisma.itinerary.update({
      where: { id: TEST_ITINERARY_ID },
      data: {
        userInfo: updatedUserInfo
      }
    });

    console.log('\n✅ Successfully updated itinerary');
    console.log('   This itinerary should NOW appear in search results');

  } catch (error) {
    console.error('❌ Error unblocking test user:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

unblockTestUser()
  .then(() => {
    console.log('\n✅ Unblock complete - refresh browser and search again');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to unblock test user:', error);
    process.exit(1);
  });
