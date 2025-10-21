/* eslint-disable no-console */
/**
 * Simple migration script: Firestore -> Postgres (Prisma)
 * Usage:

    sexualOrientation: firestoreDoc.sexualOrientation || null,
    status: firestoreDoc.status || null,
  };
}

/* eslint-disable no-console */
import admin from 'firebase-admin';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const BATCH_SIZE = 200;
const PROGRESS_FILE = path.resolve(__dirname, './migrate-progress.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}
const firestore = admin.firestore();
const prisma = new PrismaClient();

function loadProgress(): { lastId?: string } {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8')); } catch (e) { return {}; }
}
function saveProgress(progress: { lastId?: string }) { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2)); }

function convertToDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value?.toDate && typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value); return isNaN(d.getTime()) ? null : d;
  }
  return null;
}
function safeBigInt(v: any): bigint | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'bigint') return v;
  if (typeof v === 'number') return BigInt(Math.trunc(v));
  if (typeof v === 'string' && /^-?\d+$/.test(v)) return BigInt(v);
  return null;
}

function transformDoc(id: string, data: FirebaseFirestore.DocumentData): any {
  const startDate = convertToDate(data.startDate ?? data.start_date ?? null);
  const endDate = convertToDate(data.endDate ?? data.end_date ?? null);
  const startDay = safeBigInt(data.startDay ?? data.start_day ?? (startDate ? startDate.getTime() : null));
  const endDay = safeBigInt(data.endDay ?? data.end_day ?? (endDate ? endDate.getTime() : null));
  return {
    id,
    userId: data.userId ?? data.uid ?? null,
    destination: data.destination ?? null,
    title: data.title ?? null,
    description: data.description ?? null,
    startDate: startDate ?? null,
    endDate: endDate ?? null,
    startDay,
    endDay,
    lowerRange: data.lowerRange ?? data.lower_range ?? null,
    upperRange: data.upperRange ?? data.upper_range ?? null,
    gender: data.gender ?? null,
    sexualOrientation: data.sexualOrientation ?? null,
    status: data.status ?? null,
    age: data.age ?? null,
    likes: data.likes ?? null,
    activities: data.activities ?? null,
    userInfo: data.userInfo ?? data.user_info ?? null,
    response: data.response ?? null,
    metadata: (data.response && data.response.data && data.response.data.metadata) ? data.response.data.metadata : data.metadata ?? null,
    externalData: data.externalData ?? null,
    recommendations: data.recommendations ?? null,
    costBreakdown: data.costBreakdown ?? null,
    dailyPlans: data.dailyPlans ?? null,
    days: data.days ?? null,
    flights: data.flights ?? null,
    accommodations: data.accommodations ?? null,
    ai_status: data.ai_status ?? null,
    createdAt: convertToDate(data.createdAt ?? data.created_at ?? null) ?? undefined,
    updatedAt: convertToDate(data.updatedAt ?? data.updated_at ?? null) ?? undefined,
  };
}

async function migrate(resumeFromId?: string, dryRun = false) {
  const progress = loadProgress();
  let lastId = resumeFromId ?? progress.lastId;
  console.log('Starting migration. Resuming after:', lastId ?? '<start>');
  while (true) {
    let q: FirebaseFirestore.Query = firestore.collection('itineraries')
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(BATCH_SIZE);
    if (lastId) q = q.startAfter(lastId);
    const snap = await q.get();
    if (snap.empty) break;
    console.log(`Processing batch of ${snap.size} docs...`);
    for (const doc of snap.docs) {
      const converted = transformDoc(doc.id, doc.data());
      if (dryRun) { console.log('DRY:', converted.id); lastId = doc.id; continue; }
      try {
        await prisma.itinerary.upsert({ where: { id: converted.id }, create: converted, update: converted });
        lastId = doc.id;
      } catch (err) { console.error('Upsert failed for', doc.id, err); }
    }
    saveProgress({ lastId });
    console.log('Saved progress. lastId=', lastId);
    await new Promise((r) => setTimeout(r, 100));
  }
  console.log('Migration finished. Disconnecting Prisma.');
  await prisma.$disconnect();
}

const args = process.argv.slice(2);
const resumeArg = args.find(a => a.startsWith('--resume-from='));
const dryRun = args.includes('--dry-run');
const resumeFrom = resumeArg ? resumeArg.split('=')[1] : undefined;
migrate(resumeFrom, dryRun).then(() => process.exit(0)).catch((e) => { console.error('Migration failed:', e); process.exit(1); });
