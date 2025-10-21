/**
 * Comprehensive Filter Testing - Test Data Seeder
 * 
 * Test Scenario:
 * - User 1: OPoJ6tPN3DaCAXxCmXwGFjOF7SI3 (searching)
 * - User 2: QtWLY9o8uBemzPxr1pq165KzEM92 (baseline for testing)
 * - Destination: Miami, Florida
 * - Dates: Nov 11-18, 2025
 * 
 * User 1 Profile (from userInfo):
 * - Age: 27 (DOB: 1998-07-09)
 * - Gender: Male
 * - Status: Single
 * - Sexual Orientation: Heterosexual
 * 
 * This script creates test itineraries to validate ALL filter combinations:
 * ✅ SHOULD MATCH (Control Group)
 * ❌ Age out of range only
 * ❌ Status mismatch only
 * ❌ Sexual orientation mismatch only
 * ❌ Gender mismatch only
 * ❌ Date no overlap only
 * ❌ Different destination only
 * ❌ Already viewed (localStorage exclusion)
 * ❌ Multiple filters failing
 */

import prisma from '../src/db/prismaClient';
import * as dotenv from 'dotenv';

dotenv.config();

// Test user IDs
const USER1_ID = 'OPoJ6tPN3DaCAXxCmXwGFjOF7SI3'; // Searching user (Joy)
const USER2_ID = 'QtWLY9o8uBemzPxr1pq165KzEM92'; // Baseline user

// Test scenario parameters (based on Joy's actual itinerary)
const TEST_DESTINATION = 'Miami, FL, USA';
const TEST_START_DATE = new Date('2025-11-11T00:00:00Z');
const TEST_END_DATE = new Date('2025-11-30T00:00:00Z');
const TEST_START_DAY = BigInt(TEST_START_DATE.getTime());
const TEST_END_DAY = BigInt(TEST_END_DATE.getTime());

// User 1 profile (the searcher - Joy)
const USER1_PROFILE = {
  age: 27, // Born 1998-07-09
  gender: 'Male',
  status: 'couple', // Looking for couples
  sexualOrientation: 'No Preference',
  ageRange: { lower: 18, upper: 100 }, // Very wide age range
};

// Test data categories
interface TestItinerary {
  id: string;
  category: string;
  shouldMatch: boolean;
  reason: string;
  userId: string;
  destination: string;
  startDate: Date;
  endDate: Date;
  age: number;
  gender: string;
  status: string;
  sexualOrientation: string;
  lowerRange: number;
  upperRange: number;
  ai_generated?: boolean;
  response?: any;
}

const testItineraries: TestItinerary[] = [];

// Helper to create user info JSON
function createUserInfo(userId: string, age: number, gender: string, status: string, orientation: string) {
  const birthYear = new Date().getFullYear() - age;
  return JSON.stringify({
    uid: userId,
    dob: `${birthYear}-06-15`,
    email: `test${userId.slice(0, 8)}@example.com`,
    gender: gender,
    status: status.toLowerCase(),
    sexualOrientation: orientation.toLowerCase(),
    username: `TestUser${userId.slice(0, 4)}`,
    blocked: [],
  });
}

// Helper to create AI-generated response structure
function createAIResponse(id: string, destination: string, startDate: Date, endDate: Date) {
  return JSON.stringify({
    data: {
      itinerary: {
        id: id,
        destination: destination,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        days: [
          {
            day: 1,
            date: startDate.toISOString().split('T')[0],
            activities: ['Explore South Beach', 'Visit Art Deco District'],
          },
          {
            day: 2,
            date: new Date(startDate.getTime() + 86400000).toISOString().split('T')[0],
            activities: ['Everglades Tour', 'Sunset at Key Biscayne'],
          },
        ],
        accommodations: [{ name: 'Miami Beach Hotel', checkIn: startDate.toISOString().split('T')[0] }],
      },
      metadata: {
        filtering: {
          destination: destination,
          minStartDay: startDate.getTime(),
          ageRange: { lower: 18, upper: 100 },
        },
      },
    },
  });
}

console.log('\n' + '='.repeat(80));
console.log('COMPREHENSIVE FILTER TEST DATA SEEDER');
console.log('='.repeat(80));
console.log('\n📋 Test Scenario (Based on Joy\'s Actual Itinerary):');
console.log(`   Destination: ${TEST_DESTINATION}`);
console.log(`   Dates: ${TEST_START_DATE.toISOString().split('T')[0]} to ${TEST_END_DATE.toISOString().split('T')[0]}`);
console.log(`   Searching User: ${USER1_ID} (Joy)`);
console.log(`   User Profile: Age ${USER1_PROFILE.age}, ${USER1_PROFILE.gender}, Looking for ${USER1_PROFILE.status}`);
console.log(`   Age Preference: ${USER1_PROFILE.ageRange.lower}-${USER1_PROFILE.ageRange.upper} (No age restriction)`);
console.log(`   Gender Preference: Female`);
console.log(`   Sexual Orientation: ${USER1_PROFILE.sexualOrientation}`);

// =============================================================================
// CATEGORY 1: PERFECT MATCHES (Should appear in results)
// =============================================================================
console.log('\n\n✅ Creating PERFECT MATCHES (5 itineraries)...');

for (let i = 1; i <= 5; i++) {
  const id = `test-match-perfect-${i}`;
  const age = 20 + (i * 5); // Ages 25, 30, 35, 40, 45 (all within 18-100)
  const isAI = i % 2 === 0;
  
  testItineraries.push({
    id,
    category: 'PERFECT_MATCH',
    shouldMatch: true,
    reason: 'All filters match perfectly',
    userId: `test-user-match-${i}`,
    destination: TEST_DESTINATION,
    startDate: TEST_START_DATE,
    endDate: TEST_END_DATE,
    age,
    gender: 'Female', // Joy is looking for Female
    status: 'couple', // Joy is looking for couples
    sexualOrientation: 'No Preference', // Matches Joy's preference
    lowerRange: 18, // Wide range to match Joy
    upperRange: 100,
    ai_generated: isAI,
    response: isAI ? createAIResponse(id, TEST_DESTINATION, TEST_START_DATE, TEST_END_DATE) : undefined,
  });
  
  console.log(`   ✓ ${id}: Age ${age}, Female, Couple, ${isAI ? 'AI-generated' : 'Manual'}`);
}

// =============================================================================
// CATEGORY 2: AGE OUT OF RANGE (Should NOT appear - but Joy has 18-100 range)
// NOTE: Since Joy's range is 18-100, age alone won't filter these out
// These will fail due to OTHER criteria (wrong status, gender, etc.)
// =============================================================================
console.log('\n\n❌ Creating AGE EDGE CASES (4 itineraries)...');
console.log('   Note: Joy has age range 18-100, so testing extreme ages');

// Very young (18) - should still match if other criteria met
const veryYoungId = 'test-match-age-young-18';
testItineraries.push({
  id: veryYoungId,
  category: 'AGE_EDGE_YOUNG',
  shouldMatch: true,
  reason: 'Age 18 (minimum of Joy\'s range) - SHOULD MATCH',
  userId: 'test-user-age-18',
  destination: TEST_DESTINATION,
  startDate: TEST_START_DATE,
  endDate: TEST_END_DATE,
  age: 18, // Minimum of Joy's range
  gender: 'Female',
  status: 'couple',
  sexualOrientation: 'No Preference',
  lowerRange: 18,
  upperRange: 100,
});
console.log(`   ✓ ${veryYoungId}: Age 18 (SHOULD MATCH - at edge of range)`);

// Very old (100) - should still match if other criteria met
const veryOldId = 'test-match-age-old-100';
testItineraries.push({
  id: veryOldId,
  category: 'AGE_EDGE_OLD',
  shouldMatch: true,
  reason: 'Age 100 (maximum of Joy\'s range) - SHOULD MATCH',
  userId: 'test-user-age-100',
  destination: TEST_DESTINATION,
  startDate: TEST_START_DATE,
  endDate: TEST_END_DATE,
  age: 100, // Maximum of Joy's range
  gender: 'Female',
  status: 'couple',
  sexualOrientation: 'No Preference',
  lowerRange: 18,
  upperRange: 100,
});
console.log(`   ✓ ${veryOldId}: Age 100 (SHOULD MATCH - at edge of range)`);

// Too young (17) - below Joy's minimum
const tooYoungId = 'test-fail-age-too-young-17';
testItineraries.push({
  id: tooYoungId,
  category: 'AGE_TOO_YOUNG',
  shouldMatch: false,
  reason: 'Age 17 is below Joy\'s lower range (18)',
  userId: 'test-user-age-17',
  destination: TEST_DESTINATION,
  startDate: TEST_START_DATE,
  endDate: TEST_END_DATE,
  age: 17, // Below minimum
  gender: 'Female',
  status: 'couple',
  sexualOrientation: 'No Preference',
  lowerRange: 18,
  upperRange: 100,
});
console.log(`   ✓ ${tooYoungId}: Age 17 (SHOULD NOT MATCH - below 18)`);

// Too old (101) - above Joy's maximum
const tooOldId = 'test-fail-age-too-old-101';
testItineraries.push({
  id: tooOldId,
  category: 'AGE_TOO_OLD',
  shouldMatch: false,
  reason: 'Age 101 is above Joy\'s upper range (100)',
  userId: 'test-user-age-101',
  destination: TEST_DESTINATION,
  startDate: TEST_START_DATE,
  endDate: TEST_END_DATE,
  age: 101, // Above maximum
  gender: 'Female',
  status: 'couple',
  sexualOrientation: 'No Preference',
  lowerRange: 18,
  upperRange: 100,
});
console.log(`   ✓ ${tooOldId}: Age 101 (SHOULD NOT MATCH - above 100)`);

// =============================================================================
// CATEGORY 3: STATUS MISMATCH (Should NOT appear)
// =============================================================================
console.log('\n\n❌ Creating STATUS MISMATCH itineraries (3 itineraries)...');

const statusOptions = ['Single', 'Married', 'Divorced'];
statusOptions.forEach((status, idx) => {
  const id = `test-fail-status-${status.toLowerCase().replace(/\s+/g, '-')}`;
  testItineraries.push({
    id,
    category: 'STATUS_MISMATCH',
    shouldMatch: false,
    reason: `Status '${status}' does not match 'couple'`,
    userId: `test-user-status-${idx}`,
    destination: TEST_DESTINATION,
    startDate: TEST_START_DATE,
    endDate: TEST_END_DATE,
    age: 28,
    gender: 'Female',
    status: status, // Does not match USER1_PROFILE.status (couple)
    sexualOrientation: 'No Preference',
    lowerRange: 18,
    upperRange: 100,
  });
  console.log(`   ✓ ${id}: Status '${status}'`);
});

// =============================================================================
// CATEGORY 4: SEXUAL ORIENTATION (Should ALL MATCH since Joy has "No Preference")
// =============================================================================
console.log('\n\n✅ Creating SEXUAL ORIENTATION matches (3 itineraries)...');
console.log('   Note: Joy has "No Preference" so all orientations should match');

const orientationOptions = ['Gay', 'Lesbian', 'Bisexual'];
orientationOptions.forEach((orientation, idx) => {
  const id = `test-match-orientation-${orientation.toLowerCase()}`;
  testItineraries.push({
    id,
    category: 'ORIENTATION_MATCH',
    shouldMatch: true,
    reason: `Sexual orientation '${orientation}' matches (Joy has No Preference)`,
    userId: `test-user-orientation-${idx}`,
    destination: TEST_DESTINATION,
    startDate: TEST_START_DATE,
    endDate: TEST_END_DATE,
    age: 28,
    gender: 'Female',
    status: 'couple',
    sexualOrientation: orientation,
    lowerRange: 18,
    upperRange: 100,
  });
  console.log(`   ✓ ${id}: Orientation '${orientation}' (SHOULD MATCH)`);
});

// =============================================================================
// CATEGORY 5: GENDER MISMATCH (Should NOT appear - Joy is looking for Female)
// =============================================================================
console.log('\n\n❌ Creating GENDER MISMATCH itineraries (2 itineraries)...');

// If Joy searches for "Female" only, these should not appear
const id1 = 'test-fail-gender-male';
testItineraries.push({
  id: id1,
  category: 'GENDER_MISMATCH',
  shouldMatch: false,
  reason: "Gender 'Male' when searching for 'Female'",
  userId: 'test-user-gender-male',
  destination: TEST_DESTINATION,
  startDate: TEST_START_DATE,
  endDate: TEST_END_DATE,
  age: 28,
  gender: 'Male', // Joy is looking for Female
  status: 'couple',
  sexualOrientation: 'No Preference',
  lowerRange: 18,
  upperRange: 100,
});
console.log(`   ✓ ${id1}: Gender 'Male' (Joy is looking for Female)`);

const id2 = 'test-fail-gender-nonbinary';
testItineraries.push({
  id: id2,
  category: 'GENDER_MISMATCH',
  shouldMatch: false,
  reason: "Gender 'Non-binary' when searching for specific gender",
  userId: 'test-user-gender-nonbinary',
  destination: TEST_DESTINATION,
  startDate: TEST_START_DATE,
  endDate: TEST_END_DATE,
  age: 28,
  gender: 'Non-binary',
  status: 'couple',
  sexualOrientation: 'No Preference',
  lowerRange: 18,
  upperRange: 100,
});
console.log(`   ✓ ${id2}: Gender 'Non-binary'`);

// =============================================================================
// CATEGORY 6: DATE NO OVERLAP (Should NOT appear)
// =============================================================================
console.log('\n\n❌ Creating DATE NO OVERLAP itineraries (4 itineraries)...');
console.log(`   Joy's dates: Nov 11-30, 2025`);

// Before test dates - ends before Joy's start
const beforeId = 'test-fail-dates-before';
const beforeStart = new Date('2025-11-01T00:00:00Z');
const beforeEnd = new Date('2025-11-10T00:00:00Z'); // Ends Nov 10 (before Nov 11)
testItineraries.push({
  id: beforeId,
  category: 'DATES_BEFORE',
  shouldMatch: false,
  reason: 'Ends Nov 10 (before Joy\'s start Nov 11)',
  userId: 'test-user-dates-before',
  destination: TEST_DESTINATION,
  startDate: beforeStart,
  endDate: beforeEnd,
  age: 28,
  gender: 'Female',
  status: 'couple',
  sexualOrientation: 'No Preference',
  lowerRange: 18,
  upperRange: 100,
});
console.log(`   ✓ ${beforeId}: Nov 1-10 (ends before Nov 11)`);

// After test dates - starts after Joy's end
const afterId = 'test-fail-dates-after';
const afterStart = new Date('2025-12-01T00:00:00Z'); // Starts Dec 1 (after Nov 30)
const afterEnd = new Date('2025-12-10T00:00:00Z');
testItineraries.push({
  id: afterId,
  category: 'DATES_AFTER',
  shouldMatch: false,
  reason: 'Starts Dec 1 (after Joy\'s end Nov 30)',
  userId: 'test-user-dates-after',
  destination: TEST_DESTINATION,
  startDate: afterStart,
  endDate: afterEnd,
  age: 28,
  gender: 'Female',
  status: 'couple',
  sexualOrientation: 'No Preference',
  lowerRange: 18,
  upperRange: 100,
});
console.log(`   ✓ ${afterId}: Dec 1-10 (starts after Nov 30)`);

// Partial overlap - should MATCH (dates overlap)
const overlapId = 'test-match-dates-overlap';
const overlapStart = new Date('2025-11-05T00:00:00Z');
const overlapEnd = new Date('2025-11-15T00:00:00Z'); // Overlaps Nov 11-15
testItineraries.push({
  id: overlapId,
  category: 'DATES_OVERLAP',
  shouldMatch: true,
  reason: 'Dates overlap (Nov 5-15 overlaps with Nov 11-30)',
  userId: 'test-user-dates-overlap',
  destination: TEST_DESTINATION,
  startDate: overlapStart,
  endDate: overlapEnd,
  age: 28,
  gender: 'Female',
  status: 'couple',
  sexualOrientation: 'No Preference',
  lowerRange: 18,
  upperRange: 100,
});
console.log(`   ✅ ${overlapId}: Nov 5-15 (SHOULD MATCH - overlaps)`);

// Completely containing - should MATCH
const containingId = 'test-match-dates-containing';
const containingStart = new Date('2025-11-01T00:00:00Z');
const containingEnd = new Date('2025-12-15T00:00:00Z'); // Contains Nov 11-30
testItineraries.push({
  id: containingId,
  category: 'DATES_CONTAINING',
  shouldMatch: true,
  reason: 'Dates contain Joy\'s dates (Nov 1 - Dec 15 contains Nov 11-30)',
  userId: 'test-user-dates-containing',
  destination: TEST_DESTINATION,
  startDate: containingStart,
  endDate: containingEnd,
  age: 28,
  gender: 'Female',
  status: 'couple',
  sexualOrientation: 'No Preference',
  lowerRange: 18,
  upperRange: 100,
});
console.log(`   ✅ ${containingId}: Nov 1 - Dec 15 (SHOULD MATCH - contains)`);

// =============================================================================
// CATEGORY 7: DIFFERENT DESTINATION (Should NOT appear)
// =============================================================================
console.log('\n\n❌ Creating DIFFERENT DESTINATION itineraries (3 itineraries)...');

const destinations = ['New York, NY', 'Los Angeles, CA', 'Chicago, IL'];
destinations.forEach((dest, idx) => {
  const id = `test-fail-destination-${dest.split(',')[0].toLowerCase().replace(/\s+/g, '-')}`;
  testItineraries.push({
    id,
    category: 'DESTINATION_MISMATCH',
    shouldMatch: false,
    reason: `Destination '${dest}' does not match '${TEST_DESTINATION}'`,
    userId: `test-user-dest-${idx}`,
    destination: dest,
    startDate: TEST_START_DATE,
    endDate: TEST_END_DATE,
    age: 28,
    gender: 'Female',
    status: 'couple',
    sexualOrientation: 'No Preference',
    lowerRange: 18,
    upperRange: 100,
  });
  console.log(`   ✓ ${id}: Destination '${dest}'`);
});

// =============================================================================
// CATEGORY 8: ALREADY VIEWED (For localStorage exclusion testing)
// =============================================================================
console.log('\n\n📝 Creating ALREADY VIEWED itineraries (3 itineraries)...');
console.log('   These should be excluded via excludedIds parameter');

for (let i = 1; i <= 3; i++) {
  const id = `test-viewed-${i}`;
  testItineraries.push({
    id,
    category: 'ALREADY_VIEWED',
    shouldMatch: false, // Should not appear when ID is in excludedIds
    reason: 'Previously viewed (ID in excludedIds parameter)',
    userId: `test-user-viewed-${i}`,
    destination: TEST_DESTINATION,
    startDate: TEST_START_DATE,
    endDate: TEST_END_DATE,
    age: 28,
    gender: 'Female',
    status: 'couple',
    sexualOrientation: 'No Preference',
    lowerRange: 18,
    upperRange: 100,
  });
  console.log(`   ✓ ${id}: Perfect match but previously viewed`);
}

// =============================================================================
// CATEGORY 9: MULTIPLE FAILURES (Should NOT appear)
// =============================================================================
console.log('\n\n❌ Creating MULTIPLE FAILURES itineraries (2 itineraries)...');

const multiFailId1 = 'test-fail-multi-age-dest';
testItineraries.push({
  id: multiFailId1,
  category: 'MULTIPLE_FAILURES',
  shouldMatch: false,
  reason: 'Age out of range (too old) AND wrong destination',
  userId: 'test-user-multi-fail-1',
  destination: 'Paris, France', // Wrong destination
  startDate: TEST_START_DATE,
  endDate: TEST_END_DATE,
  age: 101, // Too old (above 100)
  gender: 'Female',
  status: 'couple',
  sexualOrientation: 'No Preference',
  lowerRange: 18,
  upperRange: 100,
});
console.log(`   ✓ ${multiFailId1}: Age 101 (too old) + Destination 'Paris'`);

const multiFailId2 = 'test-fail-multi-gender-status';
testItineraries.push({
  id: multiFailId2,
  category: 'MULTIPLE_FAILURES',
  shouldMatch: false,
  reason: 'Wrong gender AND wrong status',
  userId: 'test-user-multi-fail-2',
  destination: TEST_DESTINATION,
  startDate: TEST_START_DATE,
  endDate: TEST_END_DATE,
  age: 28,
  gender: 'Male', // Wrong gender
  status: 'Single', // Wrong status
  sexualOrientation: 'No Preference',
  lowerRange: 18,
  upperRange: 100,
});
console.log(`   ✓ ${multiFailId2}: Gender 'Male' + Status 'Single'`);

// =============================================================================
// SUMMARY
// =============================================================================
console.log('\n\n' + '='.repeat(80));
console.log('TEST DATA SUMMARY');
console.log('='.repeat(80));

const shouldMatchCount = testItineraries.filter(t => t.shouldMatch).length;
const shouldNotMatchCount = testItineraries.filter(t => !t.shouldMatch).length;

console.log(`\n✅ SHOULD MATCH: ${shouldMatchCount} itineraries`);
console.log(`❌ SHOULD NOT MATCH: ${shouldNotMatchCount} itineraries`);
console.log(`📊 TOTAL: ${testItineraries.length} itineraries`);

console.log('\n📋 Breakdown by category:');
const categoryCounts = testItineraries.reduce((acc, t) => {
  acc[t.category] = (acc[t.category] || 0) + 1;
  return acc;
}, {} as Record<string, number>);

Object.entries(categoryCounts).forEach(([category, count]) => {
  const icon = category.includes('MATCH') && !category.includes('MISMATCH') ? '✅' : '❌';
  console.log(`   ${icon} ${category}: ${count}`);
});

// =============================================================================
// INSERT DATA
// =============================================================================
async function seedDatabase() {
  console.log('\n\n' + '='.repeat(80));
  console.log('INSERTING TEST DATA INTO DATABASE');
  console.log('='.repeat(80) + '\n');

  try {
    // Clean up existing test data
    console.log('🧹 Cleaning up existing test data...');
    const deleted = await prisma.itinerary.deleteMany({
      where: {
        OR: [
          { id: { startsWith: 'test-' } },
          { userId: { startsWith: 'test-user-' } },
        ],
      },
    });
    console.log(`   ✓ Deleted ${deleted.count} existing test records\n`);

    // Insert new test data
    console.log('💾 Inserting test itineraries...');
    let successCount = 0;
    let errorCount = 0;

    for (const testData of testItineraries) {
      try {
        await prisma.itinerary.create({
          data: {
            id: testData.id,
            userId: testData.userId,
            destination: testData.destination,
            startDate: testData.startDate,
            endDate: testData.endDate,
            startDay: BigInt(testData.startDate.getTime()),
            endDay: BigInt(testData.endDate.getTime()),
            age: testData.age,
            gender: testData.gender,
            status: testData.status,
            sexualOrientation: testData.sexualOrientation,
            lowerRange: testData.lowerRange,
            upperRange: testData.upperRange,
            activities: JSON.stringify(['Beach', 'Dining', 'Nightlife']),
            userInfo: createUserInfo(
              testData.userId,
              testData.age,
              testData.gender,
              testData.status,
              testData.sexualOrientation
            ),
            ai_status: testData.ai_generated ? 'completed' : '',
            response: testData.response || '',
            title: `Test: ${testData.category}`,
            description: testData.reason,
            createdAt: new Date(),
          },
        });
        successCount++;
      } catch (error) {
        console.error(`   ✗ Error inserting ${testData.id}:`, error);
        errorCount++;
      }
    }

    console.log(`\n✅ Successfully inserted: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    // Verify data
    console.log('\n📊 Verifying inserted data...');
    const totalCount = await prisma.itinerary.count({
      where: { id: { startsWith: 'test-' } },
    });
    console.log(`   Total test itineraries in DB: ${totalCount}`);

    // Generate test instructions
    console.log('\n\n' + '='.repeat(80));
    console.log('TESTING INSTRUCTIONS');
    console.log('='.repeat(80));
    console.log('\n1. Create a test search with these parameters (Joy\'s Actual Itinerary):');
    console.log(`   - Destination: ${TEST_DESTINATION}`);
    console.log(`   - Start Date: ${TEST_START_DATE.toISOString().split('T')[0]}`);
    console.log(`   - End Date: ${TEST_END_DATE.toISOString().split('T')[0]}`);
    console.log(`   - User ID: ${USER1_ID}`);
    console.log(`   - Age Range: ${USER1_PROFILE.ageRange.lower}-${USER1_PROFILE.ageRange.upper}`);
    console.log(`   - Gender Preference: Female`);
    console.log(`   - Status Preference: couple`);
    console.log(`   - Sexual Orientation Preference: No Preference`);
    
    console.log('\n2. Test viewed itineraries exclusion:');
    console.log('   Pass excludedIds: ["test-viewed-1", "test-viewed-2", "test-viewed-3"]');
    
    console.log('\n3. Expected results (✅ SHOULD SEE):');
    testItineraries
      .filter(t => t.shouldMatch)
      .forEach(t => console.log(`   ✅ ${t.id}: ${t.reason}`));
    
    console.log('\n4. Should NOT see any of these (❌ SHOULD NOT SEE):');
    console.log(`   Total: ${shouldNotMatchCount} itineraries`);
    testItineraries
      .filter(t => !t.shouldMatch)
      .forEach(t => console.log(`   ❌ ${t.id}: ${t.reason}`));

    console.log('\n5. Validation query to run:');
    console.log(`
    const viewedIds = ["test-viewed-1", "test-viewed-2", "test-viewed-3"];
    const results = await searchItineraries({
      destination: "${TEST_DESTINATION}",
      gender: "Female",
      status: "couple",
      sexualOrientation: "No Preference",
      minStartDay: ${TEST_START_DAY},
      lowerRange: ${USER1_PROFILE.ageRange.lower},
      upperRange: ${USER1_PROFILE.ageRange.upper},
      excludedIds: viewedIds,
      pageSize: 50
    });
    
    console.log("Results found:", results.length);
    console.log("Result IDs:", results.map(r => r.id));
    
    // Verify ONLY matching IDs appear
    const shouldMatchIds = ${JSON.stringify(testItineraries.filter(t => t.shouldMatch).map(t => t.id))};
    const actualIds = results.map(r => r.id);
    const incorrectMatches = actualIds.filter(id => !shouldMatchIds.includes(id));
    const missingMatches = shouldMatchIds.filter(id => !actualIds.includes(id));
    
    console.log("Incorrect matches (should NOT see):", incorrectMatches);
    console.log("Missing matches (should see):", missingMatches);
    `);

  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedDatabase()
  .then(() => {
    console.log('\n✅ Test data seeding complete!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  });
