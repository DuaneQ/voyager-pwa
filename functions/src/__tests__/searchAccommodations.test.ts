/**
 * Unit tests for searchAccommodations Cloud Function helpers
 *
 * Tests pure helper logic exported via searchAccommodations._testing.
 * The onCall wrapper and network-dependent functions (fetchAllTextSearchResults)
 * are not invoked here — they depend on the Google Places API and firebase-functions.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('firebase-functions/v1', () => ({
  runWith: jest.fn(() => ({
    https: { onCall: jest.fn() },
  })),
  https: {
    HttpsError: class HttpsError extends Error {
      constructor(public code: string, message: string) { super(message) }
    },
  },
}))

jest.mock('../utils/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

jest.mock('../utils/placesApiLogger', () => ({
  placesApiLogger: {
    logTextSearch: jest.fn(),
    logNearbySearch: jest.fn(),
    logPlaceDetails: jest.fn(),
  },
}))

// Set a test API key before importing so GOOGLE_PLACES_API_KEY is defined at module load time
process.env.GOOGLE_PLACES_API_KEY = 'test-api-key'

import { _testing } from '../searchAccommodations'

const { getPlacesQuery, extractAmenities, mapPlaceToHotel } = _testing

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Build a minimal Google Place object. */
function makePlace(overrides: Record<string, any> = {}) {
  return {
    place_id: 'ChIJtest123',
    name: 'Grand Hotel',
    formatted_address: '1 Main St, Paris, France',
    geometry: { location: { lat: 48.8566, lng: 2.3522 } },
    rating: 4.5,
    user_ratings_total: 1200,
    types: ['lodging', 'point_of_interest'],
    photos: [],
    wheelchair_accessible_entrance: null,
    ...overrides,
  }
}

// ─── getPlacesQuery ───────────────────────────────────────────────────────────

describe('getPlacesQuery', () => {
  it('returns "hotel in Paris" for hotel type with destination', () => {
    expect(getPlacesQuery('hotel', 'Paris')).toBe('hotel in Paris')
  })

  it('returns "hostel in Barcelona" for hostel type with destination', () => {
    expect(getPlacesQuery('hostel', 'Barcelona')).toBe('hostel in Barcelona')
  })

  it('maps "airbnb" to "vacation rental"', () => {
    expect(getPlacesQuery('airbnb', 'Rome')).toBe('vacation rental in Rome')
  })

  it('maps "resort" correctly', () => {
    expect(getPlacesQuery('resort', 'Maldives')).toBe('resort in Maldives')
  })

  it('maps "any" to "lodging"', () => {
    expect(getPlacesQuery('any', 'Tokyo')).toBe('lodging in Tokyo')
  })

  it('falls back to "hotel" for an unrecognised type', () => {
    expect(getPlacesQuery('unknown_type', 'New York')).toBe('hotel in New York')
  })

  it('returns the base type without " in ..." when no destination provided', () => {
    expect(getPlacesQuery('hotel')).toBe('hotel')
  })

  it('returns "lodging" when no type or destination provided', () => {
    expect(getPlacesQuery()).toBe('lodging')
  })

  it('returns bare query when destination is empty string', () => {
    // An empty destination string is falsy, so no " in ..." suffix
    expect(getPlacesQuery('hotel', '')).toBe('hotel')
  })
})

// ─── extractAmenities ─────────────────────────────────────────────────────────

describe('extractAmenities', () => {
  it('returns empty array when place has no types', () => {
    expect(extractAmenities({})).toEqual([])
  })

  it('returns empty array for standard lodging types', () => {
    expect(extractAmenities({ types: ['lodging', 'point_of_interest'] })).toEqual([])
  })

  it('includes "gym" when place types contain "gym"', () => {
    const amenities = extractAmenities({ types: ['gym', 'lodging'] })
    expect(amenities).toContain('gym')
  })

  it('includes "spa" when place types contain "spa"', () => {
    const amenities = extractAmenities({ types: ['spa', 'health'] })
    expect(amenities).toContain('spa')
  })

  it('includes both "gym" and "spa" when both are present', () => {
    const amenities = extractAmenities({ types: ['gym', 'spa', 'lodging'] })
    expect(amenities).toContain('gym')
    expect(amenities).toContain('spa')
  })

  it('handles null types gracefully without throwing', () => {
    expect(() => extractAmenities({ types: null })).not.toThrow()
  })
})

// ─── mapPlaceToHotel ──────────────────────────────────────────────────────────

describe('mapPlaceToHotel', () => {
  it('maps basic place fields to a Hotel object', () => {
    const place = makePlace()
    const hotel = mapPlaceToHotel(place)
    expect(hotel).not.toBeNull()
    expect(hotel!.placeId).toBe('ChIJtest123')
    expect(hotel!.name).toBe('Grand Hotel')
    expect(hotel!.address).toBe('1 Main St, Paris, France')
    expect(hotel!.lat).toBe(48.8566)
    expect(hotel!.lng).toBe(2.3522)
    expect(hotel!.rating).toBe(4.5)
    expect(hotel!.userRatingsTotal).toBe(1200)
  })

  it('falls back on "Unknown Hotel" when name is missing', () => {
    const place = makePlace({ name: undefined })
    const hotel = mapPlaceToHotel(place)
    expect(hotel!.name).toBe('Unknown Hotel')
  })

  it('uses vicinity as address fallback when formatted_address is absent', () => {
    const place = makePlace({ formatted_address: undefined, vicinity: 'Montmartre, Paris' })
    const hotel = mapPlaceToHotel(place)
    expect(hotel!.address).toBe('Montmartre, Paris')
  })

  it('maps wheelchair_accessible_entrance to wheelchairAccessible', () => {
    const hotel = mapPlaceToHotel(makePlace({ wheelchair_accessible_entrance: true }))
    expect(hotel!.wheelchairAccessible).toBe(true)
  })

  it('sets starRating to null when neither star_rating nor starRating field is present', () => {
    const hotel = mapPlaceToHotel(makePlace())
    expect(hotel!.starRating).toBeNull()
  })

  it('preserves explicit star_rating from place data', () => {
    const hotel = mapPlaceToHotel(makePlace({ star_rating: 5 }))
    expect(hotel!.starRating).toBe(5)
  })

  it('maps priceLevel from price_level field', () => {
    const hotel = mapPlaceToHotel(makePlace({ price_level: 3 }))
    expect(hotel!.priceLevel).toBe(3)
  })

  it('does NOT calculate distanceMeters when no origin is provided', () => {
    const hotel = mapPlaceToHotel(makePlace())
    expect(hotel!.distanceMeters).toBeUndefined()
  })

  it('calculates distanceMeters via Haversine when origin is provided', () => {
    // Distance from Eiffel Tower (48.8584, 2.2945) to Louvre (48.8606, 2.3376) ≈ 3 km
    const place = makePlace({ geometry: { location: { lat: 48.8606, lng: 2.3376 } } })
    const hotel = mapPlaceToHotel(place, 48.8584, 2.2945)
    expect(hotel!.distanceMeters).toBeDefined()
    expect(hotel!.distanceMeters!).toBeGreaterThan(2000)  // >2 km
    expect(hotel!.distanceMeters!).toBeLessThan(5000)    // <5 km
  })

  it('returns null when place data is completely invalid', () => {
    // Passing undefined place should be handled gracefully
    // mapPlaceToHotel(undefined) — place.place_id access throws, caught by try/catch
    const hotel = mapPlaceToHotel(undefined)
    expect(hotel).toBeNull()
  })

  it('carries vendorRaw with the original place data', () => {
    const place = makePlace()
    const hotel = mapPlaceToHotel(place)
    expect(hotel!.vendorRaw).toBe(place)
  })

  it('defaults types to empty array when place has none', () => {
    const place = makePlace({ types: undefined })
    const hotel = mapPlaceToHotel(place)
    expect(hotel!.types).toEqual([])
  })
})
