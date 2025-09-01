import { useState, useCallback, useContext } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../environments/firebaseConfig';
import { UserProfileContext } from '../Context/UserProfileContext';
import { AIGenerationRequest } from '../types/AIGeneration';
import { AirlineCodeConverter } from '../utils/airlineMapping';

interface FlightSearchResult {
  flights: any[];
  searchId: string;
  message?: string;
}

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
      
      // Convert airline names to IATA codes for API compatibility
      const preferredAirlineCodes = request.flightPreferences?.preferredAirlines 
        ? AirlineCodeConverter.convertNamesToCodes(request.flightPreferences.preferredAirlines)
        : [];
      
      console.log('🔍 [useAIGeneration] Original airline names:', request.flightPreferences?.preferredAirlines);
      console.log('🔍 [useAIGeneration] Converted airline codes:', preferredAirlineCodes);
      
      const flightResult = await searchFlights({
        departureAirportCode: request.departureAirportCode,
        destinationAirportCode: request.destinationAirportCode,
        departureDate: request.startDate,
        returnDate: request.endDate,
        cabinClass: request.flightPreferences?.class?.toUpperCase() || 'ECONOMY',
        stopPreference: request.flightPreferences?.stopPreference === 'non-stop' ? 'NONSTOP' : 
                       request.flightPreferences?.stopPreference === 'one-stop' ? 'ONE_OR_FEWER' : 'ANY',
        preferredAirlines: preferredAirlineCodes
      });

      console.log('✅ [useAIGeneration] Flight search successful:', flightResult.data);

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
        updatedAt: serverTimestamp()
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
              flights: (flightResult.data as FlightSearchResult)?.flights || []
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