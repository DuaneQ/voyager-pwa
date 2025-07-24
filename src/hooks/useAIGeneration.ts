import { useState, useCallback } from 'react';
import { AIGenerationRequest, AIGenerationResponse } from '../types/AIGeneration';
import { auth } from '../environments/firebaseConfig';
import { useTravelPreferences } from './useTravelPreferences';
import { getFunctions, httpsCallable } from 'firebase/functions';

export interface AIGenerationStage {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  estimatedDuration?: number; // in seconds
}

export interface UseAIGenerationReturn {
  // State
  isGenerating: boolean;
  progress: {
    stage: number;
    totalStages: number;
    message: string;
    stages: AIGenerationStage[];
    estimatedTimeRemaining?: number;
  } | null;
  error: string | null;
  result: AIGenerationResponse | null;
  
  // Actions
  generateItinerary: (request: AIGenerationRequest) => Promise<AIGenerationResponse>;
  cancelGeneration: () => void;
  resetGeneration: () => void;
  
  // Utilities
  estimateCost: (request: Partial<AIGenerationRequest>) => Promise<number>;
  checkGenerationStatus: (generationId: string) => Promise<any>;
}

// Default generation stages
const DEFAULT_STAGES: AIGenerationStage[] = [
  {
    id: 'analyzing',
    label: 'Analyzing preferences',
    description: 'Processing your travel preferences and requirements',
    status: 'pending',
    estimatedDuration: 15
  },
  {
    id: 'finding',
    label: 'Finding activities',
    description: 'Discovering the best activities and attractions',
    status: 'pending',
    estimatedDuration: 30
  },
  {
    id: 'optimizing',
    label: 'Optimizing schedule',
    description: 'Creating the perfect daily schedule',
    status: 'pending',
    estimatedDuration: 25
  },
  {
    id: 'calculating',
    label: 'Calculating costs',
    description: 'Estimating costs and finding the best deals',
    status: 'pending',
    estimatedDuration: 20
  },
  {
    id: 'finalizing',
    label: 'Finalizing itinerary',
    description: 'Putting the finishing touches on your trip',
    status: 'pending',
    estimatedDuration: 10
  }
];

export const useAIGeneration = (): UseAIGenerationReturn => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<{
    stage: number;
    totalStages: number;
    message: string;
    stages: AIGenerationStage[];
    estimatedTimeRemaining?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AIGenerationResponse | null>(null);
  
  // Add travel preferences hook
  const { getProfileById } = useTravelPreferences();

  const generateItinerary = useCallback(async (request: AIGenerationRequest): Promise<AIGenerationResponse> => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('User must be authenticated to generate itineraries');
    }

    console.log('🚀 Starting AI Generation with request:', request);

    try {
      setIsGenerating(true);
      setError(null);
      setResult(null);
      
      // Initialize stages
      const stages = [...DEFAULT_STAGES];
      
      setProgress({
        stage: 1,
        totalStages: stages.length,
        message: 'Starting AI generation...',
        stages: stages.map((stage, index) => ({
          ...stage,
          status: index === 0 ? 'active' : 'pending'
        })) as AIGenerationStage[],
      });

      // Get profile data to populate missing fields
      console.log('🔍 About to call getProfileById with:', request.preferenceProfileId);
      const profile = request.preferenceProfileId ? getProfileById(request.preferenceProfileId) : null;
      
      console.log('🔍 Profile Debug Info:');
      console.log('  - Profile ID:', request.preferenceProfileId);
      console.log('  - Profile found:', !!profile);
      console.log('  - Profile data:', profile);
      
      if (!profile) {
        console.error('❌ Profile not found! Available profiles might not be loaded yet.');
        throw new Error(`Travel preference profile with ID "${request.preferenceProfileId}" not found. Please ensure your travel preferences are loaded.`);
      }

      // For testing: hardcode destination if empty or problematic
      const testRequest = {
        ...request,
        destination: request.destination || 'Paris, France', // Fallback for testing
        budget: {
          total: profile.budgetRange?.max || 1000,
          currency: 'USD' as const
        },
        groupSize: profile.groupSize?.preferred || 1
      };

      console.log('🚀 Calling Firebase Function: generateItinerary with request:', testRequest);
      const functions = getFunctions();
      const generateItineraryFn = httpsCallable(functions, 'generateItinerary');
      
      const response = await generateItineraryFn(testRequest);
      const result = response.data as any;
      
      console.log('✅ AI Generation Response:', result);
      
      if (!result.success) {
        throw new Error(result.error?.message || 'AI generation failed');
      }

      // Convert to expected format
      const aiResponse: AIGenerationResponse = {
        id: result.data?.metadata?.generationId || `gen_${Date.now()}`,
        request,
        itinerary: result.data?.itinerary,
        recommendations: result.data?.recommendations,
        costBreakdown: result.data?.costBreakdown,
        status: 'completed',
        progress: {
          stage: stages.length,
          totalStages: stages.length,
          message: 'Generation completed!'
        },
        createdAt: new Date(),
        completedAt: new Date()
      };

      setResult(aiResponse);
      
      // Update progress to completed
      setProgress({
        stage: stages.length,
        totalStages: stages.length,
        message: 'Generation completed!',
        stages: stages.map(stage => ({
          ...stage,
          status: 'completed'
        })) as AIGenerationStage[],
      });

      return aiResponse;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  }, [getProfileById]);

  const cancelGeneration = useCallback(() => {
    // Note: Firebase Cloud Functions don't support direct cancellation
    // The generation will continue on the backend but we reset the UI state
    setIsGenerating(false);
    setProgress(null);
    setError('Generation cancelled by user');
  }, []);

  const resetGeneration = useCallback(() => {
    setIsGenerating(false);
    setProgress(null);
    setError(null);
    setResult(null);
  }, []);

  const estimateCost = useCallback(async (request: Partial<AIGenerationRequest>): Promise<number> => {
    try {
      // Get profile data to populate missing fields
      const profile = request.preferenceProfileId ? getProfileById(request.preferenceProfileId) : null;
      
      if (!profile) {
        // If no profile, fall back to basic calculation
        const baseCost = 1000;
        const duration = request.startDate && request.endDate 
          ? Math.ceil((new Date(request.endDate).getTime() - new Date(request.startDate).getTime()) / (1000 * 60 * 60 * 24))
          : 7;
        return baseCost * 0.8 * duration;
      }

      // For testing: hardcode destination if empty or problematic
      const testRequest = {
        ...request,
        destination: request.destination || 'Paris, France', // Fallback for testing
        budget: {
          total: profile.budgetRange?.max || 1000,
          currency: 'USD' as const
        },
        groupSize: profile.groupSize?.preferred || 1
      };

      console.log('🚀 Calling Firebase Function: estimateItineraryCost with request:', testRequest);
      const functions = getFunctions();
      const estimateCostFn = httpsCallable(functions, 'estimateItineraryCost');
      
      const response = await estimateCostFn(testRequest);
      const result = response.data as any;
      
      console.log('✅ Cost Estimation Response:', result);
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Cost estimation failed');
      }

      return result.data?.estimatedCost || 0;
    } catch (err) {
      console.error('❌ Cost estimation error:', err);
      
      // Fallback to basic calculation if API fails
      const profile = request.preferenceProfileId ? getProfileById(request.preferenceProfileId) : null;
      const baseCost = profile?.budgetRange?.max || 1000;
      const groupMultiplier = profile?.groupSize?.preferred || 1;
      
      const duration = request.startDate && request.endDate 
        ? Math.ceil((new Date(request.endDate).getTime() - new Date(request.startDate).getTime()) / (1000 * 60 * 60 * 24))
        : 7;
      
      return Math.min(baseCost, baseCost * 0.8 * duration * groupMultiplier);
    }
  }, [getProfileById]);

  const checkGenerationStatus = useCallback(async (generationId: string) => {
    try {
      console.log('🚀 Calling Firebase Function: getGenerationStatus');
      const functions = getFunctions();
      const getStatusFn = httpsCallable(functions, 'getGenerationStatus');
      
      const response = await getStatusFn({ generationId });
      const result = response.data as any;
      
      console.log('✅ Status Check Response:', result);
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Status check failed');
      }

      return result.data;
    } catch (err) {
      console.error('❌ Status check error:', err);
      throw err;
    }
  }, []);

  return {
    isGenerating,
    progress,
    error,
    result,
    generateItinerary,
    cancelGeneration,
    resetGeneration,
    estimateCost,
    checkGenerationStatus,
  };
};
