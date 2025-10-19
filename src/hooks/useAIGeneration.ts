import { useState, useCallback, useContext } from 'react';
import logger from '../utils/logger';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth } from '../environments/firebaseConfig';
import { UserProfileContext } from '../Context/UserProfileContext';
import { AIGenerationRequest } from '../types/AIGeneration';
import buildAIPayload from './buildAIPayload';

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

      // Build AI payload and related helper vars via small module
      const built = buildAIPayload(request, userProfile);
      const preferredAirlineCodes = built.preferredAirlineCodes;
      const transportType = built.transportType;
      const includeFlights = built.includeFlights;
      const generationId = built.generationId;
      const accommodationParams = built.accommodationParams;

      // Update progress: flights started (if any) and accommodations started
      // Note: orchestration helper will create and manage the accommodations call.
      setProgress({ stage: 'searching', percent: 10, message: 'Searching for flights and accommodations...' });

      // Build activities payload and other helpers from module
      const tripDays = built.tripDays;
      const userMustInclude = built.userMustInclude;
      const userMustAvoid = built.userMustAvoid;
      const specialRequestsHint = built.specialRequestsHint;
      const reqTripType = built.reqTripType;
      const basePayload: any = built.basePayload;

      // Update progress: activities started
      setProgress({ stage: 'activities', percent: 35, message: 'Searching for activities and restaurants...' });

      // Orchestrate remote callable calls in a helper so this function stays focused
      const orchestration = await (await import('./orchestrateAICalls')).orchestrateAICalls({
        searchFlights,
        searchAccommodations,
        searchActivities,
        generateItineraryWithAI,
        request,
        includeFlights,
        preferredAirlineCodes,
        accommodationParams,
        basePayload,
        generationId,
        userMustInclude,
        userMustAvoid,
        specialRequestsHint,
        reqTripType,
        transportType
      });

      let flightSettled: any = orchestration.flightSettled;
      let accSettled: any = orchestration.accSettled;
      let activitiesSettled: any = orchestration.activitiesSettled;
      let aiSettled: any = orchestration.aiSettled;

      // Handle flight result
      let flightResultData: any = null;
      if (includeFlights) {
        if (flightSettled.status === 'fulfilled') {
          flightResultData = (flightSettled.value as any).data;
        } else {
          logger.warn('⚠️ [useAIGeneration] Flight search failed:', flightSettled.reason);
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
        } catch (accErr) {
          logger.warn('⚠️ [useAIGeneration] Failed to parse accommodations response:', accErr);
        }
      } else {
        logger.warn('⚠️ [useAIGeneration] Accommodations search failed:', accSettled.reason);
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

          // Capture filtering metadata from activities call (if present) so we can
          // attach it to the saved itinerary for UI display.
          try {
            (actDataAny as any)._filteringMetadata = actDataAny.metadata || actDataAny.data?.metadata || null;
          } catch (e) {
            // ignore
          }
        } catch (aerr) {
          logger.warn('⚠️ [useAIGeneration] Failed to parse activities response:', aerr);
        }
      } else if (activitiesSettled) {
        logger.warn('⚠️ [useAIGeneration] Activities search failed:', activitiesSettled.reason);
      }

      // Recreate start/end Date objects for daily plan generation
      const startDate = new Date(request.startDate);
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

      // Extract filtering metadata captured from the activities call (if any)
      const activitiesFilteringMetadata = (() => {
        try {
          const settledAct = activitiesSettled && activitiesSettled.status === 'fulfilled' ? (activitiesSettled.value as any) : null;
          const actDataAny = settledAct ? (settledAct.data || settledAct) : null;
          return actDataAny?.metadata || actDataAny?.data?.metadata || null;
        } catch (e) {
          return null;
        }
      })();

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
        logger.warn('[useAIGeneration] Failed to attach flights/accommodations to itineraryData', e);
      }

      // Server handles Place Details enrichment and itinerary creation. We already
      // invoked the server AI (if applicable) as part of the settled promises above.
      setProgress({ stage: 'ai_generation', percent: 60, message: 'Requesting server-side itinerary generation...' });

      let toSave: any = null;
      // parsedTransportation and serverToSave will be populated from the parser output

      // Extract AI result from the settled promises and parse server output using helper
      const parsed = (await import('./parseAIServerResponse')).parseAIServerResponse({
        aiSettled,
        generationId,
        request,
        userProfile,
        alternativeActivities,
        alternativeRestaurants,
        accommodations
      });
      const aiData = parsed.aiData;
      const parsedTransportation = parsed.parsedTransportation;
      const serverToSave = parsed.serverToSave;

      if (!serverToSave) {
        if (includeFlights) {
          // Build a minimal canonical payload based on client-side data for airplane flows
          toSave = {
            id: generationId,
            userId: auth.currentUser?.uid || null,
            status: 'No Preference',
            ai_status: 'completed',
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
            logger.warn('[useAIGeneration] Server did not return full canonical payload, but parsed transportation present; saving client-side itinerary with transportation');
            toSave = {
              id: generationId,
              userId: auth.currentUser?.uid || null,
              status: 'No Preference',
              ai_status: 'completed',
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
              logger.error('[useAIGeneration] Aborting non-air generation. Server aiData preview:', preview);
            } catch (logErr) {
              // ignore logging failures
            }
            const msg = '[useAIGeneration] Server did not return a canonical payload for non-air flow; aborting save';
            logger.error(msg);
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
          toSave = toSave || {};
          toSave.response = toSave.response || { success: true, data: { recommendations: {} } };
          toSave.response.data = toSave.response.data || {};
          toSave.response.data.recommendations = toSave.response.data.recommendations || {};

          // CRITICAL FIX: UI looks for transportation at response.data.transportation, not recommendations.transportation
          toSave.response.data.transportation = parsedTransportation;
          toSave.response.data.recommendations.transportation = parsedTransportation;
        } else {
          logger.warn('❌ [useAIGeneration] NO TRANSPORTATION DATA TO MERGE - parsedTransportation is null/undefined');
        }
      } catch (e) {
        logger.error('❌ [useAIGeneration] Transportation merge failed:', e);
        // ignore merge errors; do not block saving
      }

      // Merge activities filtering metadata (returned by searchActivities) into the
      // canonical payload that will be saved to Firestore so the UI (AIItineraryHeader)
      // can surface filtering chips and unsatisfied-constraint warnings. We handle
      // both client-built `toSave` payloads and `serverToSave` shapes returned by
      // the server. Do this defensively and do not block save on merge errors.
      try {
        if (activitiesFilteringMetadata) {
          // Normalize: some server hooks return { filtering: { ... } } as metadata;
          // we want to persist the canonical object at response.data.metadata.filtering
          const canonicalFiltering = (activitiesFilteringMetadata && (activitiesFilteringMetadata.filtering || activitiesFilteringMetadata)) || activitiesFilteringMetadata;

          // Ensure toSave exists and has the expected nested shape
          toSave = toSave || {};
          toSave.response = toSave.response || { success: true, data: {} };
          toSave.response.data = toSave.response.data || {};
          toSave.response.data.metadata = toSave.response.data.metadata || { generationId: clientGenerationId || generationId };
          // Only override filtering if not already present (prefer server-provided if present)
          if (!toSave.response.data.metadata.filtering) {
            toSave.response.data.metadata.filtering = canonicalFiltering;
          }

          // Also try to merge into serverToSave when applicable
          if (serverToSave) {
            serverToSave.response = serverToSave.response || { success: true, data: {} };
            serverToSave.response.data = serverToSave.response.data || {};
            serverToSave.response.data.metadata = serverToSave.response.data.metadata || { generationId: clientGenerationId || generationId };
            if (!serverToSave.response.data.metadata.filtering) {
              serverToSave.response.data.metadata.filtering = canonicalFiltering;
            }
          }
        }
        // Persist the exact user-provided mustInclude / mustAvoid lists so the UI
        // can surface them consistently. Do not overwrite existing metadata
        // fields; only set these arrays when they are not already present.
        try {
          const userInclude = Array.isArray(userMustInclude) ? userMustInclude.filter(Boolean).map(String) : [];
          const userAvoid = Array.isArray(userMustAvoid) ? userMustAvoid.filter(Boolean).map(String) : [];

          // Helper to safely set arrays on a metadata object
          const safeSetUserFilters = (metaObj: any) => {
            try {
              metaObj = metaObj || {};
              // If the metadata was double-wrapped (filtering.filtering), unwrap it
              if (metaObj.filtering && metaObj.filtering.filtering) {
                metaObj.filtering = metaObj.filtering.filtering;
              }
              metaObj.filtering = metaObj.filtering || {};
              if ((!Array.isArray(metaObj.filtering.userMustInclude) || metaObj.filtering.userMustInclude.length === 0) && userInclude.length > 0) {
                // limit size to avoid very large documents
                metaObj.filtering.userMustInclude = userInclude.slice(0, 20);
              }
              if ((!Array.isArray(metaObj.filtering.userMustAvoid) || metaObj.filtering.userMustAvoid.length === 0) && userAvoid.length > 0) {
                metaObj.filtering.userMustAvoid = userAvoid.slice(0, 20);
              }
            } catch (e) {
              // swallow - non-critical
            }
          };

          // Apply to client payload
          try {
            toSave = toSave || {};
            toSave.response = toSave.response || { success: true, data: {} };
            toSave.response.data = toSave.response.data || {};
            toSave.response.data.metadata = toSave.response.data.metadata || { generationId: clientGenerationId || generationId };
            safeSetUserFilters(toSave.response.data.metadata);
          } catch (e) {
            // ignore
          }

          // Mirror into server-provided payload when present
          if (serverToSave) {
            try {
              serverToSave.response = serverToSave.response || { success: true, data: {} };
              serverToSave.response.data = serverToSave.response.data || {};
              serverToSave.response.data.metadata = serverToSave.response.data.metadata || { generationId: clientGenerationId || generationId };
              safeSetUserFilters(serverToSave.response.data.metadata);
            } catch (e) {
              // ignore
            }
          }
        } catch (e) {
          logger.warn('[useAIGeneration] Failed to persist user mustInclude/mustAvoid into metadata.filtering', e);
        }
      } catch (mergeErr) {
        logger.warn('[useAIGeneration] Failed to merge activities filtering metadata into payload:', mergeErr);
        // Do not fail the generation for metadata merge problems
      }

      // Instead of writing directly to Firestore, call the server RPC which
      // persists AI-generated itineraries into the canonical Cloud SQL (Prisma)
      // backend. This ensures AI itineraries are stored in the same place as
      // other user itineraries and returned by `listItinerariesForUser`.
      try {
        const sanitized = JSON.parse(JSON.stringify(toSave, (_k, v) => v === undefined ? null : v));
        const createItineraryFn = httpsCallable(functions, 'createItinerary');
        const saveRes: any = await createItineraryFn({ itinerary: sanitized });
        if (!saveRes?.data?.success) {
          const errMsg = saveRes?.data?.error || 'createItinerary RPC failed';
          logger.warn('⚠️ [useAIGeneration] createItinerary RPC returned error:', errMsg);
          throw new Error(errMsg);
        }
        // `saveRes.data.data` contains the created itinerary (sanitized by server)
        // We don't need to do anything else here; the saved id will match clientGenerationId when provided.
      } catch (saveError) {
        logger.warn('⚠️ [useAIGeneration] Failed to save via createItinerary RPC:', saveError);
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
      logger.error('❌ [useAIGeneration] Flight search failed:', err);
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