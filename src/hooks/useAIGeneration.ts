import { useState, useCallback, useContext } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { auth } from '../environments/firebaseConfig';
import { UserProfileContext } from '../Context/UserProfileContext';
import { AIGenerationRequest } from '../types/AIGeneration';
import { AirlineCodeConverter } from '../utils/airlineMapping';
import { ACTIVITY_KEYWORD_MAP } from '../utils/activityKeywords';

import { extractJSONFromString, parseAssistantJSON } from '../utils/ai/parsers';

interface ItineraryResult {
  id: string | null;
  success: boolean;
  savedDocId?: string | null;
}

export const useAIGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ stage: string; percent: number; message?: string } | null>(null);
  const { userProfile } = useContext(UserProfileContext);

  const generateItinerary = useCallback(async (request: AIGenerationRequest): Promise<ItineraryResult> => {
    setIsGenerating(true);
    setError(null);

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

  const functions = getFunctions();
  const searchFlights = httpsCallable(functions, 'searchFlights');
  const searchAccommodations = httpsCallable(functions, 'searchAccommodations');
  const searchActivities = httpsCallable(functions, 'searchActivities');
  const generateItineraryWithAI = httpsCallable(functions, 'generateItineraryWithAI');
      
  // Convert airline names to IATA codes for API compatibility
      const preferredAirlineCodes = request.flightPreferences?.preferredAirlines 
        ? AirlineCodeConverter.convertNamesToCodes(request.flightPreferences.preferredAirlines)
        : [];
      
  // Determine transport type from explicit request or preferenceProfile.
    // Only treat as a flight request when the transport type is explicitly airplane/flight/air.
  const profile = (request as any).preferenceProfile;
  // Prefer the user's selected transport mode from their profile when present.
  // Only fall back to an explicit request.transportType if the profile has no selection.
  const transportTypeRaw = profile?.transportation?.primaryMode ?? (request as any).transportType ?? '';
    const transportType = String(transportTypeRaw || '').toLowerCase();
    const includeFlights = transportType === 'airplane' || transportType === 'flight' || transportType === 'air';
 
  // Create a generationId early so we can include it in parallel calls (AI callable)
  const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Only prepare a flight call when transport type is airplane/flight
      let flightCall: Promise<any> | null = null;
      if (includeFlights) {
        console.log('[useAIGeneration] includeFlights=true, preparing to call searchFlights with:', {
          departureAirportCode: request.departureAirportCode,
          destinationAirportCode: request.destinationAirportCode,
          departureDate: request.startDate,
          returnDate: request.endDate,
          cabinClass: request.flightPreferences?.class?.toUpperCase() || 'ECONOMY',
          preferredAirlines: preferredAirlineCodes
        });
        flightCall = searchFlights({
          departureAirportCode: request.departureAirportCode,
          destinationAirportCode: request.destinationAirportCode,
          departureDate: request.startDate,
          returnDate: request.endDate,
          cabinClass: request.flightPreferences?.class?.toUpperCase() || 'ECONOMY',
          stopPreference: request.flightPreferences?.stopPreference === 'non-stop' ? 'NONSTOP' : 
                         request.flightPreferences?.stopPreference === 'one-stop' ? 'ONE_OR_FEWER' : 'ANY',
          preferredAirlines: preferredAirlineCodes
        });
      }
  // Prepare variable for aiCall. We'll create the actual promise below so
  // it can include the generationId and run in parallel.
  let aiCall: Promise<any> | null = null;

      // derive accommodation search params from provided preference profile (if any)
      let accommodationParams: any = {};
      try {
        const profile = (request as any)?.preferenceProfile;
        console.log('[useAIGeneration] Full profile received:', JSON.stringify(profile, null, 2));
        if (profile && profile.accommodation) {
          console.log('[useAIGeneration] Accommodation preferences:', profile.accommodation);
          const starRating = profile.accommodation.starRating;
          const minUserRating = profile.accommodation.minUserRating ?? 3.5;
          console.log('[useAIGeneration] Using explicit starRating and minUserRating from profile:', { starRating, minUserRating });
          accommodationParams.starRating = Math.max(1, Math.min(5, Math.round(starRating || 3)));
          accommodationParams.minUserRating = Math.max(1, Math.min(5, Number(minUserRating)));
        } else {
          console.log('[useAIGeneration] No accommodation preferences found in profile');
        }
        // map accessibility flags if present on profile
        if (profile && profile.accessibility) {
          // pass a simple hint; server may use this to favor accessible results
          accommodationParams.accessibility = {
            mobilityNeeds: !!profile.accessibility.mobilityNeeds,
            hearingNeeds: !!profile.accessibility.hearingNeeds,
            visualNeeds: !!profile.accessibility.visualNeeds,
          };
        }
      } catch (e) {
        // ignore and fall back to default empty params
      }

      const accommodationsCall = searchAccommodations({
        destination: request.destination,
        destinationLatLng: (request as any).destinationLatLng || undefined,
        startDate: request.startDate,
        endDate: request.endDate,
        accommodationType: (request as any).accommodationType || 'any',
        maxResults: 8,
        ...accommodationParams
      });



  // Update progress: flights started (if any) and accommodations started
  setProgress({ stage: 'searching', percent: 10, message: 'Searching for flights and accommodations...' });

  // Also request activities in parallel. Map profile.activity keys to descriptive keywords using ACTIVITY_KEYWORD_MAP
  const rawActivityKeys: string[] = Array.isArray(profile?.activities) ? profile.activities : [];
  // Map keys -> arrays, flatten, dedupe while preserving order, limit to 8
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
  // Use cuisineTypes array directly when present; otherwise omit food search
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
  


  const basePayload: any = {
    destination: request.destination,
    destinationLatLng: (request as any).destinationLatLng,
    keywords: mappedKeywords,
    days: tripDays // This triggers Place Details enrichment for top activities
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
  }

  // Do not send maxResults from the client - server controls result limits
  const activitiesCall = searchActivities(basePayload);

  // Update progress: activities started
  setProgress({ stage: 'activities', percent: 35, message: 'Searching for activities and restaurants...' });

  // If this is a non-air flow, initiate the server AI callable now so it runs in parallel
  if (!includeFlights) {
    console.log('[useAIGeneration] includeFlights=false, initiating server AI callable now');
    try {
      // Include origin and transportType so the server receives the same
      // high-level inputs that were used to decide to skip flight searches.
      // Fall back to airport codes if a free-form departure string isn't present.
      const originCandidate = (request as any).departure || (request as any).origin || (request as any).departureAirportCode || null;
      const destinationAirportCodeCandidate = (request as any).destinationAirportCode || null;
      console.log('[useAIGeneration] Calling generateItineraryWithAI with originCandidate=', originCandidate, 'destinationAirportCode=', destinationAirportCodeCandidate, 'transportType=', transportType);
      aiCall = generateItineraryWithAI({
        destination: request.destination,
        startDate: request.startDate,
        endDate: request.endDate,
        origin: originCandidate,
        originAirportCode: (request as any).departureAirportCode || null,
        destinationAirportCode: destinationAirportCodeCandidate,
        transportType: transportType || null,
        preferenceProfile: (request as any)?.preferenceProfile || null,
        generationId
      });
    } catch (e) {
      // keep aiCall as null if the call cannot be constructed
      aiCall = null;
    }
  }

  // Build a labeled list of promises so we only wait on calls that were actually
  // initiated. This avoids misleading 'fulfilled' statuses from Promise.resolve
  // placeholders when a call was intentionally skipped.
  const promiseList: Promise<any>[] = [];
  const promiseKeys: string[] = [];
  if (flightCall) { promiseList.push(flightCall); promiseKeys.push('flight'); }
  promiseList.push(accommodationsCall); promiseKeys.push('accommodations');
  promiseList.push(activitiesCall); promiseKeys.push('activities');
  if (aiCall) { promiseList.push(aiCall); promiseKeys.push('ai'); }

  const settledAll = await Promise.allSettled(promiseList);
  // Map settled results back to named slots so the rest of the code can remain
  // mostly unchanged.
  let flightSettled: any = null, accSettled: any = null, activitiesSettled: any = null, aiSettled: any = null;
  settledAll.forEach((res, idx) => {
    const key = promiseKeys[idx];
    if (key === 'flight') flightSettled = res;
    else if (key === 'accommodations') accSettled = res;
    else if (key === 'activities') activitiesSettled = res;
    else if (key === 'ai') aiSettled = res;
  });
  // Diagnostic: show promise settlement statuses to trace which calls resolved/failed
  try {
    console.log('[useAIGeneration] settled statuses:', {
      flight: flightSettled ? flightSettled.status : 'skipped',
      accommodations: accSettled ? accSettled.status : 'unknown',
      activities: activitiesSettled ? activitiesSettled.status : 'unknown',
      ai: aiSettled ? aiSettled.status : 'skipped'
    });
  } catch (e) {
    // no-op
  }

      // Handle flight result
      let flightResultData: any = null;
      if (includeFlights) {
        if (flightSettled.status === 'fulfilled') {
          flightResultData = (flightSettled.value as any).data;
          console.log('✅ [useAIGeneration] Flight search successful:', flightResultData);
        } else {
          console.warn('⚠️ [useAIGeneration] Flight search failed:', flightSettled.reason);
        }
      }

      // Handle accommodations result defensively
      let accommodations: any[] = [];
      if (accSettled.status === 'fulfilled') {
        try {
          const accResult = accSettled.value as any;
          const accDataAny: any = accResult?.data || accResult || {};

          // Try common locations for hotels array in a defensive way
          if (Array.isArray(accDataAny.hotels)) accommodations = accDataAny.hotels;
          else if (accDataAny?.result?.data && Array.isArray(accDataAny.result.data.hotels)) accommodations = accDataAny.result.data.hotels;
          else if (accDataAny?.data && Array.isArray(accDataAny.data.hotels)) accommodations = accDataAny.data.hotels;
          else if (accDataAny?.result && Array.isArray(accDataAny.result.hotels)) accommodations = accDataAny.result.hotels;

          // If accommodations is still not found, attempt a shallow scan for the first array of objects
          if ((!Array.isArray(accommodations) || accommodations.length === 0) && typeof accDataAny === 'object') {
            const maybeHotels = Object.values(accDataAny).find((v: any) => Array.isArray(v) && v.length > 0 && typeof v[0] === 'object');
            if (Array.isArray(maybeHotels)) accommodations = maybeHotels as any[];
          }

          console.log('✅ [useAIGeneration] Accommodations search successful, found', accommodations.length);
        } catch (accErr) {
          console.warn('⚠️ [useAIGeneration] Failed to parse accommodations response:', accErr);
        }
      } else {
        console.warn('⚠️ [useAIGeneration] Accommodations search failed:', accSettled.reason);
      }

        // Handle activities result defensively
        let activities: any[] = [];
        let restaurantsFromActivitiesSearch: any[] = [];
        if (activitiesSettled && activitiesSettled.status === 'fulfilled') {
          try {
            const actResult = activitiesSettled.value as any;
            const actDataAny: any = actResult?.data || actResult || {};
            if (Array.isArray(actDataAny.activities)) activities = actDataAny.activities;
            else if (Array.isArray(actDataAny.data?.activities)) activities = actDataAny.data.activities;
            
            // IMPORTANT: Extract the restaurants array that searchActivities returns separately!
            if (Array.isArray(actDataAny.restaurants)) restaurantsFromActivitiesSearch = actDataAny.restaurants;
            else if (Array.isArray(actDataAny.data?.restaurants)) restaurantsFromActivitiesSearch = actDataAny.data.restaurants;
            
            console.log('✅ [useAIGeneration] Activities search successful, found', activities.length, 'activities and', restaurantsFromActivitiesSearch.length, 'restaurants');
          } catch (aerr) {
            console.warn('⚠️ [useAIGeneration] Failed to parse activities response:', aerr);
          }
        } else if (activitiesSettled) {
          console.warn('⚠️ [useAIGeneration] Activities search failed:', activitiesSettled.reason);
        }

    // Create daily itinerary structure by distributing activities and restaurants across trip days
    const dailyPlans: any[] = [];
    const enrichedActivities = activities.filter(act => act.phone || act.website || act.price_level); // Only enriched activities
    const enrichedRestaurants = restaurantsFromActivitiesSearch.filter(rest => rest.phone || rest.website || rest.price_level); // Only enriched restaurants
    


    for (let dayIndex = 0; dayIndex < tripDays; dayIndex++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(currentDate.getDate() + dayIndex);
      const dayDateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Assign one enriched activity per day (cycling through if we have more days than activities)
      const dayActivity = enrichedActivities[dayIndex % Math.max(1, enrichedActivities.length)];
      // Assign one enriched restaurant per day (cycling through if we have more days than restaurants)
      const dayRestaurant = enrichedRestaurants[dayIndex % Math.max(1, enrichedRestaurants.length)];
      
      // Helper function to calculate price from Google Places price_level
      const calculatePrice = (item: any, defaultCategory: string) => {
        // Google Places price_level: 0 (free) to 4 (very expensive)
        if (typeof item.price_level === 'number') {
          switch (item.price_level) {
            case 0: return 0;     // Free
            case 1: return 15;    // Inexpensive ($10-20)
            case 2: return 35;    // Moderate ($25-45)  
            case 3: return 65;    // Expensive ($50-80)
            case 4: return 100;   // Very expensive ($80+)
            default: return 25;   // Default for unknown price levels
          }
        }
        // Fallback based on activity category
        const category = (item.category || item.type || defaultCategory).toLowerCase();
        if (category.includes('museum') || category.includes('gallery')) return 20;
        if (category.includes('park') || category.includes('beach')) return 0;
        if (category.includes('restaurant') || category.includes('food')) return 40;
        if (category.includes('theater') || category.includes('show')) return 75;
        if (category.includes('tour') || category.includes('attraction')) return 30;
        return 25; // Generic fallback
      };

      const dayPlan = {
        date: dayDateString,
        day: dayIndex + 1,
        activities: dayActivity ? [{
          id: dayActivity.id || `activity_${dayIndex}`,
          name: dayActivity.name || 'Explore Local Area',
          description: dayActivity.description || `Discover ${request.destination}`,
          location: dayActivity.location?.name || dayActivity.location?.address || request.destination,
          startTime: '10:00',
          endTime: '16:00',
          category: dayActivity.category || 'sightseeing',
          estimatedCost: {
            amount: calculatePrice(dayActivity, 'sightseeing'),
            currency: 'USD'
          },
          // Include enriched Place Details data
          phone: dayActivity.phone,
          website: dayActivity.website,
          rating: dayActivity.rating,
          userRatingsTotal: dayActivity.userRatingsTotal,
          placeId: dayActivity.placeId,
          coordinates: dayActivity.location?.coordinates
        }] : [],
        meals: dayRestaurant ? [{
          id: dayRestaurant.id || `meal_${dayIndex}`,
          name: 'Dinner',
          type: 'dinner',
          time: '19:00',
          timing: { time: '19:00' },
          cost: {
            amount: calculatePrice(dayRestaurant, 'restaurant'),
            currency: 'USD'
          },
          restaurant: {
            id: dayRestaurant.id || `restaurant_${dayIndex}`,
            name: dayRestaurant.name || 'Local Restaurant',
            description: dayRestaurant.description || `Dine in ${request.destination}`,
            location: dayRestaurant.location?.name || dayRestaurant.location?.address || request.destination,
            category: dayRestaurant.category || 'restaurant',
            // Include enriched Place Details data
            phone: dayRestaurant.phone,
            website: dayRestaurant.website,
            rating: dayRestaurant.rating,
            userRatingsTotal: dayRestaurant.userRatingsTotal,
            placeId: dayRestaurant.placeId,
            coordinates: dayRestaurant.location?.coordinates,
            cuisine: dayRestaurant.category || 'restaurant'
          }
        }] : []
      };
      
      dailyPlans.push(dayPlan);
    }

    // Calculate alternative activities and restaurants (not used in daily plans)

    // Get the enriched items used in daily plans
    const usedEnrichedActivities = new Set(
      dailyPlans.map(day => day.activities?.[0]?.id || day.activities?.[0]?.placeId).filter(Boolean)
    );
    const usedEnrichedRestaurants = new Set(
      dailyPlans.map(day => day.meals?.[0]?.restaurant?.id || day.meals?.[0]?.restaurant?.placeId).filter(Boolean)
    );

    // Filter out used items to get alternatives - include ALL activities/restaurants, not just enriched ones
    let alternativeActivities: any[] = activities.filter(act => {
      const key = act.id || act.placeId;
      return key && !usedEnrichedActivities.has(key);
    });
    // If no enriched activities, fallback to all activities (for accommodations-only test)
    if (alternativeActivities.length === 0 && activities.length > 0) {
      alternativeActivities = activities;
    }
    const alternativeRestaurants = restaurantsFromActivitiesSearch.filter(rest => {
      const key = rest.id || rest.placeId;
      return key && !usedEnrichedRestaurants.has(key);
    });





  // generationId was created earlier

  // Generate a rich description from daily activities and restaurants
  const generateDescriptionFromDailyPlans = (dailyPlans: any[], destination: string): string => {
    if (!dailyPlans || dailyPlans.length === 0) {
      return `AI-generated itinerary for ${destination}`;
    }

    const activities: string[] = [];
    const restaurants: string[] = [];
    
    dailyPlans.forEach((day, index) => {
      // Extract activity names
      if (day.activities && day.activities.length > 0) {
        const activity = day.activities[0];
        if (activity.name && activity.name !== 'Explore Local Area') {
          activities.push(activity.name);
        }
      }
      
      // Extract restaurant names  
      if (day.meals && day.meals.length > 0) {
        const meal = day.meals[0];
        if (meal.restaurant && meal.restaurant.name && meal.restaurant.name !== 'Local Restaurant') {
          restaurants.push(meal.restaurant.name);
        }
      }
    });

    // Build description
    let description = `AI-generated ${dailyPlans.length}-day itinerary for ${destination}.`;
    
    if (activities.length > 0) {
      const activityList = activities.slice(0, 3).join(', '); // Show up to 3 activities
      const moreActivities = activities.length > 3 ? ` and ${activities.length - 3} more` : '';
      description += ` Experience ${activityList}${moreActivities}.`;
    }
    
    if (restaurants.length > 0) {
      const restaurantList = restaurants.slice(0, 2).join(', '); // Show up to 2 restaurants
      const moreRestaurants = restaurants.length > 2 ? ` and ${restaurants.length - 2} more` : '';
      description += ` Dine at ${restaurantList}${moreRestaurants}.`;
    }

    return description;
  };

  // Extract activities for the activities field (used by search and UI)
  const extractActivitiesFromDailyPlans = (dailyPlans: any[]): string[] => {
    const activities: string[] = [];
    
    // Generic terms to filter out from activities
    const genericTermsToFilter = [
      'point_of_interest',
      'tourist_attraction', 
      'establishment',
      'place_of_worship',
      'store',
      'food',
      'meal_takeaway',
      'restaurant',
      'lodging'
    ];
    
    dailyPlans.forEach(day => {
      if (day.activities && day.activities.length > 0) {
        day.activities.forEach((activity: any) => {
          if (activity.name && activity.name !== 'Explore Local Area') {
            activities.push(activity.name);
          }
          // Add category for better search matching, but filter out generic terms
          if (activity.category && 
              !activities.includes(activity.category) &&
              !genericTermsToFilter.includes(activity.category.toLowerCase())) {
            activities.push(activity.category);
          }
        });
      }
      
      // Add restaurant names to activities for better searchability
      if (day.meals && day.meals.length > 0) {
        day.meals.forEach((meal: any) => {
          if (meal.restaurant && meal.restaurant.name && meal.restaurant.name !== 'Local Restaurant') {
            activities.push(meal.restaurant.name);
          }
        });
      }
    });
    
    // Remove duplicates and return
    return Array.from(new Set(activities));
  };

  let itineraryData: any = {
      id: generationId,
      destination: request.destination,
      departure: request.departure || '',
      startDate: request.startDate,
      endDate: request.endDate,
      startDay: new Date(request.startDate).getTime(),
      endDay: new Date(request.endDate).getTime(),
      lowerRange: 18,
      upperRange: 100,
      likes: [],
      userInfo: {
        username: userProfile?.username || 'Anonymous',
        gender: userProfile?.gender || 'Any',
        dob: userProfile?.dob || '',
        uid: userId,
        email: userProfile?.email || auth.currentUser?.email || '',
        status: userProfile?.status || 'Any',
        sexualOrientation: userProfile?.sexualOrientation || 'Any',
        blocked: userProfile?.blocked || []
      },
      // AI Generation specific fields
      ai_status: "completed",
      // Add daily plans with enriched activities
      dailyPlans: dailyPlans,
      days: dailyPlans, // Also add as 'days' for compatibility with AIItineraryDisplay
      // Attach externalData for hotels so UI can read itineraryData.externalData.hotelRecommendations
      externalData: {
        hotelRecommendations: accommodations
      }
  };

  // Normalize flightResultData into an array we'll store on itineraryData.flights
  // Normalize flightResultData only when a flight search was requested.
  let normalizedFlights: any[] = [];
  if (includeFlights) {
    try {
      if (flightResultData && typeof flightResultData === 'object' && Array.isArray((flightResultData as any).flights)) {
        normalizedFlights = (flightResultData as any).flights;
      } else if (Array.isArray(flightResultData)) {
        normalizedFlights = flightResultData;
      } else if (flightResultData) {
        normalizedFlights = [flightResultData];
      }
    } catch (e) {
      normalizedFlights = [];
    }
  }

  try {
    // Always attach accommodations. Only attach flights when includeFlights is true.
    (itineraryData as any).flights = includeFlights ? normalizedFlights : [];
    (itineraryData as any).accommodations = accommodations;
  } catch (e) {
    console.warn('[useAIGeneration] Failed to attach flights/accommodations to itineraryData', e);
  }

  // Server handles Place Details enrichment and itinerary creation. We already
  // invoked the server AI (if applicable) as part of the settled promises above.
  setProgress({ stage: 'ai_generation', percent: 60, message: 'Requesting server-side itinerary generation...' });

  let toSave: any = null;
  let serverToSave: any = null;
  // parsedTransportation declared in outer scope so we can merge it into toSave later
  let parsedTransportation: any = null;

  // Extract AI result from the settled promises (if any) and parse server output
  let aiData: any = null;
  try {
    if (aiSettled) {
      if (aiSettled.status === 'fulfilled') {
        // Unwrap callable return shapes: firebase callable returns { data: <returnValue> }
        aiData = (aiSettled.value && (aiSettled.value.data || aiSettled.value)) || null;
        // If the callable returned a wrapper { success, data }, prefer the inner data
        const aiPayload = aiData && (aiData.success === true || aiData.data) ? (aiData.data || aiData) : aiData;
        console.log('✅ [useAIGeneration] Server-side AI generation successful; aiData summary=', {
          hasAiData: !!aiData,
          keys: aiPayload && typeof aiPayload === 'object' ? Object.keys(aiPayload).slice(0,10) : null
        });
        // Replace aiData with the unwrapped payload for downstream parsing convenience
        aiData = aiPayload;
      } else {
        console.warn('[useAIGeneration] Server-side AI generation failed:', aiSettled.reason);
      }
    }

      // Attempt to parse assistant text from aiData (string or object)
      let assistantTextCandidate: string | null = null;
      if (aiData && typeof aiData === 'string') {
        assistantTextCandidate = aiData as string;
      } else if (aiData && typeof aiData === 'object') {
        assistantTextCandidate = (aiData as any).assistant || (aiData as any).response?.data?.assistant || (aiData as any).data?.assistant || null;
      }
      if (assistantTextCandidate && typeof assistantTextCandidate === 'string') {
        console.log('[useAIGeneration] Found assistantTextCandidate (preview):', assistantTextCandidate.slice(0, 400));
        const parsed = parseAssistantJSON(assistantTextCandidate);
        console.log('[useAIGeneration] parseAssistantJSON (global) result keys:', parsed ? Object.keys(parsed).slice(0,10) : null);
        if (parsed && parsed.transportation) {
          parsedTransportation = parsed.transportation;
          console.log('[useAIGeneration] parsedTransportation extracted (global) keys:', Object.keys(parsedTransportation).slice(0,10));
        }
      }

    // parsedTransportation holds a structured transportation recommendation when the
    // server returns assistant text (JSON) containing a transportation object.
    if (aiData && typeof aiData === 'object') {
      console.log('🤖 [useAIGeneration] AI Data received, keys:', Object.keys(aiData));
      
      // If server returned a simple transportation object (common test shape), capture it
      if ((aiData as any).transportation) {
        parsedTransportation = (aiData as any).transportation;
        console.log('🚗 [useAIGeneration] Found transportation in direct aiData:', parsedTransportation);
      }

      // aiData may be the unwrapped payload; server callables sometimes return
      // { success: true, data: {...} } so we normalized above. Check common
      // canonical shapes in the unwrapped aiData.
      if ((aiData as any).id || (aiData as any).response) {
        serverToSave = aiData;
        // Try to parse assistant text included by server to extract a transportation object
        const assistantText = (aiData as any).assistant || (aiData as any).response?.data?.assistant || (aiData as any).data?.assistant || null;
        if (assistantText && typeof assistantText === 'string') {
          try {
            console.log('[useAIGeneration] Attempting to parse assistantText (preview):', assistantText.slice(0, 400));
            const maybe = parseAssistantJSON(assistantText);
            console.log('[useAIGeneration] parseAssistantJSON result keys:', maybe ? Object.keys(maybe).slice(0,10) : null);
            if (maybe && maybe.transportation) parsedTransportation = maybe.transportation;
          } catch (e) {
            console.warn('[useAIGeneration] parseAssistantJSON failed:', e);
          }
        }
      } else if ((aiData as any).itinerary || (aiData as any).response?.data?.itinerary || (aiData as any).data?.itinerary) {
        serverToSave = {
          id: generationId,
          userId: auth.currentUser?.uid || null,
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
          destination: request.destination,
          startDate: request.startDate,
          endDate: request.endDate,
          lowerRange: 18,
          upperRange: 110,
          ai_status: "completed",
          userInfo: {
            username: userProfile?.username || 'Anonymous',
            gender: userProfile?.gender || 'Any',
            dob: userProfile?.dob || '',
            uid: auth.currentUser?.uid || '',
            email: userProfile?.email || auth.currentUser?.email || '',
            status: userProfile?.status || 'Any',
            sexualOrientation: userProfile?.sexualOrientation || 'Any',
            blocked: userProfile?.blocked || []
          },
          response: {
            success: true,
            data: {
              itinerary: (aiData as any).itinerary || (aiData as any).response?.data?.itinerary || aiData,
              metadata: (aiData as any).metadata || (aiData as any).response?.data?.metadata || { generationId },
              recommendations: (aiData as any).recommendations || (aiData as any).response?.data?.recommendations || { alternativeActivities, alternativeRestaurants }
            }
          }
        };
        // Attempt to parse assistant output to extract transportation
        const assistantText = (aiData as any).assistant || (aiData as any).response?.data?.assistant || (aiData as any).data?.assistant || null;
        if (assistantText && typeof assistantText === 'string') {
          try {
            console.log('[useAIGeneration] Attempting to parse assistantText for itinerary (preview):', assistantText.slice(0, 400));
            const maybe = parseAssistantJSON(assistantText);
            console.log('[useAIGeneration] parseAssistantJSON (itinerary) result keys:', maybe ? Object.keys(maybe).slice(0,10) : null);
            if (maybe && maybe.transportation) parsedTransportation = maybe.transportation;
          } catch (e) {
            console.warn('[useAIGeneration] parseAssistantJSON (itinerary) failed:', e);
          }
        }
      }
    }
  } catch (e) {
    // Do NOT fall back to client-side generated payloads. These are unreliable
    // and caused production issues (missing required top-level fields). Abort
    // the generation and surface an error so the caller/UI can retry or report.
    console.warn('[useAIGeneration] Server-side AI generation failed; aborting generation', e);
  }

  if (!serverToSave) {
    if (includeFlights) {
      // Build a minimal canonical payload based on client-side data for airplane flows
      toSave = {
        id: generationId,
        userId: auth.currentUser?.uid || null,
        status: 'completed',
        createdAt: new Date(),
        updatedAt: new Date(),
        description: generateDescriptionFromDailyPlans(dailyPlans, request.destination),
        activities: extractActivitiesFromDailyPlans(dailyPlans),
        destination: request.destination,
        startDate: request.startDate,
        endDate: request.endDate,
        startDay: new Date(request.startDate).getTime(), 
        endDay: new Date(request.endDate).getTime(), 
        gender: 'No Preference',
        sexualOrientation: 'No Preference',
        lowerRange: 18,
        upperRange: 110,
        ai_status: "completed",
        likes: [],
        userInfo: {
          username: userProfile?.username || 'Anonymous',
          gender: userProfile?.gender || 'Any',
          dob: userProfile?.dob || '',
          uid: auth.currentUser?.uid || '',
          email: userProfile?.email || auth.currentUser?.email || '',
          status: userProfile?.status || 'Any',
          sexualOrientation: userProfile?.sexualOrientation || 'Any',
          blocked: userProfile?.blocked || []
        },
        response: {
          success: true,
          data: {
            itinerary: itineraryData,
            metadata: { generationId },
            recommendations: {
              alternativeActivities: alternativeActivities,
              alternativeRestaurants: alternativeRestaurants,
              flights: (itineraryData as any).flights || [],
              accommodations: accommodations
            }
          }
        }
      };
    } else {
      // If server didn't return a full canonical payload, but DID return a
      // transportation object we parsed from assistant output, accept that and
      // save a client-side itinerary merged with the parsed transportation.
      if (parsedTransportation) {
        console.warn('[useAIGeneration] Server did not return full canonical payload, but parsed transportation present; saving client-side itinerary with transportation');
        toSave = {
          id: generationId,
          userId: auth.currentUser?.uid || null,
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
          destination: request.destination,
          description: generateDescriptionFromDailyPlans(dailyPlans, request.destination),
          activities: extractActivitiesFromDailyPlans(dailyPlans),
          startDate: request.startDate,
          startDay: new Date(request.startDate).getTime(), 
          endDay: new Date(request.endDate).getTime(), 
          endDate: request.endDate,
          gender: 'No Preference',
          sexualOrientation: 'No Preference',
          likes: [],
          userInfo: {
            username: userProfile?.username || 'Anonymous',
            gender: userProfile?.gender || 'Any',
            dob: userProfile?.dob || '',
            uid: auth.currentUser?.uid || '',
            email: userProfile?.email || auth.currentUser?.email || '',
            status: userProfile?.status || 'Any',
            sexualOrientation: userProfile?.sexualOrientation || 'Any',
            blocked: userProfile?.blocked || []
          },
          response: {
            success: true,
            data: {
              itinerary: itineraryData,
              metadata: { generationId },
              recommendations: {
          alternativeActivities: alternativeActivities,
          alternativeRestaurants: alternativeRestaurants,
          accommodations: accommodations,
          transportation: parsedTransportation
              }
            }
          }
        };
      } else {
        // Before aborting, log a small, sanitized summary of what the server
        // actually returned so the developer can diagnose why a canonical
        // payload wasn't present. Avoid printing user PII — only show top-level
        // keys and a short preview of assistant text (if present).
        try {
          const preview: any = { keys: null, assistantPreview: null };
          if (aiData && typeof aiData === 'object') {
            preview.keys = Object.keys(aiData).slice(0, 20);
            const assistantText = (aiData as any).assistant || (aiData as any).response?.data?.assistant || null;
            if (assistantText && typeof assistantText === 'string') {
              preview.assistantPreview = assistantText.slice(0, 500);
            }
          }
          console.error('[useAIGeneration] Aborting non-air generation. Server aiData preview:', preview);
        } catch (logErr) {
          // ignore logging failures
        }
        const msg = '[useAIGeneration] Server did not return a canonical payload for non-air flow; aborting save';
        console.error(msg);
        setError('Server-side generation failed. Please try again.');
        throw new Error(msg);
      }
    }
  } else {
    toSave = serverToSave;
  }

  const clientGenerationId = (toSave && (toSave.id || toSave.documentId)) ? (toSave.id || toSave.documentId) : generationId;

  // If we parsed a transportation object from the assistant output, merge it into
  // the canonical toSave under response.data.transportation and
  // response.data.recommendations.transportation. Do NOT touch flights.
  try {
    if (parsedTransportation) {
      console.log('🚗 [useAIGeneration] MERGING TRANSPORTATION DATA:', JSON.stringify(parsedTransportation, null, 2));
      toSave = toSave || {};
      toSave.response = toSave.response || { success: true, data: { recommendations: {} } };
      toSave.response.data = toSave.response.data || {};
      toSave.response.data.recommendations = toSave.response.data.recommendations || {};
      
      // CRITICAL FIX: UI looks for transportation at response.data.transportation, not recommendations.transportation
      toSave.response.data.transportation = parsedTransportation;
      toSave.response.data.recommendations.transportation = parsedTransportation;
      
      console.log('🚗 [useAIGeneration] Transportation merged to BOTH locations successfully');
      console.log('toSave.response.data.transportation exists:', !!toSave.response.data.transportation);
    } else {
      console.log('❌ [useAIGeneration] NO TRANSPORTATION DATA TO MERGE - parsedTransportation is null/undefined');
    }
  } catch (e) {
    console.error('❌ [useAIGeneration] Transportation merge failed:', e);
    // ignore merge errors; do not block saving
  }


    const db = getFirestore();
  // Do not introduce shape normalization workarounds here.
  // Save the raw flightResultData under recommendations.flights where
  // the UI (`AIItineraryDisplay`) expects it. Avoid duplicating flights at top-level.

    // Save to Firestore - AI generations go to 'itineraries' collection
    try {
      // Log arguments to doc and setDoc for troubleshooting
      console.log('[useAIGeneration] Firestore doc args:', db, 'itineraries', clientGenerationId);
      const docRef = doc(db, 'itineraries', clientGenerationId);
      // Firestore rejects undefined values. Convert any undefined fields to null
      // using a JSON replacer so nested undefineds are handled without adding a
      // larger utility function.
      // Log payload shapes to help debug Firestore 'undefined' errors. Keep logs small to avoid PII.
      const sanitized = JSON.parse(JSON.stringify(toSave, (_k, v) => v === undefined ? null : v));
      try {
        console.log('[useAIGeneration] Saving ai_generation document id=', clientGenerationId, 'summary=', {
          destination: toSave.destination,
          startDate: toSave.startDate,
          endDate: toSave.endDate,
          days: (itineraryData as any)?.days?.length ?? 0,
          alternativeActivitiesCount: (toSave.response?.data?.recommendations?.alternativeActivities?.length) ?? 0,
          alternativeRestaurantsCount: (toSave.response?.data?.recommendations?.alternativeRestaurants?.length) ?? 0,
          flightsCount: (toSave.response?.data?.recommendations?.flights?.length) ?? 0
        });
        console.log('[useAIGeneration] Sanitized payload preview:', {
          id: sanitized.id,
          itineraryDays: (sanitized.response?.data?.itinerary?.days?.length) ?? 0,
          metadata: sanitized.response?.data?.metadata
        });
      } catch (logErr) {
        console.warn('[useAIGeneration] Failed to log toSave or sanitized preview', logErr);
      }
      console.log('[useAIGeneration] setDoc args:', docRef, sanitized);
      await setDoc(docRef, sanitized);
      console.log('✅ [useAIGeneration] Saved client-side itinerary to Firestore:', clientGenerationId);
    } catch (saveError) {
      console.warn('⚠️ [useAIGeneration] Failed to save to Firestore:', saveError);
      // Rethrow so the outer try/catch treats this as a failure and we don't return a saved id that doesn't exist
      throw saveError;
    }

    // Final progress
    setProgress({ stage: 'done', percent: 100, message: 'Generation complete' });

    // Return result pointing at saved doc
    return {
      id: clientGenerationId,
      success: true,
      savedDocId: clientGenerationId
    };

    } catch (err: any) {
      console.error('❌ [useAIGeneration] Flight search failed:', err);
      const errorMessage = err?.message || 'Failed to search flights';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  }, [userProfile]);

  const resetGeneration = useCallback(() => {
    setError(null);
    setIsGenerating(false);
  }, []);

  const cancelGeneration = useCallback(() => {
    setIsGenerating(false);
  }, []);

  return {
    generateItinerary,
    isGenerating,
    error,
  resetGeneration,
  cancelGeneration,
  progress
  };
};