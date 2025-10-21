/**
 * Ensure there are exactly 100 itineraries across the two test users.
 * - If there are fewer than 100, upsert additional itineraries until 100.
 * - New items alternate owners and are split evenly between past and future
 *   so the server-side filter (endDay >= now) can be tested.
 *
 * Usage:
 * cd functions
 * npx ts-node scripts/ensure100Itineraries.ts
 */

import prisma from '../src/db/prismaClient';

const USERS = [
  'QtWLY9o8uBemzPxr1pq165KzEM92',
  'OPoJ6tPN3DaCAXxCmXwGFjOF7SI3'
];

function daysFromNow(days: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  d.setUTCHours(0,0,0,0);
  return d;
}

async function ensure100() {
  console.log('Ensuring 100 itineraries across users:', USERS);

  const existing = await (prisma as any).itinerary.findMany({ where: { userId: { in: USERS } }, select: { id: true } });
  const existingCount = existing.length;
  console.log('Existing count for target users:', existingCount);

  if (existingCount >= 100) {
    console.log('Already have 100 or more itineraries. No action taken.');
    return;
  }

  const needed = 100 - existingCount;
  console.log('Need to create', needed, 'more itineraries');

  const tasks: Promise<any>[] = [];
  // We'll create half of these as future and half as past (floor/ceil split)
  const futureCount = Math.ceil(needed / 2);
  const pastCount = Math.floor(needed / 2);

  let idx = 0;
  // create future itineraries (endDay >= now + 1 day)
  for (let i = 0; i < futureCount; i++, idx++) {
    const owner = USERS[idx % USERS.length];
    const start = daysFromNow(1 + (i % 60));
    const end = daysFromNow(1 + (i % 60) + 4); // 5-day trip
    const id = `ensure-100-${owner}-${i}-future`;
    const item: any = {
      id,
      userId: owner,
      destination: 'Test City',
      title: `Ensure 100 ${i} future`,
      description: `Auto-generated future itinerary ${i}`,
      startDate: start,
      endDate: end,
      startDay: BigInt(start.getTime()),
      endDay: BigInt(end.getTime()),
      lowerRange: 18,
      upperRange: 80,
      gender: 'No Preference',
      sexualOrientation: 'No Preference',
      status: 'No Preference',
      activities: ['sightseeing'],
      likes: [],
      userInfo: { uid: owner, username: owner === USERS[0] ? 'DemoOwner' : 'DemoMatch' },
      ai_status: 'completed',
      response: { data: { itinerary: { id, destination: 'Test City', startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0], days: [] } } },
      metadata: { seededBy: 'ensure100' }
    };
    tasks.push((prisma as any).itinerary.upsert({ where: { id }, create: item, update: item }));
  }

  // create past itineraries (endDay < now - 1 day)
  for (let i = 0; i < pastCount; i++, idx++) {
    const owner = USERS[idx % USERS.length];
    const start = daysFromNow(-30 - (i % 60));
    const end = daysFromNow(-26 - (i % 60)); // 5-day trip in past
    const id = `ensure-100-${owner}-${i}-past`;
    const item: any = {
      id,
      userId: owner,
      destination: 'Past City',
      title: `Ensure 100 ${i} past`,
      description: `Auto-generated past itinerary ${i}`,
      startDate: start,
      endDate: end,
      startDay: BigInt(start.getTime()),
      endDay: BigInt(end.getTime()),
      lowerRange: 18,
      upperRange: 80,
      gender: 'No Preference',
      sexualOrientation: 'No Preference',
      status: 'No Preference',
      activities: ['old sights'],
      likes: [],
      userInfo: { uid: owner, username: owner === USERS[0] ? 'DemoOwner' : 'DemoMatch' },
      ai_status: '',
      metadata: { seededBy: 'ensure100' }
    };
    tasks.push((prisma as any).itinerary.upsert({ where: { id }, create: item, update: item }));
  }

  await Promise.all(tasks);
  console.log('Created', needed, 'itineraries (future:', futureCount, 'past:', pastCount, ')');

  const finalCount = await (prisma as any).itinerary.count({ where: { userId: { in: USERS } } });
  console.log('Final count for target users:', finalCount);
}

ensure100().then(() => process.exit(0)).catch((err) => { console.error('Failed:', err); process.exit(1); });
