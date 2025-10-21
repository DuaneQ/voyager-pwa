/**
 * Dev seed script for Cloud SQL (Prisma)
 *
 * Purpose: Insert two itineraries into the `itineraries` table that will match each other
 * by destination, overlapping date ranges, and compatible age/gender/status so you can
 * test matching and liking flows.
 *
 * Usage (local):
 *  - Ensure you have DATABASE_URL pointing to your Cloud SQL/Postgres instance (use Cloud SQL Auth Proxy if necessary)
 *  - From repository root run: `cd functions && npx ts-node scripts/seedItineraries.ts`
 *
 * Notes:
 *  - This script uses the functions/src/db/prismaClient.ts proxy which lazily initializes Prisma.
 *  - It will upsert itineraries by id to make reruns idempotent.
 *  - It does NOT run automatically in CI or on deploy. Run manually with credentials you control.
 */

import prisma from '../src/db/prismaClient';

// Two user IDs provided by you
const OWNER_UID = 'QtWLY9o8uBemzPxr1pq165KzEM92';
const MATCH_UID = 'OPoJ6tPN3DaCAXxCmXwGFjOF7SI3';

async function toEpochMs(dateStr: string) {
  return new Date(dateStr).getTime();
}

async function upsertItineraries() {
  // Shared date window that guarantees overlap
  const startDate = new Date('2035-09-01T00:00:00Z');
  const endDate = new Date('2035-09-07T23:59:59Z');

  const ownerItinerary = {
    id: 'seed-ai-itinerary-owner-QtWLY9o8',
    userId: OWNER_UID,
    destination: 'Rome',
    title: 'Seeded AI Itinerary - Owner',
    description: 'Demo itinerary for owner user (seeded)',
    startDate: startDate,
    endDate: endDate,
    // Keep epoch ms/bigint for fast filtering in DB
    startDay: BigInt((await toEpochMs('2035-09-01T00:00:00Z'))),
    endDay: BigInt((await toEpochMs('2035-09-07T23:59:59Z'))),
    lowerRange: 25,
    upperRange: 40,
    gender: 'Female',
    sexualOrientation: 'heterosexual',
    status: 'single',
    activities: ['Museums', 'Dining'],
    likes: [],
    userInfo: { uid: OWNER_UID, username: 'DemoOwner', email: 'demoowner@example.com', dob: '1992-06-15' },
    ai_status: 'completed',
    // Rich AI payload under response.data (matches server & UI expectations)
    response: {
      data: {
        itinerary: {
          id: 'seed-ai-itinerary-owner-QtWLY9o8',
          destination: 'Rome',
          title: 'Rome in a week',
          startDate: '2035-09-01',
          endDate: '2035-09-07',
          days: [
            { date: '2035-09-01', day: 1, activities: [{ name: 'Colosseum tour', startTime: '10:00', endTime: '12:00' }], meals: [{ name: 'Trattoria da Enzo', time: '19:00' }] },
            { date: '2035-09-02', day: 2, activities: [{ name: 'Vatican Museums', startTime: '09:00', endTime: '13:00' }], meals: [{ name: 'Pizzeria Baffetto', time: '20:00' }] },
            { date: '2035-09-03', day: 3, activities: [{ name: 'Borghese Gallery', startTime: '11:00', endTime: '14:00' }], meals: [{ name: "Osteria dell'Orto", time: '19:30' }] },
            { date: '2035-09-04', day: 4, activities: [{ name: 'Trastevere walk & food tour', startTime: '10:00', endTime: '15:00' }], meals: [{ name: 'Local food crawl', time: '18:30' }] },
            { date: '2035-09-05', day: 5, activities: [{ name: "Day trip to Tivoli (Villa d'Este)", startTime: '09:00', endTime: '17:00' }], meals: [{ name: 'Country trattoria', time: '19:00' }] },
            { date: '2035-09-06', day: 6, activities: [{ name: 'Shopping on Via del Corso', startTime: '10:00', endTime: '16:00' }], meals: [{ name: 'Enoteca special', time: '20:00' }] },
            { date: '2035-09-07', day: 7, activities: [{ name: 'Relax at Villa Borghese', startTime: '10:00', endTime: '14:00' }], meals: [{ name: 'Farewell dinner', time: '20:00' }] }
          ],
          flights: [
            { id: 'f-1', airline: 'ITA Airways', departure: 'JFK', arrival: 'FCO', departTime: '2035-09-01T06:00:00Z', arriveTime: '2035-09-01T18:00:00Z', price: { amount: 850, currency: 'USD' } }
          ],
          accommodations: [
            { id: 'h-1', name: 'Hotel Artemide', address: 'Via Nazionale 22, Rome', rating: 4.6, pricePerNight: { amount: 220, currency: 'USD' } }
          ],
          costBreakdown: { total: 2200, currency: 'USD', perPerson: 1100 }
        },
        recommendations: {
          flights: [],
          accommodations: [],
          alternativeActivities: []
        },
        metadata: { filtering: { budget: 'mid', preferredActivities: ['Museums', 'Food'] } },
        success: true
      }
    },
    metadata: { filtering: { budget: 'mid', preferredActivities: ['Museums', 'Food'] } }
  } as any;

  const matchItinerary = {
    id: 'seed-ai-itinerary-match-OPoJ6tPN3',
    userId: MATCH_UID,
    destination: 'Rome',
    title: 'Seeded AI Itinerary - Match',
    description: 'Demo itinerary for matching user (seeded)',
    startDate: startDate,
    endDate: endDate,
    startDay: BigInt((await toEpochMs('2035-09-02T00:00:00Z'))),
    endDay: BigInt((await toEpochMs('2035-09-06T23:59:59Z'))),
    lowerRange: 25,
    upperRange: 35,
    gender: 'Female',
    sexualOrientation: 'heterosexual',
    status: 'single',
    activities: ['Museums', 'Shopping'],
    likes: [],
    userInfo: { uid: MATCH_UID, username: 'DemoMatch', email: 'demomatch@example.com', dob: '1993-03-22' },
    ai_status: 'completed',
    response: {
      data: {
        itinerary: {
          id: 'seed-ai-itinerary-match-OPoJ6tPN3',
          destination: 'Rome',
          title: 'Short Rome highlights',
          startDate: '2035-09-02',
          endDate: '2035-09-06',
          days: [
            { date: '2035-09-02', day: 1, activities: [{ name: 'Vatican quick visit', startTime: '09:00', endTime: '12:00' }], meals: [{ name: 'Lunch near St. Peter', time: '13:00' }] },
            { date: '2035-09-03', day: 2, activities: [{ name: 'Colosseum and Roman Forum', startTime: '10:00', endTime: '14:00' }], meals: [{ name: 'Pasta tasting', time: '19:00' }] },
            { date: '2035-09-04', day: 3, activities: [{ name: 'Trastevere evening', startTime: '17:00', endTime: '22:00' }], meals: [{ name: 'Street food crawl', time: '20:00' }] },
            { date: '2035-09-05', day: 4, activities: [{ name: 'Borghese afternoon', startTime: '11:00', endTime: '15:00' }], meals: [{ name: 'Wine bar', time: '21:00' }] }
          ],
          flights: [],
          accommodations: [ { id: 'h-2', name: 'Hotel Santa Maria', address: 'Piazza di Santa Maria, Rome', rating: 4.4, pricePerNight: { amount: 180, currency: 'USD' } } ],
          costBreakdown: { total: 900, currency: 'USD', perPerson: 450 }
        },
        recommendations: {},
        metadata: { filtering: { budget: 'mid', preferredActivities: ['Museums', 'Shopping'] } },
        success: true
      }
    },
    metadata: { filtering: { budget: 'mid', preferredActivities: ['Museums', 'Shopping'] } }
  } as any;

  console.log('Upserting seeded itineraries...');

  // Use prisma proxy; methods are async and will initialize the real client.
  // We'll use upsert to be idempotent.
  await (prisma as any).itinerary.upsert({
    where: { id: ownerItinerary.id },
    update: ownerItinerary,
    create: ownerItinerary
  });

  await (prisma as any).itinerary.upsert({
    where: { id: matchItinerary.id },
    update: matchItinerary,
    create: matchItinerary
  });

  console.log('Seed complete.');
}

upsertItineraries().then(() => process.exit(0)).catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
