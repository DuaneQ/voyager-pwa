import * as functions from 'firebase-functions/v1';
import logger from './utils/logger';
import { placesApiLogger } from './utils/placesApiLogger';

// Use global fetch available in Node 18+ runtime
const fetch = globalThis.fetch as typeof globalThis.fetch;

const GOOGLE_PLACES_API_KEY = 'AIzaSyC4VMlBMjgmvO_K1-wPOrQP1JKTvV7zmo8';
const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';

interface ActivitiesSearchParams {
  destination: string;
  destinationLatLng?: { lat: number; lng: number };
  maxResults?: number;
  // Number of days (or desired activities to enrich). If provided, we'll
  // fetch Place Details for the top `days` activities to fill phone/website/price.
  days?: number;
  // Backwards-compatible explicit override for number of activities to enrich
  activityCount?: number;
  keywords?: string[]; // user-specified interests
  // Optional food-specific search hints
  food?: {
    keywords?: string[];
    opennow?: boolean;
    minprice?: number;
    maxprice?: number;
    type?: string; // e.g. 'restaurant'
    rankByDistance?: boolean;
  };
  // User-provided constraints and hints from the modal
  mustInclude?: string[];
  mustAvoid?: string[];
  specialRequests?: string;
  tripType?: string;
  // COST CONTROL: Skip expensive Place Details API calls (~$0.017/call)
  // Set to true to use AI-generated data instead of Google Place Details
  skipPlaceDetailsEnrichment?: boolean;
}

// Fetch a single text search page
async function fetchTextSearch(url: string, functionName: string = 'searchActivities'): Promise<any> {
  // Extract query from URL for logging
  const urlObj = new URL(url);
  const query = urlObj.searchParams.get('query') || urlObj.searchParams.get('input') || 'unknown';
  const pageToken = urlObj.searchParams.get('pagetoken');
  
  // Log EXPENSIVE Text Search API call
  placesApiLogger.logTextSearch({
    query,
    functionName,
    pageToken: pageToken || undefined,
  });
  
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    logger.error('[searchActivities] Places fetch error', res.status, t);
    return { status: 'ERROR', results: [] };
  }
  return res.json();
}

async function fetchAllTextSearchResults(initialUrl: string, maxResults: number = 20, functionName: string = 'searchActivities'): Promise<any[]> {
  const places: any[] = [];
  try {
    let url = initialUrl;
    let attempts = 0;
    let nextPageToken: string | undefined;

    do {
      attempts++;
      const json = await fetchTextSearch(url, functionName);
      if (!json) break;
      if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
      logger.error('[searchActivities] Places API status:', json.status, json.error_message);
        break;
      }
      const results = json.results || [];
      places.push(...results);

      nextPageToken = json.next_page_token;

      if (places.length >= maxResults) break;

      if (nextPageToken && attempts < 2) { // Limit to 2 pages max for speed
        await new Promise((r) => setTimeout(r, 1500)); // Reduced delay
        const pagedUrl = new URL(initialUrl);
        pagedUrl.searchParams.set('pagetoken', String(nextPageToken));
        url = pagedUrl.toString();
      } else {
        break; // Stop pagination after 2 attempts
      }
    } while (nextPageToken && attempts < 2 && places.length < maxResults);
  } catch (err) {
    logger.error('[searchActivities] pagination error', err);
  }
  return places;
}

// Export helper for unit tests
export { fetchAllTextSearchResults };

export function mapPlaceToActivity(place: any): any | null {
  try {
    // Create a more descriptive initial description
    const placeName = place.name || 'Unknown Location';
    const placeVicinity = place.vicinity || place.formatted_address || '';
    const initialDescription = place.description || 
      (placeVicinity ? `${placeName} located in ${placeVicinity}` : placeName);
    
    return {
      id: place.place_id || `act_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      placeId: place.place_id || '',
      name: placeName,
      category: (place.types && place.types[0]) || 'attraction',
      description: initialDescription,
      location: {
        name: place.name || '',
        address: place.formatted_address || place.vicinity || '',
        coordinates: {
          lat: place.geometry?.location?.lat,
          lng: place.geometry?.location?.lng
        }
      },
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      vendorRaw: place
    };
  } catch (err) {
  logger.error('[searchActivities] Mapping error for place:', place?.name, err);
    return null;
  }
}

export async function _searchActivitiesImpl(data: any, context: any) {
  try {
    const normalized = (data && (data.data !== undefined ? data.data : data)) || {};
    const params: ActivitiesSearchParams = normalized as ActivitiesSearchParams;

    if (!params.destination) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required field: destination');
    }

    if (!GOOGLE_PLACES_API_KEY) {
      throw new functions.https.HttpsError('failed-precondition', 'Google Places API key missing in function source');
    }

  const maxResults = params.maxResults || 30;

    // Trip type hint map - used to bias queries toward the selected trip type
    const TRIP_TYPE_HINTS: Record<string, string[]> = {
      spiritual: ['spiritual retreat', 'temple', 'meditation', 'retreat', 'monastery'],
      romantic: ['romantic', 'couples', 'sunset', 'fine dining', 'scenic walk'],
      leisure: ['sightseeing', 'relaxing', 'museum', 'park', 'landmark'],
      adventure: ['hiking', 'trek', 'outdoors', 'rafting', 'adventure'],
      family: ['family-friendly', 'kids', 'zoo', 'amusement park', 'interactive museum'],
      business: ['conference', 'business district', 'meeting venues', 'business center'],
      nightlife: ['nightlife', 'bars', 'clubs', 'live music', 'late night'],
      bachelor: ['bachelor party', 'nightlife', 'bars', 'clubs', 'party', 'dance'],
      bachelorette: ['bachelorette party', 'spa', 'pampering', 'nightlife', 'party']
    };

    // Build a human-friendly query for activities. Prepend mustInclude and tripType hints
    const keywordsArray: string[] = Array.isArray(params.keywords) ? params.keywords.filter(Boolean).map(String) : [];
    const mustIncludeArray: string[] = Array.isArray(params.mustInclude) ? params.mustInclude.filter(Boolean).map(String) : [];
    const tripTypeHints = params.tripType ? (TRIP_TYPE_HINTS[params.tripType] || [params.tripType]) : [];

    // Compose query parts: mustInclude first, then tripType hints, then keywords
    const queryParts: string[] = [];
    if (mustIncludeArray.length > 0) queryParts.push(...mustIncludeArray);
    if (tripTypeHints.length > 0) queryParts.push(...tripTypeHints);
    if (keywordsArray.length > 0) queryParts.push(...keywordsArray);
    // Limit composed query length to avoid Places API INVALID_REQUEST for overly long queries.
    const MAX_QUERY_CHARS = 140; // safe cap for the query portion before ' in <destination>'

    // Build prioritized tokens: mustInclude tokens first, then tripType hints, then keywords
    const tokenizeSimple = (s: string) => s.replace(/[^\w\s]/g, ' ').split(/\s+/).map(t => t.trim()).filter(Boolean);
    const prioritizedTokens: string[] = [];
    const pushUnique = (tokens: string[]) => {
      for (const t of tokens) {
        const lower = t.toLowerCase();
        if (!prioritizedTokens.includes(lower)) prioritizedTokens.push(lower);
      }
    };

    pushUnique(mustIncludeArray.flatMap(String).map(String).flatMap(tokenizeSimple));
    pushUnique(tripTypeHints.flatMap(String).map(String).flatMap(tokenizeSimple));
    pushUnique(keywordsArray.flatMap(String).map(String).flatMap(tokenizeSimple));

    // Join tokens until MAX_QUERY_CHARS reached
    let joined = '';
    const finalTokens: string[] = [];
    for (const tok of prioritizedTokens) {
      const candidate = finalTokens.length === 0 ? tok : `${joined} ${tok}`;
      if (candidate.length <= MAX_QUERY_CHARS) {
        finalTokens.push(tok);
        joined = finalTokens.join(' ');
      } else {
        break;
      }
    }

    const keywordsHint = finalTokens.length > 0 ? finalTokens.join(' ') : 'things to do';
    const activitiesQuery = `${keywordsHint} in ${params.destination}`;

    // Helper to build textsearch URL
    const buildTextSearchUrl = (queryStr: string, extraOpts?: { type?: string; location?: { lat: number; lng: number }; radius?: number; opennow?: boolean; minprice?: number; maxprice?: number; language?: string; region?: string; }) => {
      const url = new URL(`${PLACES_BASE}/textsearch/json`);
      url.searchParams.set('query', queryStr);
      if (extraOpts?.type) url.searchParams.set('type', extraOpts.type);
      if (extraOpts?.location) {
        url.searchParams.set('location', `${extraOpts.location.lat},${extraOpts.location.lng}`);
        if (extraOpts?.radius) url.searchParams.set('radius', String(extraOpts.radius));
      }
      if (extraOpts?.opennow) url.searchParams.set('opennow', 'true');
      if (typeof extraOpts?.minprice === 'number') url.searchParams.set('minprice', String(extraOpts.minprice));
      if (typeof extraOpts?.maxprice === 'number') url.searchParams.set('maxprice', String(extraOpts.maxprice));
      if (extraOpts?.language) url.searchParams.set('language', extraOpts.language);
      if (extraOpts?.region) url.searchParams.set('region', extraOpts.region);
      url.searchParams.set('key', GOOGLE_PLACES_API_KEY);
      return url.toString();
    };

    // Build food/restaurants search variables. We'll always run a small, bounded
    // restaurant search by default unless `noRestaurantSearch` is explicitly true.
    const foodType = params.food?.type || 'restaurant';
    const shouldSearchRestaurants = (normalized as any).noRestaurantSearch !== true;

    const activitiesUrl = buildTextSearchUrl(activitiesQuery, {
      location: params.destinationLatLng,
      radius: params.destinationLatLng ? 50000 : undefined
    });
    // Build restaurant search promise. If client provided a food object, honor it
    // (allows cuisine filters, rankByDistance, etc.). Otherwise run a small
    // default restaurant TextSearch using tripType hints + keywords.
    let foodSearchPromise: Promise<any[]> = Promise.resolve([]);
    const restaurantMaxResults = Math.min(6, maxResults);

    if (shouldSearchRestaurants) {
      if (params.food) {
  logger.debug('[searchActivities] Food search params (explicit):', {
          foodKeywords: params.food?.keywords,
          rankByDistance: params.food?.rankByDistance,
          hasLatLng: !!params.destinationLatLng
        });

        if (params.food.rankByDistance && params.destinationLatLng) {
          const nearbyUrl = new URL(`${PLACES_BASE}/nearbysearch/json`);
          nearbyUrl.searchParams.set('location', `${params.destinationLatLng.lat},${params.destinationLatLng.lng}`);
          nearbyUrl.searchParams.set('type', foodType);
          nearbyUrl.searchParams.set('rankby', 'distance');
          if (params.food?.opennow) nearbyUrl.searchParams.set('opennow', 'true');
          if (typeof params.food?.minprice === 'number') nearbyUrl.searchParams.set('minprice', String(params.food.minprice));
          if (typeof params.food?.maxprice === 'number') nearbyUrl.searchParams.set('maxprice', String(params.food.maxprice));
          nearbyUrl.searchParams.set('key', GOOGLE_PLACES_API_KEY);

          foodSearchPromise = fetchAllTextSearchResults(nearbyUrl.toString(), restaurantMaxResults);
        } else {
          const foodQuery = (Array.isArray(params.food.keywords) && params.food.keywords.length > 0)
            ? params.food.keywords.join(' ')
            : (keywordsArray.length > 0 ? keywordsArray.join(' ') : 'restaurants');
          const foodUrl = buildTextSearchUrl(foodQuery + ` in ${params.destination}`, {
            type: foodType,
            location: params.destinationLatLng,
            radius: params.destinationLatLng ? 50000 : undefined,
            opennow: !!params.food?.opennow,
            minprice: params.food?.minprice,
            maxprice: params.food?.maxprice
          });

          foodSearchPromise = fetchAllTextSearchResults(foodUrl, restaurantMaxResults);
        }
      } else {
          // Default small restaurant search using tripType hints + keywords.
          // Ensure we always include an explicit 'restaurants' term so the
          // TextSearch (with type=restaurant) returns restaurant results even
          // when tripType hints don't mention food directly.
          const defaultFoodHintsBase = tripTypeHints.length > 0
            ? tripTypeHints.join(' ')
            : (keywordsArray.length > 0 ? keywordsArray.join(' ') : '');
          const defaultFoodHints = defaultFoodHintsBase ? `${defaultFoodHintsBase} restaurants` : 'restaurants';
          const foodQuery = `${defaultFoodHints} in ${params.destination}`;
        // Prefer NearbySearch when we have a destinationLatLng — it's more
        // likely to return restaurants for generic hints like 'family' or
        // 'business district'. Use a modest radius to keep results relevant.
        if (params.destinationLatLng) {
          const nearbyUrl = new URL(`${PLACES_BASE}/nearbysearch/json`);
          nearbyUrl.searchParams.set('location', `${params.destinationLatLng.lat},${params.destinationLatLng.lng}`);
          nearbyUrl.searchParams.set('type', foodType);
          nearbyUrl.searchParams.set('radius', String(20000)); // 20km
          // Use tripType hints (without the explicit 'restaurants' token) as keyword
          const keyword = defaultFoodHintsBase || 'restaurants';
          if (keyword) nearbyUrl.searchParams.set('keyword', keyword);
          nearbyUrl.searchParams.set('key', GOOGLE_PLACES_API_KEY);
          foodSearchPromise = fetchAllTextSearchResults(nearbyUrl.toString(), restaurantMaxResults);
        } else {
          const foodUrl = buildTextSearchUrl(foodQuery, {
            type: foodType,
            location: params.destinationLatLng,
            radius: params.destinationLatLng ? 50000 : undefined
          });
          
          foodSearchPromise = fetchAllTextSearchResults(foodUrl, restaurantMaxResults);
        }
      }
    } else {
  logger.debug('[searchActivities] Restaurant search disabled via noRestaurantSearch flag');
    }

    // Resolve fetch helper at runtime from the module exports so unit tests
    // can override `fetchAllTextSearchResults` by replacing the exported
    // symbol. This avoids tightly binding to the local function reference
    // which prevents test-time mocks from taking effect.
    const runtimeFetchAll = ((exports as any).fetchAllTextSearchResults as typeof fetchAllTextSearchResults) || fetchAllTextSearchResults;

    // Execute both searches in parallel (use runtime-resolved fetch helper)
    const [activityPlaces, foodPlaces] = await Promise.all([
      runtimeFetchAll(activitiesUrl, maxResults),
      // foodSearchPromise may itself call runtimeFetchAll via build-time code
      // but ensure parity by leaving the promise as-is (it will use
      // runtimeFetchAll when created via nearby/text search code path)
      foodSearchPromise
    ]);

    // Calculate trip days for Place Details enrichment
    const tripDays = (params.days && Number(params.days)) || 0;

    // Map and dedupe activity places
    const activities: any[] = [];
    const seenActs = new Set<string>();
    for (const place of activityPlaces) {
      const act = mapPlaceToActivity(place);
      if (!act) continue;
      if (act.placeId && seenActs.has(act.placeId)) continue;
      if (act.placeId) seenActs.add(act.placeId);
      activities.push(act);
      if (activities.length >= maxResults) break;
    }

    // Post-filtering and hint processing will be applied after restaurants are mapped

      // Helper to call Place Details endpoint and merge fields
      const fetchPlaceDetails = async (placeId: string) => {
        try {
          const fields = ['formatted_phone_number', 'international_phone_number', 'website', 'price_level', 'url', 'opening_hours', 'photos', 'formatted_address', 'geometry', 'name', 'editorial_summary', 'types', 'user_ratings_total', 'rating'].join(',');
          const url = `${PLACES_BASE}/details/json?place_id=${encodeURIComponent(placeId)}&fields=${fields}&key=${GOOGLE_PLACES_API_KEY}`;
          const res = await fetch(url);
          if (!res.ok) {
            const t = await res.text().catch(() => '');
            console.warn('[searchActivities] Place Details fetch failed', res.status, t);
            return null;
          }
          const json = await res.json();
          if (json && json.status === 'OK' && json.result) return json.result;
          console.warn('[searchActivities] Place Details returned non-OK', json.status, json.error_message);
          return null;
        } catch (err) {
          console.warn('[searchActivities] Place Details error', err);
          return null;
        }
      };

      // Helper to enrich items with Place Details
      const enrichWithPlaceDetails = async (items: any[], count: number, itemType: string) => {
        if (count <= 0 || items.length === 0) return;
        
        // Sort by rating desc, fall back to presence if rating missing
        const sorted = [...items].sort((a, b) => (b.rating || 0) - (a.rating || 0));
        const toEnrich = sorted.slice(0, Math.min(count, sorted.length));

        // Limit concurrency to avoid bursting quota; use a small worker pool to improve
        // throughput while keeping requests bounded.
        const CONCURRENCY = Math.min(3, toEnrich.length);
        const queue = toEnrich.slice();

        const worker = async () => {
          while (queue.length > 0) {
            const item = queue.shift();
            if (!item || !item.placeId) continue;
            const details = await fetchPlaceDetails(item.placeId);
            if (!details) continue;
            try {
              // Merge non-destructively
              item.phone = item.phone || details.formatted_phone_number || details.international_phone_number || null;
              item.website = item.website || details.website || details.url || null;
              if ((!item.estimatedCost || item.estimatedCost === null) && details.price_level !== undefined) {
                item.estimatedCost = { price_level: details.price_level };
              }
              item.opening_hours = item.opening_hours || details.opening_hours || null;
              item.address = item.address || details.formatted_address || null;

              // Enhanced description using Google's editorial summary or formatted address
              if (!item.description || item.description === item.location?.name) {
                item.description = details.editorial_summary?.overview ||
                                  details.formatted_address ||
                                  item.description ||
                                  `Visit ${details.name || item.name} in ${details.formatted_address || 'this location'}`;
              }

              item.location = item.location || {};
              item.location.name = item.location.name || details.name || item.name || null;
              if (!item.location.coordinates && details.geometry && details.geometry.location) {
                item.location.coordinates = { lat: details.geometry.location.lat, lng: details.geometry.location.lng };
              }
              // Update rating and user ratings total from Place Details
              item.rating = item.rating || details.rating || null;
              item.userRatingsTotal = item.userRatingsTotal || details.user_ratings_total || null;

              // Merge photos and vendorRaw
              if (details.photos && Array.isArray(details.photos) && details.photos.length > 0) {
                item.vendorRaw = item.vendorRaw || {};
                item.vendorRaw.photos = details.photos;
              }
              item.vendorRaw = { ...item.vendorRaw, ...details };
            } catch (e) {
              console.warn(`[searchActivities] Failed to merge place details for ${itemType}`, item.placeId, e);
            }
          }
        };

        // Start workers
        const workers: Promise<void>[] = [];
        for (let i = 0; i < CONCURRENCY; i++) workers.push(worker());
        await Promise.all(workers);
      };

      // Perform Place Details enrichment based on trip days, but limit to a small cap
      // COST CONTROL: Skip Place Details if explicitly disabled (~$0.017 per call saved)
      const skipEnrichment = params.skipPlaceDetailsEnrichment === true;
      
      if (tripDays > 0 && !skipEnrichment) {
          const enrichmentCount = Math.min(tripDays, 6); // cap enrichment to control quota
          logger.info(`[searchActivities] Enriching ${enrichmentCount} activities with Place Details`);
          // Enrich activities for the capped number
          await enrichWithPlaceDetails(activities, enrichmentCount, 'activities');
        } else if (skipEnrichment) {
          logger.info('[searchActivities] ⚡ Skipping Place Details enrichment (cost control mode)');
        }

    // Map and dedupe food places
    const restaurants: any[] = [];
    const seenFood = new Set<string>();
    for (const place of foodPlaces) {
      const item = mapPlaceToActivity(place);
      if (!item) continue;
      if (item.placeId && seenFood.has(item.placeId)) continue;
      if (item.placeId) seenFood.add(item.placeId);
      restaurants.push(item);
      if (restaurants.length >= maxResults) break;
    }

    // Enrich restaurants with Place Details for the capped number of days
    // COST CONTROL: Skip Place Details if explicitly disabled (~$0.017 per call saved)
    if (tripDays > 0 && restaurants.length > 0 && !skipEnrichment) {
      const enrichmentCount = Math.min(tripDays, 6);
      logger.info(`[searchActivities] Enriching ${enrichmentCount} restaurants with Place Details`);
      await enrichWithPlaceDetails(restaurants, enrichmentCount, 'restaurants');
    } else if (skipEnrichment && restaurants.length > 0) {
      logger.info('[searchActivities] ⚡ Skipping restaurant Place Details enrichment (cost control mode)');
    }

    // --- Post-filtering and hint processing (mustAvoid first, then mustInclude boosting) ---
    const sanitize = (s: any) => (s && typeof s === 'string') ? s.toLowerCase() : '';
    const mustAvoid = Array.isArray(params.mustAvoid) ? params.mustAvoid.map(sanitize).filter(Boolean) : [];
    const mustInclude = Array.isArray(params.mustInclude) ? params.mustInclude.map(sanitize).filter(Boolean) : [];
    const specialReq = sanitize(params.specialRequests || '');

    // Tokenization helper: split on non-word characters and return tokens set for faster exact-term checks
    const tokenizeForMatch = (input: string) => {
      if (!input || typeof input !== 'string') return new Set<string>();
      const cleaned = input.replace(/[^\w\s]/g, ' ').toLowerCase();
      const toks = cleaned.split(/\s+/).map(t => t.trim()).filter(Boolean);
      return new Set(toks);
    };

    let mustAvoidFilteredCount = 0;
    if (mustAvoid.length > 0) {
      const beforeActs = activities.length;
      const filteredActs = activities.filter(act => {
        const hay = `${act.name || ''} ${act.category || ''} ${act.description || ''} ${act.vendorRaw?.editorial_summary || ''}`.toLowerCase();
        const hayTokens = tokenizeForMatch(hay);
        for (const avoid of mustAvoid) {
          if (!avoid) continue;
          const avoidTokens = Array.from(tokenizeForMatch(avoid));
          // If any token in the avoid term matches exactly a token in hayTokens, exclude
          if (avoidTokens.some(t => hayTokens.has(t))) return false;
        }
        return true;
      });
      mustAvoidFilteredCount += (beforeActs - filteredActs.length);

      const beforeRests = restaurants.length;
      const filteredRests = restaurants.filter(rest => {
        const hay = `${rest.name || ''} ${rest.category || ''} ${rest.description || ''} ${rest.vendorRaw?.editorial_summary || ''}`.toLowerCase();
        const hayTokens = tokenizeForMatch(hay);
        for (const avoid of mustAvoid) {
          if (!avoid) continue;
          const avoidTokens = Array.from(tokenizeForMatch(avoid));
          if (avoidTokens.some(t => hayTokens.has(t))) return false;
        }
        return true;
      });
      mustAvoidFilteredCount += (beforeRests - filteredRests.length);

      // Replace collections with filtered versions
      activities.length = 0; activities.push(...filteredActs);
      restaurants.length = 0; restaurants.push(...filteredRests);
    }

    // Second pass: mark/boost items that match mustInclude terms (but do not remove non-matching items)
    const mustIncludeMatches: any[] = [];
    if (mustInclude.length > 0) {
      for (const term of mustInclude) {
        if (!term) continue;
        const termTokens = Array.from(tokenizeForMatch(term));
        const matchedActs = activities.filter(act => {
          const hay = `${act.name || ''} ${act.category || ''} ${act.description || ''} ${act.vendorRaw?.editorial_summary || ''}`.toLowerCase();
          const hayTokens = tokenizeForMatch(hay);
          return termTokens.some(t => hayTokens.has(t));
        });
        for (const m of matchedActs) {
          if (!m._mustIncludeMatches) m._mustIncludeMatches = [];
          m._mustIncludeMatches.push(term);
          if (!mustIncludeMatches.includes(m)) mustIncludeMatches.push(m);
        }

        const matchedRests = restaurants.filter(rest => {
          const hay = `${rest.name || ''} ${rest.category || ''} ${rest.description || ''} ${rest.vendorRaw?.editorial_summary || ''}`.toLowerCase();
          const hayTokens = tokenizeForMatch(hay);
          return termTokens.some(t => hayTokens.has(t));
        });
        for (const m of matchedRests) {
          if (!m._mustIncludeMatches) m._mustIncludeMatches = [];
          m._mustIncludeMatches.push(term);
          if (!mustIncludeMatches.includes(m)) mustIncludeMatches.push(m);
        }
      }
    }


    return {
      success: true,
      data: {
        searchId: `activities_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        activities,
        restaurants
      },
      metadata: {
        provider: 'Google Places',
        counts: { activities: activities.length, restaurants: restaurants.length },
        activitiesQuery,
        tripTypeHints,
        // include foodHints when explicit food object provided for debugging
        foodHints: (params.food && Array.isArray((params.food as any).keywords) && (params.food as any).keywords.length > 0) ? (params.food as any).keywords.join(' ') : undefined,
        filtering: {
          mustAvoidFilteredCount: mustAvoidFilteredCount || 0,
          mustIncludeMatchesCount: (mustIncludeMatches && mustIncludeMatches.length) || 0,
          mustIncludeTermsFound: (mustIncludeMatches || []).slice(0, 10).map((m: any) => ({ id: m.id || m.placeId || null, matches: m._mustIncludeMatches || [] })),
          specialRequestsUsed: !!(params.specialRequests && String(params.specialRequests).trim())
        }
      }
    };
  } catch (err: any) {
    console.error('[searchActivities] Unexpected error', err);
    throw new functions.https.HttpsError('internal', err?.message || String(err));
  }
}

export const searchActivities = functions.https.onCall(_searchActivitiesImpl);

export default {};
