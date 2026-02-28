/**
 * seedCampaignMetrics.ts
 *
 * Generates 30 days of realistic daily metric snapshots for a given campaign
 * and writes them to:
 *   ads_campaigns/{campaignId}/daily_metrics/{YYYY-MM-DD}
 *
 * Also updates the campaign root doc with summed lifetime counters:
 *   totalImpressions, totalClicks
 *
 * Usage (from voyager-pwa/functions/):
 *   npx ts-node scripts/seedCampaignMetrics.ts --campaignId=<id>
 *
 * Credentials — pick one:
 *   a) GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json  (recommended)
 *      e.g. GOOGLE_APPLICATION_CREDENTIALS=../../voyager-RN/mundo1-dev-firebase-adminsdk-fbsvc-bb26c2ec85.json
 *   b) FIREBASE_PROJECT=mundo1-dev  (uses whatever ADC is currently active)
 *
 * The functions/.env file is loaded automatically via dotenv.
 */

import admin from 'firebase-admin'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

dotenv.config()

const FIREBASE_PROJECT = process.env.FIREBASE_PROJECT ?? 'mundo1-dev'

if (!admin.apps.length) {
  // Prefer an explicit service account key if GOOGLE_APPLICATION_CREDENTIALS is
  // set, or fall back to the known dev key in the sibling voyager-RN directory.
  const envKeyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  const siblingKeyPath = path.resolve(
    __dirname,
    '../../../voyager-RN/mundo1-dev-firebase-adminsdk-fbsvc-bb26c2ec85.json'
  )

  if (envKeyPath && fs.existsSync(envKeyPath)) {
    admin.initializeApp({
      credential: admin.credential.cert(envKeyPath),
      projectId: FIREBASE_PROJECT,
    })
    console.log(`🔑  Using key file: ${envKeyPath}`)
  } else if (fs.existsSync(siblingKeyPath)) {
    admin.initializeApp({
      credential: admin.credential.cert(siblingKeyPath),
      projectId: FIREBASE_PROJECT,
    })
    console.log(`🔑  Using dev key: ${siblingKeyPath}`)
  } else {
    // Fall back to ADC — operator must ensure gcloud project matches
    admin.initializeApp({ projectId: FIREBASE_PROJECT })
    console.warn(
      `⚠️  No service account key found. Using ADC (project: ${FIREBASE_PROJECT}).\n` +
      `   If the campaign isn't found, set GOOGLE_APPLICATION_CREDENTIALS to the dev SA key.`
    )
  }
}

const db = admin.firestore()

// ── CLI argument parsing ─────────────────────────────────────────────────────

function getArg(name: string): string | undefined {
  const flag = `--${name}=`
  const found = process.argv.find(a => a.startsWith(flag))
  return found ? found.slice(flag.length) : undefined
}

const campaignId = getArg('campaignId')
if (!campaignId) {
  console.error('Error: --campaignId=<id> is required.')
  process.exit(1)
}

// ── Date helpers (no toISOString — avoids UTC timezone shift) ────────────────

function formatDateLocal(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + n)
  return d
}

// ── Realistic metric generators ──────────────────────────────────────────────

/**
 * Day-of-week multiplier: weekends are higher, Mon/Fri mid, Tue–Thu baseline.
 */
function dowMultiplier(date: Date): number {
  const dow = date.getDay() // 0=Sun, 6=Sat
  const multipliers = [1.25, 0.90, 0.95, 1.00, 1.05, 1.15, 1.30]
  return multipliers[dow]
}

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

interface DailySnapshot {
  date: string
  impressions: number
  clicks: number
  views?: number
  completions?: number
  spend: number
}

type Placement = 'video_feed' | 'itinerary_feed' | 'ai_slot'

function generateVideoFeedDay(date: Date): DailySnapshot {
  const mult = dowMultiplier(date)
  const impressions = Math.round(rand(2000, 8000) * mult)
  const ctr = rand(0.008, 0.015) // 0.8–1.5%
  const clicks = Math.round(impressions * ctr)
  const viewRate = rand(0.60, 0.75)
  const views = Math.round(impressions * viewRate)
  const completionRate = rand(0.35, 0.55)
  const completions = Math.round(views * completionRate)
  const cpm = rand(5, 9)                      // $5–9 CPM
  const spend = Math.round(impressions / 1000 * cpm * 100) / 100
  return {
    date: formatDateLocal(date),
    impressions,
    clicks,
    views,
    completions,
    spend,
  }
}

function generateFeedDay(date: Date): DailySnapshot {
  const mult = dowMultiplier(date)
  const impressions = Math.round(rand(500, 3000) * mult)
  const ctr = rand(0.003, 0.012) // 0.3–1.2%
  const clicks = Math.round(impressions * ctr)
  const cpm = rand(3, 7)
  const spend = Math.round(impressions / 1000 * cpm * 100) / 100
  return {
    date: formatDateLocal(date),
    impressions,
    clicks,
    spend,
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n📊  Seeding metrics for campaign: ${campaignId}\n`)

  // Read campaign to determine placement
  const campaignRef = db.collection('ads_campaigns').doc(campaignId!)
  const campaignSnap = await campaignRef.get()

  if (!campaignSnap.exists) {
    console.error(`Campaign "${campaignId}" not found in Firestore.`)
    process.exit(1)
  }

  const placement = (campaignSnap.data()?.placement ?? 'itinerary_feed') as Placement
  console.log(`Placement: ${placement}`)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = addDays(today, -29) // 30 days including today

  const snapshots: DailySnapshot[] = []
  for (let i = 0; i < 30; i++) {
    const day = addDays(startDate, i)
    const snapshot =
      placement === 'video_feed'
        ? generateVideoFeedDay(day)
        : generateFeedDay(day)
    snapshots.push(snapshot)
  }

  // Write in batches of 500 (Firestore limit)
  const BATCH_SIZE = 500
  let batch = db.batch()
  let opCount = 0

  let totalImpressions = 0
  let totalClicks = 0

  const metricsRef = campaignRef.collection('daily_metrics')

  for (const snapshot of snapshots) {
    batch.set(metricsRef.doc(snapshot.date), snapshot)
    totalImpressions += snapshot.impressions
    totalClicks += snapshot.clicks
    opCount++

    if (opCount >= BATCH_SIZE) {
      await batch.commit()
      console.log(`  Committed batch of ${opCount} documents`)
      batch = db.batch()
      opCount = 0
    }
  }

  // Write campaign lifetime counters in the same final batch
  batch.update(campaignRef, {
    totalImpressions: admin.firestore.FieldValue.increment(totalImpressions),
    totalClicks: admin.firestore.FieldValue.increment(totalClicks),
  })
  opCount++

  if (opCount > 0) {
    await batch.commit()
    console.log(`  Committed final batch of ${opCount} documents`)
  }

  console.log(`\n✅  Done!`)
  console.log(`   Daily metric docs written : ${snapshots.length}`)
  console.log(`   Total impressions added   : ${totalImpressions.toLocaleString()}`)
  console.log(`   Total clicks added        : ${totalClicks.toLocaleString()}`)
  console.log(
    `   Avg CTR                   : ${((totalClicks / totalImpressions) * 100).toFixed(2)}%`
  )
  console.log(`\nRun "npx ts-node scripts/seedCampaignMetrics.ts --campaignId=${campaignId}" again`)
  console.log(`to stack additional data (counters are incremented, docs overwritten).\n`)
}

main().catch(err => {
  console.error('Seed script failed:', err)
  process.exit(1)
})
