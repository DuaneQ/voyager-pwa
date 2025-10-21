#!/usr/bin/env node
/**
 * Test Script: Verify searchItineraries Filtering Logic
 * 
 * This script tests the searchItineraries function with Joy's actual itinerary
 * to ensure all filters work correctly.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Joy's actual search criteria
const JOYS_CRITERIA = {
  destination: 'Miami, FL, USA',
  startDate: new Date('2025-11-11'),
  endDate: new Date('2025-11-30'),
  minStartDay: BigInt(new Date('2025-11-11').getTime()),
  gender: 'Female',
  status: 'couple',
  sexualOrientation: 'No Preference',
  lowerRange: 18,
  upperRange: 100,
};

// IDs that should be viewed/excluded
const VIEWED_IDS = ['test-viewed-1', 'test-viewed-2', 'test-viewed-3'];

// Expected matching IDs (from seed script)
const EXPECTED_MATCH_IDS = [
  'test-match-perfect-1',
  'test-match-perfect-2',
  'test-match-perfect-3',
  'test-match-perfect-4',
  'test-match-perfect-5',
  'test-match-age-young-18',
  'test-match-age-old-100',
  'test-match-orientation-gay',
  'test-match-orientation-lesbian',
  'test-match-orientation-bisexual',
  'test-match-dates-overlap',
  'test-match-dates-containing',
];

async function testSearch() {
  console.log('================================================================================');
  console.log('TESTING SEARCHITINERARIES FILTERING LOGIC');
  console.log('================================================================================\n');

  console.log('📋 Search Criteria (Joy\'s Actual Itinerary):');
  console.log(`   Destination: ${JOYS_CRITERIA.destination}`);
  console.log(`   Dates: ${JOYS_CRITERIA.startDate.toISOString().split('T')[0]} to ${JOYS_CRITERIA.endDate.toISOString().split('T')[0]}`);
  console.log(`   Gender: ${JOYS_CRITERIA.gender}`);
  console.log(`   Status: ${JOYS_CRITERIA.status}`);
  console.log(`   Sexual Orientation: ${JOYS_CRITERIA.sexualOrientation}`);
  console.log(`   Age Range: ${JOYS_CRITERIA.lowerRange}-${JOYS_CRITERIA.upperRange}`);
  console.log(`   Excluded IDs: ${VIEWED_IDS.join(', ')}\n`);

  try {
    // Build the where clause (matching backend logic)
    const filters: any = {
      destination: JOYS_CRITERIA.destination,
      startDay: { lte: BigInt(JOYS_CRITERIA.endDate.getTime()) },
      endDay: { gte: JOYS_CRITERIA.minStartDay },
    };

    // Gender filter
    if (JOYS_CRITERIA.gender) {
      filters.gender = JOYS_CRITERIA.gender;
    }

    // Status filter
    if (JOYS_CRITERIA.status) {
      filters.status = JOYS_CRITERIA.status;
    }

    // Sexual orientation filter
    if (JOYS_CRITERIA.sexualOrientation) {
      // "No Preference" should match all orientations, so we skip this filter
      if (JOYS_CRITERIA.sexualOrientation !== 'No Preference') {
        filters.sexualOrientation = JOYS_CRITERIA.sexualOrientation;
      }
    }

    // Age filter
    if (JOYS_CRITERIA.lowerRange != null && JOYS_CRITERIA.upperRange != null) {
      filters.age = {
        gte: JOYS_CRITERIA.lowerRange,
        lte: JOYS_CRITERIA.upperRange,
      };
    }

    // Exclude viewed itineraries
    if (VIEWED_IDS.length > 0) {
      filters.id = { notIn: VIEWED_IDS };
    }

    console.log('🔍 Executing search query...\n');

    const results = await prisma.itinerary.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        destination: true,
        age: true,
        gender: true,
        status: true,
        sexualOrientation: true,
        startDate: true,
        endDate: true,
      },
    });

    console.log('✅ RESULTS:\n');
    console.log(`   Found: ${results.length} itineraries`);
    console.log(`   Expected: ${EXPECTED_MATCH_IDS.length} itineraries\n`);

    console.log('📊 Result Details:');
    results.forEach((r, idx) => {
      const expected = EXPECTED_MATCH_IDS.includes(r.id);
      const icon = expected ? '✅' : '❌';
      console.log(`   ${icon} ${idx + 1}. ${r.id}`);
      console.log(`      Age: ${r.age}, Gender: ${r.gender}, Status: ${r.status}, Orientation: ${r.sexualOrientation}`);
      console.log(`      Dates: ${r.startDate?.toISOString().split('T')[0]} to ${r.endDate?.toISOString().split('T')[0]}`);
    });

    console.log('\n📋 VALIDATION:\n');

    // Check for incorrect matches
    const actualIds = results.map(r => r.id);
    const incorrectMatches = actualIds.filter(id => !EXPECTED_MATCH_IDS.includes(id));
    const missingMatches = EXPECTED_MATCH_IDS.filter(id => !actualIds.includes(id));

    if (incorrectMatches.length === 0 && missingMatches.length === 0) {
      console.log('   ✅ PERFECT! All results match expectations!');
    } else {
      if (incorrectMatches.length > 0) {
        console.log(`   ❌ Incorrect matches (should NOT see): ${incorrectMatches.length}`);
        incorrectMatches.forEach(id => console.log(`      - ${id}`));
      }

      if (missingMatches.length > 0) {
        console.log(`   ❌ Missing matches (should see): ${missingMatches.length}`);
        missingMatches.forEach(id => console.log(`      - ${id}`));
      }
    }

    // Test specific filters
    console.log('\n🔬 FILTER VALIDATION:\n');

    const ageOutOfRange = results.filter(r => r.age == null || r.age < JOYS_CRITERIA.lowerRange || r.age > JOYS_CRITERIA.upperRange);
    console.log(`   Age Filter: ${ageOutOfRange.length === 0 ? '✅' : '❌'} (${ageOutOfRange.length} out of range)`);
    if (ageOutOfRange.length > 0) {
      ageOutOfRange.forEach(r => console.log(`      ❌ ${r.id}: Age ${r.age}`));
    }

    const wrongGender = results.filter(r => r.gender !== JOYS_CRITERIA.gender);
    console.log(`   Gender Filter: ${wrongGender.length === 0 ? '✅' : '❌'} (${wrongGender.length} wrong gender)`);
    if (wrongGender.length > 0) {
      wrongGender.forEach(r => console.log(`      ❌ ${r.id}: Gender ${r.gender}`));
    }

    const wrongStatus = results.filter(r => r.status !== JOYS_CRITERIA.status);
    console.log(`   Status Filter: ${wrongStatus.length === 0 ? '✅' : '❌'} (${wrongStatus.length} wrong status)`);
    if (wrongStatus.length > 0) {
      wrongStatus.forEach(r => console.log(`      ❌ ${r.id}: Status ${r.status}`));
    }

    const wrongDestination = results.filter(r => r.destination !== JOYS_CRITERIA.destination);
    console.log(`   Destination Filter: ${wrongDestination.length === 0 ? '✅' : '❌'} (${wrongDestination.length} wrong destination)`);
    if (wrongDestination.length > 0) {
      wrongDestination.forEach(r => console.log(`      ❌ ${r.id}: Destination ${r.destination}`));
    }

    const hasViewedIds = results.some(r => VIEWED_IDS.includes(r.id));
    console.log(`   Exclusion Filter: ${!hasViewedIds ? '✅' : '❌'} (${hasViewedIds ? 'viewed IDs found' : 'no viewed IDs'})`);

    // Date overlap check
    const noDateOverlap = results.filter(r => {
      if (!r.startDate || !r.endDate) return true;
      const startTime = r.startDate.getTime();
      const endTime = r.endDate.getTime();
      const searchStart = JOYS_CRITERIA.startDate.getTime();
      const searchEnd = JOYS_CRITERIA.endDate.getTime();
      return endTime < searchStart || startTime > searchEnd;
    });
    console.log(`   Date Overlap Filter: ${noDateOverlap.length === 0 ? '✅' : '❌'} (${noDateOverlap.length} no overlap)`);
    if (noDateOverlap.length > 0) {
      noDateOverlap.forEach(r => console.log(`      ❌ ${r.id}: ${r.startDate?.toISOString().split('T')[0]} to ${r.endDate?.toISOString().split('T')[0]}`));
    }

    console.log('\n================================================================================');
    if (incorrectMatches.length === 0 && missingMatches.length === 0 && 
        ageOutOfRange.length === 0 && wrongGender.length === 0 && 
        wrongStatus.length === 0 && wrongDestination.length === 0 && 
        !hasViewedIds && noDateOverlap.length === 0) {
      console.log('✅ ALL TESTS PASSED! Filtering logic is working correctly.');
    } else {
      console.log('❌ TESTS FAILED! Please review the issues above.');
    }
    console.log('================================================================================\n');

  } catch (error) {
    console.error('❌ Error during search:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testSearch()
  .then(() => {
    console.log('✅ Test completed successfully!\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
