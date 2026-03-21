/**
 * Unit tests for logAdEvents Cloud Function helpers
 *
 * Tests the event validation, date conversion, billing constants, and
 * edge cases exported via logAdEvents._testing.  The onCall function itself
 * is not invoked here — it depends on Firestore / firebase-admin.
 */

import { _testing } from '../logAdEvents'

const {
  validateEvent,
  epochToDateKey,
  MAX_EVENTS_PER_REQUEST,
  MAX_EVENT_AGE_MS,
  MAX_FUTURE_DRIFT_MS,
  CPM_RATE_CENTS,
  CPC_RATE_CENTS,
  CPC_IMPRESSION_FLOOR_RATE_CENTS,
} = _testing

// ─── epochToDateKey ─────────────────────────────────────────────────────────

describe('epochToDateKey', () => {
  it('should convert epoch ms to YYYY-MM-DD in UTC', () => {
    // 2025-06-15T12:00:00Z
    const epoch = Date.UTC(2025, 5, 15, 12, 0, 0)
    expect(epochToDateKey(epoch)).toBe('2025-06-15')
  })

  it('should handle midnight UTC correctly', () => {
    // 2025-01-01T00:00:00Z — should be Jan 1, not Dec 31
    const epoch = Date.UTC(2025, 0, 1, 0, 0, 0)
    expect(epochToDateKey(epoch)).toBe('2025-01-01')
  })

  it('should handle just-before-midnight UTC', () => {
    // 2025-01-01T23:59:59.999Z — should still be Jan 1
    const epoch = Date.UTC(2025, 0, 1, 23, 59, 59, 999)
    expect(epochToDateKey(epoch)).toBe('2025-01-01')
  })

  it('should pad single-digit months and days', () => {
    const epoch = Date.UTC(2025, 0, 5, 10, 0, 0)
    expect(epochToDateKey(epoch)).toBe('2025-01-05')
  })

  it('should handle Dec 31', () => {
    const epoch = Date.UTC(2025, 11, 31, 18, 0, 0)
    expect(epochToDateKey(epoch)).toBe('2025-12-31')
  })

  it('should handle leap year Feb 29', () => {
    const epoch = Date.UTC(2024, 1, 29, 6, 0, 0)
    expect(epochToDateKey(epoch)).toBe('2024-02-29')
  })
})

// ─── validateEvent ──────────────────────────────────────────────────────────

describe('validateEvent', () => {
  const NOW = Date.now()

  /** Build a valid event for overriding in tests. */
  function makeEvent(overrides: Record<string, unknown> = {}) {
    return {
      type: 'impression',
      campaignId: 'camp_abc123',
      timestamp: NOW - 1000, // 1 second ago
      ...overrides,
    }
  }

  describe('valid events', () => {
    it('should accept a valid impression event', () => {
      expect(validateEvent(makeEvent(), NOW)).toBeNull()
    })

    it('should accept a valid click event', () => {
      expect(validateEvent(makeEvent({ type: 'click' }), NOW)).toBeNull()
    })

    it('should accept a valid video_quartile event with quartile 25', () => {
      expect(
        validateEvent(makeEvent({ type: 'video_quartile', quartile: 25 }), NOW),
      ).toBeNull()
    })

    it('should accept a valid video_quartile event with quartile 50', () => {
      expect(
        validateEvent(makeEvent({ type: 'video_quartile', quartile: 50 }), NOW),
      ).toBeNull()
    })

    it('should accept a valid video_quartile event with quartile 75', () => {
      expect(
        validateEvent(makeEvent({ type: 'video_quartile', quartile: 75 }), NOW),
      ).toBeNull()
    })

    it('should accept a valid video_quartile event with quartile 100', () => {
      expect(
        validateEvent(makeEvent({ type: 'video_quartile', quartile: 100 }), NOW),
      ).toBeNull()
    })

    it('should accept an event at the exact max age boundary', () => {
      const event = makeEvent({ timestamp: NOW - MAX_EVENT_AGE_MS })
      expect(validateEvent(event, NOW)).toBeNull()
    })

    it('should accept an event with slight future drift (within boundary)', () => {
      const event = makeEvent({ timestamp: NOW + MAX_FUTURE_DRIFT_MS - 1000 })
      expect(validateEvent(event, NOW)).toBeNull()
    })
  })

  describe('invalid type', () => {
    it('should reject null event', () => {
      expect(validateEvent(null, NOW)).toBe('event must be an object')
    })

    it('should reject undefined event', () => {
      expect(validateEvent(undefined, NOW)).toBe('event must be an object')
    })

    it('should reject string event', () => {
      expect(validateEvent('not an event', NOW)).toBe('event must be an object')
    })

    it('should reject event with missing type', () => {
      const result = validateEvent({ campaignId: 'c1', timestamp: NOW }, NOW)
      expect(result).toContain('invalid event type')
    })

    it('should reject event with unknown type', () => {
      const result = validateEvent(makeEvent({ type: 'unknown_type' }), NOW)
      expect(result).toContain('invalid event type')
    })

    it('should reject event with numeric type', () => {
      const result = validateEvent(makeEvent({ type: 42 }), NOW)
      expect(result).toContain('invalid event type')
    })
  })

  describe('invalid campaignId', () => {
    it('should reject missing campaignId', () => {
      const result = validateEvent(makeEvent({ campaignId: undefined }), NOW)
      expect(result).toContain('campaignId is required')
    })

    it('should reject empty campaignId', () => {
      const result = validateEvent(makeEvent({ campaignId: '' }), NOW)
      expect(result).toContain('campaignId is required')
    })

    it('should reject campaignId with slash (Firestore injection)', () => {
      const result = validateEvent(makeEvent({ campaignId: 'camp/../../etc' }), NOW)
      expect(result).toContain('invalid characters')
    })

    it('should reject campaignId longer than 128 chars', () => {
      const longId = 'a'.repeat(129)
      const result = validateEvent(makeEvent({ campaignId: longId }), NOW)
      expect(result).toContain('too long')
    })

    it('should accept campaignId of exactly 128 chars', () => {
      const maxId = 'a'.repeat(128)
      expect(validateEvent(makeEvent({ campaignId: maxId }), NOW)).toBeNull()
    })
  })

  describe('timestamp validation', () => {
    it('should reject non-numeric timestamp', () => {
      const result = validateEvent(makeEvent({ timestamp: 'yesterday' }), NOW)
      expect(result).toContain('timestamp must be a finite number')
    })

    it('should reject NaN timestamp', () => {
      const result = validateEvent(makeEvent({ timestamp: NaN }), NOW)
      expect(result).toContain('timestamp must be a finite number')
    })

    it('should reject Infinity timestamp', () => {
      const result = validateEvent(makeEvent({ timestamp: Infinity }), NOW)
      expect(result).toContain('timestamp must be a finite number')
    })

    it('should reject event older than MAX_EVENT_AGE_MS', () => {
      const event = makeEvent({ timestamp: NOW - MAX_EVENT_AGE_MS - 1000 })
      const result = validateEvent(event, NOW)
      expect(result).toContain('too old')
    })

    it('should reject event too far in the future', () => {
      const event = makeEvent({ timestamp: NOW + MAX_FUTURE_DRIFT_MS + 5000 })
      const result = validateEvent(event, NOW)
      expect(result).toContain('too far in the future')
    })
  })

  describe('video_quartile validation', () => {
    it('should reject video_quartile without quartile field', () => {
      const result = validateEvent(makeEvent({ type: 'video_quartile' }), NOW)
      expect(result).toContain('quartile')
    })

    it('should reject video_quartile with invalid quartile value', () => {
      const result = validateEvent(
        makeEvent({ type: 'video_quartile', quartile: 33 }),
        NOW,
      )
      expect(result).toContain('quartile')
    })

    it('should reject video_quartile with quartile 0', () => {
      const result = validateEvent(
        makeEvent({ type: 'video_quartile', quartile: 0 }),
        NOW,
      )
      expect(result).toContain('quartile')
    })

    it('should reject video_quartile with string quartile', () => {
      const result = validateEvent(
        makeEvent({ type: 'video_quartile', quartile: '25' }),
        NOW,
      )
      expect(result).toContain('quartile')
    })
  })
})

// ─── Billing constants ──────────────────────────────────────────────────────

// ─── Billing constant sync guard ───────────────────────────────────────────
// These tests pin the three rate constants exported by logAdEvents.ts.
// If any value changes here it MUST also be updated in the ads portal:
//   voyager-ads/src/config/pricingConstants.ts
//     CPM_RATE_CENTS          ↔  price.CPM * 100        (currently 500)
//     CPC_RATE_CENTS          ↔  price.CPC * 100        (currently 50)
//     CPC_IMPRESSION_FLOOR_RATE_CENTS  ↔  CPC_IMPRESSION_FLOOR_CPM * 100  (currently 50)
// ─────────────────────────────────────────────────────────────────────────────
describe('billing constants', () => {
  it('should have CPM rate of $5.00 (500 cents per 1000 impressions)', () => {
    expect(CPM_RATE_CENTS).toBe(500)
    // Cost per single impression: 0.5 cents
    expect(Math.round((1 * CPM_RATE_CENTS) / 1000 * 100) / 100).toBe(0.5)
  })

  it('should have CPC rate of $0.50 (50 cents per click)', () => {
    expect(CPC_RATE_CENTS).toBe(50)
  })

  it('should have CPC impression floor rate of $0.50 per 1,000 impressions (50 cents)', () => {
    expect(CPC_IMPRESSION_FLOOR_RATE_CENTS).toBe(50)
    // Floor is 10% of CPM_RATE_CENTS ($5.00)
    expect(CPC_IMPRESSION_FLOOR_RATE_CENTS).toBe(CPM_RATE_CENTS / 10)
  })

  it('should have max events per request of 50', () => {
    expect(MAX_EVENTS_PER_REQUEST).toBe(50)
  })

  it('should have max event age of 5 minutes (300000ms)', () => {
    expect(MAX_EVENT_AGE_MS).toBe(300000)
  })

  it('should have max future drift of 30 seconds (30000ms)', () => {
    expect(MAX_FUTURE_DRIFT_MS).toBe(30000)
  })
})

// ─── Billing computation edge cases ─────────────────────────────────────────

describe('billing computation edge cases', () => {
  // Running-total CPM formula: floor((prev+new)*rate) - floor(prev*rate)
  // This correctly tracks fractional-cent debt across batches using totalImpressions.
  const computeCpmCharge = (prevImpressions: number, newImpressions: number) =>
    Math.floor((prevImpressions + newImpressions) * CPM_RATE_CENTS / 1000) -
    Math.floor(prevImpressions * CPM_RATE_CENTS / 1000)

  it('should compute CPM charge correctly for various impression counts (new campaign, prev=0)', () => {
    // prev=0, batch=1: floor(0.5) - floor(0) = 0 — sub-cent, no charge yet
    expect(computeCpmCharge(0, 1)).toBe(0)

    // prev=0, batch=2: floor(1) - floor(0) = 1 cent ✓
    expect(computeCpmCharge(0, 2)).toBe(1)

    // prev=0, batch=10: floor(5) - floor(0) = 5 cents ✓
    expect(computeCpmCharge(0, 10)).toBe(5)

    // prev=0, batch=1000: exactly 500 cents ($5.00) ✓
    expect(computeCpmCharge(0, 1000)).toBe(500)

    // prev=0, batch=0: 0 cents ✓
    expect(computeCpmCharge(0, 0)).toBe(0)
  })

  it('should recover the fractional-cent debt on the next impression', () => {
    // 1st impression (prev=0→1): 0 cents owed, cost 0
    expect(computeCpmCharge(0, 1)).toBe(0)
    // 2nd impression (prev=1→2): crosses whole-cent boundary, costs 1 cent ✓
    expect(computeCpmCharge(1, 1)).toBe(1)
    // 3rd impression (prev=2→3): 0 again
    expect(computeCpmCharge(2, 1)).toBe(0)
    // 4th impression (prev=3→4): costs 1 cent again ✓
    expect(computeCpmCharge(3, 1)).toBe(1)
    // Average: 4 impressions → 2 charges = 0.5 cents each = $5 CPM ✓
  })

  it('should compute CPM correctly for ongoing campaign with large prev total', () => {
    // Campaign has had 999 impressions; next batch of 1 tips to 1000 → 1 cent
    expect(computeCpmCharge(999, 1)).toBe(1) // floor(1000*0.5) - floor(999*0.5) = 500 - 499 = 1
    // Campaign at 1000; next 1 impression: floor(1000.5) - floor(500) = 500 - 500 = 0
    expect(computeCpmCharge(1000, 1)).toBe(0)
    // Campaign at 1000; next 100 impressions: floor(550) - floor(500) = 50 cents ✓
    expect(computeCpmCharge(1000, 100)).toBe(50)
  })

  it('should compute CPC charge correctly — clicks only (zero impressions)', () => {
    const computeCharge = (clicks: number, impressions: number, prev = 0) => {
      const floor = Math.floor((prev + impressions) * CPC_IMPRESSION_FLOOR_RATE_CENTS / 1000) -
                    Math.floor(prev * CPC_IMPRESSION_FLOOR_RATE_CENTS / 1000)
      return floor + clicks * CPC_RATE_CENTS
    }

    expect(computeCharge(0, 0)).toBe(0)
    expect(computeCharge(1, 0)).toBe(50) // $0.50 per click, no floor
    expect(computeCharge(10, 0)).toBe(500) // $5.00 in clicks
    expect(computeCharge(100, 0)).toBe(5000) // $50.00 in clicks
  })

  it('should compute CPC charge correctly — impressions only (zero clicks)', () => {
    const computeFloor = (impressions: number, prev = 0) =>
      Math.floor((prev + impressions) * CPC_IMPRESSION_FLOOR_RATE_CENTS / 1000) -
      Math.floor(prev * CPC_IMPRESSION_FLOOR_RATE_CENTS / 1000)

    // 1,000 impressions × $0.50 / 1,000 = 50 cents floor ✓
    expect(computeFloor(1000)).toBe(50)
    // 0 impressions → 0 charge ✓
    expect(computeFloor(0)).toBe(0)
    // 500 impressions → floor(25) = 25 cents ✓
    expect(computeFloor(500)).toBe(25)
  })

  it('should compute CPC charge correctly — combined clicks and impressions', () => {
    const computeCharge = (clicks: number, impressions: number, prev = 0) => {
      const floor = Math.floor((prev + impressions) * CPC_IMPRESSION_FLOOR_RATE_CENTS / 1000) -
                    Math.floor(prev * CPC_IMPRESSION_FLOOR_RATE_CENTS / 1000)
      return floor + clicks * CPC_RATE_CENTS
    }

    // 5 clicks + 1,000 impressions → (50) + (5 × 50) = 300 cents ✓
    expect(computeCharge(5, 1000)).toBe(300)
    // 1 click + 2,000 impressions → (100) + (50) = 150 cents ✓
    expect(computeCharge(1, 2000)).toBe(150)
  })
})

// ─── Daily spend proportional allocation ────────────────────────────────────
// Verifies that the proportional allocation algorithm distributes chargeCents
// across days so the sum equals the total (no rounding divergence).
describe('daily spend proportional allocation', () => {
  // Running-total charge helper (mirrors logAdEvents production formula, prev=0 for new campaigns)
  const runningTotalCharge = (impressions: number, prev = 0) =>
    Math.floor((prev + impressions) * CPM_RATE_CENTS / 1000) -
    Math.floor(prev * CPM_RATE_CENTS / 1000)

  // Helper mirrors the allocation logic from logAdEvents
  function allocateDayCharges(
    dailyImpressions: Map<string, number>,
    totalImpressions: number,
    chargeCents: number,
  ): Map<string, number> {
    const dayChargeMap = new Map<string, number>()
    let allocated = 0
    let largestDay = ''
    let largestImp = 0
    for (const [dk, dayImp] of dailyImpressions) {
      const share = totalImpressions > 0
        ? Math.floor((dayImp / totalImpressions) * chargeCents)
        : 0
      dayChargeMap.set(dk, share)
      allocated += share
      if (dayImp > largestImp) {
        largestImp = dayImp
        largestDay = dk
      }
    }
    const remainder = chargeCents - allocated
    if (remainder > 0 && largestDay) {
      dayChargeMap.set(largestDay, (dayChargeMap.get(largestDay) ?? 0) + remainder)
    }
    return dayChargeMap
  }

  it('should sum daily charges to exactly chargeCents for single day', () => {
    // 3 impressions, prev=0 → floor(3*0.5) - floor(0) = 1 cent
    const daily = new Map([['2026-03-01', 3]])
    const total = 3
    const charge = runningTotalCharge(total) // 1 cent
    const result = allocateDayCharges(daily, total, charge)

    const sum = Array.from(result.values()).reduce((a, b) => a + b, 0)
    expect(sum).toBe(charge)
  })

  it('should sum daily charges to exactly chargeCents for two days — avoiding rounding divergence', () => {
    // 1 impression per day, 2 total → charge = floor(2*0.5) - 0 = 1 cent
    // Independent rounding per-day would give: floor(1*0.5) = 0 each → sum 0 ≠ 1
    // Proportional allocation gives: 0 each, remainder 1 to largest → sum = 1 ✓
    const daily = new Map([['2026-03-01', 1], ['2026-03-02', 1]])
    const total = 2
    const charge = runningTotalCharge(total) // 1 cent
    const result = allocateDayCharges(daily, total, charge)

    const sum = Array.from(result.values()).reduce((a, b) => a + b, 0)
    expect(sum).toBe(charge)
  })

  it('should handle uneven impression splits across days', () => {
    // 7 on Day A, 3 on Day B → 10 total → charge = floor(10*0.5) = 5 cents
    const daily = new Map([['2026-03-01', 7], ['2026-03-02', 3]])
    const total = 10
    const charge = runningTotalCharge(total) // 5 cents
    const result = allocateDayCharges(daily, total, charge)

    const sum = Array.from(result.values()).reduce((a, b) => a + b, 0)
    expect(sum).toBe(charge)
    // Day A gets proportionally more
    expect(result.get('2026-03-01')!).toBeGreaterThanOrEqual(result.get('2026-03-02')!)
  })

  it('should handle three-day split with remainder', () => {
    // 1 impression per day × 3 days → charge = floor(3*0.5) = 1 cent
    // floor(1/3 * 1) = 0 per day → remainder 1 goes to first (largest; tied, first wins) → sum = 1 ✓
    const daily = new Map([['2026-03-01', 1], ['2026-03-02', 1], ['2026-03-03', 1]])
    const total = 3
    const charge = runningTotalCharge(total) // 1 cent
    const result = allocateDayCharges(daily, total, charge)

    const sum = Array.from(result.values()).reduce((a, b) => a + b, 0)
    expect(sum).toBe(charge)
  })

  it('should return zero for all days when chargeCents is 0', () => {
    const daily = new Map([['2026-03-01', 0], ['2026-03-02', 0]])
    const result = allocateDayCharges(daily, 0, 0)

    const sum = Array.from(result.values()).reduce((a, b) => a + b, 0)
    expect(sum).toBe(0)
  })
})

// ─── Anti-spoofing edge cases ───────────────────────────────────────────────

describe('anti-spoofing edge cases', () => {
  const NOW = Date.now()

  it('should not accept events with object as campaignId', () => {
    const event = {
      type: 'impression',
      campaignId: { '$regex': '.*' },
      timestamp: NOW - 1000,
    }
    expect(validateEvent(event, NOW)).toContain('campaignId is required')
  })

  it('should not accept events with array as campaignId', () => {
    const event = {
      type: 'impression',
      campaignId: ['camp1', 'camp2'],
      timestamp: NOW - 1000,
    }
    expect(validateEvent(event, NOW)).toContain('campaignId is required')
  })

  it('should not accept events with Firestore path traversal in campaignId', () => {
    const event = {
      type: 'impression',
      campaignId: '../../../users/admin',
      timestamp: NOW - 1000,
    }
    const result = validateEvent(event, NOW)
    expect(result).not.toBeNull()
  })

  it('should reject replayed events (> 5 min old)', () => {
    const event = {
      type: 'impression',
      campaignId: 'camp_abc',
      timestamp: NOW - 6 * 60 * 1000, // 6 minutes ago
    }
    const result = validateEvent(event, NOW)
    expect(result).toContain('too old')
  })

  it('should reject events with future timestamps (> 30s ahead)', () => {
    const event = {
      type: 'impression',
      campaignId: 'camp_abc',
      timestamp: NOW + 60 * 1000, // 60 seconds in the future
    }
    const result = validateEvent(event, NOW)
    expect(result).toContain('future')
  })
})

// ─── epochToDateKey edge cases ──────────────────────────────────────────────

describe('epochToDateKey edge cases', () => {
  it('should handle epoch 0 (Unix epoch: 1970-01-01)', () => {
    expect(epochToDateKey(0)).toBe('1970-01-01')
  })

  it('should handle large future dates', () => {
    const epoch = Date.UTC(2099, 11, 31, 23, 59, 59)
    expect(epochToDateKey(epoch)).toBe('2099-12-31')
  })

  it('should return consistent keys for events within same UTC day', () => {
    const morning = Date.UTC(2025, 5, 15, 3, 0, 0)
    const evening = Date.UTC(2025, 5, 15, 22, 0, 0)
    expect(epochToDateKey(morning)).toBe(epochToDateKey(evening))
  })

  it('should return different keys for events crossing UTC midnight', () => {
    const beforeMidnight = Date.UTC(2025, 5, 15, 23, 59, 59)
    const afterMidnight = Date.UTC(2025, 5, 16, 0, 0, 0)
    expect(epochToDateKey(beforeMidnight)).toBe('2025-06-15')
    expect(epochToDateKey(afterMidnight)).toBe('2025-06-16')
  })
})
