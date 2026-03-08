/**
 * Unit tests for src/utils/placesApiLogger.ts
 *
 * Tests the PlacesApiLogger singleton: cost accumulation, per-type/function
 * tracking, and summary logging. Logger output is mocked to avoid console noise.
 */

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

import { placesApiLogger } from '../../utils/placesApiLogger'

// Expected per-call costs (must match source constants)
const TEXT_SEARCH_COST = 0.032
const NEARBY_SEARCH_COST = 0.032
const PLACE_DETAILS_COST = 0.017
const AUTOCOMPLETE_COST = 0.00283
const AUTOCOMPLETE_SESSION_COST = 0.017

beforeEach(() => {
  placesApiLogger.resetStats()
})

// ─── logTextSearch ────────────────────────────────────────────────────────────

describe('logTextSearch', () => {
  it('increments totalCalls by 1', () => {
    placesApiLogger.logTextSearch({ query: 'hotels in Paris', functionName: 'searchAccommodations' })
    expect(placesApiLogger.getStats().totalCalls).toBe(1)
  })

  it('adds the text-search cost to totalEstimatedCost', () => {
    placesApiLogger.logTextSearch({ query: 'hotels in Paris' })
    expect(placesApiLogger.getStats().totalEstimatedCost).toBeCloseTo(TEXT_SEARCH_COST)
  })

  it('records the call under "textSearch" type', () => {
    placesApiLogger.logTextSearch({ query: 'hostels in Rome' })
    expect(placesApiLogger.getStats().callsByType['textSearch']).toBe(1)
  })

  it('tracks cost by type correctly', () => {
    placesApiLogger.logTextSearch({ query: 'resorts in Bali' })
    expect(placesApiLogger.getStats().costByType['textSearch']).toBeCloseTo(TEXT_SEARCH_COST)
  })

  it('tracks call count per function name', () => {
    placesApiLogger.logTextSearch({ query: 'hotels', functionName: 'searchAccommodations' })
    expect(placesApiLogger.getStats().callsByFunction['searchAccommodations']).toBe(1)
  })

  it('accumulates multiple calls correctly', () => {
    placesApiLogger.logTextSearch({ query: 'q1' })
    placesApiLogger.logTextSearch({ query: 'q2' })
    placesApiLogger.logTextSearch({ query: 'q3' })
    const stats = placesApiLogger.getStats()
    expect(stats.totalCalls).toBe(3)
    expect(stats.totalEstimatedCost).toBeCloseTo(TEXT_SEARCH_COST * 3)
    expect(stats.callsByType['textSearch']).toBe(3)
  })
})

// ─── logNearbySearch ──────────────────────────────────────────────────────────

describe('logNearbySearch', () => {
  it('increments totalCalls', () => {
    placesApiLogger.logNearbySearch({ location: '48.8566,2.3522', radius: 1000, functionName: 'fn' })
    expect(placesApiLogger.getStats().totalCalls).toBe(1)
  })

  it('adds nearby-search cost', () => {
    placesApiLogger.logNearbySearch({ location: '48.8566,2.3522' })
    expect(placesApiLogger.getStats().totalEstimatedCost).toBeCloseTo(NEARBY_SEARCH_COST)
  })

  it('records under "nearbySearch" type', () => {
    placesApiLogger.logNearbySearch({})
    expect(placesApiLogger.getStats().callsByType['nearbySearch']).toBe(1)
  })
})

// ─── logPlaceDetails ──────────────────────────────────────────────────────────

describe('logPlaceDetails', () => {
  it('increments totalCalls', () => {
    placesApiLogger.logPlaceDetails({ place_id: 'ChIJtest', functionName: 'fn' })
    expect(placesApiLogger.getStats().totalCalls).toBe(1)
  })

  it('adds place-details cost', () => {
    placesApiLogger.logPlaceDetails({ place_id: 'ChIJtest' })
    expect(placesApiLogger.getStats().totalEstimatedCost).toBeCloseTo(PLACE_DETAILS_COST)
  })

  it('records under "placeDetails" type', () => {
    placesApiLogger.logPlaceDetails({ place_id: 'ChIJtest' })
    expect(placesApiLogger.getStats().callsByType['placeDetails']).toBe(1)
  })

  it('tracks function name when provided', () => {
    placesApiLogger.logPlaceDetails({ place_id: 'ChIJtest', functionName: 'myFn' })
    expect(placesApiLogger.getStats().callsByFunction['myFn']).toBe(1)
  })
})

// ─── logAutocomplete ──────────────────────────────────────────────────────────

describe('logAutocomplete', () => {
  it('uses per-call cost when no session token provided', () => {
    placesApiLogger.logAutocomplete({ query: 'Paris' })
    expect(placesApiLogger.getStats().totalEstimatedCost).toBeCloseTo(AUTOCOMPLETE_COST)
  })

  it('uses per-session cost when session token is provided', () => {
    placesApiLogger.logAutocomplete({ query: 'Paris', sessionToken: 'sess_abc' })
    expect(placesApiLogger.getStats().totalEstimatedCost).toBeCloseTo(AUTOCOMPLETE_SESSION_COST)
  })

  it('records under "autocomplete" type', () => {
    placesApiLogger.logAutocomplete({ query: 'London' })
    expect(placesApiLogger.getStats().callsByType['autocomplete']).toBe(1)
  })
})

// ─── Mixed call types ─────────────────────────────────────────────────────────

describe('mixed call types', () => {
  it('accumulates costs across different API types', () => {
    placesApiLogger.logTextSearch({ query: 'hotels' })      // 0.032
    placesApiLogger.logPlaceDetails({ place_id: 'abc' })    // 0.017
    placesApiLogger.logNearbySearch({})                     // 0.032
    const { totalCalls, totalEstimatedCost, callsByType } = placesApiLogger.getStats()
    expect(totalCalls).toBe(3)
    expect(totalEstimatedCost).toBeCloseTo(0.032 + 0.017 + 0.032)
    expect(callsByType['textSearch']).toBe(1)
    expect(callsByType['placeDetails']).toBe(1)
    expect(callsByType['nearbySearch']).toBe(1)
  })

  it('tracks multiple functions independently', () => {
    placesApiLogger.logTextSearch({ query: 'q', functionName: 'fnA' })
    placesApiLogger.logTextSearch({ query: 'q', functionName: 'fnA' })
    placesApiLogger.logNearbySearch({ functionName: 'fnB' })
    const { callsByFunction } = placesApiLogger.getStats()
    expect(callsByFunction['fnA']).toBe(2)
    expect(callsByFunction['fnB']).toBe(1)
  })
})

// ─── resetStats ───────────────────────────────────────────────────────────────

describe('resetStats', () => {
  it('clears all counters to zero', () => {
    placesApiLogger.logTextSearch({ query: 'hotels' })
    placesApiLogger.logTextSearch({ query: 'resorts' })
    placesApiLogger.resetStats()
    const stats = placesApiLogger.getStats()
    expect(stats.totalCalls).toBe(0)
    expect(stats.totalEstimatedCost).toBe(0)
    expect(stats.callsByType).toEqual({})
    expect(stats.costByType).toEqual({})
    expect(stats.callsByFunction).toEqual({})
  })

  it('allows fresh tracking after reset', () => {
    placesApiLogger.logTextSearch({ query: 'q1' })
    placesApiLogger.resetStats()
    placesApiLogger.logNearbySearch({ functionName: 'fn' })
    const stats = placesApiLogger.getStats()
    expect(stats.totalCalls).toBe(1)
    expect(stats.callsByType['nearbySearch']).toBe(1)
    expect(stats.callsByType['textSearch']).toBeUndefined()
  })
})

// ─── getStats ─────────────────────────────────────────────────────────────────

describe('getStats', () => {
  it('returns a snapshot (not a live reference)', () => {
    const snap1 = placesApiLogger.getStats()
    placesApiLogger.logTextSearch({ query: 'q' })
    const snap2 = placesApiLogger.getStats()
    // snap1 should not have been mutated
    expect(snap1.totalCalls).toBe(0)
    expect(snap2.totalCalls).toBe(1)
  })
})

// ─── logSummary ───────────────────────────────────────────────────────────────

describe('logSummary', () => {
  it('does not throw when called with no prior calls', () => {
    expect(() => placesApiLogger.logSummary()).not.toThrow()
  })

  it('does not throw when called after several calls', () => {
    placesApiLogger.logTextSearch({ query: 'hotels' })
    placesApiLogger.logPlaceDetails({ place_id: 'abc' })
    expect(() => placesApiLogger.logSummary()).not.toThrow()
  })
})
