/**
 * Blocked User Test Data Seeder
 * 
 * Creates a test itinerary that:
 * - Matches all search criteria (destination, dates, age, gender, status, orientation)
 * - Has the current user's ID (OPoJ6tPN3DaCAXxCmXwGFjOF7SI3) in their blocked array
 * - Should NOT appear in search results due to bidirectional blocking
 */

import prisma from '../src/db/prismaClient';
import * as dotenv from 'dotenv';

dotenv.config();

const CURRENT_USER_ID = 'OPoJ6tPN3DaCAXxCmXwGFjOF7SI3'; // Joy's user ID
const BLOCKED_USER_ID = 'blocked-user-test-123'; // Test user who blocked Joy

// Joy's itinerary details (from previous tests)
const TEST_DESTINATION = 'Miami, FL, USA';
const TEST_START_DATE = new Date('2025-11-11T00:00:00Z');
const TEST_END_DATE = new Date('2025-11-30T00:00:00Z');
const TEST_START_DAY = BigInt(TEST_START_DATE.getTime());
const TEST_END_DAY = BigInt(TEST_END_DATE.getTime());

async function seedBlockedUserTest() {
  console.log('🚫 Seeding blocked user test data...');
  console.log(`Current user ID to block: ${CURRENT_USER_ID}`);

  try {
    // Create itinerary that matches all criteria but has current user in blocked array
    const blockedItinerary = await prisma.itinerary.create({
      data: {
        id: 'test-blocked-user-has-joy-blocked',
        userId: BLOCKED_USER_ID,
        destination: TEST_DESTINATION,
        startDate: TEST_START_DATE,
        endDate: TEST_END_DATE,
        startDay: TEST_START_DAY,
        endDay: TEST_END_DAY,
        age: 28, // Within Joy's age range (18-100)
        gender: 'Female', // Joy is looking for Female
        status: 'couple', // Joy is looking for couple
        sexualOrientation: 'No Preference', // Matches
        lowerRange: 18,
        upperRange: 100,
        description: 'Test itinerary - User who blocked Joy. Should NOT appear in search results.',
        activities: ['beach', 'nightlife', 'dining'],
        likes: [],
        userInfo: {
          uid: BLOCKED_USER_ID,
          username: 'BlockedTestUser',
          email: 'blocked-test@example.com',
          gender: 'Female',
          status: 'couple',
          sexualOrientation: 'No Preference',
          dob: '1997-01-15',
          blocked: [CURRENT_USER_ID] // THIS USER HAS BLOCKED JOY
        },
        metadata: {
          note: 'This itinerary should be excluded from search results because this user has blocked Joy (bidirectional blocking)'
        }
      }
    });

    console.log('✅ Created blocked user test itinerary:', blockedItinerary.id);
    console.log('   - Destination:', blockedItinerary.destination);
    console.log('   - Dates:', blockedItinerary.startDate, 'to', blockedItinerary.endDate);
    console.log('   - Gender/Status/Orientation:', blockedItinerary.gender, blockedItinerary.status, blockedItinerary.sexualOrientation);
    console.log('   - User blocked in array:', CURRENT_USER_ID);
    console.log('');
    console.log('🧪 Test Verification:');
    console.log('   1. This itinerary matches all search criteria');
    console.log('   2. But has Joy\'s user ID in the blocked array');
    console.log('   3. Should NOT appear in search results (bidirectional blocking)');
    console.log('');
    console.log('📝 To verify:');
    console.log('   - Search with Joy\'s Miami itinerary');
    console.log('   - This itinerary should be filtered out');
    console.log('   - Check console logs for: "🚫 Blocking itinerary test-blocked-user-has-joy-blocked - candidate blocked current user"');

  } catch (error) {
    console.error('❌ Error seeding blocked user test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedBlockedUserTest()
  .then(() => {
    console.log('✅ Blocked user test data seeded successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed to seed blocked user test data:', error);
    process.exit(1);
  });
