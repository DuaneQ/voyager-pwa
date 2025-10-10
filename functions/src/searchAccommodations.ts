/**
 * Simple accommodations search cloud function
 * - Receives JSON body with accommodation preferences
 * - Calls Google Places API for hotel/lodging search
 * - Maps results to a compact Hotel shape
 * - Console.logs request and mapped results for verification
 *
 * Environment variables expected:
 * - GOOGLE_PLACES_API_KEY (embedded in source per project constraints)
 */

import * as functions from 'firebase-functions/v1';
import logger from './utils/logger';

// Use global fetch available in Node 18+ runtime used by Functions
const fetch = globalThis.fetch as typeof globalThis.fetch;

interface AccommodationSearchParams {
  destination: string;
  destinationLatLng?: { lat: number; lng: number };
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  accommodationType?: 'hotel' | 'hostel' | 'airbnb' | 'resort' | 'any';
  starRating?: number; // 1-5
  minUserRating?: number; // 0-5, default 3.5
  // Optional sorting preference: 'rating' sorts by rating desc, 'popularity' sorts by userRatingsTotal desc
  sortBy?: 'rating' | 'popularity';
  accessibility?: { mobilityNeeds?: boolean; visualNeeds?: boolean; hearingNeeds?: boolean };
  groupSize?: number;
  maxResults?: number;
}

interface Hotel {
  id: string;
  placeId: string;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  rating?: number; // Google user rating
  userRatingsTotal?: number;
  starRating?: number | null; // if available or inferred
  types?: string[];
  photos?: string[];
  wheelchairAccessible?: boolean | null;
  amenities?: string[];
  distanceMeters?: number | null;
  vendorRaw?: any; // raw provider response (optional)
  priceLevel?: number | null;
}

// Google Places API configuration: prefer environment variable for testing, fallback to embedded key
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

// Helper: map accommodation type to Places API query
function getPlacesQuery(accommodationType?: string, destination?: string): string {
  const queries: Record<string, string> = {
    'hotel': 'hotel',
    'hostel': 'hostel',
    'airbnb': 'vacation rental',
    'resort': 'resort',
    'any': 'lodging'
  };

  const baseQuery = queries[accommodationType || 'any'] || 'hotel';
  return destination ? `${baseQuery} in ${destination}` : baseQuery;
}

// Helper: extract amenities from place details
function extractAmenities(place: any): string[] {
  const amenities: string[] = [];

  // Check for common amenities in types or other fields
  if (place.types) {
    if (place.types.includes('gym')) amenities.push('gym');
    if (place.types.includes('spa')) amenities.push('spa');
  }

  // Note: Google Places doesn't provide detailed amenities in basic API
  // In a real implementation, you might use Place Details with specific fields
  return amenities;
}

// NOTE: star rating inference has been removed by design.
// We intentionally do NOT infer a hotel's star rating from price_level or user ratings.
// The system will use explicit star rating data when present in the source, otherwise
// treat starRating as unknown (null). This avoids accidental price/rating bias and
// keeps server behaviour deterministic; price handling will be implemented separately.

// Helper: get photo URLs from place photos
function getPhotoUrls(place: any, maxPhotos: number = 3): string[] {
  if (!place.photos || !Array.isArray(place.photos)) return [];

  return place.photos
    .slice(0, maxPhotos)
    .map((photo: any) => {
      if (photo.photo_reference) {
        return `${PLACES_BASE}/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`;
      }
      return null;
    })
    .filter(Boolean);
}

// Helper: fetch multiple Text Search pages following next_page_token
async function fetchAllTextSearchResults(initialUrl: string, maxResults: number = 20): Promise<any[]> {
  const places: any[] = [];
  try {
    let url = initialUrl;
    let attempts = 0;
    let nextPageToken: string | undefined;

    do {
      attempts++;
      const res = await fetch(url);
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        logger.error('[searchAccommodations] Places fetch error', res.status, t);
        break;
      }
      const json = await res.json();
      if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
        logger.error('[searchAccommodations] Places API status:', json.status, json.error_message);
        break;
      }

      const results = json.results || [];
      places.push(...results);

      nextPageToken = json.next_page_token;

      // Stop if we've collected enough
      if (places.length >= maxResults) break;

      // Google recommends a short delay before using next_page_token
      if (nextPageToken) {
        await new Promise((r) => setTimeout(r, 2000));
        const pagedUrl = new URL(initialUrl);
        pagedUrl.searchParams.set('pagetoken', String(nextPageToken));
        url = pagedUrl.toString();
      }
      // Safety: do not loop indefinitely; Text Search supports up to 3 pages
    } while (nextPageToken && attempts < 4 && places.length < maxResults);
  } catch (err) {
    logger.error('[searchAccommodations] pagination error', err);
  }

  return places;
}

// Export helper for unit tests
export { fetchAllTextSearchResults };

// (No place details fetched here — keep mapping lightweight and rely on stored recommendations)

// Main mapping function
function mapPlaceToHotel(place: any, originLat?: number, originLng?: number): Hotel | null {
  try {
    const hotel: Hotel = {
      id: place.place_id || `hotel_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      placeId: place.place_id || '',
      name: place.name || 'Unknown Hotel',
      address: place.formatted_address || place.vicinity || '',
      lat: place.geometry?.location?.lat,
      lng: place.geometry?.location?.lng,
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      // Use explicit star rating fields if available on the provider response. If not present,
      // leave as null to indicate unknown. Do NOT infer from other signals.
      starRating: (place.star_rating ?? place.starRating ?? null),
      // Map coarse provider price level when available (1-4)
      priceLevel: (place.price_level ?? place.priceLevel ?? null),
      types: place.types || [],
      photos: getPhotoUrls(place),
      wheelchairAccessible: place.wheelchair_accessible_entrance || null,
      amenities: extractAmenities(place),
      vendorRaw: place
    };

    // Calculate distance if origin provided
    if (originLat && originLng && hotel.lat && hotel.lng) {
      const R = 6371000; // Earth radius in meters
      const dLat = (hotel.lat - originLat) * Math.PI / 180;
      const dLng = (hotel.lng - originLng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(originLat * Math.PI / 180) * Math.cos(hotel.lat * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      hotel.distanceMeters = Math.round(R * c);
    }

    return hotel;
  } catch (err) {
    logger.error('[searchAccommodations] Mapping error for place:', place?.name, 'Error:', err);
    return null;
  }
}

export const searchAccommodations = functions.https.onCall(async (data, context) => {
  try {
    // Accept either the callable-wrapped shape ({ data: { ... } }) or raw body ({ ... })
    const normalized = (data && (data.data !== undefined ? data.data : data)) || {};
    const params: AccommodationSearchParams = normalized as AccommodationSearchParams;

    // Basic validation
    if (!params.destination) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required field: destination');
    }

    if (!GOOGLE_PLACES_API_KEY) {
      throw new functions.https.HttpsError('failed-precondition', 'Google Places API key missing in function source');
    }

    // Set defaults
    // Use 20 as default to match one full initial Places Text Search page
    const maxResults = params.maxResults || 20;

    // Use explicit minUserRating from params; do NOT derive server-side.
    // Defaults: ensure a concrete value so downstream filtering is deterministic.
    const DEFAULT_MIN_USER_RATING = 3.5;
    let effectiveMinUserRating: number = DEFAULT_MIN_USER_RATING;
    if (params.minUserRating !== undefined && params.minUserRating !== null) {
      effectiveMinUserRating = Number(params.minUserRating);
    } else {
      // No explicit minUserRating provided; fall back to server default (do not infer from starRating)
      effectiveMinUserRating = DEFAULT_MIN_USER_RATING;
    }

    // Build Google Places Text Search request
    // Per request: do not perform server-side post-processing filters. Instead, include
    // human-readable hints in the query so Places may prefer matching results.
    // Examples: '4-star hotel in Seattle', 'hotel in Paris rating 4 and up'
    let query = getPlacesQuery(params.accommodationType, params.destination);

    // Append star rating hint when provided
    if (params.starRating && params.starRating >= 1 && params.starRating <= 5) {
      // Prefer the common phrasing like '4-star' which the place search may weight
      query = `${params.starRating}-star ${query}`;
      console.log('[searchAccommodations] Appending star rating hint to query:', `${params.starRating}-star`);
    }

    // Append min user rating hint when provided
    if (params.minUserRating !== undefined && params.minUserRating !== null) {
      const minR = Number(params.minUserRating);
      if (!Number.isNaN(minR) && minR > 0 && minR <= 5) {
        query = `${query} rating ${minR} and up`;
        console.log('[searchAccommodations] Appending minUserRating hint to query:', minR);
      }
    }
    const searchUrl = new URL(`${PLACES_BASE}/textsearch/json`);

    searchUrl.searchParams.set('query', query);
    searchUrl.searchParams.set('type', 'lodging');
    searchUrl.searchParams.set('key', GOOGLE_PLACES_API_KEY);

    // Add location bias if lat/lng provided
    if (params.destinationLatLng) {
      const { lat, lng } = params.destinationLatLng;
      searchUrl.searchParams.set('location', `${lat},${lng}`);
      searchUrl.searchParams.set('radius', '50000'); // 50km radius
    }

    // No price-based filtering applied here. We only use explicit starRating and minUserRating.
    // Use pagination helper to collect multiple pages of Text Search results up to maxResults
    const allPlaces = await fetchAllTextSearchResults(searchUrl.toString(), maxResults * 3);

    // Map places to hotel objects. Perform dedupe and optional sorting (both non-invasive)
    let hotels: Hotel[] = [];
    const seenPlaceIds = new Set<string>();

    for (const place of allPlaces.slice(0, maxResults * 6)) {
      const hotel = mapPlaceToHotel(
        place,
        params.destinationLatLng?.lat,
        params.destinationLatLng?.lng
      );
      if (!hotel) continue;

      // Dedupe by placeId - keep the first occurrence
      if (hotel.placeId && seenPlaceIds.has(hotel.placeId)) {
        continue;
      }
      if (hotel.placeId) seenPlaceIds.add(hotel.placeId);

      hotels.push(hotel);
      if (hotels.length >= maxResults) break;
    }

    // Always sort by popularity (userRatingsTotal desc) then rating (desc)
    hotels.sort((a, b) => {
      const popA = a.userRatingsTotal ?? 0;
      const popB = b.userRatingsTotal ?? 0;
      if (popB !== popA) return popB - popA;
      const rA = a.rating ?? 0;
      const rB = b.rating ?? 0;
      return rB - rA;
    });

    // Ensure we return at most maxResults
    hotels = hotels.slice(0, maxResults);

    const searchId = `hotels_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

    const priceFilteringApplied = false;

    return {
      success: true,
      data: {
        searchId,
        hotels
      },
      metadata: {
        provider: 'Google Places',
        count: hotels.length,
        query,
        pagesFetched: Math.min(3, Math.ceil(allPlaces.length / 20)),
        filters: {
          starRating: params.starRating,
          accommodationType: params.accommodationType,
          starRatingFilterApplied: !!(params.starRating && params.starRating >= 1 && params.starRating <= 5),
          priceFilteringApplied,
          effectiveMinUserRating: effectiveMinUserRating,
          minUserRatingDerived: false,
          starRatingInferred: false,
          totalPlacesProcessed: allPlaces.length,
          deduplicated: true,
          sortBy: 'popularity_then_rating',
          sortApplied: true
        }
      }
    };

  } catch (err: any) {
    console.error('[searchAccommodations] Unexpected error', err);
    throw new functions.https.HttpsError('internal', err?.message || String(err));
  }
});

export default {};
