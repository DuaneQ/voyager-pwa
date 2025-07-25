import { FieldValue } from 'firebase/firestore';

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
    primaryMode: 'walking' | 'public' | 'taxi' | 'rental' | 'airplane' | 'bus' | 'train' | 'mixed';
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
  
    
  // Timestamps
  createdAt: Date | FieldValue;
  updatedAt: Date | FieldValue;
}

// Inferred preferences type with confidence scores
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
    createdAt: Date | FieldValue;
    updatedAt: Date | FieldValue;
  };
}

// Preference signal for learning system
export interface PreferenceSignal {
  id?: string;
  type: 'like' | 'dislike' | 'save' | 'book' | 'share' | 'view_time' | 'search';
  activityType: string;
  confidence: number;
  metadata?: {
    itineraryId?: string;
    videoId?: string;
    destination?: string;
    activities?: string[];
    query?: string;
    watchDuration?: number;
    completionRate?: number;
    source?: string;
    dataQuality?: 'high' | 'medium' | 'low' | 'inferred_from_text' | 'inferred_from_destination_and_activities';
    rawActivities?: string[];
    budgetSignal?: string;
    timestamp?: number;
  };
  timestamp?: Date | FieldValue;
  processed?: boolean;
}

// Learning metadata for preference inference
export interface PreferenceLearningMetadata {
  totalSignals: number;
  signalsSinceLastUpdate: number;
  analysisVersion: string;
}

// Travel preferences container in user profile
export interface UserTravelPreferences {
  profiles: TravelPreferenceProfile[];
  defaultProfileId: string | null;
  preferenceSignals: PreferenceSignal[];
  // Store inferred preferences alongside explicit ones
  inferredPreferences?: {
    profiles: InferredTravelPreferenceProfile[];
    lastAnalysisDate: Date;
    confidenceScores: Record<string, number>;
    learningMetadata: PreferenceLearningMetadata;
  };
}
