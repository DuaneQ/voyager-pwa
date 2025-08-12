import { useState, useCallback, useEffect, useContext } from 'react';
import { AIGenerationRequest, AIGenerationResponse } from '../types/AIGeneration';
import { auth } from '../environments/firebaseConfig';
import { useTravelPreferences } from './useTravelPreferences';
import { UserProfileContext } from '../Context/UserProfileContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, onSnapshot, getFirestore, collection, query, where, orderBy, limit } from 'firebase/firestore';

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
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const [pendingResolvers, setPendingResolvers] = useState<{[key: string]: (result: AIGenerationResponse) => void}>({});
  
  // Add travel preferences hook and user profile context
  const { getProfileById } = useTravelPreferences();
  const userProfileContext = useContext(UserProfileContext);
  const userProfile = userProfileContext?.userProfile;

  // Listen for real-time progress updates from Firestore
  useEffect(() => {
    if (!currentGenerationId) return;

    console.log('🔔 Setting up Firestore listener for generation:', currentGenerationId);
    const db = getFirestore();
    const generationDoc = doc(db, 'ai_generations', currentGenerationId);
    
    const unsubscribe = onSnapshot(generationDoc, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        console.log('📊 Firestore progress update:', data.progress);
        
        if (data.progress) {
          const firebaseProgress = data.progress;
          
          // Convert Firebase progress to our format
          const stages = [...DEFAULT_STAGES];
          const currentStageIndex = firebaseProgress.stage - 1;
          
          setProgress({
            stage: firebaseProgress.stage,
            totalStages: firebaseProgress.totalStages,
            message: firebaseProgress.message,
            stages: stages.map((stage, index) => ({
              ...stage,
              status: index < currentStageIndex ? 'completed' : 
                     index === currentStageIndex ? 'active' : 'pending'
            })) as AIGenerationStage[],
          });
        }

        // Check if generation is completed
        if (data.status === 'completed' && data.response?.success) {
          console.log('✅ Generation completed, processing result...');
          
          const result = data.response;
          const aiResponse: AIGenerationResponse = {
            id: data.id,
            request: data.request,
            itinerary: result.data?.itinerary,
            recommendations: result.data?.recommendations,
            costBreakdown: result.data?.costBreakdown,
            status: 'completed',
            progress: {
              stage: 5,
              totalStages: 5,
              message: 'Generation completed!'
            },
            createdAt: data.createdAt?.toDate() || new Date(),
            completedAt: new Date()
          };

          setResult(aiResponse);
          setIsGenerating(false);
          setCurrentGenerationId(null);
          
          // Resolve any pending promises
          const resolver = pendingResolvers[data.id];
          if (resolver) {
            resolver(aiResponse);
            setPendingResolvers(prev => {
              const updated = { ...prev };
              delete updated[data.id];
              return updated;
            });
          }
          
          // Final progress update
          setProgress({
            stage: 5,
            totalStages: 5,
            message: 'Generation completed!',
            stages: DEFAULT_STAGES.map(stage => ({
              ...stage,
              status: 'completed'
            })) as AIGenerationStage[],
          });
        }

        // Check if generation failed
        if (data.status === 'failed') {
          console.error('❌ Generation failed:', data.errorDetails);
          setError(data.errorDetails?.message || 'Generation failed');
          setIsGenerating(false);
          setCurrentGenerationId(null);
        }
      }
    }, (error) => {
      console.error('❌ Firestore listener error:', error);
      // Don't immediately fail on connection errors - they might be temporary
      if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
        console.warn('🔄 Firestore temporarily unavailable, will retry automatically');
      } else {
        setError(`Connection error: ${error.message}`);
      }
    });

    return () => {
      console.log('🔕 Cleaning up Firestore listener');
      unsubscribe();
    };
  }, [currentGenerationId, pendingResolvers]);

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
      console.log('  - User profile context:', userProfile);
      
      if (!profile) {
        console.error('❌ Profile not found! Available profiles might not be loaded yet.');
        throw new Error(`Travel preference profile with ID "${request.preferenceProfileId}" not found. Please ensure your travel preferences are loaded.`);
      }

      // Prepare user info from context to send to backend
      const userInfoForBackend = userProfile ? {
        uid: userProfile.uid || auth.currentUser?.uid || '',
        username: userProfile.username || '',
        gender: userProfile.gender || '',
        dob: userProfile.dob || '',
        status: userProfile.status || '',
        sexualOrientation: userProfile.sexualOrientation || '',
        email: userProfile.email || auth.currentUser?.email || '',
        blocked: userProfile.blocked || []
      } : undefined;

      // Validate that we have essential user data
      if (!userInfoForBackend || !userInfoForBackend.uid) {
        console.error('❌ User profile context not available - this will cause backend Firestore reads');
        console.error('User profile data:', userProfile);
        throw new Error('User profile data not loaded. Please ensure you are logged in and try again.');
      }

      console.log('✅ User profile data ready for backend:', {
        hasUserInfo: !!userInfoForBackend,
        hasProfile: !!profile,
        uid: userInfoForBackend.uid,
        profileId: profile.id
      });

      // For testing: hardcode destination if empty or problematic
      const testRequest: AIGenerationRequest = {
        ...request,
        destination: request.destination || 'Paris, France', // Fallback for testing
        budget: {
          total: profile.budgetRange?.max || 1000,
          currency: 'USD' as const
        },
        groupSize: profile.groupSize?.preferred || 1,
        // Pass user data from frontend to avoid backend Firestore reads
        userInfo: userInfoForBackend,
        travelPreferences: profile
      };

      console.log('🚀 Calling Firebase Function: generateItinerary with request:', testRequest);
      const functions = getFunctions();
      
      // Configure with longer timeout to match backend
      const generateItineraryFn = httpsCallable(functions, 'generateItinerary', {
        timeout: 600000 // 10 minutes (600,000 milliseconds)
      });
      
      // Increase timeout to 10 minutes and handle deadline-exceeded gracefully
      try {
        const response = await generateItineraryFn(testRequest);
        const result = response.data as any;
        
        console.log('✅ AI Generation initiated:', result);
        
        if (!result.success) {
          throw new Error(result.error?.message || 'AI generation failed to start');
        }

        // Extract generation ID to listen for progress
        const generationId = result.data?.metadata?.generationId;
        if (generationId) {
          console.log('� Starting progress tracking for generation:', generationId);
          setCurrentGenerationId(generationId);
          
          // Return a promise that will be resolved by the real-time listener
          return new Promise<AIGenerationResponse>((resolve, reject) => {
            setPendingResolvers(prev => ({ ...prev, [generationId]: resolve }));
            
            // Set up a timeout as backup
            const timeoutId = setTimeout(() => {
              console.warn('⏰ Generation timeout reached after 10 minutes');
              setPendingResolvers(prev => {
                const updated = { ...prev };
                delete updated[generationId];
                return updated;
              });
              reject(new Error('Generation timed out after 10 minutes'));
            }, 600000); // 10 minutes
            
            // Store the timeout ID so it can be cleared when the promise resolves
            const originalResolve = resolve;
            const resolveWithCleanup = (result: AIGenerationResponse) => {
              clearTimeout(timeoutId);
              setPendingResolvers(prev => {
                const updated = { ...prev };
                delete updated[generationId];
                return updated;
              });
              originalResolve(result);
            };
            
            setPendingResolvers(prev => ({ ...prev, [generationId]: resolveWithCleanup }));
          });
        } else {
          // No generation ID - process immediate result (legacy response format)
          const fallbackResponse: AIGenerationResponse = {
            id: `gen_${Date.now()}`,
            request,
            itinerary: result.data?.itinerary,
            recommendations: result.data?.recommendations,
            costBreakdown: result.data?.costBreakdown,
            status: 'completed',
            progress: {
              stage: 5,
              totalStages: 5,
              message: 'Generation completed!'
            },
            createdAt: new Date(),
            completedAt: new Date()
          };

          setResult(fallbackResponse);
          setIsGenerating(false);
          setCurrentGenerationId(null);
          
          setProgress({
            stage: 5,
            totalStages: 5,
            message: 'Generation completed!',
            stages: DEFAULT_STAGES.map(stage => ({
              ...stage,
              status: 'completed'
            })) as AIGenerationStage[],
          });

          return fallbackResponse;
        }
      } catch (timeoutError: any) {
        console.log('⏰ Function timed out, but checking for completed generation...');
        
        if (timeoutError.code === 'deadline-exceeded' || timeoutError.message?.includes('deadline-exceeded')) {
          // The function timed out, but the generation might have completed
          // Set up a listener to check for the most recent completed generation for this user
          return new Promise((resolve, reject) => {
            const db = getFirestore();
            
            // Look for recent generations by this user
            const recentGenerationsQuery = query(
              collection(db, 'ai_generations'),
              where('userId', '==', userId),
              where('status', '==', 'completed'),
              orderBy('createdAt', 'desc'),
              limit(1)
            );
            
            const unsubscribe = onSnapshot(recentGenerationsQuery, (snapshot: any) => {
              if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                const data = doc.data();
                const docCreatedAt = data.createdAt?.toDate();
                
                // Only process if this was created within the last 5 minutes
                if (docCreatedAt && (Date.now() - docCreatedAt.getTime()) < 300000) {
                  console.log('🎉 Found recent completed generation after timeout:', doc.id);
                  
                  const result = data.response;
                  const aiResponse: AIGenerationResponse = {
                    id: doc.id,
                    request: data.request,
                    itinerary: result.data?.itinerary,
                    recommendations: result.data?.recommendations,
                    costBreakdown: result.data?.costBreakdown,
                    status: 'completed',
                    progress: {
                      stage: 5,
                      totalStages: 5,
                      message: 'Generation completed!'
                    },
                    createdAt: data.createdAt?.toDate() || new Date(),
                    completedAt: new Date()
                  };

                  setResult(aiResponse);
                  setIsGenerating(false);
                  setCurrentGenerationId(null);
                  
                  setProgress({
                    stage: 5,
                    totalStages: 5,
                    message: 'Generation completed!',
                    stages: DEFAULT_STAGES.map(stage => ({
                      ...stage,
                      status: 'completed'
                    })) as AIGenerationStage[],
                  });
                  
                  unsubscribe();
                  resolve(aiResponse);
                }
              }
            }, (error) => {
              console.error('❌ Firestore recent generations listener error:', error);
              // Don't immediately fail on connection errors - they might be temporary
              if (error.code === 'unavailable' || error.code === 'deadline-exceeded') {
                console.warn('🔄 Firestore temporarily unavailable for recent generations query, will retry automatically');
              }
            });
            
            // Show extended progress while waiting
            const waitingStages = [...DEFAULT_STAGES];
            let currentStage = 4; // Start at stage 4 since we know it's processing
            
            const updateProgress = () => {
              if (currentStage <= 5) {
                setProgress({
                  stage: currentStage,
                  totalStages: 5,
                  message: currentStage === 5 ? 'Finalizing your itinerary...' : waitingStages[currentStage - 1]?.description || 'Processing...',
                  stages: waitingStages.map((stage, index) => ({
                    ...stage,
                    status: index < currentStage - 1 ? 'completed' : 
                           index === currentStage - 1 ? 'active' : 'pending'
                  })) as AIGenerationStage[],
                });
                
                if (currentStage < 5) {
                  currentStage++;
                  setTimeout(updateProgress, 3000);
                } else {
                  // Keep showing finalizing
                  setTimeout(updateProgress, 2000);
                }
              }
            };
            
            setTimeout(updateProgress, 200);
            
            // Give up after 5 more minutes
            setTimeout(() => {
              unsubscribe();
              reject(new Error('Generation timed out. Please check your AI Itineraries tab to see if it completed.'));
            }, 300000);
          });
        } else {
          throw timeoutError;
        }
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setIsGenerating(false);
      setProgress(null);
      throw err;
    }
  }, [getProfileById]);

  const cancelGeneration = useCallback(() => {
    // Note: Firebase Cloud Functions don't support direct cancellation
    // The generation will continue on the backend but we reset the UI state
    setIsGenerating(false);
    setProgress(null);
    setError('Generation cancelled by user');
    setCurrentGenerationId(null);
    setPendingResolvers({});
  }, []);

  const resetGeneration = useCallback(() => {
    setIsGenerating(false);
    setProgress(null);
    setError(null);
    setResult(null);
    setCurrentGenerationId(null);
    setPendingResolvers({});
  }, []);

  const estimateCost = useCallback(async (request: Partial<AIGenerationRequest>): Promise<number> => {
    try {
      // Create a detailed cache key for rate limiting
      const cacheKey = JSON.stringify({
        destination: request.destination,
        departure: request.departure,
        startDate: request.startDate,
        endDate: request.endDate,
        profileId: request.preferenceProfileId,
        budget: request.budget?.total,
        groupSize: request.groupSize
      });
      
      const cachedEstimate = sessionStorage.getItem(`rate-limit-cache-${btoa(cacheKey)}`);
      const cachedTime = sessionStorage.getItem(`rate-limit-time-${btoa(cacheKey)}`);
      
      // Use cached result if less than 2 minutes old to prevent rate limiting
      if (cachedEstimate && cachedTime) {
        const timeDiff = Date.now() - parseInt(cachedTime);
        if (timeDiff < 120000) { // 2 minutes
          console.log('📋 Using cached cost estimate to prevent rate limiting');
          return parseInt(cachedEstimate);
        }
      }
      
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

      // Prepare user info from context
      const userInfoForBackend = userProfile ? {
        uid: userProfile.uid || auth.currentUser?.uid || '',
        username: userProfile.username || '',
        gender: userProfile.gender || '',
        dob: userProfile.dob || '',
        status: userProfile.status || '',
        sexualOrientation: userProfile.sexualOrientation || '',
        email: userProfile.email || auth.currentUser?.email || '',
        blocked: userProfile.blocked || []
      } : undefined;

      // Validate user data for cost estimation
      if (!userInfoForBackend || !userInfoForBackend.uid) {
        console.warn('⚠️ User profile not available for cost estimation, using fallback calculation');
        const baseCost = profile?.budgetRange?.max || 1000;
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
        groupSize: profile.groupSize?.preferred || 1,
        // Pass user data from frontend to avoid backend Firestore reads
        userInfo: userInfoForBackend,
        travelPreferences: profile
      };

      console.log('🚀 Calling Firebase Function: estimateItineraryCost with request:', testRequest);
      const functions = getFunctions();
      const estimateCostFn = httpsCallable(functions, 'estimateItineraryCost', {
        timeout: 120000 // 2 minutes timeout for cost estimation
      });
      
      const response = await estimateCostFn(testRequest);
      const result = response.data as any;
      
      console.log('✅ Cost Estimation Response:', result);
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Cost estimation failed');
      }

      const estimatedCost = result.data?.estimatedCost || 0;
      
      // Cache successful result for rate limiting prevention
      sessionStorage.setItem(`rate-limit-cache-${btoa(cacheKey)}`, estimatedCost.toString());
      sessionStorage.setItem(`rate-limit-time-${btoa(cacheKey)}`, Date.now().toString());

      return estimatedCost;
    } catch (err: any) {
      console.error('❌ Cost estimation error:', err);
      
      // Handle rate limiting gracefully
      if (err.message?.includes('Rate limit') || err.message?.includes('429') || err.code === 'functions/resource-exhausted') {
        console.warn('⚠️ Rate limit detected, using fallback calculation');
        
        // Use fallback calculation during rate limiting
        const profile = request.preferenceProfileId ? getProfileById(request.preferenceProfileId) : null;
        const baseCost = profile?.budgetRange?.max || 1000;
        const groupMultiplier = profile?.groupSize?.preferred || 1;
        
        const duration = request.startDate && request.endDate 
          ? Math.ceil((new Date(request.endDate).getTime() - new Date(request.startDate).getTime()) / (1000 * 60 * 60 * 24))
          : 7;
        
        return Math.min(baseCost, baseCost * 0.8 * duration * groupMultiplier);
      }
      
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
