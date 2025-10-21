/**
 * Seed Test Itineraries Script
 * 
 * Creates 1000 itineraries with 50 that match a specific test user's preferences
 * to test server-side filtering in the UI.
 * 
 * Usage: npx ts-node scripts/seed-test-itineraries.ts
 */

import prisma from '../src/db/prismaClient';

// Test user itinerary that we'll create matches for
const TEST_USER_ITINERARY = {
  destination: 'Paris, France',
  gender: 'Male',
  status: 'Single',
  sexualOrientation: 'Straight',
  startDate: new Date('2025-12-01'),
  endDate: new Date('2025-12-15'),
  // Age range: 25-35 (birth year 1990-2000)
  minAge: 25,
  maxAge: 35
};

// Helper to generate random dates around the test dates
function getRandomDate(baseDate: Date, daysOffset: number): Date {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + Math.floor(Math.random() * daysOffset) - daysOffset / 2);
  return date;
}

// Helper to get birth date from age
function getBirthDateFromAge(age: number): Date {
  const birthYear = new Date().getFullYear() - age;
  return new Date(`${birthYear}-06-15`);
}

// Generate matching itineraries (50 total)
function generateMatchingItineraries(count: number = 50) {
  const genders = ['Male', 'Female'];
  const statuses = ['Single', 'Divorced', 'Widowed'];
  const orientations = ['Straight', 'Gay', 'Lesbian', 'Bisexual'];
  
  const itineraries = [];
  
  for (let i = 0; i < count; i++) {
    const age = 25 + Math.floor(Math.random() * 11); // 25-35
    const startDate = getRandomDate(TEST_USER_ITINERARY.startDate, 7); // Within 1 week
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 10 + Math.floor(Math.random() * 10)); // 10-20 days
    
    itineraries.push({
      id: `test-match-${i}`,
      userId: `test-user-match-${i}`,
      destination: TEST_USER_ITINERARY.destination,
      gender: genders[Math.floor(Math.random() * genders.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      sexualOrientation: orientations[Math.floor(Math.random() * orientations.length)],
      startDate,
      endDate,
      startDay: BigInt(startDate.getTime()),
      endDay: BigInt(endDate.getTime()),
      userInfo: {
        uid: `test-user-match-${i}`,
        email: `match${i}@test.com`,
        username: `test_match_${i}`,
        birthDate: getBirthDateFromAge(age).toISOString(),
        gender: genders[Math.floor(Math.random() * genders.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        sexualOrientation: orientations[Math.floor(Math.random() * orientations.length)]
      },
      likes: [],
      activities: ['Sightseeing', 'Museums', 'Dining'],
      budget: 'Medium',
      notes: `Matching test itinerary ${i}`
    });
  }
  
  return itineraries;
}

// Generate non-matching itineraries (950 total)
function generateNonMatchingItineraries(count: number = 950) {
  const destinations = [
    'Tokyo, Japan',
    'London, UK',
    'New York, USA',
    'Sydney, Australia',
    'Rome, Italy',
    'Barcelona, Spain',
    'Dubai, UAE',
    'Bangkok, Thailand',
    'Singapore',
    'Berlin, Germany'
  ];
  
  const genders = ['Male', 'Female'];
  const statuses = ['Single', 'Married', 'Divorced', 'Widowed'];
  const orientations = ['Straight', 'Gay', 'Lesbian', 'Bisexual'];
  
  const itineraries = [];
  
  for (let i = 0; i < count; i++) {
    // Mix of reasons why they don't match:
    // - Different destination (70%)
    // - Different dates (20%)
    // - Different age range (10%)
    
    const reason = Math.random();
    let destination = TEST_USER_ITINERARY.destination;
    let startDate = getRandomDate(TEST_USER_ITINERARY.startDate, 7);
    let age = 25 + Math.floor(Math.random() * 11);
    
    if (reason < 0.7) {
      // Different destination
      destination = destinations[Math.floor(Math.random() * destinations.length)];
    } else if (reason < 0.9) {
      // Different dates (no overlap)
      const offset = Math.random() < 0.5 ? -60 : 60; // 60 days before or after
      startDate = getRandomDate(TEST_USER_ITINERARY.startDate, 10);
      startDate.setDate(startDate.getDate() + offset);
    } else {
      // Different age range
      age = Math.random() < 0.5 ? 18 + Math.floor(Math.random() * 7) : 36 + Math.floor(Math.random() * 30);
    }
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 10 + Math.floor(Math.random() * 10));
    
    itineraries.push({
      id: `test-nomatch-${i}`,
      userId: `test-user-nomatch-${i}`,
      destination,
      gender: genders[Math.floor(Math.random() * genders.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      sexualOrientation: orientations[Math.floor(Math.random() * orientations.length)],
      startDate,
      endDate,
      startDay: BigInt(startDate.getTime()),
      endDay: BigInt(endDate.getTime()),
      userInfo: {
        uid: `test-user-nomatch-${i}`,
        email: `nomatch${i}@test.com`,
        username: `test_nomatch_${i}`,
        birthDate: getBirthDateFromAge(age).toISOString(),
        gender: genders[Math.floor(Math.random() * genders.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        sexualOrientation: orientations[Math.floor(Math.random() * orientations.length)]
      },
      likes: [],
      activities: ['Various activities'],
      budget: 'Medium',
      notes: `Non-matching test itinerary ${i}`
    });
  }
  
  return itineraries;
}

async function seedDatabase() {
  console.log('🌱 Starting database seeding...');
  console.log('📋 Test User Itinerary Profile:');
  console.log(`   Destination: ${TEST_USER_ITINERARY.destination}`);
  console.log(`   Gender: ${TEST_USER_ITINERARY.gender}`);
  console.log(`   Status: ${TEST_USER_ITINERARY.status}`);
  console.log(`   Sexual Orientation: ${TEST_USER_ITINERARY.sexualOrientation}`);
  console.log(`   Dates: ${TEST_USER_ITINERARY.startDate.toDateString()} - ${TEST_USER_ITINERARY.endDate.toDateString()}`);
  console.log(`   Age Range: ${TEST_USER_ITINERARY.minAge}-${TEST_USER_ITINERARY.maxAge}`);
  console.log('');
  
  try {
    // Delete existing test itineraries
    console.log('🗑️  Cleaning up existing test data...');
    await prisma.itinerary.deleteMany({
      where: {
        OR: [
          { id: { startsWith: 'test-match-' } },
          { id: { startsWith: 'test-nomatch-' } }
        ]
      }
    });
    console.log('✅ Cleanup complete');
    console.log('');
    
    // Generate matching itineraries
    console.log('✨ Generating 50 matching itineraries...');
    const matchingItineraries = generateMatchingItineraries(50);
    
    // Generate non-matching itineraries
    console.log('✨ Generating 950 non-matching itineraries...');
    const nonMatchingItineraries = generateNonMatchingItineraries(950);
    
    // Combine all itineraries
    const allItineraries = [...matchingItineraries, ...nonMatchingItineraries];
    
    // Shuffle to mix matching and non-matching
    for (let i = allItineraries.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allItineraries[i], allItineraries[j]] = [allItineraries[j], allItineraries[i]];
    }
    
    // Insert in batches to avoid overwhelming the database
    console.log('💾 Inserting 1000 itineraries into database...');
    const batchSize = 100;
    for (let i = 0; i < allItineraries.length; i += batchSize) {
      const batch = allItineraries.slice(i, i + batchSize);
      await prisma.itinerary.createMany({
        data: batch,
        skipDuplicates: true
      });
      process.stdout.write(`   Progress: ${Math.min(i + batchSize, allItineraries.length)}/1000\r`);
    }
    console.log('');
    console.log('✅ Database seeded successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log(`   Total itineraries: 1000`);
    console.log(`   Matching (should appear in search): 50`);
    console.log(`   Non-matching (should be filtered out): 950`);
    console.log('');
    console.log('🧪 To test:');
    console.log(`   1. Create an itinerary with destination "${TEST_USER_ITINERARY.destination}"`);
    console.log(`   2. Search should return only the 50 matching itineraries`);
    console.log(`   3. Pagination should work in batches of 10`);
    
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedDatabase()
  .then(() => {
    console.log('');
    console.log('✨ Seeding complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
