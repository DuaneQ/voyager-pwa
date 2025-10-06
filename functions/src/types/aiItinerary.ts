// AI Itinerary Generation Types
export interface AIGenerationRequest {
  destination: string;
  departure?: string; // Added departure location for flight pricing
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  budget: {
    total: number;
    currency: 'USD' | 'EUR' | 'GBP';
  };
  groupSize: number;
  tripType: 'business' | 'leisure' | 'adventure' | 'romantic' | 'family';
  preferenceProfileId?: string; // Optional - uses default if not provided
  
  // Additional context
  specialRequests?: string;
  mustInclude?: string[]; // Specific activities/places user wants
  mustAvoid?: string[];   // Things to avoid
}

export interface AIGenerationResponse {
  success: boolean;
  data?: {
    itinerary: GeneratedItinerary;
    metadata: {
      generationId: string;
      confidence: number; // 0-1 score
      processingTime: number; // milliseconds
      aiModel: string;
      version: string;
    };
    recommendations: {
      accommodations: AccommodationRecommendation[];
      transportation: TransportationRecommendation[];
      alternativeActivities: Activity[];
    };
    costBreakdown: {
      total: number;
      perPerson: number;
      byCategory: {
        accommodation: number;
        food: number;
        activities: number;
        transportation: number;
        misc: number;
      };
      byDay: DailyCost[];
    };
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface GeneratedItinerary {
  id: string;
  destination: string;
  departure?: string; // Added departure location for flight pricing
  startDate: string;
  endDate: string;
  description: string; // AI-generated description
  activities: string[]; // Activity categories
  
  // TravalPass platform fields
  gender: string;
  status: string;
  sexualOrientation: string;
  startDay: number;
  endDay: number;
  lowerRange: number;
  upperRange: number;
  likes: string[];
  
  // AI-specific fields
  dailyPlans: DailyPlan[];
  aiGenerated: true;
  generationMetadata: {
    model: string;
    confidence: number;
    preferences: any;
    createdAt: Date;
  };
}

export interface DailyPlan {
  day: number;
  date: string;
  theme?: string; // "Cultural Exploration", "Adventure Day", etc.
  activities: PlannedActivity[];
  meals: PlannedMeal[];
  transportation: PlannedTransportation[];
  estimatedCost: number;
  notes?: string;
}

export interface PlannedActivity {
  id: string;
  name: string;
  description: string;
  category: string;
  location: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
  };
  timing: {
    startTime: string; // "09:00"
    endTime: string;   // "11:30"
    duration: number;  // minutes
  };
  cost: {
    amount: number;
    currency: string;
    perPerson: boolean;
  };
  bookingInfo?: {
    requiresReservation: boolean;
    bookingUrl?: string;
    phone?: string;
    advanceBookingDays?: number;
  };
  tips?: string[];
  alternatives?: string[]; // Alternative similar activities
}

export interface PlannedMeal {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  restaurant: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
    priceRange: '$' | '$$' | '$$$' | '$$$$';
    cuisine: string;
    rating?: number;
    phone?: string;
    website?: string;
    bookingUrl?: string;
  };
  timing: {
    time: string; // "12:30"
    duration: number; // minutes
  };
  cost: {
    amount: number;
    currency: string;
  };
  dietaryInfo?: string[];
  reservationRequired?: boolean;
  bookingInfo?: {
    phone?: string;
    website?: string;
    reservationUrl?: string;
    walkInsAccepted?: boolean;
  };
}

export interface PlannedTransportation {
  id: string;
  from: {
    name: string;
    coordinates: { lat: number; lng: number };
  };
  to: {
    name: string;
    coordinates: { lat: number; lng: number };
  };
  mode: 'walk' | 'taxi' | 'uber' | 'public_transport' | 'rental_car' | 'flight';
  duration: number; // minutes
  cost: {
    amount: number;
    currency: string;
  };
  notes?: string;
  bookingInfo?: {
    required: boolean;
    url?: string;
    instructions?: string;
  };
}

export interface AccommodationRecommendation {
  id: string;
  name: string;
  type: 'hotel' | 'hostel' | 'apartment' | 'bnb';
  location: {
    name: string;
    address: string;
    coordinates: { lat: number; lng: number };
  };
  pricePerNight: {
    amount: number;
    currency: string;
  };
  rating: number;
  amenities: string[];
  bookingUrl?: string;
  pros: string[];
  cons: string[];
}

export interface TransportationRecommendation {
  mode: string;
  provider: string;
  estimatedCost: {
    amount: number;
    currency: string;
  };
  duration: string;
  pros: string[];
  cons: string[];
  bookingInfo?: {
    url?: string;
    instructions?: string;
  };
}

export interface Activity {
  id: string;
  name: string;
  category: string;
  description: string;
  location: {
    name: string;
    coordinates: { lat: number; lng: number };
  };
  estimatedCost: {
    amount: number;
    currency: string;
  };
  duration: number; // minutes
  rating?: number;
}

export interface DailyCost {
  day: number;
  date: string;
  accommodation: number;
  food: number;
  activities: number;
  transportation: number;
  misc: number;
  total: number;
}

// Progress tracking types
export interface AIGenerationProgress {
  stage: number;
  totalStages: number;
  message: string;
  details?: string;
  estimatedTimeRemaining?: number; // seconds
}

// User preference types (simplified for AI generation)
export interface TravelPreferenceProfile {
  id: string;
  name: string;
  isDefault: boolean;
  
  // Core Preferences
  travelStyle: 'luxury' | 'budget' | 'mid-range' | 'backpacker';
  budgetRange: {
    min: number;
    max: number;
    currency: 'USD' | 'EUR' | 'GBP';
  };
  groupSize: {
    preferred: number;
    sizes: number[];
  };
  activities?: {
    [key: string]: number; // Activity name -> preference score (0-10)
  };
  accommodation?: {
    type: string;
    starRating: number;
  };
  transportation?: {
    primaryMode: string;
  };
  foodPreferences?: {
    cuisineTypes: string[];
    dietaryRestrictions: string[];
  };
  accessibility?: {
    mobilityNeeds: boolean;
    dietaryRestrictions: string[];
    otherNeeds: string[];
  };
}

// Authentication types
export interface AuthenticatedUser {
  uid: string;
  email: string;
  hasPremium: boolean;
  subscriptionType: string;
  subscriptionEndDate?: Date;
}

// Database document types
export interface AIGenerationDocument {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  request: AIGenerationRequest;
  response?: AIGenerationResponse;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  processingTimeMs: number;
  errorDetails?: any;
}

export interface UserPreferencesDocument {
  profiles: TravelPreferenceProfile[];
  defaultProfileId: string;
  inferredPreferences: InferredPreferences;
  lastUpdated: FirebaseFirestore.Timestamp;
}

export interface InferredPreferences {
  preferredDestinationTypes: string[];
  activityPreferences: string[];
  budgetPatterns: {
    average: number;
    range: { min: number; max: number };
  };
  groupSizePreferences: {
    most_common: number;
    sizes: number[];
  };
  seasonalPreferences: string[];
}

export interface AIAnalyticsDocument {
  date: string; // YYYY-MM-DD
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  averageProcessingTime: number;
  popularDestinations: string[];
  commonFailureReasons: string[];
}
