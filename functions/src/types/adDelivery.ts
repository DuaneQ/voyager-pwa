/**
 * Ad Delivery Types — Shared interfaces for selectAds and logAdEvents Cloud Functions.
 *
 * These types define the contracts between the consumer app (voyager-RN) and
 * the ad delivery Cloud Functions.  Keep them in sync with the client-side
 * `src/types/AdUnit.ts` in voyager-RN.
 */

// ─── Placement & Creative ─────────────────────────────────────────────────────

export type Placement = 'video_feed' | 'itinerary_feed' | 'ai_slot'
export type CreativeType = 'image' | 'video'
export type BillingModel = 'cpm' | 'cpc'
export type BusinessType =
  | 'restaurant'
  | 'hotel'
  | 'tour'
  | 'experience'
  | 'transport'
  | 'shop'
  | 'activity'
  | 'other'

// ─── selectAds ────────────────────────────────────────────────────────────────

/** Context about the current user / itinerary for targeting. */
export interface UserAdContext {
  /** User's itinerary destination (display string). */
  destination?: string
  /** Google Places canonical place_id for exact destination match. */
  placeId?: string
  /** Travel start date YYYY-MM-DD — parsed with local-date logic to avoid UTC shift. */
  travelStartDate?: string
  /** Travel end date YYYY-MM-DD. */
  travelEndDate?: string
  /** User's gender preference from their itinerary. */
  gender?: string
  /** User's age (integer, computed from date of birth). */
  age?: number
  /** Trip types from the user's itinerary, e.g. ['adventure', 'romantic']. */
  tripTypes?: string[]
  /** Activity preferences, e.g. ['Cultural', 'Nightlife']. */
  activityPreferences?: string[]
  /** Travel style preferences, e.g. ['luxury', 'mid-range']. */
  travelStyles?: string[]
}

export interface SelectAdsRequest {
  /** Which surface to select ads for. */
  placement: Placement
  /** Maximum ads to return (default 5). */
  limit?: number
  /** Optional targeting context from the user's active itinerary. */
  userContext?: UserAdContext
}

/**
 * A single ad unit returned to the consumer app for rendering.
 * Intentionally a flat structure — no nested objects — so it serialises
 * cleanly over httpsCallable JSON.
 */
export interface AdUnit {
  campaignId: string
  placement: Placement
  creativeType: CreativeType
  assetUrl: string
  /** HLS manifest URL for video_feed campaigns (Mux); absent for images. */
  muxPlaybackUrl?: string
  /** Mux thumbnail for poster frame. */
  muxThumbnailUrl?: string
  primaryText: string
  cta: string
  landingUrl: string
  billingModel: BillingModel
  /** Campaign name used as the "business name" in UI. */
  businessName: string
  businessType?: BusinessType | ''
  address?: string
  phone?: string
  email?: string
  promoCode?: string
  /** Offer details for AI-slot promotions. */
  offerDetails?: string
}

export interface SelectAdsResponse {
  ads: AdUnit[]
}

// ─── logAdEvents ──────────────────────────────────────────────────────────────

export type AdEventType = 'impression' | 'click' | 'video_quartile'
export type VideoQuartile = 25 | 50 | 75 | 100

export interface AdEvent {
  type: AdEventType
  campaignId: string
  /** Client-side timestamp (epoch ms) — validated server-side. */
  timestamp: number
  /** Only for video_quartile events. */
  quartile?: VideoQuartile
}

export interface LogAdEventsRequest {
  events: AdEvent[]
}

export interface LogAdEventsResponse {
  /** Number of events that were successfully processed. */
  processed: number
  /** Number of events that were skipped due to validation errors. */
  skipped: number
}

// ─── Internal / Firestore ─────────────────────────────────────────────────────

/**
 * Shape of an ads_campaigns Firestore document (read-side).
 * Not exhaustive — contains only the fields that selectAds and logAdEvents need.
 */
export interface CampaignDoc {
  uid: string
  name: string
  status: string
  placement: Placement
  isUnderReview: boolean
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  creativeType: CreativeType
  assetUrl: string | null
  muxPlaybackUrl?: string
  muxThumbnailUrl?: string
  primaryText: string
  cta: string
  landingUrl: string
  billingModel: BillingModel
  budgetAmount: string
  /** Integer cents — set when admin approves. */
  budgetCents?: number
  businessType?: BusinessType | ''
  address?: string
  phone?: string
  email?: string
  promoCode?: string
  // Targeting fields
  /** Destination string for video_feed and ai_slot (non-itinerary placements). */
  location?: string
  targetDestination?: string
  targetPlaceId?: string
  targetTravelStartDate?: string // YYYY-MM-DD
  targetTravelEndDate?: string // YYYY-MM-DD
  targetGender?: string
  targetTripTypes?: string[]
  targetActivityPreferences?: string[]
  targetTravelStyles?: string[]
  /** Age range lower bound (e.g. '18', '25'). */
  ageFrom?: string
  /** Age range upper bound (e.g. '24', '34', '65+'). */
  ageTo?: string
  /** Comma-separated interest keywords (e.g. 'beach, adventure'). */
  interests?: string
  // Counters
  totalImpressions?: number
  totalClicks?: number
}

/** Shape of a daily_metrics sub-document. */
export interface DailyMetricsDoc {
  impressions: number
  clicks: number
  spend: number // cents
  videoQuartiles?: {
    q25: number
    q50: number
    q75: number
    q100: number
  }
}
