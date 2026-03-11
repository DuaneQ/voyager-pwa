/**
 * Unit tests for reviewCampaign Cloud Function helpers
 *
 * Tests pure business-logic helpers exported via reviewCampaign._testing.
 * The onCall wrapper itself is not invoked here — it depends on Firestore /
 * firebase-admin and is covered by integration tests.
 */

import { _testing } from '../reviewCampaign'

const { parseAdminUids, dollarsTobudgetCents } = _testing

// ─── parseAdminUids ──────────────────────────────────────────────────────────

describe('parseAdminUids', () => {
  it('returns an array of trimmed UIDs from a comma-separated string', () => {
    expect(parseAdminUids('uid1,uid2,uid3')).toEqual(['uid1', 'uid2', 'uid3'])
  })

  it('trims surrounding whitespace from each UID', () => {
    expect(parseAdminUids('  uid1 , uid2  ,uid3')).toEqual(['uid1', 'uid2', 'uid3'])
  })

  it('filters out empty entries caused by trailing commas', () => {
    expect(parseAdminUids('uid1,,uid3,')).toEqual(['uid1', 'uid3'])
  })

  it('returns empty array for an empty string', () => {
    expect(parseAdminUids('')).toEqual([])
  })

  it('returns empty array for a whitespace-only string', () => {
    expect(parseAdminUids('  ,  ,  ')).toEqual([])
  })

  it('handles a single UID with no commas', () => {
    expect(parseAdminUids('adminUID123')).toEqual(['adminUID123'])
  })

  it('handles UIDs that look like Firebase UIDs (alphanumeric 28 chars)', () => {
    const uid = 'xKjP2mRqW8nT5vBLdCeA7hYs3Fuk'
    expect(parseAdminUids(uid)).toEqual([uid])
  })

  it('correctly identifies a known UID as included', () => {
    const env = 'adminA,adminB,adminC'
    const uids = parseAdminUids(env)
    expect(uids.includes('adminB')).toBe(true)
    expect(uids.includes('adminD')).toBe(false)
  })
})

// ─── dollarsTobudgetCents ────────────────────────────────────────────────────

describe('dollarsTobudgetCents', () => {
  it('converts whole dollar amount to cents', () => {
    expect(dollarsTobudgetCents(50)).toBe(5000)
  })

  it('converts fractional dollar amount, rounding correctly', () => {
    expect(dollarsTobudgetCents(10.99)).toBe(1099)
  })

  it('rounds half-cent up (half-up rounding)', () => {
    // 1.995 dollars → 199.5 cents → rounds up to 200 cents
    expect(dollarsTobudgetCents(1.995)).toBe(200)
  })

  it('converts minimum valid amount (one cent)', () => {
    expect(dollarsTobudgetCents(0.01)).toBe(1)
  })

  it('handles large budget amounts', () => {
    expect(dollarsTobudgetCents(10000)).toBe(1_000_000)
  })

  it('returns null for zero', () => {
    expect(dollarsTobudgetCents(0)).toBeNull()
  })

  it('returns null for negative values', () => {
    expect(dollarsTobudgetCents(-5)).toBeNull()
  })

  it('returns null for NaN', () => {
    expect(dollarsTobudgetCents(NaN)).toBeNull()
  })

  it('returns null for Infinity', () => {
    // parseFloat('Infinity') returns Infinity which is not NaN but is invalid
    expect(dollarsTobudgetCents(Infinity)).toBeNull()
  })
})
