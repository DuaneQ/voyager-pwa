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

  it('should score +3 for exact placeId match', () => {
    const campaign = makeCampaign({ targetPlaceId: 'ChIJ12345' })
    expect(scoreCampaign(campaign, { placeId: 'ChIJ12345' })).toBe(3)
  })

  it('should NOT score placeId for partial match', () => {
    const campaign = makeCampaign({ targetPlaceId: 'ChIJ12345' })
    expect(scoreCampaign(campaign, { placeId: 'ChIJ12345_extra' })).toBe(0)
  })

  it('should score +2 for destination string match (exact)', () => {
    const campaign = makeCampaign({ targetDestination: 'Paris' })
    expect(scoreCampaign(campaign, { destination: 'Paris' })).toBe(2)
  })

  it('should score +2 for destination string match (case-insensitive)', () => {
    const campaign = makeCampaign({ targetDestination: 'paris' })
    expect(scoreCampaign(campaign, { destination: 'PARIS' })).toBe(2)
  })

  it('should score +2 for destination substring match (campaign contains user)', () => {
    const campaign = makeCampaign({ targetDestination: 'Paris, France' })
    expect(scoreCampaign(campaign, { destination: 'Paris' })).toBe(2)
  })

  it('should prefer placeId over destination when both are present', () => {
    const campaign = makeCampaign({
      targetPlaceId: 'ChIJ12345',
      targetDestination: 'Paris',
    })
    // When placeId matches, it's +3 and destination is not checked
    expect(scoreCampaign(campaign, { placeId: 'ChIJ12345', destination: 'Paris' })).toBe(3)
  })

  // ── Location field fallback (video_feed / ai_slot) ───────────────────────

  it('should score +2 for location field string match (video_feed/ai_slot fallback)', () => {
    const campaign = makeCampaign({ location: 'Tokyo, Japan' })
    expect(scoreCampaign(campaign, { destination: 'Tokyo' })).toBe(2)
  })

  it('should score +2 for location field exact match', () => {
    const campaign = makeCampaign({ location: 'Barcelona' })
    expect(scoreCampaign(campaign, { destination: 'Barcelona' })).toBe(2)
  })

  it('should prefer targetDestination over location when both present', () => {
    const campaign = makeCampaign({
      targetDestination: 'Paris',
      location: 'London',
    })
    // targetDestination is resolved first, so "Paris" matches the user's "Paris"
    expect(scoreCampaign(campaign, { destination: 'Paris' })).toBe(2)
  })

  it('should fall back to location if targetDestination is empty', () => {
    const campaign = makeCampaign({
      targetDestination: '',
      location: 'Rome, Italy',
    })
    expect(scoreCampaign(campaign, { destination: 'Rome' })).toBe(2)
  })

  it('should NOT score location when there is no user destination', () => {
    const campaign = makeCampaign({ location: 'Tokyo' })
    expect(scoreCampaign(campaign, { gender: 'female' })).toBe(0)
  })

  it('should score +2 for date overlap', () => {
    const campaign = makeCampaign({
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

  it('should NOT score date overlap when ranges do not overlap', () => {
    const campaign = makeCampaign({
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

  it('should NOT penalize when campaign has dates but user does not', () => {
    const campaign = makeCampaign({
      targetTravelStartDate: '2025-06-01',
      targetTravelEndDate: '2025-06-30',
    })
    expect(scoreCampaign(campaign, { destination: 'Paris' })).toBe(0)
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

  it('should score +1 for trip type overlap', () => {
    const campaign = makeCampaign({ targetTripTypes: ['adventure', 'romantic'] })
    expect(scoreCampaign(campaign, { tripTypes: ['adventure'] })).toBe(1)
  })

  it('should score +1 for trip type overlap (case-insensitive)', () => {
    const campaign = makeCampaign({ targetTripTypes: ['Adventure'] })
    expect(scoreCampaign(campaign, { tripTypes: ['adventure'] })).toBe(1)
  })

  it('should NOT score trip types when no overlap', () => {
    const campaign = makeCampaign({ targetTripTypes: ['adventure'] })
    expect(scoreCampaign(campaign, { tripTypes: ['romantic'] })).toBe(0)
  })

  it('should score +1 for activity preference overlap', () => {
    const campaign = makeCampaign({ targetActivityPreferences: ['Cultural', 'Nightlife'] })
    expect(scoreCampaign(campaign, { activityPreferences: ['Nightlife'] })).toBe(1)
  })

  it('should score +1 for travel style overlap', () => {
    const campaign = makeCampaign({ targetTravelStyles: ['luxury', 'mid-range'] })
    expect(scoreCampaign(campaign, { travelStyles: ['luxury'] })).toBe(1)
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

  it('should score +1 when campaign interests overlap with user activity preferences', () => {
    const campaign = makeCampaign({ interests: 'beach, adventure, nightlife' })
    expect(scoreCampaign(campaign, { activityPreferences: ['Nightlife'] })).toBe(1)
  })

  it('should score +1 when campaign interests overlap with user trip types', () => {
    const campaign = makeCampaign({ interests: 'adventure, romantic' })
    expect(scoreCampaign(campaign, { tripTypes: ['adventure'] })).toBe(1)
  })

  it('should score +1 when campaign interests overlap with user travel styles', () => {
    const campaign = makeCampaign({ interests: 'luxury, beach' })
    expect(scoreCampaign(campaign, { travelStyles: ['luxury'] })).toBe(1)
  })

  it('should score +1 for partial keyword match in interests', () => {
    const campaign = makeCampaign({ interests: 'beach travel, family' })
    expect(scoreCampaign(campaign, { tripTypes: ['family'] })).toBe(1)
  })

  it('should NOT score interests when no overlap', () => {
    const campaign = makeCampaign({ interests: 'shopping, spa' })
    expect(scoreCampaign(campaign, { tripTypes: ['adventure'], activityPreferences: ['Nightlife'] })).toBe(0)
  })

  it('should NOT score interests when user has no context', () => {
    const campaign = makeCampaign({ interests: 'beach, adventure' })
    expect(scoreCampaign(campaign, { gender: 'male' })).toBe(0)
  })

  // ── Full accumulation with age + interests ────────────────────────────────

  it('should accumulate scores across all matching fields', () => {
    const campaign = makeCampaign({
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
    // +3 (placeId) +2 (dates) +1 (gender) +2 (age) +1 (trip) +1 (activity) +1 (style) +1 (interests) = 12
    expect(scoreCampaign(campaign, ctx)).toBe(12)
  })

  it('should accumulate scores using location field instead of targetDestination', () => {
    // Simulates a video_feed campaign that stores destination in `location`
    const campaign = makeCampaign({
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
    // +2 (location→destination string) +1 (gender) +2 (age) +1 (interests via activityPreferences) = 6
    expect(scoreCampaign(campaign, ctx)).toBe(6)
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
