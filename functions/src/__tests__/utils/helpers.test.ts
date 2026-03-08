/**
 * Unit tests for src/utils/helpers.ts
 *
 * All functions in helpers.ts are pure utilities — no Firebase / network dependencies.
 */

import {
  generateUniqueId,
  calculateTripDuration,
  validateDateRange,
  formatCurrency,
  timeToMinutes,
  minutesToTime,
  sanitizeInput,
  logGenerationMetrics,
  hasPremiumSubscription,
} from '../../utils/helpers'

// ─── generateUniqueId ─────────────────────────────────────────────────────────

describe('generateUniqueId', () => {
  it('starts with "gen_"', () => {
    expect(generateUniqueId()).toMatch(/^gen_/)
  })

  it('contains a numeric timestamp segment', () => {
    expect(generateUniqueId()).toMatch(/^gen_\d+_/)
  })

  it('contains a random alphanumeric suffix', () => {
    expect(generateUniqueId()).toMatch(/^gen_\d+_[a-z0-9]+$/)
  })

  it('produces unique values on successive calls', () => {
    const ids = Array.from({ length: 20 }, () => generateUniqueId())
    const unique = new Set(ids)
    expect(unique.size).toBe(20)
  })
})

// ─── calculateTripDuration ────────────────────────────────────────────────────

describe('calculateTripDuration', () => {
  it('calculates a 7-day trip correctly', () => {
    expect(calculateTripDuration('2027-03-01', '2027-03-08')).toBe(7)
  })

  it('calculates a 1-day trip correctly', () => {
    expect(calculateTripDuration('2027-06-10', '2027-06-11')).toBe(1)
  })

  it('calculates a 30-day trip correctly', () => {
    expect(calculateTripDuration('2027-01-01', '2027-01-31')).toBe(30)
  })

  it('calculates duration across month boundaries', () => {
    expect(calculateTripDuration('2027-01-28', '2027-02-04')).toBe(7)
  })

  it('calculates duration across year boundaries', () => {
    expect(calculateTripDuration('2027-12-28', '2028-01-04')).toBe(7)
  })
})

// ─── validateDateRange ────────────────────────────────────────────────────────

describe('validateDateRange', () => {
  // All future dates (relative to March 7, 2026)
  const future1 = '2027-04-01'
  const future2 = '2027-04-08'

  it('returns { isValid: true } for a valid future date range', () => {
    expect(validateDateRange(future1, future2)).toEqual({ isValid: true })
  })

  it('returns invalid for an unparseable start date', () => {
    const result = validateDateRange('not-a-date', future2)
    expect(result.isValid).toBe(false)
    expect(result.error).toMatch(/start date/i)
  })

  it('returns invalid for an unparseable end date', () => {
    const result = validateDateRange(future1, 'bad')
    expect(result.isValid).toBe(false)
    expect(result.error).toMatch(/end date/i)
  })

  it('returns invalid when start equals end', () => {
    const result = validateDateRange(future1, future1)
    expect(result.isValid).toBe(false)
    expect(result.error).toMatch(/after start/i)
  })

  it('returns invalid when end is before start', () => {
    const result = validateDateRange(future2, future1)
    expect(result.isValid).toBe(false)
    expect(result.error).toMatch(/after start/i)
  })

  it('returns invalid when start date is in the past', () => {
    const result = validateDateRange('2024-01-01', '2024-01-08')
    expect(result.isValid).toBe(false)
    expect(result.error).toMatch(/past/i)
  })

  it('returns invalid when trip duration exceeds 30 days', () => {
    const result = validateDateRange('2027-05-01', '2027-06-15')
    expect(result.isValid).toBe(false)
    expect(result.error).toMatch(/30/i)
  })

  it('accepts exactly 30-day trip', () => {
    const result = validateDateRange('2027-05-01', '2027-05-31')
    expect(result.isValid).toBe(true)
  })
})

// ─── formatCurrency ───────────────────────────────────────────────────────────

describe('formatCurrency', () => {
  it('formats a whole dollar amount with USD symbol', () => {
    expect(formatCurrency(50, 'USD')).toMatch(/50/)
  })

  it('formats default USD when no currency passed', () => {
    expect(formatCurrency(10)).toMatch(/10/)
  })

  it('includes cents when amount has fractional part', () => {
    expect(formatCurrency(10.99, 'USD')).toMatch(/10/)
  })

  it('formats zero correctly', () => {
    expect(formatCurrency(0)).toMatch(/0/)
  })
})

// ─── timeToMinutes ────────────────────────────────────────────────────────────

describe('timeToMinutes', () => {
  it('converts "00:00" to 0', () => {
    expect(timeToMinutes('00:00')).toBe(0)
  })

  it('converts "08:30" to 510', () => {
    expect(timeToMinutes('08:30')).toBe(510)
  })

  it('converts "12:00" (noon) to 720', () => {
    expect(timeToMinutes('12:00')).toBe(720)
  })

  it('converts "23:59" to 1439', () => {
    expect(timeToMinutes('23:59')).toBe(1439)
  })

  it('converts "01:01" to 61', () => {
    expect(timeToMinutes('01:01')).toBe(61)
  })
})

// ─── minutesToTime ────────────────────────────────────────────────────────────

describe('minutesToTime', () => {
  it('converts 0 to "00:00"', () => {
    expect(minutesToTime(0)).toBe('00:00')
  })

  it('converts 510 to "08:30"', () => {
    expect(minutesToTime(510)).toBe('08:30')
  })

  it('converts 720 to "12:00"', () => {
    expect(minutesToTime(720)).toBe('12:00')
  })

  it('converts 1439 to "23:59"', () => {
    expect(minutesToTime(1439)).toBe('23:59')
  })

  it('rounds correctly for small values like 61 → "01:01"', () => {
    expect(minutesToTime(61)).toBe('01:01')
  })

  it('is the inverse of timeToMinutes for valid inputs', () => {
    const times = ['00:00', '08:30', '12:00', '23:59', '09:05']
    times.forEach(t => {
      expect(minutesToTime(timeToMinutes(t))).toBe(t)
    })
  })
})

// ─── sanitizeInput ────────────────────────────────────────────────────────────

describe('sanitizeInput', () => {
  it('removes angle brackets', () => {
    expect(sanitizeInput('<script>alert()</script>')).not.toContain('<')
    expect(sanitizeInput('<script>alert()</script>')).not.toContain('>')
  })

  it('removes curly braces', () => {
    expect(sanitizeInput('{injection}')).not.toContain('{')
    expect(sanitizeInput('{injection}')).not.toContain('}')
  })

  it('trims leading and trailing whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello')
  })

  it('preserves regular alphanumeric content', () => {
    expect(sanitizeInput('Paris 2027')).toBe('Paris 2027')
  })

  it('handles empty string without throwing', () => {
    expect(sanitizeInput('')).toBe('')
  })

  it('preserves hyphens and other non-bracket characters', () => {
    expect(sanitizeInput('New York - July 2027')).toBe('New York - July 2027')
  })
})

// ─── logGenerationMetrics ─────────────────────────────────────────────────────

describe('logGenerationMetrics', () => {
  it('does not throw for a successful generation', () => {
    expect(() =>
      logGenerationMetrics({
        userId: 'user1',
        generationId: 'gen_123',
        destination: 'Tokyo',
        duration: 7,
        processingTime: 1200,
        success: true,
      })
    ).not.toThrow()
  })

  it('does not throw when error field is provided', () => {
    expect(() =>
      logGenerationMetrics({
        userId: 'user1',
        generationId: 'gen_456',
        destination: 'Berlin',
        duration: 5,
        processingTime: 500,
        success: false,
        error: 'OpenAI timeout',
      })
    ).not.toThrow()
  })
})

// ─── hasPremiumSubscription ───────────────────────────────────────────────────

describe('hasPremiumSubscription', () => {
  it('returns false for null userData', () => {
    expect(hasPremiumSubscription(null)).toBe(false)
  })

  it('returns false for undefined userData', () => {
    expect(hasPremiumSubscription(undefined)).toBe(false)
  })

  it('returns false when subscriptionType is not "premium"', () => {
    expect(hasPremiumSubscription({ subscriptionType: 'free' })).toBe(false)
  })

  it('returns false when subscriptionType is missing', () => {
    expect(hasPremiumSubscription({})).toBe(false)
  })

  it('returns false when subscription is cancelled', () => {
    expect(hasPremiumSubscription({
      subscriptionType: 'premium',
      subscriptionCancelled: true,
    })).toBe(false)
  })

  it('returns false when subscriptionEndDate is in the past', () => {
    expect(hasPremiumSubscription({
      subscriptionType: 'premium',
      subscriptionCancelled: false,
      subscriptionEndDate: new Date('2020-01-01'),
    })).toBe(false)
  })

  it('returns false when subscriptionEndDate is a Firestore-style object with toDate() in the past', () => {
    expect(hasPremiumSubscription({
      subscriptionType: 'premium',
      subscriptionCancelled: false,
      subscriptionEndDate: { toDate: () => new Date('2020-01-01') },
    })).toBe(false)
  })

  it('returns true when subscriptionType is "premium" and not cancelled, no end date', () => {
    expect(hasPremiumSubscription({
      subscriptionType: 'premium',
      subscriptionCancelled: false,
    })).toBe(true)
  })

  it('returns true when premium with future subscriptionEndDate', () => {
    expect(hasPremiumSubscription({
      subscriptionType: 'premium',
      subscriptionCancelled: false,
      subscriptionEndDate: new Date('2099-01-01'),
    })).toBe(true)
  })

  it('returns true when premium with future Firestore Timestamp-style end date', () => {
    expect(hasPremiumSubscription({
      subscriptionType: 'premium',
      subscriptionCancelled: false,
      subscriptionEndDate: { toDate: () => new Date('2099-01-01') },
    })).toBe(true)
  })
})
