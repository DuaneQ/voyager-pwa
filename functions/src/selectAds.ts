import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'
import {
  SelectAdsRequest,
  SelectAdsResponse,
  AdUnit,
  CampaignDoc,
  Placement,
} from './types/adDelivery'

const COLLECTION = 'ads_campaigns'
const VALID_PLACEMENTS: Placement[] = ['video_feed', 'itinerary_feed', 'ai_slot']
const DEFAULT_LIMIT = 5
const MAX_LIMIT = 20

/**
 * Parse a YYYY-MM-DD string as a local-date noon-UTC epoch ms.
 *
 * CRITICAL: Using `new Date('YYYY-MM-DD')` parses as UTC midnight, which can
 * shift the date backward in western timezones.  Instead we split the string
 * and construct via `Date.UTC(y, m-1, d, 12)` — anchored to noon UTC so that
 * any ±12 h timezone offset still lands on the correct calendar day.
 *
 * This mirrors the "noon UTC" strategy used by `useCreateItinerary` in
 * voyager-RN to produce `startDay`/`endDay` epoch values.
 */
function parseDateToNoonUTC(dateStr: string): number | null {
  if (!dateStr || typeof dateStr !== 'string') return null

  const parts = dateStr.split('-')
  if (parts.length !== 3) return null

  const [y, m, d] = parts.map(Number)
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null
  if (m < 1 || m > 12 || d < 1 || d > 31) return null

  // Validate the date is real (e.g. not Feb 30)
  const candidate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0, 0))
  if (
    candidate.getUTCFullYear() !== y ||
    candidate.getUTCMonth() !== m - 1 ||
    candidate.getUTCDate() !== d
  ) {
    return null
  }

  return candidate.getTime()
}

/**
 * Today's date as a YYYY-MM-DD string derived from the server's clock.
 * Uses UTC to match the noon-UTC anchoring strategy — the date returned is
 * always the calendar day that is current at UTC noon.
 */
function todayYYYYMMDD(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Check whether two date ranges overlap.
 * Range A: [aStart, aEnd],  Range B: [bStart, bEnd]
 * Overlap iff  aStart <= bEnd  AND  aEnd >= bStart
 *
 * Both ranges are inclusive.  All values are noon-UTC epoch ms.
 */
function dateRangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart <= bEnd && aEnd >= bStart
}

/**
 * Compute a targeting relevance score for a campaign against the user context.
 *
 * Higher scores mean the campaign is more relevant.  Hard constraints
 * (date range, budget, review status) are checked before this function is
 * called — only eligible campaigns reach scoring.
 *
 * Scoring:
 * - +3  Exact destination (placeId) match
 * - +2  Destination string match (fallback when no placeId)
 * - +2  Travel date overlap
 * - +2  Age within campaign's ageFrom–ageTo range
 * - +1  Gender match
 * - +1  At least one trip type overlap
 * - +1  At least one activity preference overlap
 * - +1  At least one travel style overlap
 * - +1  At least one interest keyword overlap
 * - +0  No targeting constraint on that field (matches everyone)
 *
 * No hard filters — a campaign with no targeting fields will score 0 and still
 * be eligible.  Only date range and budget are hard constraints (checked
 * before scoring).
 */
function scoreCampaign(
  campaign: CampaignDoc,
  userContext: SelectAdsRequest['userContext'],
): number {
  if (!userContext) return 0 // no context → everything scores equally

  let score = 0

  // ── Destination ───────────────────────────────────────────────────────────
  // itinerary_feed stores destination in targetDestination/targetPlaceId;
  // video_feed and ai_slot store it in the `location` field.
  // Resolve whichever is populated.
  const campDestStr = campaign.targetDestination || campaign.location || ''
  const campPlaceId = campaign.targetPlaceId || ''

  if (campPlaceId && userContext.placeId) {
    if (campPlaceId === userContext.placeId) {
      score += 3
    }
    // If placeIds are present but don't match, no points but not disqualified
  } else if (campDestStr && userContext.destination) {
    // Fallback: case-insensitive string includes (city names can vary)
    const campDest = campDestStr.toLowerCase().trim()
    const userDest = userContext.destination.toLowerCase().trim()
    if (campDest === userDest || campDest.includes(userDest) || userDest.includes(campDest)) {
      score += 2
    }
  }

  // ── Travel date overlap ──────────────────────────────────────────────────
  if (campaign.targetTravelStartDate && campaign.targetTravelEndDate) {
    if (userContext.travelStartDate && userContext.travelEndDate) {
      const campStart = parseDateToNoonUTC(campaign.targetTravelStartDate)
      const campEnd = parseDateToNoonUTC(campaign.targetTravelEndDate)
      const userStart = parseDateToNoonUTC(userContext.travelStartDate)
      const userEnd = parseDateToNoonUTC(userContext.travelEndDate)

      if (campStart && campEnd && userStart && userEnd) {
        if (dateRangesOverlap(campStart, campEnd, userStart, userEnd)) {
          score += 2
        }
      }
    }
    // If user has no dates, campaign still eligible (no penalty)
  }

  // ── Gender ──────────────────────────────────────────────────────────────
  if (campaign.targetGender && campaign.targetGender !== '') {
    if (userContext.gender) {
      if (campaign.targetGender.toLowerCase() === userContext.gender.toLowerCase()) {
        score += 1
      }
    }
  }

  // ── Age range ──────────────────────────────────────────────────────────
  if (campaign.ageFrom && campaign.ageTo) {
    if (typeof userContext.age === 'number' && userContext.age > 0) {
      const ageFrom = parseInt(campaign.ageFrom, 10)
      // '65+' → treat as 120 (no upper bound)
      const ageTo = campaign.ageTo === '65+' ? 120 : parseInt(campaign.ageTo, 10)
      if (!isNaN(ageFrom) && !isNaN(ageTo) && userContext.age >= ageFrom && userContext.age <= ageTo) {
        score += 2
      }
    }
  }

  // ── Trip types (array overlap) ──────────────────────────────────────────
  if (campaign.targetTripTypes && campaign.targetTripTypes.length > 0) {
    if (userContext.tripTypes && userContext.tripTypes.length > 0) {
      const campSet = new Set(campaign.targetTripTypes.map((t) => t.toLowerCase()))
      const hasOverlap = userContext.tripTypes.some((t) => campSet.has(t.toLowerCase()))
      if (hasOverlap) score += 1
    }
  }

  // ── Activity preferences (array overlap) ────────────────────────────────
  if (campaign.targetActivityPreferences && campaign.targetActivityPreferences.length > 0) {
    if (userContext.activityPreferences && userContext.activityPreferences.length > 0) {
      const campSet = new Set(campaign.targetActivityPreferences.map((a) => a.toLowerCase()))
      const hasOverlap = userContext.activityPreferences.some((a) => campSet.has(a.toLowerCase()))
      if (hasOverlap) score += 1
    }
  }

  // ── Travel styles (array overlap) ───────────────────────────────────────
  if (campaign.targetTravelStyles && campaign.targetTravelStyles.length > 0) {
    if (userContext.travelStyles && userContext.travelStyles.length > 0) {
      const campSet = new Set(campaign.targetTravelStyles.map((s) => s.toLowerCase()))
      const hasOverlap = userContext.travelStyles.some((s) => campSet.has(s.toLowerCase()))
      if (hasOverlap) score += 1
    }
  }

  // ── Interests (keyword overlap) ──────────────────────────────────────
  // Campaign stores interests as a comma-separated string (e.g. 'beach, adventure, family travel').
  // We tokenise both sides and check for at least one shared keyword.
  if (campaign.interests && typeof campaign.interests === 'string') {
    const campKeywords = campaign.interests
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean)
    if (campKeywords.length > 0) {
      // User context may carry interests via activityPreferences, tripTypes, or travelStyles
      // Merge them all into a single keyword bag for broad matching.
      const userKeywords = new Set<string>()
      if (userContext.activityPreferences) {
        userContext.activityPreferences.forEach((a) => userKeywords.add(a.toLowerCase()))
      }
      if (userContext.tripTypes) {
        userContext.tripTypes.forEach((t) => userKeywords.add(t.toLowerCase()))
      }
      if (userContext.travelStyles) {
        userContext.travelStyles.forEach((s) => userKeywords.add(s.toLowerCase()))
      }
      if (userContext.destination) {
        userKeywords.add(userContext.destination.toLowerCase())
      }
      if (userKeywords.size > 0) {
        const hasOverlap = campKeywords.some(
          (kw) =>
            userKeywords.has(kw) ||
            [...userKeywords].some((uk) => uk.includes(kw) || kw.includes(uk)),
        )
        if (hasOverlap) score += 1
      }
    }
  }

  return score
}

/**
 * Map a Firestore campaign document to the AdUnit wire format returned to clients.
 */
function campaignToAdUnit(id: string, doc: CampaignDoc): AdUnit {
  return {
    campaignId: id,
    placement: doc.placement,
    creativeType: doc.creativeType,
    assetUrl: doc.assetUrl ?? '',
    muxPlaybackUrl: doc.muxPlaybackUrl,
    muxThumbnailUrl: doc.muxThumbnailUrl,
    primaryText: doc.primaryText ?? '',
    cta: doc.cta ?? 'Learn More',
    landingUrl: doc.landingUrl ?? '',
    billingModel: doc.billingModel ?? 'cpm',
    businessName: doc.name ?? '',
    businessType: doc.businessType,
    address: doc.address,
    phone: doc.phone,
    email: doc.email,
    promoCode: doc.promoCode,
  }
}

// ─── Cloud Function ─────────────────────────────────────────────────────────

/**
 * selectAds — Public callable that returns a batch of eligible ad campaigns
 * for a given placement surface.
 *
 * Does NOT require authentication — anonymous users should see ads.
 *
 * Anti-abuse:
 * - Validates all input types strictly (prevents injection of bad query shapes)
 * - Limits result set to MAX_LIMIT to prevent data scraping
 * - No PII is returned in the response
 * - Rate limiting delegated to Firebase's built-in per-IP throttling
 *
 * Query strategy:
 * 1. Firestore indexed query: status == 'active' AND placement == X
 * 2. Client-side filter: isUnderReview == false, date in range, budget > 0
 * 3. Score each passing campaign against user context
 * 4. Sort by score desc, return top N
 */
export const selectAds = onCall(
  {
    region: 'us-central1',
    // No auth required — public endpoint
    // Low memory / timeout since this is a simple read
    memory: '256MiB',
    timeoutSeconds: 30,
  },
  async (request): Promise<SelectAdsResponse> => {
    // ── Input validation ──────────────────────────────────────────────────
    const data = (request.data ?? {}) as Partial<SelectAdsRequest>

    const placement = data.placement
    if (!placement || !VALID_PLACEMENTS.includes(placement)) {
      throw new HttpsError(
        'invalid-argument',
        `placement must be one of: ${VALID_PLACEMENTS.join(', ')}`,
      )
    }

    let limit = data.limit ?? DEFAULT_LIMIT
    if (typeof limit !== 'number' || limit < 1) {
      limit = DEFAULT_LIMIT
    }
    limit = Math.min(limit, MAX_LIMIT)

    // Validate userContext fields (defensive — don't trust client)
    const ctx = data.userContext
    if (ctx) {
      if (ctx.destination && typeof ctx.destination !== 'string') {
        throw new HttpsError('invalid-argument', 'userContext.destination must be a string')
      }
      if (ctx.placeId && typeof ctx.placeId !== 'string') {
        throw new HttpsError('invalid-argument', 'userContext.placeId must be a string')
      }
      if (ctx.travelStartDate && typeof ctx.travelStartDate !== 'string') {
        throw new HttpsError('invalid-argument', 'userContext.travelStartDate must be a YYYY-MM-DD string')
      }
      if (ctx.travelEndDate && typeof ctx.travelEndDate !== 'string') {
        throw new HttpsError('invalid-argument', 'userContext.travelEndDate must be a YYYY-MM-DD string')
      }
      if (ctx.gender && typeof ctx.gender !== 'string') {
        throw new HttpsError('invalid-argument', 'userContext.gender must be a string')
      }
      if (ctx.age !== undefined && ctx.age !== null) {
        if (typeof ctx.age !== 'number' || !Number.isInteger(ctx.age) || ctx.age < 0 || ctx.age > 150) {
          throw new HttpsError('invalid-argument', 'userContext.age must be an integer between 0 and 150')
        }
      }
      if (ctx.tripTypes && !Array.isArray(ctx.tripTypes)) {
        throw new HttpsError('invalid-argument', 'userContext.tripTypes must be an array')
      }
      if (ctx.activityPreferences && !Array.isArray(ctx.activityPreferences)) {
        throw new HttpsError('invalid-argument', 'userContext.activityPreferences must be an array')
      }
      if (ctx.travelStyles && !Array.isArray(ctx.travelStyles)) {
        throw new HttpsError('invalid-argument', 'userContext.travelStyles must be an array')
      }

      // Sanitize array elements: filter out non-strings to prevent
      // crashes in scoring logic that calls .toLowerCase() on each element.
      if (ctx.tripTypes) {
        ctx.tripTypes = ctx.tripTypes.filter((v): v is string => typeof v === 'string')
      }
      if (ctx.activityPreferences) {
        ctx.activityPreferences = ctx.activityPreferences.filter((v): v is string => typeof v === 'string')
      }
      if (ctx.travelStyles) {
        ctx.travelStyles = ctx.travelStyles.filter((v): v is string => typeof v === 'string')
      }

      // Validate date formats (YYYY-MM-DD) when present
      if (ctx.travelStartDate && parseDateToNoonUTC(ctx.travelStartDate) === null) {
        throw new HttpsError('invalid-argument', 'userContext.travelStartDate is not a valid YYYY-MM-DD date')
      }
      if (ctx.travelEndDate && parseDateToNoonUTC(ctx.travelEndDate) === null) {
        throw new HttpsError('invalid-argument', 'userContext.travelEndDate is not a valid YYYY-MM-DD date')
      }

      // Ensure start <= end when both are present
      if (ctx.travelStartDate && ctx.travelEndDate) {
        const s = parseDateToNoonUTC(ctx.travelStartDate)!
        const e = parseDateToNoonUTC(ctx.travelEndDate)!
        if (s > e) {
          throw new HttpsError('invalid-argument', 'travelStartDate must be <= travelEndDate')
        }
      }
    }

    // ── Firestore query ───────────────────────────────────────────────────
    const db = admin.firestore()
    const snapshot = await db
      .collection(COLLECTION)
      .where('status', '==', 'active')
      .where('placement', '==', placement)
      .get()

    if (snapshot.empty) {
      return { ads: [] }
    }

    const today = todayYYYYMMDD()

    // ── Filter + Score ────────────────────────────────────────────────────
    const scored: Array<{ id: string; doc: CampaignDoc; score: number }> = []

    for (const snap of snapshot.docs) {
      const doc = snap.data() as CampaignDoc

      // Hard filter: must not be under review
      if (doc.isUnderReview) continue

      // Hard filter: campaign date range must include today
      // Uses string comparison — YYYY-MM-DD sorts lexicographically
      if (doc.startDate && doc.startDate > today) continue // hasn't started yet
      if (doc.endDate && doc.endDate < today) continue // already ended

      // Hard filter: must have remaining budget
      // budgetCents is set on approval; if absent fall back to parsing budgetAmount.
      // Guard against NaN: parseFloat('abc') → NaN, and NaN <= 0 is false,
      // which would let a campaign with garbage budgetAmount bypass the filter.
      const parsedBudget = parseFloat(doc.budgetAmount || '0')
      const budgetCents =
        typeof doc.budgetCents === 'number' && Number.isFinite(doc.budgetCents)
          ? doc.budgetCents
          : Number.isFinite(parsedBudget)
            ? Math.round(parsedBudget * 100)
            : 0
      if (budgetCents <= 0) continue

      // Hard filter: must have a renderable creative
      if (!doc.assetUrl && !doc.muxPlaybackUrl) continue

      const score = scoreCampaign(doc, ctx)
      scored.push({ id: snap.id, doc, score })
    }

    // ── Sort by score (desc), then by id for stable ordering ──────────────
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.id.localeCompare(b.id) // deterministic tie-break
    })

    // ── Return top N ──────────────────────────────────────────────────────
    const ads = scored.slice(0, limit).map((s) => campaignToAdUnit(s.id, s.doc))

    return { ads }
  },
)

// ─── Exported for unit testing ────────────────────────────────────────────────
export const _testing = {
  parseDateToNoonUTC,
  todayYYYYMMDD,
  dateRangesOverlap,
  scoreCampaign,
  campaignToAdUnit,
}
