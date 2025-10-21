/**
 * Seed script to create 100 itineraries for performance / filtering tests.
 * - 50 itineraries with endDay in the past
 * - 50 itineraries with endDay in the future
 *
 * Usage (from functions/):
 *  - Ensure DATABASE_URL is set (Cloud SQL Auth Proxy if needed)
 *  - npx ts-node scripts/seedManyItineraries.ts
 */

import prisma from '../src/db/prismaClient';

const OWNER_UID = 'QtWLY9o8uBemzPxr1pq165KzEM92';
const MATCH_UID = 'OPoJ6tPN3DaCAXxCmXwGFjOF7SI3';

// Small helpers to generate simple flight / accommodation examples
function diToFlights(index: number, startDate: Date) {
  // Alternate between having a flight or not to diversify data
  if (index % 3 === 0) {
    const depart = new Date(startDate);
    depart.setUTCHours(6, 0, 0, 0);
    const arrive = new Date(startDate);
    arrive.setUTCHours(18, 0, 0, 0);
    return [{ id: `f-${index}`, airline: index % 2 === 0 ? 'ITA Airways' : 'Delta', departure: 'JFK', arrival: 'FCO', departTime: depart.toISOString(), arriveTime: arrive.toISOString(), price: { amount: 600 + (index % 5) * 50, currency: 'USD' } }];
  }
  return [];
}

function diToAccommodations(index: number) {
  // Provide one hotel recommendation with variable price
  return [{ id: `h-${index}`, name: index % 2 === 0 ? 'Hotel Artemide' : 'Hotel Santa Maria', address: 'Central Rome', rating: 4.3 + (index % 3) * 0.1, pricePerNight: { amount: 120 + (index % 6) * 20, currency: 'USD' } }];

}

function daysFromNow(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

async function seed() {
  console.log('Seeding 100 itineraries (50 past, 50 future)...');

  const tasks: Promise<any>[] = [];

  for (let i = 0; i < 100; i++) {
    const isFuture = i >= 50; // first 50 past, next 50 future
    const owner = i % 2 === 0 ? OWNER_UID : MATCH_UID; // alternate users

    // spread dates: past items end between -60 and -1 days; future items end between +1 and +60 days
    const offset = isFuture ? (1 + (i - 50) % 60) : (-60 + (i % 60));
    const start = daysFromNow(offset - 4); // 5-day trips
    const end = daysFromNow(offset);

    const id = `seed-many-itinerary-${i}-${isFuture ? 'future' : 'past'}`;

    // Build a more realistic AI payload for future itineraries so UI can render
    const daysCount = 5;
    const isoStart = start.toISOString().split('T')[0];
    const isoEnd = end.toISOString().split('T')[0];

    const generatedDays = Array.from({ length: daysCount }).map((_, di) => {
      const d = new Date(start);
      d.setUTCDate(d.getUTCDate() + di);
      return {
        date: d.toISOString().split('T')[0],
        day: di + 1,
        activities: [{ name: `Sightseeing and local highlights (day ${di + 1})`, startTime: '10:00', endTime: '16:00' }],
        meals: [{ name: `Local dinner ${di + 1}`, time: '19:00' }]
      };
    });

    const futureResponse = isFuture ? {
      data: {
        itinerary: {
          id,
          destination: 'Rome',
          title: `Seeded AI Rome ${i}`,
          startDate: isoStart,
          endDate: isoEnd,
          days: generatedDays,
          flights: diToFlights(i, start),
          accommodations: diToAccommodations(i),
          costBreakdown: { total: 500 + (i % 5) * 50, currency: 'USD', perPerson: Math.round((500 + (i % 5) * 50) / 2) }
        },
        recommendations: {
          accommodations: [{ id: 'rec-h-1', name: 'Sample Hotel', pricePerNight: { amount: 150, currency: 'USD' } }],
          alternativeActivities: [{ name: 'Cooking class' }]
        },
        metadata: { filtering: { budget: 'mid', preferredActivities: ['Sightseeing'] } },
        success: true
      }
    } : { data: { success: true } };

    const item: any = {
      id,
      userId: owner,
      destination: 'Rome',
      title: `Seed Many ${i}`,
      description: `Seeded itinerary ${i} (${isFuture ? 'future' : 'past'})`,
      startDate: start,
      endDate: end,
      startDay: BigInt(start.getTime()),
      endDay: BigInt(end.getTime()),
      lowerRange: 20,
      upperRange: 50,
      gender: 'Female',
      sexualOrientation: 'heterosexual',
      status: 'single',
      activities: ['Sightseeing'],
      likes: [],
      userInfo: { uid: owner, username: owner === OWNER_UID ? 'DemoOwner' : 'DemoMatch' },
      ai_status: isFuture ? 'completed' : 'archived',
      response: isFuture ? futureResponse : { data: { success: true } },
      metadata: { filtering: { budget: 'mid' } }
    };

    tasks.push((prisma as any).itinerary.upsert({
      where: { id },
      update: item,
      create: item
    }));
  }

  await Promise.all(tasks);
  console.log('Seeding complete.');
}

seed().then(() => process.exit(0)).catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
