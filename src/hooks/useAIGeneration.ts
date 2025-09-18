import { useState, useCallback, useContext } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../environments/firebaseConfig';
import { UserProfileContext } from '../Context/UserProfileContext';
import { AIGenerationRequest } from '../types/AIGeneration';
import { AirlineCodeConverter } from '../utils/airlineMapping';

interface ItineraryResult {
  id: string;
  success: boolean;
}

export const useAIGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { userProfile } = useContext(UserProfileContext);

  const generateItinerary = useCallback(async (request: AIGenerationRequest): Promise<ItineraryResult> => {
    setIsGenerating(true);
    setError(null);

    try {
      const userId = auth.currentUser?.uid;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      console.log('🔍 [useAIGeneration] Calling Firebase Cloud Function with request:', request);

      const functions = getFunctions();
      const searchFlights = httpsCallable(functions, 'searchFlights');
      const searchAccommodations = httpsCallable(functions, 'searchAccommodations');
      
  // Convert airline names to IATA codes for API compatibility
      const preferredAirlineCodes = request.flightPreferences?.preferredAirlines 
        ? AirlineCodeConverter.convertNamesToCodes(request.flightPreferences.preferredAirlines)
        : [];
      
      console.log('🔍 [useAIGeneration] Original airline names:', request.flightPreferences?.preferredAirlines);
      console.log('🔍 [useAIGeneration] Converted airline codes:', preferredAirlineCodes);
      
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

      console.log('[useAIGeneration] Calling searchAccommodations with params:', {
        destination: request.destination,
        destinationLatLng: (request as any).destinationLatLng || undefined,
        startDate: request.startDate,
        endDate: request.endDate,
        accommodationType: (request as any).accommodationType || 'any',
        maxResults: 8,
        ...accommodationParams
      });

  // Await the two promises, passing a placeholder for flightCall when null
  const settledPromises = [flightCall ? flightCall : Promise.resolve(null), accommodationsCall];
  const [flightSettled, accSettled] = await Promise.allSettled(settledPromises as any[]);

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

      // Create a single ID for the generation
      const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const itineraryData = {
        id: generationId,
        destination: request.destination,
        departure: request.departure || '',
        startDate: request.startDate,
        endDate: request.endDate,
        description: `Flight search for ${request.destination}`,
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        // Attach externalData for hotels so UI can read itineraryData.externalData.hotelRecommendations
        externalData: {
          hotelRecommendations: accommodations
        }
      };

      // Save only to ai_generations collection
      console.log('💾 [useAIGeneration] Saving generation to Firestore...');
      
      // Save to ai_generations collection using itineraryData
      await setDoc(doc(db, 'ai_generations', generationId), {
        id: generationId,
        userId: userId,
        status: 'completed',
        request: request,
        response: {
          success: true,
          data: {
            itinerary: itineraryData,
            recommendations: {
              flights: flightResultData?.flights || [],
              accommodations: accommodations
            },
            metadata: {
              generationId: generationId,
              confidence: 0.8,
              processingTime: Date.now(),
              aiModel: 'flight-search-v1',
              version: '1.0.0'
            }
          }
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        processingTimeMs: 1000
      });

      console.log('✅ [useAIGeneration] Generation saved successfully');

      // Return simple result with just ID and status
      return {
        id: generationId,
        success: true
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
    progress: null // Keep for compatibility with modal
  };
};