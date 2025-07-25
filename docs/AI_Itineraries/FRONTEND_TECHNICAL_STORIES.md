# AI Itineraries - Frontend Technical Implementation Stories

## Overview
This document outlines the technical implementation details for the frontend components of the AI-powered auto-generated itineraries feature. These stories break down the user stories from `AUTO_GENERATED_ITINERARIES.md` into specific technical implementation tasks.

---

## Technical Architecture Overview

### Current Frontend Structure
```
src/
├── components/
│   ├── pages/          # Main page components (Profile, Search, etc.)
│   ├── forms/          # Form components with state management
│   ├── modals/         # Modal dialogs
│   ├── common/         # Reusable UI components
│   └── layout/         # Layout components (BottomNavigation, etc.)
├── hooks/              # Custom React hooks for data fetching/state
├── types/              # TypeScript type definitions
├── Context/            # React Context providers
└── utils/              # Utility functions
```

### Technology Stack
- **React 18** with TypeScript
- **Material-UI (MUI)** for UI components
- **Firebase** (Firestore, Auth, Storage)
- **React Router** for navigation
- **React Hook Form** for form management

---

## Frontend Technical Stories

### **FE-1: Travel Preferences Profile Tab Implementation**
*Corresponds to User Story 1: Travel Preference Management*

#### **FE-1.1: Create TravelPreferencesTab Component**

**Technical Scope:**
- Create new tab in existing ProfileForm component
- Design preference collection UI with Material-UI
- Implement visual preference controls (sliders, toggles, multi-select)

**Files to Create/Modify:**
```
src/components/forms/TravelPreferencesTab.tsx          [NEW]
src/components/forms/ProfileForm.tsx                   [MODIFY - add 4th tab]
src/types/TravelPreferences.ts                        [NEW]
src/types/UserProfile.ts                              [MODIFY - add preferences field]
```

**Implementation Details:**
```typescript
// src/types/TravelPreferences.ts
export interface TravelPreferenceProfile {
  id: string;
  name: string; // "Default", "Work Travel", "Family Vacation"
  isDefault: boolean;
  
  // Core Preferences
  travelStyle: 'luxury' | 'budget' | 'mid-range' | 'backpacker';
  budgetRange: {
    min: number;
    max: number;
    currency: 'USD';
  };
  
  // Activity Preferences (0-10 scale)
  activities: {
    cultural: number;      // Museums, historical sites
    adventure: number;     // Hiking, extreme sports
    relaxation: number;    // Spa, beaches
    nightlife: number;     // Bars, clubs
    shopping: number;      // Markets, malls
    food: number;          // Restaurants, food tours
    nature: number;        // Parks, wildlife
    photography: number;   // Scenic spots
  };
  
  // Food Preferences
  foodPreferences: {
    dietaryRestrictions: string[]; // ['vegetarian', 'gluten-free', etc.]
    cuisineTypes: string[];        // ['italian', 'asian', 'local', etc.]
    foodBudgetLevel: 'low' | 'medium' | 'high';
  };
  
  // Accommodation Preferences
  accommodation: {
    type: 'hotel' | 'hostel' | 'airbnb' | 'resort' | 'any';
    starRating: number; // 1-5
  };
  
  // Transportation Preferences
  transportation: {
    primaryMode: 'walking' | 'public' | 'taxi' | 'rental' | 'mixed';
    maxWalkingDistance: number; // in minutes
  };
  
  // Group Preferences
  groupSize: {
    preferred: number;
    sizes: number[]; // [1, 3, 5, 10] for cost calculations
  };
  
  // Accessibility
  accessibility: {
    mobilityNeeds: boolean;
    visualNeeds: boolean;
    hearingNeeds: boolean;
    details?: string;
  };
  
  // Meta
  createdAt: Date;
  updatedAt: Date;
}

// Add to UserProfile.ts
export interface UserProfile {
  // ... existing fields
  travelPreferences?: {
    profiles: TravelPreferenceProfile[];
    defaultProfileId: string;
    // NEW: Store inferred preferences alongside explicit ones
    inferredPreferences?: {
      profiles: InferredTravelPreferenceProfile[];
      lastAnalysisDate: Date;
      confidenceScores: Record<string, number>;
      learningMetadata: {
        totalSignals: number;
        signalsSinceLastUpdate: number;
        analysisVersion: string;
      };
    };
  };
}

// NEW: Inferred preferences type
export interface InferredTravelPreferenceProfile {
  id: string;
  basedOnProfileId: string; // Links to explicit profile
  
  // Same structure as TravelPreferenceProfile but with confidence scores
  activities: {
    cultural: { value: number; confidence: number; };
    adventure: { value: number; confidence: number; };
    relaxation: { value: number; confidence: number; };
    nightlife: { value: number; confidence: number; };
    shopping: { value: number; confidence: number; };
    food: { value: number; confidence: number; };
    nature: { value: number; confidence: number; };
    photography: { value: number; confidence: number; };
  };
  
  // Inferred budget preferences
  budgetRange: {
    min: { value: number; confidence: number; };
    max: { value: number; confidence: number; };
    currency: 'USD';
  };
  
  // Inferred travel style
  travelStyle: {
    preference: 'luxury' | 'budget' | 'mid-range' | 'backpacker';
    confidence: number;
  };
  
  // Learning sources and reasoning
  metadata: {
    inferredFrom: Array<{
      source: 'likes' | 'dislikes' | 'bookings' | 'searches' | 'view_time';
      signalCount: number;
      lastSignalDate: Date;
      confidence: number;
    }>;
    reasons: string[]; // Human-readable explanations
    createdAt: Date;
    updatedAt: Date;
  };
}
```

**Component Structure:**
```typescript
// src/components/forms/TravelPreferencesTab.tsx
export interface TravelPreferencesTabProps {
  userId?: string;
  compact?: boolean;
}

export const TravelPreferencesTab: React.FC<TravelPreferencesTabProps> = ({
  userId,
  compact = false
}) => {
  // Component implementation with sections:
  // 1. Profile Management (create, switch, duplicate)
  // 2. Core Preferences (travel style, budget)
  // 3. Activity Preference Sliders
  // 4. Food & Accommodation Settings
  // 5. Group & Accessibility Options
};
```

**UI Wireframe:**
```
┌─────────────────────────────────────────────┐
│ TRAVEL PREFERENCES                          │
├─────────────────────────────────────────────┤
│ Profile: [Default ▼] [+ New] [⚙ Manage]   │
├─────────────────────────────────────────────┤
│ TRAVEL STYLE                                │
│ ○ Luxury    ● Mid-Range                    │
│ ○ Budget    ○ Backpacker                   │
│                                             │
│ BUDGET RANGE                                │
│ [$500 ═══●═══════ $5000] USD               │
│                                             │
│ ACTIVITY PREFERENCES                        │
│ Cultural    [●─────────] 8/10              │
│ Adventure   [───●──────] 4/10              │
│ Relaxation  [─────●────] 6/10              │
│ Nightlife   [──●───────] 3/10              │
│ Food        [────────●─] 9/10              │
│ Nature      [────●─────] 5/10              │
│                                             │
│ FOOD PREFERENCES                            │
│ ☑ Vegetarian  ☐ Gluten-Free              │
│ ☑ Local Cuisine ☑ Street Food            │
│                                             │
│ GROUP SIZE: [2] people                     │
│                                             │
│ [Save Preferences]                          │
└─────────────────────────────────────────────┘
```

#### **FE-1.2: Preference Profile Management UI**

**Technical Scope:**
- Multiple preference profiles with CRUD operations
- Profile switcher dropdown
- Import from liked content functionality

**Key Components:**
```typescript
// Profile Selector Component
const PreferenceProfileSelector = ({
  profiles,
  activeProfileId,
  onProfileChange,
  onCreateNew,
  onDuplicate,
  onDelete
}) => {
  // Dropdown with profile options
  // "Create New" and "Duplicate" buttons
  // Delete confirmation dialog
};

// Automatic Preference Inference (Background Service)
// This runs automatically during AI generation, no UI needed
const useAutomaticPreferenceInference = (userId: string) => {
  const [inferredPreferences, setInferredPreferences] = useState<TravelPreferenceProfile | null>(null);
  const [confidenceScores, setConfidenceScores] = useState<Record<string, number>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  useEffect(() => {
    // Background analysis of user behavior patterns
    const analyzeUserBehavior = async () => {
      const userActivity = await Promise.all([
        // 1. Analyze liked/saved itineraries
        getUserLikedItineraries(userId),
        // 2. Track time spent viewing different activity types
        getUserViewingPatterns(userId),
        // 3. Monitor booking/sharing patterns
        getUserEngagementData(userId),
        // 4. Check location preferences from search history
        getUserSearchHistory(userId)
      ]);
      
      // ML inference service call
      const inferences = await fetch('/api/ai/infer-preferences', {
        method: 'POST',
        body: JSON.stringify({
          userId,
          activityData: userActivity,
          currentPreferences: await getUserPreferences(userId)
        })
      }).then(res => res.json());
      
      setInferredPreferences(inferences.preferences);
      setConfidenceScores(inferences.confidence);
      setLastUpdated(new Date());
      
      // STORAGE: Save inferred preferences to Firestore
      await updateUserInferredPreferences(userId, {
        profiles: [inferences.preferences],
        lastAnalysisDate: new Date(),
        confidenceScores: inferences.confidence,
        learningMetadata: {
          totalSignals: inferences.metadata.totalSignals,
          signalsSinceLastUpdate: 0, // Reset after update
          analysisVersion: inferences.metadata.version
        }
      });
    };
    
    // Run initial analysis
    analyzeUserBehavior();
    
    // Update every 24 hours or when user takes significant actions
    const interval = setInterval(analyzeUserBehavior, 24 * 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [userId]);
  
  // Real-time learning from current session
  const recordPreferenceSignal = useCallback((signal: {
    type: 'like' | 'dislike' | 'save' | 'book' | 'share' | 'view_time';
    activityType: string;
    confidence: number;
    metadata?: any;
  }) => {
    // Send signal to learning service
    fetch('/api/ai/preference-signal', {
      method: 'POST',
      body: JSON.stringify({ userId, signal })
    });
    
    // Update confidence scores locally for immediate feedback
    setConfidenceScores(prev => ({
      ...prev,
      [signal.activityType]: Math.min(10, Math.max(0, 
        (prev[signal.activityType] || 5) + (signal.confidence * 0.1)
      ))
    }));
  }, [userId]);
  
  return {
    inferredPreferences,
    confidenceScores,
    lastUpdated,
    recordPreferenceSignal,
    isLearning: inferredPreferences === null
  };
};

/**
 * HOW IT WORKS:
 * 
 * 1. **Data Collection**: Continuously monitors user behavior:
 *    - Which itineraries they like/save/share
 *    - How long they spend viewing different activity types
 *    - What destinations they search for repeatedly
 *    - Booking patterns and preferences
 * 
 * 2. **Pattern Analysis**: Backend ML service analyzes patterns:
 *    - User consistently likes cultural activities → increase cultural preference
 *    - Always books mid-range accommodations → adjust budget preferences
 *    - Searches for beach destinations → increase relaxation preference
 * 
 * 3. **Confidence Scoring**: Each preference gets a confidence score (0-10):
 *    - 0-3: Low confidence, use user's explicit settings
 *    - 4-6: Medium confidence, suggest adjustments
 *    - 7-10: High confidence, auto-apply with user notification
 * 
 * 4. **Real-time Learning**: Records user actions during AI generation:
 *    - User dismisses cultural suggestions → decrease cultural weight
 *    - User adds expensive restaurants → increase food budget
 *    - User books suggested activities → increase confidence for similar suggestions
 * 
 * 5. **Integration with AI Generation**: 
 *    - Merges inferred preferences with explicit user preferences
 *    - Higher confidence inferences override lower explicit ratings
 *    - Provides reasoning to AI: "User historically prefers X based on Y behavior"
 * 
 * 6. **HANDLING LIMITED DATA FROM ITINERARIES/VIDEOS**:
 *    Since Itineraries and Videos lack structured budget/activity data, the system uses:
 *    
 *    A) **NLP Analysis of Activity Strings**:
 *       - "Visit Louvre Museum" → cultural category
 *       - "Hiking in Alps" → adventure + nature categories  
 *       - "Fine dining at Michelin restaurant" → food + luxury budget inference
 *    
 *    B) **Destination-Based Inference**:
 *       - Tokyo itineraries → higher budget inference (expensive city)
 *       - Bangkok itineraries → lower budget inference (budget-friendly city)
 *       - Beach destinations → relaxation category
 *    
 *    C) **User Interaction Patterns**:
 *       - Time spent viewing → engagement level
 *       - Like/dislike patterns → preference strength
 *       - Sequential behavior → preference consistency
 *    
 *    D) **Cross-Reference with Structured Data**:
 *       - Compare liked itineraries with user's explicit preferences
 *       - Use search queries for additional context
 *       - Analyze booking/sharing patterns when available
 *    
 *    E) **Gradual Learning with Low Confidence**:
 *       - Start with low confidence scores (3-5/10)
 *       - Increase confidence only after multiple consistent signals
 *       - Focus on categories where we have clearer data
 */

/**
 * USAGE EXAMPLE:
 */
const ExampleAIGenerationComponent = ({ userId }) => {
  const userPreferences = useUserPreferences(userId);
  const {
    inferredPreferences,
    confidenceScores,
    recordPreferenceSignal,
    isLearning
  } = useAutomaticPreferenceInference(userId);
  
  const generateItinerary = async (tripParams) => {
    // Merge explicit and inferred preferences
    const enhancedPreferences = {
      ...userPreferences.defaultProfile,
      activities: Object.keys(userPreferences.defaultProfile.activities).reduce((acc, key) => {
        const explicitRating = userPreferences.defaultProfile.activities[key];
        const inferredRating = inferredPreferences?.activities?.[key];
        const confidence = confidenceScores[key] || 0;
        
        // Use inferred preference if confidence is high enough
        acc[key] = confidence > 6 && inferredRating 
          ? inferredRating 
          : explicitRating;
        
        return acc;
      }, {})
    };
    
    // Call AI generation with enhanced preferences
    const result = await generateAIItinerary({
      ...tripParams,
      preferences: enhancedPreferences,
      learningContext: {
        confidenceScores,
        inferenceReasons: inferredPreferences?.metadata?.reasons
      }
    });
    
    return result;
  };
  
  const handleUserInteraction = (activity, action) => {
    // Record user behavior for continuous learning
    recordPreferenceSignal({
      type: action, // 'like', 'dislike', 'save', etc.
      activityType: activity.category,
      confidence: action === 'like' ? 1 : action === 'dislike' ? -1 : 0.5,
      metadata: { activityId: activity.id, timestamp: Date.now() }
    });
  };
  
  return (
    <div>
      {isLearning && (
        <Alert severity="info">
          🧠 Learning your preferences... This will improve over time!
        </Alert>
      )}
      
      {/* Show confidence indicators */}
      <Box>
        <Typography variant="h6">Preference Confidence</Typography>
        {Object.entries(confidenceScores).map(([key, score]) => (
          <Box key={key} display="flex" alignItems="center">
            <Typography>{key}:</Typography>
            <LinearProgress 
              variant="determinate" 
              value={score * 10} 
              sx={{ flex: 1, ml: 1 }}
            />
            <Typography variant="caption">{score.toFixed(1)}/10</Typography>
          </Box>
        ))}
      </Box>
    </div>
  );
};

/**
 * INTEGRATION WITH EXISTING COMPONENTS:
 * 
 * The hook captures user behavior by integrating with your existing components.
 * Here's how it connects to your current ItineraryCard and VideoPlayer:
 */

// 1. ENHANCED ITINERARY CARD WITH PREFERENCE LEARNING
const EnhancedItineraryCard = ({ itinerary, ...otherProps }) => {
  const { recordPreferenceSignal } = useAutomaticPreferenceInference(auth.currentUser?.uid);
  
  const handleLike = (itinerary: Itinerary) => {
    // Your existing like logic
    otherProps.onLike(itinerary);
    
    // NEW: Record preference signal for learning
    recordPreferenceSignal({
      type: 'like',
      activityType: extractActivityTypes(itinerary), // Helper function
      confidence: 1.0, // Strong positive signal
      metadata: {
        itineraryId: itinerary.id,
        destination: itinerary.destination,
        activities: itinerary.activities,
        timestamp: Date.now()
      }
    });
  };
  
  const handleDislike = (itinerary: Itinerary) => {
    // Your existing dislike logic
    otherProps.onDislike(itinerary);
    
    // NEW: Record negative preference signal
    recordPreferenceSignal({
      type: 'dislike',
      activityType: extractActivityTypes(itinerary),
      confidence: -1.0, // Strong negative signal
      metadata: {
        itineraryId: itinerary.id,
        destination: itinerary.destination,
        activities: itinerary.activities,
        timestamp: Date.now()
      }
    });
  };
  
  return (
    <ItineraryCard
      {...otherProps}
      itinerary={itinerary}
      onLike={handleLike}
      onDislike={handleDislike}
    />
  );
};

// 2. ENHANCED VIDEO PLAYER WITH ENGAGEMENT TRACKING
const EnhancedVideoPlayer = ({ video, ...otherProps }) => {
  const { recordPreferenceSignal } = useAutomaticPreferenceInference(auth.currentUser?.uid);
  const [watchStartTime, setWatchStartTime] = useState<number | null>(null);
  
  const handlePlayToggle = () => {
    // Your existing play logic
    otherProps.onPlayToggle?.();
    
    // Track watch start time
    if (!watchStartTime) {
      setWatchStartTime(Date.now());
    }
  };
  
  const handleVideoEnd = () => {
    // Your existing video end logic
    otherProps.onVideoEnd?.();
    
    // NEW: Record engagement signal
    const watchDuration = watchStartTime ? Date.now() - watchStartTime : 0;
    const engagementScore = calculateEngagementScore(watchDuration, video);
    
    recordPreferenceSignal({
      type: 'view_time',
      activityType: video.category || 'general', // Assume videos have categories
      confidence: engagementScore, // 0-1 based on watch completion
      metadata: {
        videoId: video.id,
        watchDuration,
        completionRate: calculateCompletionRate(watchDuration, video),
        timestamp: Date.now()
      }
    });
  };
  
  return (
    <VideoPlayer
      {...otherProps}
      video={video}
      onPlayToggle={handlePlayToggle}
      onVideoEnd={handleVideoEnd}
    />
  );
};

// 3. HELPER FUNCTIONS FOR PREFERENCE EXTRACTION
const extractActivityTypes = (itinerary: Itinerary): string => {
  // PROBLEM: Itineraries have unstructured activity strings, no budget data
  // SOLUTION: Use NLP + destination analysis + keyword matching
  
  const activities = itinerary.activities || [];
  const destination = itinerary.destination || '';
  const categories = [];
  
  // A) NLP Analysis of Activity Strings
  activities.forEach(activity => {
    const activityLower = activity.toLowerCase();
    
    // Cultural keywords
    if (activityLower.match(/museum|gallery|historical|heritage|cultural|temple|cathedral|palace|art/)) {
      categories.push('cultural');
    }
    
    // Adventure keywords
    if (activityLower.match(/hike|climb|ski|surf|dive|adventure|extreme|mountain|trek/)) {
      categories.push('adventure');
    }
    
    // Food keywords with budget inference
    if (activityLower.match(/restaurant|dining|food|eat|cuisine|michelin|fine dining/)) {
      categories.push('food');
      // Budget inference from food descriptions
      if (activityLower.match(/michelin|fine dining|gourmet|upscale/)) {
        categories.push('luxury_budget_signal');
      } else if (activityLower.match(/street food|local|cheap|budget/)) {
        categories.push('budget_budget_signal');
      }
    }
    
    // Relaxation keywords
    if (activityLower.match(/spa|beach|relax|massage|wellness|resort|pool/)) {
      categories.push('relaxation');
    }
    
    // Nature keywords
    if (activityLower.match(/park|nature|wildlife|garden|outdoor|scenic/)) {
      categories.push('nature');
    }
    
    // Nightlife keywords
    if (activityLower.match(/bar|club|nightlife|drinks|pub|entertainment/)) {
      categories.push('nightlife');
    }
    
    // Shopping keywords
    if (activityLower.match(/shop|market|mall|boutique|souvenir/)) {
      categories.push('shopping');
    }
  });
  
  // B) Destination-Based Budget Inference
  const destinationLower = destination.toLowerCase();
  const expensiveCities = ['tokyo', 'paris', 'london', 'new york', 'zurich', 'geneva', 'singapore'];
  const budgetFriendlyCities = ['bangkok', 'prague', 'budapest', 'vietnam', 'india', 'mexico'];
  
  if (expensiveCities.some(city => destinationLower.includes(city))) {
    categories.push('high_budget_signal');
  } else if (budgetFriendlyCities.some(city => destinationLower.includes(city))) {
    categories.push('low_budget_signal');
  }
  
  // C) Destination-Based Activity Inference
  if (destinationLower.match(/beach|island|coastal|bali|hawaii|maldives/)) {
    categories.push('relaxation');
  }
  if (destinationLower.match(/mountain|alps|himalayas|rockies/)) {
    categories.push('adventure', 'nature');
  }
  if (destinationLower.match(/rome|paris|kyoto|cultural|historical/)) {
    categories.push('cultural');
  }
  
  return categories.length > 0 ? categories[0] : 'general';
};

// Enhanced preference signal recording with limited data handling
const recordPreferenceSignal = useCallback((signal: {
  type: 'like' | 'dislike' | 'save' | 'book' | 'share' | 'view_time';
  activityType: string;
  confidence: number;
  metadata?: any;
}) => {
  // IMPORTANT: Lower confidence for inferred data from limited sources
  const adjustedConfidence = signal.type === 'like' && signal.metadata?.source === 'itinerary_card' 
    ? signal.confidence * 0.7  // Reduce confidence since itinerary data is limited
    : signal.confidence;
  
  // Send signal to learning service
  fetch('/api/ai/preference-signal', {
    method: 'POST',
    body: JSON.stringify({ 
      userId, 
      signal: {
        ...signal,
        confidence: adjustedConfidence,
        dataQuality: signal.metadata?.source === 'explicit_preference' ? 'high' : 'inferred'
      }
    })
  });
  
  // Update confidence scores locally for immediate feedback
  setConfidenceScores(prev => ({
    ...prev,
    [signal.activityType]: Math.min(10, Math.max(0, 
      (prev[signal.activityType] || 5) + (adjustedConfidence * 0.1)
    ))
  }));
}, [userId]);

// Multiple signal types for comprehensive learning
const recordItineraryInteraction = (itinerary: Itinerary, action: 'like' | 'dislike') => {
  const extractedCategories = extractActivityTypes(itinerary);
  const budgetSignals = extractBudgetSignals(itinerary);
  
  // Record activity preferences
  extractedCategories.forEach(category => {
    if (!category.includes('_signal')) { // Skip budget signals for activity recording
      recordPreferenceSignal({
        type: action,
        activityType: category,
        confidence: action === 'like' ? 0.6 : -0.6, // Lower confidence for inferred data
        metadata: {
          itineraryId: itinerary.id,
          destination: itinerary.destination,
          source: 'itinerary_card',
          dataQuality: 'inferred_from_text',
          rawActivities: itinerary.activities
        }
      });
    }
  });
  
  // Record budget preferences separately
  budgetSignals.forEach(budgetSignal => {
    recordPreferenceSignal({
      type: action,
      activityType: 'budget_preference',
      confidence: action === 'like' ? 0.4 : -0.4, // Even lower confidence for budget inference
      metadata: {
        budgetSignal,
        destination: itinerary.destination,
        source: 'itinerary_card',
        dataQuality: 'inferred_from_destination_and_activities'
      }
    });
  });
};

const extractBudgetSignals = (itinerary: Itinerary): string[] => {
  const signals = [];
  const activities = itinerary.activities || [];
  const destination = itinerary.destination || '';
  
  // Extract budget signals from activities
  activities.forEach(activity => {
    const activityLower = activity.toLowerCase();
    if (activityLower.match(/luxury|michelin|5.star|expensive|premium|upscale/)) {
      signals.push('luxury');
    } else if (activityLower.match(/budget|cheap|hostel|street.food|local/)) {
      signals.push('budget');
    } else {
      signals.push('mid-range'); // Default assumption
    }
  });
  
  // Extract budget signals from destination
  const destinationLower = destination.toLowerCase();
  if (['tokyo', 'paris', 'london', 'new york', 'zurich'].some(city => destinationLower.includes(city))) {
    signals.push('high-cost-destination');
  } else if (['bangkok', 'prague', 'vietnam', 'india'].some(city => destinationLower.includes(city))) {
    signals.push('low-cost-destination');
  }
  
  return signals;
};

const calculateEngagementScore = (watchDuration: number, video: any): number => {
  // Calculate engagement score based on watch duration
  // Assume video has duration property or estimate based on content
  const estimatedDuration = video.duration || 30000; // 30 seconds default
  const completionRate = Math.min(watchDuration / estimatedDuration, 1);
  
  // Higher completion rate = higher engagement score
  return completionRate;
};

const calculateCompletionRate = (watchDuration: number, video: any): number => {
  const estimatedDuration = video.duration || 30000;
  return Math.min(watchDuration / estimatedDuration, 1);
};

// 4. CONTEXT PROVIDER FOR PREFERENCE LEARNING
const PreferenceLearningProvider = ({ children }) => {
  const userId = auth.currentUser?.uid;
  const preferenceHook = useAutomaticPreferenceInference(userId);
  
  return (
    <PreferenceLearningContext.Provider value={preferenceHook}>
      {children}
    </PreferenceLearningContext.Provider>
  );
};

// 5. PAGE-LEVEL INTEGRATION EXAMPLE
const SearchPage = () => {
  const { recordPreferenceSignal } = useContext(PreferenceLearningContext);
  
  const handleItineraryView = (itinerary: Itinerary) => {
    // Track when user views an itinerary (even without liking)
    recordPreferenceSignal({
      type: 'view_time',
      activityType: extractActivityTypes(itinerary),
      confidence: 0.3, // Moderate signal for just viewing
      metadata: {
        action: 'view_itinerary',
        itineraryId: itinerary.id,
        timestamp: Date.now()
      }
    });
  };
  
  const handleSearchQuery = (query: string, destination: string) => {
    // Track search patterns
    recordPreferenceSignal({
      type: 'search',
      activityType: inferCategoryFromSearch(query), // Helper function
      confidence: 0.5,
      metadata: {
        query,
        destination,
        timestamp: Date.now()
      }
    });
  };
  
  return (
    <div>
      {/* Your search interface */}
      {/* ItineraryCards with enhanced preference tracking */}
    </div>
  );
};

/**
 * DATA FLOW SUMMARY:
 * 
 * 1. USER ACTIONS → PREFERENCE SIGNALS
 *    ItineraryCard.onLike() → recordPreferenceSignal({type: 'like', confidence: 1.0})
 *    ItineraryCard.onDislike() → recordPreferenceSignal({type: 'dislike', confidence: -1.0})
 *    VideoPlayer.onVideoEnd() → recordPreferenceSignal({type: 'view_time', confidence: 0.8})
 *    Search.onQuery() → recordPreferenceSignal({type: 'search', confidence: 0.5})
 * 
 * 2. SIGNALS → BACKEND LEARNING
 *    recordPreferenceSignal() → POST /api/ai/preference-signal
 *    Backend ML service → Analyzes patterns → Updates user preference model
 * 
 * 3. LEARNED PREFERENCES → AI GENERATION
 *    useAutomaticPreferenceInference() → Fetches inferred preferences
 *    AI Generation → Merges explicit + inferred preferences
 *    Better recommendations → User satisfaction → More positive signals
 * 
 * EXAMPLE LEARNING CYCLE:
 * 
 * Week 1: User sets "Cultural: 3/10" but likes 5 cultural itineraries
 * Week 2: System infers "Cultural: 7/10" with confidence 6/10
 * Week 3: AI generates more cultural activities, user engagement increases
 * Week 4: Confidence reaches 8/10, system fully trusts cultural preference
 * 
 * The system becomes smarter over time by learning from actual behavior vs stated preferences.
 */

/**
 * HANDLING LIMITED DATA QUALITY:
 * 
 * CONFIDENCE LEVELS BY DATA SOURCE:
 * 
 * 1. **Explicit User Settings**: Confidence 9-10/10
 *    - User manually sets "Cultural: 8/10" → High confidence
 *    - Direct, intentional user input
 * 
 * 2. **Structured Booking Data**: Confidence 7-8/10  
 *    - User books $200/night hotel → Budget inference
 *    - Clear behavioral signal with concrete data
 * 
 * 3. **Search Queries**: Confidence 5-6/10
 *    - User searches "luxury hotels Paris" → Budget + destination inference
 *    - Intent-based but less commitment than booking
 * 
 * 4. **Itinerary Likes**: Confidence 3-5/10
 *    - User likes itinerary with "Visit Louvre" → Cultural inference
 *    - Requires NLP extraction, multiple interpretation possibilities
 * 
 * 5. **Video Engagement**: Confidence 2-4/10
 *    - User watches food video for 2 minutes → Food interest inference
 *    - Passive engagement, many confounding factors
 * 
 * DATA QUALITY MARKERS:
 * 
 * - **High Quality**: Explicit preferences, booking history, detailed search
 * - **Medium Quality**: Search patterns, time-based engagement, sharing behavior  
 * - **Low Quality**: Inferred from text, destination assumptions, passive viewing
 * 
 * LEARNING STRATEGY:
 * 
 * 1. **Start Conservative**: Begin with low confidence for inferred data
 * 2. **Require Consistency**: Only increase confidence after multiple consistent signals
 * 3. **Weight by Quality**: Explicit data overrides inferred data
 * 4. **Gradual Improvement**: System gets smarter as more structured data becomes available
 * 5. **Transparency**: Show users what data confidence is based on
 * 
 * EXAMPLE LEARNING PROGRESSION:
 * 
 * Week 1: User likes 3 Tokyo itineraries → Cultural: 3.2/10 confidence (low, inferred)
 * Week 2: User searches "museums Tokyo" → Cultural: 4.1/10 confidence (search intent)
 * Week 3: User books museum tour → Cultural: 6.8/10 confidence (booking behavior)
 * Week 4: User sets explicit cultural preference → Cultural: 9.0/10 confidence (explicit)
 */

/**
 * STORAGE ARCHITECTURE:
 * 
 * FIRESTORE COLLECTION STRUCTURE:
 * 
 * /users/{userId}
 * ├── profile: UserProfile (existing)
 * ├── travelPreferences: {
 * │   ├── profiles: TravelPreferenceProfile[] (explicit user settings)
 * │   ├── defaultProfileId: string
 * │   └── inferredPreferences: {
 * │       ├── profiles: InferredTravelPreferenceProfile[]
 * │       ├── lastAnalysisDate: Date
 * │       ├── confidenceScores: Record<string, number>
 * │       └── learningMetadata: {...}
 * │   }
 * └── preferenceSignals: PreferenceSignal[] (raw behavioral data)
 * 
 * /users/{userId}/preferenceSignals/{signalId}
 * {
 *   type: 'like' | 'dislike' | 'save' | 'view_time' | 'search',
 *   activityType: string,
 *   confidence: number,
 *   metadata: any,
 *   timestamp: Date,
 *   processed: boolean, // Whether included in latest inference
 *   source: 'itinerary_card' | 'video_player' | 'search_page'
 * }
 * 
 * STORAGE FUNCTIONS:
 */

// Store raw preference signals (immediate)
const storePreferenceSignal = async (userId: string, signal: PreferenceSignal) => {
  const signalRef = doc(collection(db, 'users', userId, 'preferenceSignals'));
  await setDoc(signalRef, {
    ...signal,
    timestamp: new Date(),
    processed: false,
    id: signalRef.id
  });
};

// Update inferred preferences (after ML analysis)
const updateUserInferredPreferences = async (userId: string, inferences: any) => {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    'travelPreferences.inferredPreferences': inferences
  });
  
  // Mark signals as processed
  const signalsQuery = query(
    collection(db, 'users', userId, 'preferenceSignals'),
    where('processed', '==', false)
  );
  const signalsSnapshot = await getDocs(signalsQuery);
  
  const batch = writeBatch(db);
  signalsSnapshot.docs.forEach(doc => {
    batch.update(doc.ref, { processed: true });
  });
  await batch.commit();
};

// Retrieve user preferences (explicit + inferred)
const getUserPreferences = async (userId: string) => {
  const userDoc = await getDoc(doc(db, 'users', userId));
  const userData = userDoc.data();
  
  return {
    explicit: userData?.travelPreferences?.profiles || [],
    inferred: userData?.travelPreferences?.inferredPreferences?.profiles || [],
    confidenceScores: userData?.travelPreferences?.inferredPreferences?.confidenceScores || {},
    lastAnalysis: userData?.travelPreferences?.inferredPreferences?.lastAnalysisDate
  };
};

// Get unprocessed signals for ML analysis
const getUnprocessedSignals = async (userId: string) => {
  const signalsQuery = query(
    collection(db, 'users', userId, 'preferenceSignals'),
    where('processed', '==', false),
    orderBy('timestamp', 'desc'),
    limit(1000) // Limit for performance
  );
  
  const snapshot = await getDocs(signalsQuery);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

/**
 * DATA RETENTION & PRIVACY:
 * 
 * 1. Raw signals older than 1 year are automatically deleted
 * 2. Users can clear their learning data via privacy settings
 * 3. Inferred preferences are regenerated if explicit preferences change significantly
 * 4. All data is encrypted at rest in Firestore
 * 5. GDPR compliance: users can export/delete all preference data
 */

// Clean up old signals (run periodically)
const cleanupOldSignals = async (userId: string) => {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  const oldSignalsQuery = query(
    collection(db, 'users', userId, 'preferenceSignals'),
    where('timestamp', '<', oneYearAgo)
  );
  
  const snapshot = await getDocs(oldSignalsQuery);
  const batch = writeBatch(db);
  
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log(`Cleaned up ${snapshot.size} old preference signals for user ${userId}`);
};
```

#### **FE-1.3: Visual Preference Collection Interface**

**Technical Scope:**
- Image-based preference selection for onboarding
- Slider controls for activity preferences (0-10 scale)
- Multi-select toggles for food/cuisine preferences
- Budget range slider with currency formatting

**Key Features:**
```typescript
// Activity Preference Slider Component
const ActivityPreferenceSlider = ({
  label,
  value,
  onChange,
  icon,
  description
}) => {
  return (
    <Box>
      <Typography>{label}</Typography>
      <Slider
        value={value}
        onChange={onChange}
        min={0}
        max={10}
        marks={[
          { value: 0, label: 'Never' },
          { value: 5, label: 'Sometimes' },
          { value: 10, label: 'Always' }
        ]}
      />
    </Box>
  );
};

// Budget Range Component
const BudgetRangeSelector = ({
  minValue,
  maxValue,
  onChange,
  currency = 'USD'
}) => {
  // Dual-handle range slider
  // Currency formatting
  // Preset budget options
};
```

---

### **FE-2: AI Generation Request Interface**
*Corresponds to User Story 2: Premium User Requests Auto-Generated Itinerary*

#### **FE-2.1: AI Generation Modal Component**

**Technical Scope:**
- Modal dialog for AI itinerary generation
- Trip parameter input form
- Preference profile selection
- Progress indicators during generation

**Modal Initiation Points:**
1. **Profile Page**: "Generate AI Itinerary" button in Travel Preferences tab
2. **Search Page**: "AI Generate" option in destination search results
3. **Homepage**: Featured "Try AI Itinerary" call-to-action
4. **Empty State**: When user has no itineraries, show AI generation prompt
5. **Upgrade Flow**: After premium subscription, highlight AI features

**Files to Create:**
```
src/components/modals/AIGenerationModal.tsx           [NEW]
src/hooks/useAIGeneration.ts                         [NEW]
src/types/AIGeneration.ts                            [NEW]
```

**Implementation:**
```typescript
// src/types/AIGeneration.ts
export interface AIGenerationRequest {
  destination: string;
  startDate: string;
  endDate: string;
  budget: {
    total: number;
    currency: string;
  };
  groupSize: number;
  tripType: 'business' | 'leisure' | 'adventure' | 'romantic' | 'family';
  preferenceProfileId: string;
}

export interface AIGenerationResponse {
  itinerary: Itinerary;
  recommendations: {
    accommodations: any[];
    transportation: any[];
    activities: any[];
  };
  costBreakdown: {
    total: number;
    perPerson: number;
    byCategory: Record<string, number>;
  };
}

// src/components/modals/AIGenerationModal.tsx
export const AIGenerationModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onGenerated: (result: AIGenerationResponse) => void;
}> = ({ open, onClose, onGenerated }) => {
  // Form for trip parameters
  // Preference profile selector
  // Generate button with loading state
  // Progress indicator with steps
};
```

**UI Wireframe:**
```
INITIATION POINTS:
┌─────────────────────────────────────────────┐
│ 1. PROFILE PAGE - Travel Preferences Tab   │
│ [Save Preferences] [🤖 Generate AI Trip]   │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 2. SEARCH PAGE - Destination Results       │
│ Tokyo, Japan                                │
│ [View Details] [🤖 AI Generate]            │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 3. HOMEPAGE - Featured CTA                  │
│ ✨ Try AI-Powered Itinerary Planning        │
│ [🚀 Generate Your First AI Trip]           │
└─────────────────────────────────────────────┘

MODAL INTERFACE:
┌─────────────────────────────────────────────┐
│ ✨ GENERATE AI ITINERARY              [✕] │
├─────────────────────────────────────────────┤
│ TRIP DETAILS                                │
│ Destination: [Tokyo, Japan          ]      │
│ Dates: [Mar 15] to [Mar 22] 2025          │
│ Budget: [$2000] USD                        │
│ Group: [2] travelers                       │
│                                             │
│ TRIP TYPE                                   │
│ ● Leisure    ○ Adventure                   │
│ ○ Business   ○ Romantic                    │
│                                             │
│ PREFERENCES                                 │
│ Profile: [Default ▼]                       │
│ ⚡ Use my saved preferences                │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ ESTIMATED COST: $1,847 total           │ │
│ │ ($923 per person)                      │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [🚀 Generate Itinerary]                    │
└─────────────────────────────────────────────┘
```

#### **FE-2.2: AI Generation Progress Component**

**Technical Scope:**
- Multi-step progress indicator
- Real-time status updates
- Cancel generation functionality

**Features:**
```typescript
const AIGenerationProgress = ({
  stages,
  currentStage,
  onCancel
}) => {
  const stages = [
    'Analyzing preferences...',
    'Finding activities...',
    'Optimizing schedule...',
    'Calculating costs...',
    'Finalizing itinerary...'
  ];
  
  // Linear progress with stage indicators
  // Estimated time remaining
  // Cancel button
};
```

**Progress UI Wireframe:**
```
┌─────────────────────────────────────────────┐
│ 🤖 CREATING YOUR ITINERARY...         [✕] │
├─────────────────────────────────────────────┤
│ ● Analyzing preferences... ✓               │
│ ● Finding activities... ✓                  │
│ ● Optimizing schedule... ⏳                │
│ ○ Calculating costs...                     │
│ ○ Finalizing itinerary...                  │
│                                             │
│ Progress: [████████░░] 60%                 │
│                                             │
│ ⏱ Estimated time: 2 minutes remaining      │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 🎯 Current: Optimizing your schedule   │ │
│ │    Finding the best times to visit     │ │
│ │    each location...                    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│              [Cancel Generation]            │
└─────────────────────────────────────────────┘
```

---

### **FE-3: Free User Teaser Interface**
*Corresponds to User Story 4: Free User AI Itinerary Teaser*

#### **FE-3.1: Teaser Generation Component**

**Technical Scope:**
- Email-centric generation interface for free users
- Trip parameter collection (minimal form)
- Email delivery confirmation
- Upgrade prompts and conversion tracking

**Files to Create:**
```
src/components/modals/AITeaserModal.tsx               [NEW]
src/components/forms/EmailDeliveryForm.tsx           [NEW]
src/components/common/EmailTeaserPreview.tsx         [NEW - Optional]
src/hooks/useAITeaser.ts                             [NEW]
```

**Implementation:**
```typescript
**Implementation:**
```typescript
// src/components/modals/AITeaserModal.tsx - Email-focused interface
export const AITeaserModal: React.FC<{
  open: boolean;
  onClose: () => void;
  onEmailSent: () => void;
}> = ({ open, onClose, onEmailSent }) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Get Your AI Itinerary Preview</DialogTitle>
      <DialogContent>
        <EmailDeliveryForm onEmailSent={onEmailSent} />
        <UpgradePromptCard />
      </DialogContent>
    </Dialog>
  );
};

// Email-focused form for free users
const EmailDeliveryForm = ({ onEmailSent }) => {
  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Get a preview of your AI-generated itinerary delivered to your email!
      </Typography>
      
      <TextField
        fullWidth
        label="Email Address"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        sx={{ mb: 2 }}
      />
      
      <Alert severity="info" sx={{ mb: 2 }}>
        Free preview includes the first 2 days with limited details. 
        Upgrade to Premium for the complete itinerary!
      </Alert>
      
      <Button 
        variant="contained" 
        fullWidth
        onClick={handleSendEmail}
        disabled={!isValidEmail || isSending}
      >
        {isSending ? 'Sending...' : 'Send Preview to Email'}
      </Button>
    </Box>
  );
};

// Optional: Email preview component (for admin/testing)
export const EmailTeaserPreview: React.FC<{
  itinerary: Partial<Itinerary>;
  isTeaser: boolean;
}> = ({ itinerary, isTeaser }) => {
  // This would be used primarily for:
  // 1. Email template preview in admin
  // 2. Testing email layouts
  // 3. Optional platform confirmation after email sent
  
  return (
    <Box sx={{ 
      maxWidth: 600, 
      mx: 'auto', 
      p: 2,
      border: '1px solid #ccc',
      fontFamily: 'Arial, sans-serif' // Email-safe fonts
    }}>
      {/* Email-optimized layout */}
      <Typography variant="h5" sx={{ mb: 2 }}>
        Your {itinerary.destination} Itinerary Preview
      </Typography>
      
      {/* Show only first 2 days */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6">Day 1-2 Preview</Typography>
        {/* Limited content with blurred details */}
        <Box sx={{ 
          filter: isTeaser ? 'blur(2px)' : 'none',
          opacity: isTeaser ? 0.7 : 1 
        }}>
          {/* Partial itinerary content */}
        </Box>
      </Box>
      
      {/* Prominent upgrade CTA */}
      <Box sx={{ 
        textAlign: 'center', 
        p: 3, 
        backgroundColor: '#f5f5f5',
        borderRadius: 2 
      }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Want the Complete Itinerary?
        </Typography>
        <Button 
          variant="contained" 
          size="large"
          color="primary"
        >
          Upgrade to Premium
        </Button>
      </Box>
    </Box>
  );
};

// Primary email delivery interface for free users
const EmailDeliveryForm = ({
  email,
  onEmailChange,
  onSendTeaser,
  isSending
}) => {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Get Your AI Itinerary Preview
      </Typography>
      
      <TextField
        fullWidth
        label="Email Address"
        type="email"
        value={email}
        onChange={onEmailChange}
        placeholder="Enter your email for the preview"
        sx={{ mb: 2 }}
      />
      
      <Alert severity="info" sx={{ mb: 2 }}>
        📧 Free preview includes 2 days with limited details<br/>
        ⭐ Upgrade for complete itinerary + platform access
      </Alert>
      
      <Button 
        variant="contained" 
        fullWidth 
        size="large"
        onClick={onSendTeaser}
        disabled={isSending || !email}
        sx={{ mb: 2 }}
      >
        {isSending ? 'Generating & Sending...' : 'Send Preview to Email'}
      </Button>
      
      <Typography variant="caption" color="text.secondary">
        ✓ No spam, just your travel preview<br/>
        ✓ Unsubscribe anytime
      </Typography>
    </Box>
  );
};
```

**UI Wireframe - Free User Teaser:**
```
┌─────────────────────────────────────────────┐
│ 🎁 GET AI ITINERARY PREVIEW           [✕] │
├─────────────────────────────────────────────┤
│ 📧 Email delivery for free users!          │
│                                             │
│ TRIP DETAILS                                │
│ Destination: [Tokyo, Japan          ]      │
│ Dates: [Mar 15] to [Mar 22] 2025          │
│                                             │
│ EMAIL ADDRESS                               │
│ [user@example.com                   ]      │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ ℹ️  FREE PREVIEW INCLUDES:              │ │
│ │ • First 2 days of itinerary            │ │
│ │ • Limited activity details             │ │
│ │ • Upgrade prompt for full access       │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [📧 Send Preview to Email]                 │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ ⭐ UPGRADE TO PREMIUM                   │ │
│ │ • Complete 7-day itinerary             │ │
│ │ • Platform access & editing            │ │
│ │ • Real-time optimizations              │ │
│ │                                        │ │
│ │ [🚀 Upgrade Now - $9.99/month]        │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

#### **FE-3.2: Upgrade CTA Integration**

**Technical Scope:**
- Contextual upgrade prompts
- Subscription card integration
- Conversion tracking setup

**Features:**
```typescript
const UpgradePrompt = ({
  context,
  feature,
  onUpgrade
}) => {
  // Context-aware messaging
  // Feature-specific benefits
  // Call-to-action button
  // Track conversion attribution
};
```

---

### **FE-4: Real-time Optimization Interface**
*Corresponds to User Story 5: Real-time Itinerary Optimization*

#### **FE-4.1: Live Updates Component**

**Technical Scope:**
- Real-time notification system
- Weather-based recommendations
- Venue status updates
- Alternative suggestions

**Files to Create:**
```
src/components/common/LiveItineraryUpdates.tsx       [NEW]
src/hooks/useRealTimeOptimization.ts                 [NEW]
src/components/notifications/ItineraryAlert.tsx     [NEW]
```

**Implementation:**
```typescript
// Real-time updates hook
export const useRealTimeOptimization = (itineraryId: string) => {
  // WebSocket connection for live updates
  // Weather API integration
  // Venue status checking
  // Push notification handling
  
  return {
    weatherAlerts,
    venueUpdates,
    alternatives,
    isConnected
  };
};

// Live update notifications
const ItineraryAlert = ({
  type,
  message,
  alternatives,
  onAcceptChange,
  onDismiss
}) => {
  // Weather warnings
  // Venue closure alerts
  // Alternative suggestions
  // Quick action buttons
};
```

**Real-time Updates UI Wireframe:**
```
┌─────────────────────────────────────────────┐
│ 🔴 LIVE ITINERARY ALERT               [✕] │
├─────────────────────────────────────────────┤
│ ⛈️  WEATHER ALERT                          │
│                                             │
│ Heavy rain expected in Tokyo tomorrow       │
│ 2:00 PM - 6:00 PM                         │
│                                             │
│ AFFECTED ACTIVITIES:                        │
│ • Shibuya Sky observation deck             │
│ • Meiji Shrine gardens walk               │
│                                             │
│ 💡 SUGGESTED ALTERNATIVES:                 │
│ ┌─────────────────────────────────────────┐ │
│ │ 🏛️  Tokyo National Museum              │ │
│ │    Indoor cultural experience          │ │
│ │    [📍 View on Map]                    │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 🛍️  Shibuya Underground Shopping       │ │
│ │    Stay dry while exploring            │ │
│ │    [📍 View on Map]                    │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ [✅ Update Itinerary]  [❌ Keep Original]  │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ 📳 LIVE UPDATES                       [⚙️] │
├─────────────────────────────────────────────┤
│ ● Connected to real-time optimization      │
│                                             │
│ Recent Updates:                             │
│ 🌤️  Weather looking great for Day 3       │
│ ✅ All venues confirmed open              │
│ 🎌 Cherry blossom update: Peak bloom!     │
│                                             │
│ [⚙️ Notification Settings]                 │
└─────────────────────────────────────────────┘
```

---

### **FE-5: Platform Integration Components**
*Corresponds to User Story 7: Premium User AI-to-Platform Integration*

#### **FE-5.1: AddItineraryModal Enhancement**

**Technical Scope:**
- Pre-populate modal with AI-generated data
- AI source indication
- Edit capabilities before saving

**Files to Modify:**
```
src/components/forms/AddItineraryModal.tsx           [MODIFY]
```

**Enhancement:**
```typescript
// Enhanced AddItineraryModal props
interface AddItineraryModalProps {
  // ... existing props
  aiGeneratedData?: AIGenerationResponse;
  isAIGenerated?: boolean;
}

// AI generation integration
const handleAIGeneration = (aiData: AIGenerationResponse) => {
  // Pre-populate all form fields
  // Show "AI-Generated" badge
  // Enable editing before save
  // Include email delivery option
};
```

#### **FE-5.2: AI Source Indicators**

**Technical Scope:**
- Visual badges for AI-generated content
- Explanation tooltips
- Edit history tracking

**Components:**
```typescript
const AIGeneratedBadge = ({
  confidence,
  onExplain
}) => {
  // "AI-Generated" chip with confidence score
  // Tooltip with explanation
  // Click to see AI reasoning
};
```

---

### **FE-6: Feedback Collection Interface**
*Corresponds to User Story 8: AI Itinerary Feedback and Learning*

#### **FE-6.1: Feedback Collection Modal**

**Technical Scope:**
- Rating system (1-5 stars)
- Individual activity feedback
- Written feedback input
- Learning explanations

**Files to Create:**
```
src/components/modals/AIFeedbackModal.tsx            [NEW]
src/components/forms/ActivityRatingComponent.tsx    [NEW]
src/hooks/useAIFeedback.ts                          [NEW]
```

**Implementation:**
```typescript
// AI Feedback Modal
export const AIFeedbackModal: React.FC<{
  itinerary: Itinerary;
  open: boolean;
  onClose: () => void;
  onSubmitFeedback: (feedback: AIFeedback) => void;
}> = ({ itinerary, open, onClose, onSubmitFeedback }) => {
  // Overall itinerary rating
  // Individual activity ratings
  // "Not interested" flags
  // Written feedback section
  // "Why was this recommended?" explanations
};

// Activity rating component
const ActivityRatingComponent = ({
  activity,
  onRate,
  onNotInterested
}) => {
  // Star rating
  // Not interested toggle
  // Reasoning display
};
```

---

## Implementation Priority

### Phase 1: Foundation (Sprint 1-2)
1. **FE-1.1** - Travel Preferences Tab structure
2. **FE-1.2** - Basic preference profile management
3. **FE-2.1** - AI Generation Modal (basic version)

### Phase 2: Core Features (Sprint 3-4)
1. **FE-1.3** - Visual preference interface
2. **FE-2.2** - Generation progress indicators
3. **FE-5.1** - AddItineraryModal integration

### Phase 3: Conversion Tools (Sprint 5-6)
1. **FE-3.1** - Free user teaser interface
2. **FE-3.2** - Upgrade CTA integration
3. **FE-6.1** - Feedback collection

### Phase 4: Advanced Features (Sprint 7-8)
1. **FE-4.1** - Real-time optimization
2. **FE-5.2** - AI source indicators
3. Integration testing and refinement

---

## Technical Dependencies

### External Libraries Needed
```json
{
  "dependencies": {
    "react-google-places-autocomplete": "^4.0.0", // Already installed
    "date-fns": "^2.30.0", // Date formatting
    "react-hook-form": "^7.45.0", // Form management
    "@mui/x-date-pickers": "^6.10.0" // Date picker components
  }
}
```

### Firebase Services Required
- **Firestore**: User preferences storage, AI generations
- **Functions**: AI generation API endpoints
- **Storage**: Image assets for preference collection
- **Auth**: User session management

### API Integration Points
- AI Generation API (Claude/GPT integration)
- Weather APIs for real-time optimization
- Google Places API for destination autocomplete
- Stripe API for subscription management

---

## Testing Strategy

### Component Testing
- **Unit Tests**: Each component with Jest/React Testing Library
- **Integration Tests**: Modal workflows and form submissions
- **Cypress Tests**: End-to-end user journeys

### Test Coverage Targets
- Component rendering: 100%
- User interactions: 90%
- API integration: 85%
- Error handling: 80%

### Key Test Scenarios
1. **Preference Management**: Create, edit, delete profiles
2. **AI Generation**: Complete generation workflow
3. **Free User Flow**: Teaser generation and upgrade prompts
4. **Real-time Updates**: WebSocket connections and notifications
5. **Mobile Responsiveness**: All components on mobile devices

---

This technical specification provides a roadmap for implementing the AI itineraries feature with clear component boundaries, TypeScript interfaces, and implementation priorities.
