/**
 * Unit tests for openFlightsProxy Cloud Function helpers
 *
 * Tests pure parsing and scoring helpers exported via openFlightsProxy._testing.
 * The onCall wrappers (openFlightsGetAll, openFlightsSearch, openFlightsHttp)
 * are not invoked here — they depend on network I/O and firebase-functions.
 */

jest.mock('firebase-functions/v1', () => ({
  https: {
    onCall: jest.fn(),
    onRequest: jest.fn(),
    HttpsError: class HttpsError extends Error {
      constructor(public code: string, message: string) { super(message) }
    },
  },
}))

import { _testing } from '../openFlightsProxy'

const { parseCSVLine, normalizeString, scoreAirport } = _testing

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Build a minimal airport record for scoreAirport tests. */
function makeAirport(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    name: 'Test International Airport',
    city: 'Springfield',
    country: 'US',
    iata: 'TST' as string | null,
    icao: 'KTST',
    latitude: 40,
    longitude: -75,
    altitude: 100,
    timezone: -5,
    dst: 'A',
    tz: 'America/New_York',
    type: 'airport',
    source: 'test',
    ...overrides,
  }
}

// ─── parseCSVLine ─────────────────────────────────────────────────────────────

describe('parseCSVLine', () => {
  it('splits a simple comma-separated line', () => {
    expect(parseCSVLine('a,b,c')).toEqual(['a', 'b', 'c'])
  })

  it('preserves quoted fields containing a comma', () => {
    expect(parseCSVLine('"Kennedy, JFK",New York,US')).toEqual([
      'Kennedy, JFK',
      'New York',
      'US',
    ])
  })

  it('handles two consecutive commas as an empty field', () => {
    expect(parseCSVLine('a,,c')).toEqual(['a', '', 'c'])
  })

  it('toggles quotes correctly to handle double-quoted strings', () => {
    // A field that is quoted and contains no commas
    expect(parseCSVLine('"JFK","New York","US"')).toEqual(['JFK', 'New York', 'US'])
  })

  it('returns a single-element array for a line with no commas', () => {
    expect(parseCSVLine('onlyField')).toEqual(['onlyField'])
  })

  it('returns array with empty string for empty input', () => {
    expect(parseCSVLine('')).toEqual([''])
  })

  it('correctly parses a real OpenFlights-style line', () => {
    // Airport ID, name, city, country, IATA, ICAO, lat, lng, alt, tz, dst, tz, type, source
    const line = '3797,"John F Kennedy International Airport","New York","United States","JFK","KJFK",40.63972,-73.77889,13,-5,"A","America/New_York","airport","OurAirports"'
    const parts = parseCSVLine(line)
    expect(parts[0]).toBe('3797')
    expect(parts[1]).toBe('John F Kennedy International Airport')
    expect(parts[4]).toBe('JFK')
  })

  it('handles a quoted field with no special characters', () => {
    expect(parseCSVLine('1,"Airport Name","City"')).toEqual(['1', 'Airport Name', 'City'])
  })
})

// ─── normalizeString ──────────────────────────────────────────────────────────

describe('normalizeString', () => {
  it('converts uppercase to lowercase', () => {
    expect(normalizeString('JFK')).toBe('jfk')
  })

  it('replaces non-alphanumeric characters with a single space', () => {
    expect(normalizeString('John F. Kennedy')).toBe('john f kennedy')
  })

  it('trims leading and trailing whitespace from result', () => {
    expect(normalizeString('  hello world  ')).toBe('hello world')
  })

  it('collapses consecutive non-alphanumeric sequences into one space', () => {
    expect(normalizeString('New  --  York')).toBe('new york')
  })

  it('handles an empty string', () => {
    expect(normalizeString('')).toBe('')
  })

  it('handles numbers in string', () => {
    expect(normalizeString('Terminal 2B')).toBe('terminal 2b')
  })

  it('returns lowercase alphanumeric-only string unchanged after normalisation', () => {
    expect(normalizeString('lax')).toBe('lax')
  })
})

// ─── scoreAirport ─────────────────────────────────────────────────────────────

describe('scoreAirport', () => {
  it('returns 100 for an exact IATA match (case-insensitive)', () => {
    const airport = makeAirport({ iata: 'JFK' })
    expect(scoreAirport(airport, 'jfk')).toBe(100)
  })

  it('returns 50 when the airport name contains the query', () => {
    const airport = makeAirport({ iata: 'ORD', name: 'Chicago O\'Hare International' })
    // "ohare" won't exactly match "o'hare" after normalisation — use "chicago"
    expect(scoreAirport(airport, 'chicago')).toBe(50)
  })

  it('returns 30 when the city matches the query', () => {
    const airport = makeAirport({ iata: 'XYZ', name: 'Generic Airport', city: 'Springfield' })
    expect(scoreAirport(airport, 'springfield')).toBe(30)
  })

  it('stacks IATA + name points when both match', () => {
    // name deliberately contains the IATA code so both tiers score
    const airport = makeAirport({ iata: 'LAX', name: 'LAX International Airport', city: 'Los Angeles' })
    // 'lax' matches IATA exactly (100) + normalised name includes 'lax' (50)
    // city 'los angeles' does not include 'lax' → 0
    expect(scoreAirport(airport, 'lax')).toBe(150)
  })

  it('stacks name + city when both match but not IATA', () => {
    const airport = makeAirport({ iata: 'BCN', name: 'Barcelona El Prat Airport', city: 'Barcelona' })
    expect(scoreAirport(airport, 'barcelona')).toBe(80) // 50 name + 30 city
  })

  it('returns 0 when query does not match any field', () => {
    const airport = makeAirport({ iata: 'TST', name: 'Test Airport', city: 'Testville' })
    expect(scoreAirport(airport, 'paris')).toBe(0)
  })

  it('handles null IATA without throwing', () => {
    const airport = makeAirport({ iata: null })
    expect(() => scoreAirport(airport, 'lax')).not.toThrow()
    expect(scoreAirport(airport, 'lax')).toBe(0)
  })

  it('does not award IATA points for a partial IATA match', () => {
    const airport = makeAirport({ iata: 'JFKK' })
    // 'jfk' is not equal to 'jfkk' → no IATA score
    expect(scoreAirport(airport, 'jfk')).toBe(0)
  })

  it('awards all three score tiers when query matches IATA, name, and city', () => {
    const airport = makeAirport({ iata: 'AA', name: 'AA City Airport', city: 'AA Town' })
    expect(scoreAirport(airport, 'aa')).toBe(180) // 100 + 50 + 30
  })
})
