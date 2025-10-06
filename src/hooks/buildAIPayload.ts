import { AirlineCodeConverter } from '../utils/airlineMapping';
import { ACTIVITY_KEYWORD_MAP } from '../utils/activityKeywords';

export function buildAIPayload(request: any, userProfile: any) {
  // Convert airline names to IATA codes for API compatibility
  const preferredAirlineCodes = request.flightPreferences?.preferredAirlines
    ? AirlineCodeConverter.convertNamesToCodes(request.flightPreferences.preferredAirlines)
    : [];

  // Determine transport type from explicit request or preferenceProfile.
  const profile = (request as any).preferenceProfile;
  const transportTypeRaw = profile?.transportation?.primaryMode ?? (request as any).transportType ?? '';
  const transportType = String(transportTypeRaw || '').toLowerCase();
  const includeFlights = transportType === 'airplane' || transportType === 'flight' || transportType === 'air';

  // Create a generationId early so callers can include it in parallel calls
  const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // derive accommodation search params from provided preference profile (if any)
  let accommodationParams: any = {};
  try {
    const profile = (request as any)?.preferenceProfile;
    if (profile && profile.accommodation) {
      const starRating = profile.accommodation.starRating;
      const minUserRating = profile.accommodation.minUserRating ?? 3.5;
      accommodationParams.starRating = Math.max(1, Math.min(5, Math.round(starRating || 3)));
      accommodationParams.minUserRating = Math.max(1, Math.min(5, Number(minUserRating)));
    }
    if (profile && profile.accessibility) {
      accommodationParams.accessibility = {
        mobilityNeeds: !!profile.accessibility.mobilityNeeds,
        hearingNeeds: !!profile.accessibility.hearingNeeds,
        visualNeeds: !!profile.accessibility.visualNeeds,
      };
    }
  } catch (e) {
    // ignore and fall back to default empty params
  }

  // Also request activities in parallel. Map profile.activity keys to descriptive keywords using ACTIVITY_KEYWORD_MAP
  const rawActivityKeys: string[] = Array.isArray(profile?.activities) ? profile.activities : [];
  const seenKw = new Set<string>();
  const mappedKeywords: string[] = [];
  for (const k of rawActivityKeys) {
    const mapped = ACTIVITY_KEYWORD_MAP[k] || [k];
    for (const kw of mapped) {
      if (!seenKw.has(kw)) {
        seenKw.add(kw);
        mappedKeywords.push(kw);
        if (mappedKeywords.length >= 8) break;
      }
    }
    if (mappedKeywords.length >= 8) break;
  }

  // Derive food hints from profile.foodPreferences
  const foodPrefs = profile?.foodPreferences;
  const cuisineTypes = Array.isArray(foodPrefs?.cuisineTypes) ? foodPrefs.cuisineTypes.filter((c: any) => typeof c === 'string' && c.trim()).map((s: string) => s.trim()) : [];

  // Map budget level to price hints if present
  let minprice: number | undefined;
  let maxprice: number | undefined;
  if (foodPrefs?.foodBudgetLevel === 'low') { minprice = 0; maxprice = 1; }
  else if (foodPrefs?.foodBudgetLevel === 'medium') { minprice = 1; maxprice = 2; }
  else if (foodPrefs?.foodBudgetLevel === 'high') { minprice = 2; maxprice = 4; }

  // Calculate trip duration for activity enrichment (one activity per day)
  const startDate = new Date(request.startDate);
  const endDate = new Date(request.endDate);
  const tripDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Extract user-provided hints from request (modal fields)
  const userMustInclude: string[] = Array.isArray((request as any).mustInclude) ? (request as any).mustInclude.filter(Boolean).map(String) : [];
  const userMustAvoid: string[] = Array.isArray((request as any).mustAvoid) ? (request as any).mustAvoid.filter(Boolean).map(String) : [];
  const specialRequestsHint: string | null = (request as any).specialRequests ? String((request as any).specialRequests).trim() : null;
  const reqTripType: string | null = (request as any).tripType ? String((request as any).tripType) : null;

  const TRIP_TYPE_KEYWORD_MAP: Record<string, string[]> = {
    romantic: ['romantic', 'couples', 'date night'],
    family: ['family-friendly', 'kids', 'amusement park'],
    adventure: ['adventure', 'hiking', 'outdoor activities'],
    leisure: ['relaxing', 'sightseeing', 'easy pace'],
    business: ['business', 'conference', 'meetings'],
    bachelor: ['nightlife', 'group', 'party'],
    bachelorette: ['pampering', 'spa', 'party'],
    spiritual: ['retreat', 'temple', 'meditation']
  };

  const tripTypeHints = reqTripType ? (TRIP_TYPE_KEYWORD_MAP[reqTripType] || [reqTripType]) : [];

  const combinedKeywords = Array.from(new Set<string>([
    ...mappedKeywords,
    ...userMustInclude,
    ...tripTypeHints,
    ...(specialRequestsHint ? [specialRequestsHint] : [])
  ])).slice(0, 12);

  const basePayload: any = {
    destination: request.destination,
    destinationLatLng: (request as any).destinationLatLng,
    keywords: combinedKeywords,
    days: tripDays, // This triggers Place Details enrichment for top activities
    mustInclude: userMustInclude,
    mustAvoid: userMustAvoid,
    specialRequests: specialRequestsHint,
    tripType: reqTripType
  };

  if (cuisineTypes.length > 0) {
    basePayload.food = {
      keywords: cuisineTypes,
      type: 'restaurant',
      minprice,
      maxprice,
      opennow: false,
      rankByDistance: false
    };
    if (userMustInclude.length > 0) {
      basePayload.food.keywords = Array.from(new Set([...basePayload.food.keywords, ...userMustInclude])).slice(0, 6);
    }
  }

  return {
    preferredAirlineCodes,
    transportType,
    includeFlights,
    generationId,
    accommodationParams,
    mappedKeywords,
    cuisineTypes,
    minprice,
    maxprice,
    tripDays,
    userMustInclude,
    userMustAvoid,
    specialRequestsHint,
    reqTripType,
    tripTypeHints,
    combinedKeywords,
    basePayload
  };
}

export default buildAIPayload;
