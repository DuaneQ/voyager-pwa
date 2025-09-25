import { useState, useCallback, useContext } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { auth } from '../environments/firebaseConfig';
import { UserProfileContext } from '../Context/UserProfileContext';
import { AIGenerationRequest } from '../types/AIGeneration';
import { AirlineCodeConverter } from '../utils/airlineMapping';
import { ACTIVITY_KEYWORD_MAP } from '../utils/activityKeywords';

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
      
    // Determine whether we should search for flights: use transport dropdown value (primaryMode === 'airplane')
    // or allow a request-level override.
    const profile = (request as any).preferenceProfile;
    const includeFlights = Boolean(
      (request as any).includeFlights === true ||
      (profile && String(profile.transportation?.primaryMode || '').toLowerCase() === 'airplane')
    );

      // Only prepare a flight call when flights are requested
      let flightCall: Promise<any> | null = null;
      if (includeFlights) {
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

  const settledAll = await Promise.allSettled([flightCall ? flightCall : Promise.resolve(null), accommodationsCall, activitiesCall]);
  const [flightSettled, accSettled, activitiesSettled] = settledAll as any[];

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





    // Create a single ID for the generation (client-side temporary id)
    const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  let itineraryData: any = {
      id: generationId,
      destination: request.destination,
      departure: request.departure || '',
      startDate: request.startDate,
      endDate: request.endDate,
      description: `AI-generated itinerary for ${request.destination}`,
      // Search functionality fields
      gender: 'Any',
      sexualOrientation: 'Any',
      status: 'Any',
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
      aiGenerated: true,
      // Add daily plans with enriched activities
      dailyPlans: dailyPlans,
      days: dailyPlans, // Also add as 'days' for compatibility with AIItineraryDisplay
      // Attach externalData for hotels so UI can read itineraryData.externalData.hotelRecommendations
      externalData: {
        hotelRecommendations: accommodations
      }
  };

  // Normalize flightResultData into an array we'll store on itineraryData.flights
  let normalizedFlights: any[] = [];
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

  try {
    (itineraryData as any).flights = normalizedFlights;
    (itineraryData as any).accommodations = accommodations;
  } catch (e) {
    console.warn('[useAIGeneration] Failed to attach flights/accommodations to itineraryData', e);
  }


    // Send the full itinerary data (including flights, accommodations, activities, restaurants, userInfo)
    // so the server has the original payload shape the frontend expects.
    
    // Use the restaurants array that searchActivities returned (this was the missing piece!)
  // const restaurants = restaurantsFromActivitiesSearch || [];
    


  // Server handles Place Details enrichment and itinerary creation.
  // Request the canonical, enriched itinerary from the server AI function.
  setProgress({ stage: 'ai_generation', percent: 60, message: 'Requesting server-side itinerary generation...' });

  let toSave: any = null;
  let serverToSave: any = null;
  try {
    const aiResp = await generateItineraryWithAI({
      requestPayload: {
        destination: request.destination,
        startDate: request.startDate,
        endDate: request.endDate,
        profile: (request as any)?.preferenceProfile || null,
        generationId
      }
    });
    const aiData = aiResp?.data || aiResp || null;
    if (aiData && typeof aiData === 'object') {
      // If the server returned an already-shaped document, use it (preserve server canonical fields)
      if ((aiData as any).id || (aiData as any).response) {
        serverToSave = aiData;
      } else if ((aiData as any).itinerary || (aiData as any).response?.data?.itinerary) {
        serverToSave = {
          id: generationId,
          userId: auth.currentUser?.uid || null,
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date(),
          destination: request.destination,
          startDate: request.startDate,
          endDate: request.endDate,
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
      }
    }
  } catch (e) {
    console.warn('[useAIGeneration] Server-side AI generation failed; falling back to client-side minimal payload', e);
  }

  // Fallback: if server did not return a toSave payload, build a minimal document similar to previous behavior
  const clientGenerationId = generationId;
  if (!serverToSave) {
    const fallbackToSave = {
      id: clientGenerationId,
      userId: auth.currentUser?.uid || null,
      status: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
      destination: request.destination,
      startDate: request.startDate,
      endDate: request.endDate,
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
          metadata: {
            generationId: clientGenerationId,
            confidence: 1.0,
            processingTime: Date.now() - Date.now(),
            aiModel: 'client-side-fallback',
            model: 'client-side-fallback',
            version: '1.0.0'
          },
          recommendations: {
            alternativeActivities: alternativeActivities,
            alternativeRestaurants: alternativeRestaurants,
            flights: (itineraryData as any).flights || [],
            accommodations: accommodations
          }
        }
      }
  };
  toSave = fallbackToSave;
  } else {
    toSave = serverToSave;
  }


    const db = getFirestore();
  // Do not introduce shape normalization workarounds here.
  // Save the raw flightResultData under recommendations.flights where
  // the UI (`AIItineraryDisplay`) expects it. Avoid duplicating flights at top-level.

    // Save to Firestore
    try {
      // Log arguments to doc and setDoc for troubleshooting
      console.log('[useAIGeneration] Firestore doc args:', db, 'ai_generations', clientGenerationId);
      const docRef = doc(db, 'ai_generations', clientGenerationId);
      // Firestore rejects undefined values. Convert any undefined fields to null
      // using a JSON replacer so nested undefineds are handled without adding a
      // larger utility function.
      // Log payload shapes to help debug Firestore 'undefined' errors. Keep logs small to avoid PII.
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
      } catch (logErr) {
        console.warn('[useAIGeneration] Failed to log toSave summary', logErr);
      }

      const sanitized = JSON.parse(JSON.stringify(toSave, (_k, v) => v === undefined ? null : v));
      try {
        console.log('[useAIGeneration] Sanitized payload preview:', {
          id: sanitized.id,
          itineraryDays: (sanitized.response?.data?.itinerary?.days?.length) ?? 0,
          metadata: sanitized.response?.data?.metadata
        });
      } catch (logErr) {
        console.warn('[useAIGeneration] Failed to log sanitized preview', logErr);
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