/**
 * Fix script: find any itineraries with id starting 'bulk-past-' that still
 * have endDay >= now and move their endDate/endDay to at least 2 days ago.
 *
 * Usage:
 * cd functions
 * npx ts-node scripts/fixBulkPastEndDays.ts
 */

import prisma from '../src/db/prismaClient';

async function fix() {
  console.log('Fixing bulk-past items with endDay >= now');
  const now = Date.now();
  const offending = await (prisma as any).itinerary.findMany({ where: { id: { startsWith: 'bulk-past-' }, AND: [{ endDay: { gte: BigInt(now) } }] }, select: { id: true, endDay: true } });
  console.log('Found', offending.length, 'offending items');
  if (offending.length === 0) return process.exit(0);

  let idx = 0;
  for (const o of offending) {
    // place them at least 2 days ago, spaced by 1 second so endDay differs
    const newEnd = Date.now() - (2 * 24 * 60 * 60 * 1000) - (idx * 1000);
    const newStart = newEnd - (4 * 24 * 60 * 60 * 1000); // 5-day trip
    const update = {
      endDate: new Date(newEnd),
      startDate: new Date(newStart),
      endDay: BigInt(newEnd),
      startDay: BigInt(newStart),
      metadata: { ...o.metadata, fixedBy: 'fixBulkPastEndDays' }
    };
    await (prisma as any).itinerary.update({ where: { id: o.id }, data: update });
    idx++;
  }

  console.log('Updated', idx, 'records');
}

fix().then(() => process.exit(0)).catch((err) => { console.error('Failed:', err); process.exit(1); });
