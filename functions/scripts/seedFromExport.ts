/**
 * Seed script: import two exported itineraries and add past itineraries for testing
 * - Upserts the provided exported rows (parses string fields)
 * - Adds one explicit past itinerary per user (endDay < now) so listItinerariesForUser filtering can be tested
 *
 * Usage:
 * cd functions
 * npx ts-node scripts/seedFromExport.ts
 */

import prisma from '../src/db/prismaClient';

type RawRow = Record<string, any>;

const exported: RawRow[] = [
  {
    id: '450086b6-e8d4-4499-9112-deb30d9afacd',
    userId: 'OPoJ6tPN3DaCAXxCmXwGFjOF7SI3',
    destination: 'Paris, France',
    title: '',
    description: 'manual itinerary',
    startDate: '2025-11-20T00:00:00Z',
    endDate: '2025-11-29T00:00:00Z',
    startDay: '1763640000000',
    endDay: '1764417600000',
    lowerRange: '18',
    upperRange: '100',
    gender: 'No Preference',
    sexualOrientation: 'No Preference',
    status: 'No Preference',
    likes: '[]',
    activities: '["ski", "love", "eat"]',
    userInfo: '{"dob": "1998-07-09", "uid": "OPoJ6tPN3DaCAXxCmXwGFjOF7SI3", "email": "quan.hodges@gmail.com", "gender": "Male", "status": "single", "blocked": [], "username": "Joy", "sexualOrientation": "heterosexual"}',
    response: '',
    metadata: '',
  },
  {
    id: 'gen_1760746671183_z2mkmgt35',
    userId: 'OPoJ6tPN3DaCAXxCmXwGFjOF7SI3',
    destination: 'London, UK',
    title: '',
    description: 'AI-generated 7-day itinerary for London, UK. Experience The British Museum, The National Gallery, Tate Britain and 4 more. Dine at Aladin Brick Lane, Govinda\'s Soho Street and 5 more.',
    startDate: '2025-10-24T00:00:00Z',
    endDate: '2025-10-31T00:00:00Z',
    startDay: '1761264000000',
    endDay: '1761868800000',
    lowerRange: '18',
    upperRange: '110',
    gender: 'No Preference',
    sexualOrientation: 'No Preference',
    status: 'No Preference',
    likes: '[]',
    activities: JSON.stringify(["The British Museum", "museum", "Aladin Brick Lane", "The National Gallery"]),
    userInfo: JSON.stringify({ dob: '1998-07-09', uid: 'OPoJ6tPN3DaCAXxCmXwGFjOF7SI3', email: 'quan.hodges@gmail.com', gender: 'Male', status: 'single', blocked: [], username: 'Joy', sexualOrientation: 'heterosexual' }),
    response: '',
    metadata: '',
  }
];

function parseMaybeJson(value: any) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (_) {
    return value;
  }
}

async function upsertExported() {
  console.log('Upserting exported itineraries...');

  for (const row of exported) {
    const startDate = row.startDate ? new Date(row.startDate) : null;
    const endDate = row.endDate ? new Date(row.endDate) : null;
    const startDay = row.startDay ? BigInt(String(row.startDay)) : null;
    const endDay = row.endDay ? BigInt(String(row.endDay)) : null;

    const likes = parseMaybeJson(row.likes) || [];
    const activities = parseMaybeJson(row.activities) || [];
    const userInfo = parseMaybeJson(row.userInfo) || { uid: row.userId };
    const response = parseMaybeJson(row.response) || null;
    const metadata = parseMaybeJson(row.metadata) || null;

    const payload: any = {
      id: row.id,
      userId: row.userId,
      destination: row.destination,
      title: row.title || undefined,
      description: row.description || undefined,
      startDate: startDate,
      endDate: endDate,
      startDay: startDay,
      endDay: endDay,
      lowerRange: row.lowerRange ? Number(row.lowerRange) : undefined,
      upperRange: row.upperRange ? Number(row.upperRange) : undefined,
      gender: row.gender || undefined,
      sexualOrientation: row.sexualOrientation || undefined,
      status: row.status || undefined,
      likes,
      activities,
      userInfo,
      response: response ? { data: response } : undefined,
      metadata,
    };

    await (prisma as any).itinerary.upsert({ where: { id: row.id }, update: payload, create: payload });
    console.log('Upserted', row.id);
  }

  // Add explicit past itineraries for both users (endDay < now)
  const now = Date.now();
  const pastEnd = new Date(now - 1000 * 60 * 60 * 24 * 30); // 30 days ago
  const pastStart = new Date(pastEnd.getTime() - 1000 * 60 * 60 * 24 * 5);

  const pastItems = [
    {
      id: 'past-itin-op-1',
      userId: 'OPoJ6tPN3DaCAXxCmXwGFjOF7SI3',
      destination: 'Pastville',
      title: 'Past trip (should be filtered out)',
      description: 'This itinerary ended 30 days ago and should NOT be returned by listItinerariesForUser',
      startDate: pastStart,
      endDate: pastEnd,
      startDay: BigInt(pastStart.getTime()),
      endDay: BigInt(pastEnd.getTime()),
      lowerRange: 18,
      upperRange: 99,
      activities: ['Past activities'],
      likes: [],
      userInfo: { uid: 'OPoJ6tPN3DaCAXxCmXwGFjOF7SI3', username: 'Joy' },
      ai_status: '',
    },
    {
      id: 'past-itin-qt-1',
      userId: 'QtWLY9o8uBemzPxr1pq165KzEM92',
      destination: 'Oldtown',
      title: 'Old trip (should be filtered out)',
      description: 'Ended in the past',
      startDate: pastStart,
      endDate: pastEnd,
      startDay: BigInt(pastStart.getTime()),
      endDay: BigInt(pastEnd.getTime()),
      lowerRange: 18,
      upperRange: 99,
      activities: ['Old activities'],
      likes: [],
      userInfo: { uid: 'QtWLY9o8uBemzPxr1pq165KzEM92', username: 'DemoOwner' },
      ai_status: '',
    }
  ];

  for (const p of pastItems) {
    await (prisma as any).itinerary.upsert({ where: { id: p.id }, update: p, create: p });
    console.log('Upserted past item', p.id);
  }

  console.log('Seed from export complete.');
}

upsertExported()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
