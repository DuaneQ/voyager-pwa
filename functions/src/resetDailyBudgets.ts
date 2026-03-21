/**
 * resetDailyBudgets — Scheduled Cloud Function
 *
 * Runs every day at 00:05 UTC (5 minutes after midnight to allow any
 * in-flight logAdEvents calls to complete before we refill budgets).
 *
 * Behaviour:
 *  - Finds every campaign where budgetType == 'daily' AND status is
 *    'active' or 'paused'.
 *  - Resets budgetCents to Math.round(budgetAmount * 100).
 *  - Re-activates paused campaigns whose budget was exhausted today
 *    (status 'paused' → 'active').
 *  - Does NOT touch 'lifetime' campaigns — their budgetCents only
 *    depletes and is never automatically refilled.
 *  - Does NOT touch campaigns that are 'under_review', 'rejected', or
 *    'archived' — those require manual admin action.
 *
 * Idempotency: writing the same budgetCents value twice is safe because
 * the value is set (not incremented). Running twice on the same day is
 * harmless.
 *
 * Cost: one Firestore read per active/paused daily-budget campaign, plus
 * one batched write. Batches are chunked at 490 docs to stay under the
 * 500-operation Firestore batch limit.
 */

import { onSchedule } from 'firebase-functions/v2/scheduler'
import * as admin from 'firebase-admin'

const COLLECTION = 'ads_campaigns'
const BATCH_LIMIT = 490 // Stay under 500-op Firestore batch limit

/**
 * Core reset logic extracted for unit testing without the scheduler wrapper.
 *
 * Returns the number of campaigns updated.
 */
export async function runDailyBudgetReset(db: admin.firestore.Firestore): Promise<number> {
  const snapshot = await db
    .collection(COLLECTION)
    .where('budgetType', '==', 'daily')
    .where('status', 'in', ['active', 'paused'])
    .get()

  if (snapshot.empty) {
    console.info('[resetDailyBudgets] No daily-budget campaigns to reset.')
    return 0
  }

  let updated = 0
  const docs = snapshot.docs

  // Process in chunks to stay within the 500-operation batch limit.
  for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
    const chunk = docs.slice(i, i + BATCH_LIMIT)
    const batch = db.batch()

    for (const doc of chunk) {
      const data = doc.data()
      const budgetCents = Math.round(parseFloat(data.budgetAmount ?? '0') * 100)

      if (budgetCents <= 0) {
        // budgetAmount missing or zero — skip rather than reset to 0 which
        // would immediately re-pause the campaign on the next event.
        console.warn(`[resetDailyBudgets] Skipping ${doc.id}: budgetAmount="${data.budgetAmount}" resolves to ${budgetCents} cents`)
        continue
      }

      const update: Record<string, unknown> = {
        budgetCents,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }

      // Re-activate campaigns that were paused due to budget exhaustion.
      // Campaigns paused for other reasons (e.g. admin action) keep their status.
      // We can only safely re-activate paused campaigns — 'active' ones already
      // have the correct status value and don't need a redundant write.
      if (data.status === 'paused') {
        update.status = 'active'
      }

      batch.update(doc.ref, update)
      updated++
    }

    await batch.commit()
  }

  console.info(`[resetDailyBudgets] Reset complete: ${updated} campaign(s) updated.`)
  return updated
}

/**
 * Scheduled trigger: runs at 00:05 UTC every day.
 */
export const resetDailyBudgets = onSchedule(
  {
    schedule: '5 0 * * *', // 00:05 UTC daily
    timeZone: 'UTC',
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 60,
  },
  async (_event) => {
    const db = admin.firestore()
    await runDailyBudgetReset(db)
  },
)
