/**
 * Seed script to create 1000 past itineraries across the two test users.
 * - All generated itineraries will have endDay < now so they should NOT be
 *   returned by the server filter that requires endDay >= now.
 *
 * Usage:
 * cd functions
 * npx ts-node scripts/seed1000PastItineraries.ts
 */

import prisma from '../src/db/prismaClient';

const USERS = [
  'QtWLY9o8uBemzPxr1pq165KzEM92',
  'OPoJ6tPN3DaCAXxCmXwGFjOF7SI3'
];

function daysFromNow(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

async function seed() {
  console.log('Seeding 1000 past itineraries across users:', USERS);

  const total = 1000;
  const tasks: Promise<any>[] = [];

  for (let i = 0; i < total; i++) {
    const owner = USERS[i % USERS.length];

    // Spread past dates between -365 and -1 days from now to ensure they're
    // well in the past and won't show up in endDay >= now queries.
    const daysAgo = 1 + (i % 365);
    const start = daysFromNow(-daysAgo - 4); // 5-day trip
    const end = daysFromNow(-daysAgo);

    const id = `bulk-past-${owner}-${i}`;

    const item: any = {
      id,
      userId: owner,
      destination: 'Past Bulk City',
      title: `Bulk Past Itinerary ${i}`,
      description: `Auto-generated bulk past itinerary ${i}`,
      startDate: start,
      endDate: end,
      startDay: BigInt(start.getTime()),
      endDay: BigInt(end.getTime()),
      lowerRange: 18,
      upperRange: 80,
      gender: 'No Preference',
      sexualOrientation: 'No Preference',
      status: 'No Preference',
      activities: ['historic sites'],
      likes: [],
      userInfo: { uid: owner, username: owner === USERS[0] ? 'DemoOwner' : 'DemoMatch' },
      ai_status: '',
      metadata: { seededBy: 'seed1000BulkPast' }
    };

    tasks.push((prisma as any).itinerary.upsert({ where: { id }, create: item, update: item }));
  }

  // Batch the upserts in groups to avoid overwhelming the DB in a single call
  const batchSize = 200;
  for (let b = 0; b < tasks.length; b += batchSize) {
    const batch = tasks.slice(b, b + batchSize);
    console.log(`Running batch ${b / batchSize + 1} / ${Math.ceil(tasks.length / batchSize)}`);
    await Promise.all(batch);
  }

  console.log('Seeding of 1000 past itineraries complete.');

  const finalCounts = await (prisma as any).itinerary.count({ where: { userId: { in: USERS } } });
  console.log('Total itineraries for target users now:', finalCounts);
}

seed().then(() => process.exit(0)).catch((err) => { console.error('Failed:', err); process.exit(1); });
