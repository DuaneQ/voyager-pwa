import * as functions from 'firebase-functions/v1';

// Use global fetch available in Node 18+ runtime
const fetch = globalThis.fetch as typeof globalThis.fetch;

// IMPORTANT: per project conventions, API keys are embedded in source
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';
const GEOCODE_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';

/**
 * placeSearch: proxies a Google Places Text Search request server-side and
 * returns normalized results. Accepts either callable-wrapped { data: { q, location } }
 * or raw payload.
 */
export const placeSearch = functions.https.onCall(async (data, context) => {
  try {
    const normalized = (data && (data.data !== undefined ? data.data : data)) || {};
    const { q, location, maxResults = 10 } = normalized as any;

    if (!q) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required field: q');
    }

    if (!GOOGLE_PLACES_API_KEY) {
      throw new functions.https.HttpsError('failed-precondition', 'Google Places API key missing in function source');
    }

    const url = new URL(`${PLACES_BASE}/textsearch/json`);
    url.searchParams.set('query', `${q}`);
    url.searchParams.set('key', GOOGLE_PLACES_API_KEY);
    url.searchParams.set('type', 'airport');

    if (location && typeof location.lat === 'number' && typeof location.lng === 'number') {
      url.searchParams.set('location', `${location.lat},${location.lng}`);
      url.searchParams.set('radius', '100000');
    }

    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Places fetch failed: ${res.status} ${text}`);
    }

    const json = await res.json();

    const results = (json.results || []).slice(0, maxResults).map((place: any) => ({
      name: place.name,
      formatted_address: place.formatted_address || place.vicinity,
      geometry: place.geometry,
      types: place.types,
      place_id: place.place_id,
      rating: place.rating || null,
      vendorRaw: place
    }));

    return { success: true, data: { results }, metadata: { provider: 'Google Places', total: results.length } };
  } catch (err: any) {
    console.error('[placeSearch] Error', err);
    throw new functions.https.HttpsError('internal', err.message || String(err));
  }
});

export const geocodePlace = functions.https.onCall(async (data, context) => {
  try {
    const normalized = (data && (data.data !== undefined ? data.data : data)) || {};
    const { address } = normalized as any;
    if (!address) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required field: address');
    }

    const url = `${GEOCODE_BASE}?address=${encodeURIComponent(address)}&key=${GOOGLE_PLACES_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Geocode fetch failed: ${res.status} ${text}`);
    }

    const json = await res.json();
    if (json.status !== 'OK' || !json.results || json.results.length === 0) {
      return { success: true, data: null };
    }

    const loc = json.results[0].geometry.location;
    return { success: true, data: { lat: loc.lat, lng: loc.lng } };
  } catch (err: any) {
    console.error('[geocodePlace] Error', err);
    throw new functions.https.HttpsError('internal', err.message || String(err));
  }
});

export default {};
