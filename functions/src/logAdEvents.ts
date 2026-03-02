import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import {
  LogAdEventsRequest,
  LogAdEventsResponse,
  AdEvent,
  AdEventType,
  VideoQuartile,
} from './types/adDelivery'

const COLLECTION = 'ads_campaigns'
const DAILY_METRICS_SUB = 'daily_metrics'

const VALID_EVENT_TYPES: AdEventType[] = ['impression', 'click', 'video_quartile']
const VALID_QUARTILES: VideoQuartile[] = [25, 50, 75, 100]

/**
 * Maximum number of events per single request.
 * Prevents abuse where a client sends thousands of fake events in one call.
 */
const MAX_EVENTS_PER_REQUEST = 50

/**
 * Maximum age of an event timestamp (5 minutes).
 * Events older than this are rejected — prevents replay attacks where a
 * malicious client resends old impression batches to inflate metrics.
 */
const MAX_EVENT_AGE_MS = 5 * 60 * 1000

/**
 * Maximum future drift allowed (30 seconds).
 * Client clocks can be slightly ahead; anything more is suspicious.
 */
const MAX_FUTURE_DRIFT_MS = 30 * 1000

// ─── Billing rates (cents) ──────────────────────────────────────────────────

/**
 * Cost per thousand impressions in cents.
 * $5.00 CPM = 500 cents per 1000 impressions = 0.5 cents per impression.
 */
const CPM_RATE_CENTS = 500 // $5.00 per 1000 impressions

/**
 * Cost per click in cents.
 * $0.50 CPC = 50 cents per click.
 */
const CPC_RATE_CENTS = 50 // $0.50 per click

/**
 * Convert epoch ms timestamp to a YYYY-MM-DD string in UTC.
 * Used for daily_metrics document IDs.
 */
function epochToDateKey(epochMs: number): string {
  const d = new Date(epochMs)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Validate a single AdEvent object.
 * Returns an error string if invalid, or null if valid.
 */
function validateEvent(event: unknown, serverNow: number): string | null {
  if (!event || typeof event !== 'object') {
    return 'event must be an object'
  }

  const e = event as Record<string, unknown>

  // Type
  if (!e.type || typeof e.type !== 'string' || !VALID_EVENT_TYPES.includes(e.type as AdEventType)) {
    return `invalid event type: ${String(e.type)}`
  }

  // Campaign ID
  if (!e.campaignId || typeof e.campaignId !== 'string' || e.campaignId.length === 0) {
    return 'campaignId is required and must be a non-empty string'
  }
  // Sanitize: Firestore doc IDs can't contain / or be > 1500 bytes
  if (e.campaignId.includes('/') || (e.campaignId as string).length > 128) {
    return 'campaignId contains invalid characters or is too long'
  }

  // Timestamp
  if (typeof e.timestamp !== 'number' || !Number.isFinite(e.timestamp)) {
    return 'timestamp must be a finite number (epoch ms)'
  }
  const age = serverNow - (e.timestamp as number)
  if (age > MAX_EVENT_AGE_MS) {
    return `event is too old (${Math.round(age / 1000)}s ago, max ${MAX_EVENT_AGE_MS / 1000}s)`
  }
  if (age < -MAX_FUTURE_DRIFT_MS) {
    return `event is too far in the future (${Math.round(-age / 1000)}s ahead)`
  }

  // Quartile (conditional)
  if (e.type === 'video_quartile') {
    if (!VALID_QUARTILES.includes(e.quartile as VideoQuartile)) {
      return `video_quartile events require quartile to be one of: ${VALID_QUARTILES.join(', ')}`
    }
  }

  return null // valid
}

// ─── Cloud Function ─────────────────────────────────────────────────────────

/**
 * logAdEvents — Public callable that ingests batched ad impression/click events
 * and updates Firestore counters atomically.
 *
 * Does NOT require authentication — events come from anonymous users too.
 *
 * Anti-abuse measures:
 * - Strict event count limit (MAX_EVENTS_PER_REQUEST)
 * - Timestamp freshness validation (rejects stale / future events)
 * - Campaign ID format validation (prevents Firestore injection)
 * - Batched Firestore writes for atomicity and efficiency
 * - Invalid events are skipped (not fatal) — partial success is possible
 *
 * Budget enforcement:
 * - CPM: charges (CPM_RATE / 1000) cents per impression
 * - CPC: charges CPC_RATE cents per click
 * - When budgetCents reaches 0, campaign status is set to 'paused'
 * - Uses FieldValue.increment for atomic counter updates (no read-then-write races)
 */
export const logAdEvents = onCall(
  {
    region: 'us-central1',
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request): Promise<LogAdEventsResponse> => {
    // ── Input validation ──────────────────────────────────────────────────
    const data = (request.data ?? {}) as Partial<LogAdEventsRequest>

    if (!data.events || !Array.isArray(data.events)) {
      throw new HttpsError('invalid-argument', 'events must be an array')
    }

    if (data.events.length === 0) {
      return { processed: 0, skipped: 0 }
    }

    if (data.events.length > MAX_EVENTS_PER_REQUEST) {
      throw new HttpsError(
        'invalid-argument',
        `Too many events: ${data.events.length}. Maximum is ${MAX_EVENTS_PER_REQUEST}.`,
      )
    }

    const serverNow = Date.now()

    // ── Validate all events, partition into valid / invalid ────────────────
    const validEvents: AdEvent[] = []
    let skipped = 0

    for (const raw of data.events) {
      const err = validateEvent(raw, serverNow)
      if (err) {
        console.warn(`[logAdEvents] Skipping invalid event: ${err}`, JSON.stringify(raw))
        skipped++
        continue
      }
      validEvents.push(raw as AdEvent)
    }

    if (validEvents.length === 0) {
      return { processed: 0, skipped }
    }

    // ── Group events by campaignId for efficient batched writes ────────────
    const byCampaign = new Map<string, AdEvent[]>()
    for (const event of validEvents) {
      const list = byCampaign.get(event.campaignId) ?? []
      list.push(event)
      byCampaign.set(event.campaignId, list)
    }

    const db = admin.firestore()
    const increment = admin.firestore.FieldValue.increment

    // ── Pre-fetch campaign docs to get billingModel & budget ──────────────
    // We need to know each campaign's billingModel to compute charges.
    // Fetching once avoids repeated reads inside the loop.
    const campaignIds = Array.from(byCampaign.keys())
    const campaignDocs = new Map<string, FirebaseFirestore.DocumentData>()

    // Batch fetch: Firestore getAll supports up to ~100 refs at once
    const refs = campaignIds.map((id) => db.collection(COLLECTION).doc(id))
    const snapshots = await db.getAll(...refs)

    for (const snap of snapshots) {
      if (snap.exists) {
        campaignDocs.set(snap.id, snap.data()!)
      }
    }

    // ── Process each campaign's events ────────────────────────────────────
    let processed = 0

    for (const [campaignId, events] of byCampaign) {
      const campaignData = campaignDocs.get(campaignId)

      // Skip events for campaigns that don't exist (possible spoofing)
      if (!campaignData) {
        console.warn(`[logAdEvents] Campaign not found, skipping: ${campaignId}`)
        skipped += events.length
        continue
      }

      // Skip events for campaigns that aren't active
      if (campaignData.status !== 'active') {
        console.warn(`[logAdEvents] Campaign not active (${campaignData.status}), skipping: ${campaignId}`)
        skipped += events.length
        continue
      }

      const billingModel: string = campaignData.billingModel ?? 'cpm'

      // Aggregate events by type and by day
      let impressionCount = 0
      let clickCount = 0
      const dailyImpressions = new Map<string, number>()
      const dailyClicks = new Map<string, number>()
      const dailyQuartiles = new Map<string, { q25: number; q50: number; q75: number; q100: number }>()

      for (const event of events) {
        const dateKey = epochToDateKey(event.timestamp)

        if (event.type === 'impression') {
          impressionCount++
          dailyImpressions.set(dateKey, (dailyImpressions.get(dateKey) ?? 0) + 1)
        } else if (event.type === 'click') {
          clickCount++
          dailyClicks.set(dateKey, (dailyClicks.get(dateKey) ?? 0) + 1)
        } else if (event.type === 'video_quartile' && event.quartile) {
          const entry = dailyQuartiles.get(dateKey) ?? { q25: 0, q50: 0, q75: 0, q100: 0 }
          const key = `q${event.quartile}` as keyof typeof entry
          entry[key]++
          dailyQuartiles.set(dateKey, entry)
        }
      }

      // ── Compute charges ───────────────────────────────────────────────
      let chargeCents = 0
      if (billingModel === 'cpm') {
        // CPM: charge per impression (CPM_RATE / 1000 cents each)
        // Use fractional math: (impressions * CPM_RATE) / 1000, rounded
        chargeCents = Math.round((impressionCount * CPM_RATE_CENTS) / 1000)
      } else if (billingModel === 'cpc') {
        // CPC: charge per click
        chargeCents = clickCount * CPC_RATE_CENTS
      }

      // ── Batched Firestore writes ──────────────────────────────────────
      const batch = db.batch()
      const campaignRef = db.collection(COLLECTION).doc(campaignId)

      // Update top-level campaign counters + budget
      const campaignUpdate: Record<string, unknown> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }
      if (impressionCount > 0) {
        campaignUpdate.totalImpressions = increment(impressionCount)
      }
      if (clickCount > 0) {
        campaignUpdate.totalClicks = increment(clickCount)
      }
      if (chargeCents > 0) {
        // Guard: if budgetCents was never set (older campaign approved before
        // this field existed), initialize it from budgetAmount first.
        // FieldValue.increment on a missing field starts from 0, which would
        // immediately go negative and trigger an incorrect pause.
        if (typeof campaignData.budgetCents !== 'number') {
          const initialBudget = Math.round(parseFloat(campaignData.budgetAmount || '0') * 100)
          campaignUpdate.budgetCents = initialBudget > 0
            ? initialBudget - chargeCents
            : increment(-chargeCents)
        } else {
          campaignUpdate.budgetCents = increment(-chargeCents)
        }
      }
      batch.update(campaignRef, campaignUpdate)

      // Update daily_metrics sub-documents
      const allDateKeys = new Set([
        ...dailyImpressions.keys(),
        ...dailyClicks.keys(),
        ...dailyQuartiles.keys(),
      ])

      // Pre-compute daily spend so it sums exactly to chargeCents.
      // Independent rounding per-day can diverge from the total (see CPM
      // fractional math). Instead, allocate proportionally with a remainder
      // adjustment on the largest day.
      const dateKeysArray = Array.from(allDateKeys)
      const dayChargeMap = new Map<string, number>()

      if (chargeCents > 0) {
        if (billingModel === 'cpc') {
          // CPC is exact (integer * integer), no rounding issue
          for (const dk of dateKeysArray) {
            dayChargeMap.set(dk, (dailyClicks.get(dk) ?? 0) * CPC_RATE_CENTS)
          }
        } else if (billingModel === 'cpm') {
          // CPM: distribute chargeCents proportionally by impression count
          let allocated = 0
          let largestDay = ''
          let largestImp = 0
          for (const dk of dateKeysArray) {
            const dayImp = dailyImpressions.get(dk) ?? 0
            const share = impressionCount > 0
              ? Math.floor((dayImp / impressionCount) * chargeCents)
              : 0
            dayChargeMap.set(dk, share)
            allocated += share
            if (dayImp > largestImp) {
              largestImp = dayImp
              largestDay = dk
            }
          }
          // Assign remainder to the day with the most impressions
          const remainder = chargeCents - allocated
          if (remainder > 0 && largestDay) {
            dayChargeMap.set(largestDay, (dayChargeMap.get(largestDay) ?? 0) + remainder)
          }
        }
      }

      for (const dateKey of allDateKeys) {
        const metricsRef = campaignRef.collection(DAILY_METRICS_SUB).doc(dateKey)
        const metricsUpdate: Record<string, unknown> = {}

        const dayImp = dailyImpressions.get(dateKey) ?? 0
        const dayClk = dailyClicks.get(dateKey) ?? 0
        const dayQ = dailyQuartiles.get(dateKey)

        if (dayImp > 0) metricsUpdate.impressions = increment(dayImp)
        if (dayClk > 0) metricsUpdate.clicks = increment(dayClk)

        // Daily spend allocated proportionally — sums to chargeCents exactly
        const dayCharge = dayChargeMap.get(dateKey) ?? 0
        if (dayCharge > 0) metricsUpdate.spend = increment(dayCharge)

        if (dayQ) {
          if (dayQ.q25 > 0) metricsUpdate['videoQuartiles.q25'] = increment(dayQ.q25)
          if (dayQ.q50 > 0) metricsUpdate['videoQuartiles.q50'] = increment(dayQ.q50)
          if (dayQ.q75 > 0) metricsUpdate['videoQuartiles.q75'] = increment(dayQ.q75)
          if (dayQ.q100 > 0) metricsUpdate['videoQuartiles.q100'] = increment(dayQ.q100)
        }

        if (Object.keys(metricsUpdate).length > 0) {
          // Use set with merge so the doc is created if it doesn't exist yet
          batch.set(metricsRef, metricsUpdate, { merge: true })
        }
      }

      // Commit the batch atomically
      await batch.commit()
      processed += events.length

      // ── Budget enforcement (post-commit check) ──────────────────────
      // After decrementing, check if budget has been exhausted.
      // This is a separate read because FieldValue.increment is write-only.
      if (chargeCents > 0) {
        try {
          const freshSnap = await campaignRef.get()
          const freshData = freshSnap.data()
          if (freshData && typeof freshData.budgetCents === 'number' && freshData.budgetCents <= 0) {
            await campaignRef.update({
              status: 'paused',
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            })
            console.log(`[logAdEvents] Campaign ${campaignId} budget exhausted — paused.`)
          }
        } catch (budgetErr) {
          // Non-fatal: events were already counted. Budget check will catch
          // it on the next call or via a scheduled audit.
          console.error(`[logAdEvents] Budget check failed for ${campaignId}:`, budgetErr)
        }
      }
    }

    return { processed, skipped }
  },
)

// ─── Exported for unit testing ────────────────────────────────────────────────
export const _testing = {
  validateEvent,
  epochToDateKey,
  MAX_EVENTS_PER_REQUEST,
  MAX_EVENT_AGE_MS,
  MAX_FUTURE_DRIFT_MS,
  CPM_RATE_CENTS,
  CPC_RATE_CENTS,
}
