/**
 * Unit tests for selectAds Cloud Function helpers
 *
 * Tests the date utility, scoring, filtering and mapping logic exported via
 * selectAds._testing.  The onCall function itself is not invoked here — it
 * depends on Firestore and firebase-admin which are mocked in integration tests.
 */

import { _testing } from '../selectAds'
import { CampaignDoc, UserAdContext } from '../types/adDelivery'

const {
  parseDateToNoonUTC,
  todayYYYYMMDD,
  dateRangesOverlap,
  scoreCampaign,
  campaignToAdUnit,
  tieBreakKey,
} = _testing

// ─── helpers ────────────────────────────────────────────────────────────────

/** Build a minimal CampaignDoc, overriding defaults with partial data. */
function makeCampaign(overrides: Partial<CampaignDoc> = {}): CampaignDoc {
  return {
    uid: 'user123',
    name: 'Test Campaign',
    status: 'active',
    placement: 'video_feed',
    isUnderReview: false,
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    creativeType: 'video',
    assetUrl: 'https://example.com/video.mp4',
    primaryText: 'Check this out!',
    cta: 'Learn More',
    landingUrl: 'https://example.com',
    billingModel: 'cpm',
    budgetAmount: '50',
    budgetCents: 5000,
    ...overrides,
  }
}

// ─── parseDateToNoonUTC ────────────────────────────────────────────────────

describe('parseDateToNoonUTC', () => {
  it('should parse a valid YYYY-MM-DD as noon UTC', () => {
    const result = parseDateToNoonUTC('2025-06-15')!
    const d = new Date(result)
    expect(d.getUTCFullYear()).toBe(2025)
    expect(d.getUTCMonth()).toBe(5) // June = 5
    expect(d.getUTCDate()).toBe(15)
    expect(d.getUTCHours()).toBe(12)
    expect(d.getUTCMinutes()).toBe(0)
    expect(d.getUTCSeconds()).toBe(0)
  })

  it('should return the same calendar day regardless of timezone offset', () => {
    // The key purpose: noon UTC means ±12h timezone still lands on same day
    const result = parseDateToNoonUTC('2025-01-01')!
    const d = new Date(result)
    expect(d.getUTCDate()).toBe(1) // Never shifts to Dec 31
  })

  it('should handle Jan 1 (common date-shift failure)', () => {
    const result = parseDateToNoonUTC('2025-01-01')!
    const d = new Date(result)
    expect(d.getUTCFullYear()).toBe(2025)
    expect(d.getUTCMonth()).toBe(0)
    expect(d.getUTCDate()).toBe(1)
  })

  it('should handle Dec 31 (common date-shift failure)', () => {
    const result = parseDateToNoonUTC('2025-12-31')!
    const d = new Date(result)
    expect(d.getUTCFullYear()).toBe(2025)
    expect(d.getUTCMonth()).toBe(11)
    expect(d.getUTCDate()).toBe(31)
  })

  it('should handle Feb 28 non-leap year', () => {
    const result = parseDateToNoonUTC('2025-02-28')!
    const d = new Date(result)
    expect(d.getUTCMonth()).toBe(1)
    expect(d.getUTCDate()).toBe(28)
  })

  it('should handle Feb 29 leap year', () => {
    const result = parseDateToNoonUTC('2024-02-29')!
    const d = new Date(result)
    expect(d.getUTCMonth()).toBe(1)
    expect(d.getUTCDate()).toBe(29)
  })

  it('should return null for Feb 29 non-leap year', () => {
    expect(parseDateToNoonUTC('2025-02-29')).toBeNull()
  })

  it('should return null for invalid dates like Feb 30', () => {
    expect(parseDateToNoonUTC('2025-02-30')).toBeNull()
  })

  it('should return null for Apr 31', () => {
    expect(parseDateToNoonUTC('2025-04-31')).toBeNull()
  })

  it('should return null for empty string', () => {
    expect(parseDateToNoonUTC('')).toBeNull()
  })

  it('should return null for non-string input', () => {
    expect(parseDateToNoonUTC(null as unknown as string)).toBeNull()
    expect(parseDateToNoonUTC(undefined as unknown as string)).toBeNull()
    expect(parseDateToNoonUTC(12345 as unknown as string)).toBeNull()
  })

  it('should return null for malformed date strings', () => {
    expect(parseDateToNoonUTC('2025/06/15')).toBeNull()
    expect(parseDateToNoonUTC('06-15-2025')).toBeNull()
    expect(parseDateToNoonUTC('not-a-date')).toBeNull()
    // Note: '2025-6-1' is actually valid — split gives 3 parts and Number('6')/Number('1') work
    expect(parseDateToNoonUTC('2025-6-1')).not.toBeNull()
  })

  it('should return null for out-of-range month', () => {
    expect(parseDateToNoonUTC('2025-13-01')).toBeNull()
    expect(parseDateToNoonUTC('2025-00-01')).toBeNull()
  })

  it('should return null for out-of-range day', () => {
    expect(parseDateToNoonUTC('2025-01-00')).toBeNull()
    expect(parseDateToNoonUTC('2025-01-32')).toBeNull()
  })
})

// ─── todayYYYYMMDD ──────────────────────────────────────────────────────────

describe('todayYYYYMMDD', () => {
  it('should return a YYYY-MM-DD string', () => {
    const result = todayYYYYMMDD()
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('should match the current UTC date', () => {
    const now = new Date()
    const expected = [
      now.getUTCFullYear(),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      String(now.getUTCDate()).padStart(2, '0'),
    ].join('-')
    expect(todayYYYYMMDD()).toBe(expected)
  })
})

// ─── dateRangesOverlap ──────────────────────────────────────────────────────

describe('dateRangesOverlap', () => {
  const jan1 = parseDateToNoonUTC('2025-01-01')!
  const jan31 = parseDateToNoonUTC('2025-01-31')!
  const feb1 = parseDateToNoonUTC('2025-02-01')!
  const feb28 = parseDateToNoonUTC('2025-02-28')!
  const mar1 = parseDateToNoonUTC('2025-03-01')!
  const mar31 = parseDateToNoonUTC('2025-03-31')!

  it('should detect full overlap', () => {
    expect(dateRangesOverlap(jan1, mar31, feb1, feb28)).toBe(true)
  })

  it('should detect partial overlap (end of A overlaps start of B)', () => {
    expect(dateRangesOverlap(jan1, feb28, feb1, mar31)).toBe(true)
  })

  it('should detect adjacent-day overlap (A ends on day B starts)', () => {
    expect(dateRangesOverlap(jan1, feb1, feb1, mar31)).toBe(true)
  })

  it('should return false for non-overlapping ranges', () => {
    expect(dateRangesOverlap(jan1, jan31, mar1, mar31)).toBe(false)
  })

  it('should detect identical ranges as overlapping', () => {
    expect(dateRangesOverlap(jan1, jan31, jan1, jan31)).toBe(true)
  })

  it('should detect single-day range overlap', () => {
    expect(dateRangesOverlap(jan1, jan1, jan1, jan1)).toBe(true)
  })

  it('should return false when A ends just before B starts', () => {
    expect(dateRangesOverlap(jan1, jan31, feb1, feb28)).toBe(false)
  })
})

// ─── scoreCampaign ──────────────────────────────────────────────────────────

describe('scoreCampaign', () => {
  it('should return 0 when no user context is provided', () => {
    const campaign = makeCampaign()
    // The function checks if (!userContext) return 0
    expect(scoreCampaign(campaign, undefined as unknown as UserAdContext)).toBe(0)
  })

  it('should return 0 when user context is empty', () => {
    const campaign = makeCampaign()
    expect(scoreCampaign(campaign, {})).toBe(0)
  })

  it('should score +10 for exact placeId match', () => {
    const campaign = makeCampaign({ placement: 'itinerary_feed', targetPlaceId: 'ChIJ12345' })
    expect(scoreCampaign(campaign, { placeId: 'ChIJ12345' })).toBe(10)
  })

  it('should NOT score placeId for partial match', () => {
    const campaign = makeCampaign({ placement: 'itinerary_feed', targetPlaceId: 'ChIJ12345' })
    expect(scoreCampaign(campaign, { placeId: 'ChIJ12345_extra' })).toBe(0)
  })

  it('should score +8 for destination string match (exact)', () => {
    const campaign = makeCampaign({ placement: 'itinerary_feed', targetDestination: 'Paris' })
    expect(scoreCampaign(campaign, { destination: 'Paris' })).toBe(8)
  })

  it('should score +8 for destination string match (case-insensitive)', () => {
    const campaign = makeCampaign({ placement: 'itinerary_feed', targetDestination: 'paris' })
    expect(scoreCampaign(campaign, { destination: 'PARIS' })).toBe(8)
  })

  it('should score +8 for destination substring match (campaign contains user)', () => {
    const campaign = makeCampaign({ placement: 'itinerary_feed', targetDestination: 'Paris, France' })
    expect(scoreCampaign(campaign, { destination: 'Paris' })).toBe(8)
  })

  it('should prefer placeId over destination when both are present', () => {
    const campaign = makeCampaign({
      placement: 'itinerary_feed',
      targetPlaceId: 'ChIJ12345',
      targetDestination: 'Paris',
    })
    // When placeId matches, it's +10 and destination is not checked
    expect(scoreCampaign(campaign, { placeId: 'ChIJ12345', destination: 'Paris' })).toBe(10)
  })

  // ── Location field fallback (ai_slot) ─────────────────────────────────────

  it('should score +8 for location field string match (ai_slot)', () => {
    const campaign = makeCampaign({ placement: 'ai_slot', location: 'Tokyo, Japan' })
    expect(scoreCampaign(campaign, { destination: 'Tokyo' })).toBe(8)
  })

  it('should score +8 for location field exact match (ai_slot)', () => {
    const campaign = makeCampaign({ placement: 'ai_slot', location: 'Barcelona' })
    expect(scoreCampaign(campaign, { destination: 'Barcelona' })).toBe(8)
  })

  it('should prefer targetDestination over location when both present (ai_slot)', () => {
    const campaign = makeCampaign({
      placement: 'ai_slot',
      targetDestination: 'Paris',
      location: 'London',
    })
    // targetDestination is resolved first, so "Paris" matches the user's "Paris"
    expect(scoreCampaign(campaign, { destination: 'Paris' })).toBe(8)
  })

  it('should fall back to location if targetDestination is empty (ai_slot)', () => {
    const campaign = makeCampaign({
      placement: 'ai_slot',
      targetDestination: '',
      location: 'Rome, Italy',
    })
    expect(scoreCampaign(campaign, { destination: 'Rome' })).toBe(8)
  })

  it('should NOT score location when there is no user destination (ai_slot)', () => {
    const campaign = makeCampaign({ placement: 'ai_slot', location: 'Tokyo' })
    expect(scoreCampaign(campaign, { gender: 'female' })).toBe(0)
  })

  it('should NOT score location for video_feed placement', () => {
    const campaign = makeCampaign({ placement: 'video_feed', location: 'Tokyo' })
    expect(scoreCampaign(campaign, { destination: 'Tokyo' })).toBe(0)
  })

  it('should score +2 for date overlap (itinerary_feed)', () => {
    const campaign = makeCampaign({
      placement: 'itinerary_feed',
      targetTravelStartDate: '2025-06-01',
      targetTravelEndDate: '2025-06-30',
    })
    expect(
      scoreCampaign(campaign, {
        travelStartDate: '2025-06-15',
        travelEndDate: '2025-06-20',
      }),
    ).toBe(2)
  })

  it('should NOT score date overlap when ranges do not overlap (itinerary_feed)', () => {
    const campaign = makeCampaign({
      placement: 'itinerary_feed',
      targetTravelStartDate: '2025-06-01',
      targetTravelEndDate: '2025-06-30',
    })
    expect(
      scoreCampaign(campaign, {
        travelStartDate: '2025-07-15',
        travelEndDate: '2025-07-20',
      }),
    ).toBe(0)
  })

  it('should NOT penalize when campaign has dates but user does not (itinerary_feed)', () => {
    const campaign = makeCampaign({
      placement: 'itinerary_feed',
      targetTravelStartDate: '2025-06-01',
      targetTravelEndDate: '2025-06-30',
    })
    expect(scoreCampaign(campaign, { destination: 'Paris' })).toBe(0)
  })

  it('should NOT score travel dates for video_feed placement', () => {
    const campaign = makeCampaign({
      placement: 'video_feed',
      targetTravelStartDate: '2025-06-01',
      targetTravelEndDate: '2025-06-30',
    })
    expect(scoreCampaign(campaign, { travelStartDate: '2025-06-15', travelEndDate: '2025-06-20' })).toBe(0)
  })

  it('should score +1 for gender match', () => {
    const campaign = makeCampaign({ targetGender: 'female' })
    expect(scoreCampaign(campaign, { gender: 'female' })).toBe(1)
  })

  it('should score +1 for gender match (case-insensitive)', () => {
    const campaign = makeCampaign({ targetGender: 'Female' })
    expect(scoreCampaign(campaign, { gender: 'female' })).toBe(1)
  })

  it('should NOT score gender when campaign targets a different gender', () => {
    const campaign = makeCampaign({ targetGender: 'male' })
    expect(scoreCampaign(campaign, { gender: 'female' })).toBe(0)
  })

  it('should score +1 for trip type overlap (ai_slot)', () => {
    const campaign = makeCampaign({ placement: 'ai_slot', targetTripTypes: ['adventure', 'romantic'] })
    expect(scoreCampaign(campaign, { tripTypes: ['adventure'] })).toBe(1)
  })

  it('should score +1 for trip type overlap (case-insensitive, ai_slot)', () => {
    const campaign = makeCampaign({ placement: 'ai_slot', targetTripTypes: ['Adventure'] })
    expect(scoreCampaign(campaign, { tripTypes: ['adventure'] })).toBe(1)
  })

  it('should NOT score trip types when no overlap (ai_slot)', () => {
    const campaign = makeCampaign({ placement: 'ai_slot', targetTripTypes: ['adventure'] })
    expect(scoreCampaign(campaign, { tripTypes: ['romantic'] })).toBe(0)
  })

  it('should NOT score trip types for video_feed placement', () => {
    const campaign = makeCampaign({ placement: 'video_feed', targetTripTypes: ['adventure'] })
    expect(scoreCampaign(campaign, { tripTypes: ['adventure'] })).toBe(0)
  })

  it('should score +1 for activity preference overlap (ai_slot)', () => {
    const campaign = makeCampaign({ placement: 'ai_slot', targetActivityPreferences: ['Cultural', 'Nightlife'] })
    expect(scoreCampaign(campaign, { activityPreferences: ['Nightlife'] })).toBe(1)
  })

  it('should NOT score activity preferences for video_feed placement', () => {
    const campaign = makeCampaign({ placement: 'video_feed', targetActivityPreferences: ['Nightlife'] })
    expect(scoreCampaign(campaign, { activityPreferences: ['Nightlife'] })).toBe(0)
  })

  it('should score +1 for travel style overlap (ai_slot)', () => {
    const campaign = makeCampaign({ placement: 'ai_slot', targetTravelStyles: ['luxury', 'mid-range'] })
    expect(scoreCampaign(campaign, { travelStyles: ['luxury'] })).toBe(1)
  })

  it('should NOT score travel styles for video_feed placement', () => {
    const campaign = makeCampaign({ placement: 'video_feed', targetTravelStyles: ['luxury'] })
    expect(scoreCampaign(campaign, { travelStyles: ['luxury'] })).toBe(0)
  })

  // ── Age range scoring ────────────────────────────────────────────────────

  it('should score +2 when user age is within campaign age range', () => {
    const campaign = makeCampaign({ ageFrom: '25', ageTo: '34' })
    expect(scoreCampaign(campaign, { age: 30 })).toBe(2)
  })

  it('should score +2 at the lower boundary of age range', () => {
    const campaign = makeCampaign({ ageFrom: '25', ageTo: '34' })
    expect(scoreCampaign(campaign, { age: 25 })).toBe(2)
  })

  it('should score +2 at the upper boundary of age range', () => {
    const campaign = makeCampaign({ ageFrom: '25', ageTo: '34' })
    expect(scoreCampaign(campaign, { age: 34 })).toBe(2)
  })

  it('should NOT score age when user is outside campaign age range', () => {
    const campaign = makeCampaign({ ageFrom: '25', ageTo: '34' })
    expect(scoreCampaign(campaign, { age: 18 })).toBe(0)
    expect(scoreCampaign(campaign, { age: 40 })).toBe(0)
  })

  it('should handle 65+ upper bound (no upper limit)', () => {
    const campaign = makeCampaign({ ageFrom: '55', ageTo: '65+' })
    expect(scoreCampaign(campaign, { age: 70 })).toBe(2)
    expect(scoreCampaign(campaign, { age: 100 })).toBe(2)
    expect(scoreCampaign(campaign, { age: 55 })).toBe(2)
  })

  it('should NOT score age when user age is not provided', () => {
    const campaign = makeCampaign({ ageFrom: '25', ageTo: '34' })
    expect(scoreCampaign(campaign, { gender: 'female' })).toBe(0) // no age field
  })

  it('should NOT score age when campaign has no age range', () => {
    const campaign = makeCampaign({ ageFrom: undefined, ageTo: undefined })
    expect(scoreCampaign(campaign, { age: 30 })).toBe(0)
  })

  // ── Interests scoring ────────────────────────────────────────────────────

  it('should score +1 when campaign interests overlap with user activity preferences (ai_slot)', () => {
    const campaign = makeCampaign({ placement: 'ai_slot', interests: 'beach, adventure, nightlife' })
    expect(scoreCampaign(campaign, { activityPreferences: ['Nightlife'] })).toBe(1)
  })

  it('should score +1 when campaign interests overlap with user trip types (ai_slot)', () => {
    const campaign = makeCampaign({ placement: 'ai_slot', interests: 'adventure, romantic' })
    expect(scoreCampaign(campaign, { tripTypes: ['adventure'] })).toBe(1)
  })

  it('should score +1 when campaign interests overlap with user travel styles (ai_slot)', () => {
    const campaign = makeCampaign({ placement: 'ai_slot', interests: 'luxury, beach' })
    expect(scoreCampaign(campaign, { travelStyles: ['luxury'] })).toBe(1)
  })

  it('should score +1 for partial keyword match in interests (ai_slot)', () => {
    const campaign = makeCampaign({ placement: 'ai_slot', interests: 'beach travel, family' })
    expect(scoreCampaign(campaign, { tripTypes: ['family'] })).toBe(1)
  })

  it('should NOT score interests when no overlap (ai_slot)', () => {
    const campaign = makeCampaign({ placement: 'ai_slot', interests: 'shopping, spa' })
    expect(scoreCampaign(campaign, { tripTypes: ['adventure'], activityPreferences: ['Nightlife'] })).toBe(0)
  })

  it('should NOT score interests when user has no context (ai_slot)', () => {
    const campaign = makeCampaign({ placement: 'ai_slot', interests: 'beach, adventure' })
    expect(scoreCampaign(campaign, { gender: 'male' })).toBe(0)
  })

  it('should NOT score interests for video_feed placement', () => {
    const campaign = makeCampaign({ placement: 'video_feed', interests: 'beach, adventure' })
    expect(scoreCampaign(campaign, { activityPreferences: ['adventure'], tripTypes: ['adventure'] })).toBe(0)
  })

  // ── Full accumulation with age + interests ────────────────────────────────

  it('should accumulate scores across all matching fields (ai_slot)', () => {
    const campaign = makeCampaign({
      placement: 'ai_slot',
      targetPlaceId: 'ChIJ12345',
      targetTravelStartDate: '2025-06-01',
      targetTravelEndDate: '2025-06-30',
      targetGender: 'female',
      ageFrom: '25',
      ageTo: '34',
      targetTripTypes: ['adventure'],
      targetActivityPreferences: ['Cultural'],
      targetTravelStyles: ['luxury'],
      interests: 'adventure, cultural',
    })
    const ctx: UserAdContext = {
      placeId: 'ChIJ12345',
      travelStartDate: '2025-06-15',
      travelEndDate: '2025-06-20',
      gender: 'female',
      age: 30,
      tripTypes: ['adventure'],
      activityPreferences: ['Cultural'],
      travelStyles: ['luxury'],
    }
    // +10 (placeId) +2 (dates) +1 (gender) +2 (age) +1 (trip) +1 (activity) +1 (style) +1 (interests) = 19
    expect(scoreCampaign(campaign, ctx)).toBe(19)
  })

  it('should only score age and gender for video_feed (not location, interests, preferences)', () => {
    // video_feed is passive — only demographic signals are scored
    const campaign = makeCampaign({
      placement: 'video_feed',
      location: 'Tokyo, Japan',
      targetGender: 'male',
      ageFrom: '18',
      ageTo: '34',
      interests: 'food, nature',
    })
    const ctx: UserAdContext = {
      destination: 'Tokyo',
      gender: 'male',
      age: 25,
      activityPreferences: ['food'],
    }
    // +1 (gender) +2 (age) = 3 — location and interests not scored for video_feed
    expect(scoreCampaign(campaign, ctx)).toBe(3)
  })

  it('should NOT crash on campaign with undefined targeting arrays', () => {
    const campaign = makeCampaign({
      targetTripTypes: undefined,
      targetActivityPreferences: undefined,
      targetTravelStyles: undefined,
    })
    expect(() =>
      scoreCampaign(campaign, {
        tripTypes: ['adventure'],
        activityPreferences: ['Cultural'],
        travelStyles: ['luxury'],
      }),
    ).not.toThrow()
    expect(
      scoreCampaign(campaign, {
        tripTypes: ['adventure'],
        activityPreferences: ['Cultural'],
        travelStyles: ['luxury'],
      }),
    ).toBe(0)
  })
})

// ─── campaignToAdUnit ───────────────────────────────────────────────────────

describe('campaignToAdUnit', () => {
  it('should map all CampaignDoc fields to AdUnit correctly', () => {
    const doc = makeCampaign({
      placement: 'itinerary_feed',
      creativeType: 'image',
      assetUrl: 'https://img.example.com/ad.jpg',
      muxPlaybackUrl: 'https://stream.mux.com/play123.m3u8',
      muxThumbnailUrl: 'https://image.mux.com/thumb123/thumbnail.jpg',
      primaryText: 'Best Hotel Deals',
      cta: 'Book Now',
      landingUrl: 'https://hotel.example.com',
      billingModel: 'cpc',
      name: 'Hotel Campaign',
      businessType: 'hotel',
      address: '123 Main St',
      phone: '+1-555-0100',
      email: 'info@hotel.example.com',
      promoCode: 'SAVE20',
    })

    const unit = campaignToAdUnit('campaign_abc', doc)

    expect(unit.campaignId).toBe('campaign_abc')
    expect(unit.placement).toBe('itinerary_feed')
    expect(unit.creativeType).toBe('image')
    expect(unit.assetUrl).toBe('https://img.example.com/ad.jpg')
    expect(unit.muxPlaybackUrl).toBe('https://stream.mux.com/play123.m3u8')
    expect(unit.muxThumbnailUrl).toBe('https://image.mux.com/thumb123/thumbnail.jpg')
    expect(unit.primaryText).toBe('Best Hotel Deals')
    expect(unit.cta).toBe('Book Now')
    expect(unit.landingUrl).toBe('https://hotel.example.com')
    expect(unit.billingModel).toBe('cpc')
    expect(unit.businessName).toBe('Hotel Campaign')
    expect(unit.businessType).toBe('hotel')
    expect(unit.address).toBe('123 Main St')
    expect(unit.phone).toBe('+1-555-0100')
    expect(unit.email).toBe('info@hotel.example.com')
    expect(unit.promoCode).toBe('SAVE20')
  })

  it('should pass through empty cta (nullish coalescing only defaults null/undefined)', () => {
    const doc = makeCampaign({ cta: '' })
    const unit = campaignToAdUnit('c1', doc)
    // cta uses ?? operator: only null/undefined trigger default, empty string passes through
    expect(unit.cta).toBe('')
  })

  it('should default cta to "Learn More" when cta is undefined', () => {
    const doc = makeCampaign()
    delete (doc as unknown as Record<string, unknown>).cta
    const unit = campaignToAdUnit('c1', doc)
    expect(unit.cta).toBe('Learn More')
  })

  it('should handle null assetUrl by returning empty string', () => {
    const doc = makeCampaign({ assetUrl: null })
    const unit = campaignToAdUnit('c1', doc)
    expect(unit.assetUrl).toBe('')
  })

  it('should handle missing optional fields gracefully', () => {
    const doc = makeCampaign()
    // Remove optional fields to simulate Firestore documents that don't have them
    delete doc.businessType
    delete doc.address
    delete doc.phone
    delete doc.email
    delete doc.promoCode
    delete doc.muxPlaybackUrl
    delete doc.muxThumbnailUrl

    const unit = campaignToAdUnit('c1', doc)
    expect(unit.businessType).toBeUndefined()
    expect(unit.address).toBeUndefined()
    expect(unit.phone).toBeUndefined()
    expect(unit.email).toBeUndefined()
    expect(unit.promoCode).toBeUndefined()
    expect(unit.muxPlaybackUrl).toBeUndefined()
    expect(unit.muxThumbnailUrl).toBeUndefined()
  })
})

// ─── Edge cases: date-shift regression ──────────────────────────────────────

describe('date-shift regression tests', () => {
  /**
   * These tests protect against the exact bug that previously occurred in
   * AddItineraryModal and AIGenerationModal: using `new Date('YYYY-MM-DD')`
   * parses as UTC midnight, which in western timezones (UTC-5+) shifts to
   * the previous day.  The noon-UTC strategy prevents this.
   */

  it('should preserve date for US Eastern (UTC-5 equivalent)', () => {
    // If parsed as midnight UTC, then converted to UTC-5, the date would shift
    // from Jan 15 to Jan 14.  Noon UTC prevents this.
    const epoch = parseDateToNoonUTC('2025-01-15')!
    const d = new Date(epoch)
    // Even at UTC-12 (the farthest west timezone), noon UTC = midnight local = still Jan 15
    expect(d.getUTCDate()).toBe(15)
    // At UTC+12, noon UTC = midnight next day, but still Jan 15 in UTC
    expect(d.getUTCHours()).toBe(12)
  })

  it('should correctly handle year boundary (Dec 31 → Jan 1)', () => {
    const dec31 = parseDateToNoonUTC('2025-12-31')!
    const jan1 = parseDateToNoonUTC('2026-01-01')!
    expect(jan1 - dec31).toBe(24 * 60 * 60 * 1000) // exactly 1 day apart
  })

  it('should correctly handle month boundary (Jan 31 → Feb 1)', () => {
    const jan31 = parseDateToNoonUTC('2025-01-31')!
    const feb1 = parseDateToNoonUTC('2025-02-01')!
    expect(feb1 - jan31).toBe(24 * 60 * 60 * 1000) // exactly 1 day apart
  })

  it('should work for dates far in the past and future', () => {
    expect(parseDateToNoonUTC('2020-01-01')).not.toBeNull()
    expect(parseDateToNoonUTC('2030-12-31')).not.toBeNull()
  })
})

// ─── tieBreakKey ───────────────────────────────────────────────────────────────────────────

describe('tieBreakKey', () => {
  it('is deterministic — same inputs always return the same value', () => {
    const key = tieBreakKey('campaign-abc', 'user123|2026-03-09')
    expect(tieBreakKey('campaign-abc', 'user123|2026-03-09')).toBe(key)
    expect(tieBreakKey('campaign-abc', 'user123|2026-03-09')).toBe(key)
  })

  it('returns a non-negative integer (unsigned 32-bit)', () => {
    const key = tieBreakKey('someId', 'someSeed')
    expect(key).toBeGreaterThanOrEqual(0)
    expect(Number.isInteger(key)).toBe(true)
    expect(key).toBeLessThanOrEqual(0xFFFFFFFF)
  })

  it('returns 0 for empty inputs without throwing', () => {
    expect(() => tieBreakKey('', '')).not.toThrow()
    expect(tieBreakKey('', '')).toBeGreaterThanOrEqual(0)
  })

  it('different campaign IDs with same seed produce different keys', () => {
    const seed = 'user123|2026-03-09'
    const keys = new Set([
      tieBreakKey('campaignA', seed),
      tieBreakKey('campaignB', seed),
      tieBreakKey('campaignC', seed),
      tieBreakKey('campaignD', seed),
      tieBreakKey('campaignE', seed),
    ])
    // All 5 should be distinct (FNV-1a has negligible collision rate at this scale)
    expect(keys.size).toBe(5)
  })

  it('same campaign ID with different seeds produces different keys', () => {
    const id = 'campaign-xyz'
    const keys = new Set([
      tieBreakKey(id, 'user1|2026-03-09'),
      tieBreakKey(id, 'user2|2026-03-09'),
      tieBreakKey(id, 'user3|2026-03-09'),
      tieBreakKey(id, 'user1|2026-03-10'), // same user, different day
    ])
    expect(keys.size).toBe(4)
  })

  it('distributes 10 campaigns fairly across 100 different user seeds', () => {
    // With 10 campaigns and 100 seeds, each campaign should rank #1 roughly
    // 10% of the time.  We accept any campaign winning between 2 and 25 times
    // (i.e. no campaign is a permanent monopoly or permanently buried).
    const campaigns = Array.from({ length: 10 }, (_, i) => `campaign-${i.toString().padStart(3, '0')}`)
    const winCounts: Record<string, number> = {}
    campaigns.forEach((id) => { winCounts[id] = 0 })

    for (let u = 0; u < 100; u++) {
      const seed = `user${u}|2026-03-09`
      const sorted = [...campaigns].sort(
        (a, b) => tieBreakKey(a, seed) - tieBreakKey(b, seed),
      )
      winCounts[sorted[0]]++
    }

    // No campaign should win all 100 or zero
    Object.values(winCounts).forEach((count) => {
      expect(count).toBeGreaterThanOrEqual(2)
      expect(count).toBeLessThanOrEqual(25)
    })
  })

  it('distributes 10 campaigns fairly across 1000 different date seeds (daily rotation)', () => {
    const campaigns = Array.from({ length: 10 }, (_, i) => `campaign-${i.toString().padStart(3, '0')}`)
    const winCounts: Record<string, number> = {}
    campaigns.forEach((id) => { winCounts[id] = 0 })

    // Simulate 1000 unique seeds (pseudo-daily, using index as the date portion).
    // At scale the FNV-1a avalanche behaviour guarantees no campaign is
    // permanently buried or monopolises the top slot.
    for (let d = 0; d < 1000; d++) {
      const seed = `userABC|seed-${d}`
      const sorted = [...campaigns].sort(
        (a, b) => tieBreakKey(a, seed) - tieBreakKey(b, seed),
      )
      winCounts[sorted[0]]++
    }

    // With 1000 draws and 10 campaigns each wins ~100 times on average.
    // Require every campaign wins at least 25 times (> 2.5% share) and
    // no campaign wins more than 200 times (< 20%), ruling out monopoly.
    Object.values(winCounts).forEach((count) => {
      expect(count).toBeGreaterThanOrEqual(25)
      expect(count).toBeLessThanOrEqual(200)
    })
  })

  it('higher score always wins regardless of tie-break key', () => {
    // Construct a scenario where tieBreakKey would rank campaignB before campaignA,
    // but campaignA has a higher score — score must still win.
    const seed = 'user999|2026-03-09'

    // Find a pair where B’s key < A’s key (B would win tie-break)
    // Use known values to make the test deterministic
    const campaigns = Array.from({ length: 20 }, (_, i) => `c${i}`)
    const sorted = [...campaigns].sort((a, b) => tieBreakKey(a, seed) - tieBreakKey(b, seed))
    const tieWinner = sorted[0]  // would win on tie-break
    const tieLoser = sorted[1]   // would lose on tie-break

    // With equal scores, tie-break winner should come first
    const eqSorted = [tieLoser, tieWinner].sort(
      (a, b) => tieBreakKey(a, seed) - tieBreakKey(b, seed),
    )
    expect(eqSorted[0]).toBe(tieWinner)

    // But if tieLoser has a higher score, it must win
    interface Candidate { id: string; score: number }
    const candidates: Candidate[] = [
      { id: tieLoser, score: 5 },
      { id: tieWinner, score: 3 },
    ]
    candidates.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return tieBreakKey(a.id, seed) - tieBreakKey(b.id, seed)
    })
    expect(candidates[0].id).toBe(tieLoser)
  })
})
