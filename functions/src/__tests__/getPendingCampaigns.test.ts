/**
 * Unit tests for getPendingCampaigns Cloud Function helpers
 *
 * Tests pure business-logic helpers exported via getPendingCampaigns._testing.
 * The onCall wrapper itself is not invoked here — it depends on Firestore /
 * firebase-admin and is covered by integration tests.
 */

import { _testing } from '../getPendingCampaigns'

const { parseAdminUids, sortNewestFirst } = _testing

// ─── parseAdminUids ──────────────────────────────────────────────────────────

describe('parseAdminUids', () => {
  it('splits a comma-separated UID string into an array', () => {
    expect(parseAdminUids('abc,def,ghi')).toEqual(['abc', 'def', 'ghi'])
  })

  it('trims whitespace from each UID', () => {
    expect(parseAdminUids(' uid1 , uid2 ')).toEqual(['uid1', 'uid2'])
  })

  it('filters empty segments created by consecutive commas', () => {
    expect(parseAdminUids('uid1,,uid2')).toEqual(['uid1', 'uid2'])
  })

  it('returns empty array for blank string', () => {
    expect(parseAdminUids('')).toEqual([])
  })

  it('returns empty array for whitespace-only entries', () => {
    expect(parseAdminUids(' , , ')).toEqual([])
  })

  it('handles a single UID', () => {
    expect(parseAdminUids('onlyAdmin')).toEqual(['onlyAdmin'])
  })

  it('confirms inclusion check works correctly', () => {
    const uids = parseAdminUids('adminA,adminB')
    expect(uids.includes('adminA')).toBe(true)
    expect(uids.includes('adminC')).toBe(false)
  })
})

// ─── sortNewestFirst ─────────────────────────────────────────────────────────

describe('sortNewestFirst', () => {
  it('sorts records with a later createdAt before an earlier one', () => {
    const a = { createdAt: '2025-06-15T12:00:00.000Z' }
    const b = { createdAt: '2025-06-01T00:00:00.000Z' }
    // newer first → a should come before b, so compare(a, b) < 0
    expect(sortNewestFirst(a, b)).toBeLessThan(0)
  })

  it('returns a positive value when the first record is older', () => {
    const a = { createdAt: '2024-01-01T00:00:00.000Z' }
    const b = { createdAt: '2025-01-01T00:00:00.000Z' }
    expect(sortNewestFirst(a, b)).toBeGreaterThan(0)
  })

  it('returns 0 when both records have the same createdAt', () => {
    const ts = '2025-03-10T08:30:00.000Z'
    expect(sortNewestFirst({ createdAt: ts }, { createdAt: ts })).toBe(0)
  })

  it('correctly orders an unsorted array newest-first', () => {
    const items = [
      { id: 'c1', createdAt: '2025-01-01T00:00:00.000Z' },
      { id: 'c3', createdAt: '2025-03-01T00:00:00.000Z' },
      { id: 'c2', createdAt: '2025-02-01T00:00:00.000Z' },
    ]
    const sorted = [...items].sort(sortNewestFirst)
    expect(sorted.map((i) => i.id)).toEqual(['c3', 'c2', 'c1'])
  })

  it('handles ISO strings with milliseconds precision', () => {
    const a = { createdAt: '2025-05-01T10:00:00.500Z' }
    const b = { createdAt: '2025-05-01T10:00:00.499Z' }
    // a is later (500ms vs 499ms)
    expect(sortNewestFirst(a, b)).toBeLessThan(0)
  })

  it('treats empty string as the earliest possible date (sorts last)', () => {
    // Empty string is lexicographically less than any ISO date
    const a = { createdAt: '' }
    const b = { createdAt: '2025-01-01T00:00:00.000Z' }
    expect(sortNewestFirst(a, b)).toBeGreaterThan(0)
  })
})
