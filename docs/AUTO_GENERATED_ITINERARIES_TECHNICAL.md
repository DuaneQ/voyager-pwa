# Auto-Generated Itineraries - Technical Specifications

## Architecture Overview

### Hybrid Architecture: Integrated Frontend + Separate AI Service

```
┌─────────────────────────────────────┐
│          Voyager PWA                │
│  ┌─────────────────────────────────┐│
│  │   Existing Features             ││
│  │   - Search & Browse             ││
│  │   - Chat & Matching             ││
│  │   - Manual Itinerary Creation   ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │   New AI Features (Integrated)  ││
│  │   - AI Generation UI            ││
│  │   - Progress Tracking           ││
│  │   - Rate Limiting Display       ││
│  │   - Preference Management       ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
                    │
                    │ Firebase Functions
                    ▼
┌─────────────────────────────────────┐
│       Firebase Functions            │
│  ┌─────────────────────────────────┐│
│  │   Existing Functions            ││
│  │   - User Management             ││
│  │   - Stripe Integration          ││
│  │   - Chat & Notifications        ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │   AI Integration Functions      ││
│  │   - Generation Trigger          ││
│  │   - Rate Limiting Check         ││
│  │   - Status Updates              ││
│  │   - Result Processing           ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
                    │
                    │ HTTP/Queue
                    ▼
┌─────────────────────────────────────┐
│      AI Processing Service          │
│         (Cloud Run/Separate)        │
│  ┌─────────────────────────────────┐│
│  │   AI Generation Engine          ││
│  │   - OpenAI/Claude Integration   ││
│  │   - Google Places API           ││
│  │   - Route Optimization          ││
│  │   - Recommendation Engine       ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
                    │
                    │ Write Results
                    ▼
┌─────────────────────────────────────┐
│           Firestore                 │
│  ┌─────────────────────────────────┐│
│  │   Enhanced Collections          ││
│  │   - users (with AI metadata)    ││
│  │   - itineraries (AI-enhanced)   ││
│  │   - ai_generations              ││
│  │   - activity_feedback           ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

## API Design

### Firebase Functions API (Internal)

```typescript
// Trigger AI generation (called from frontend)
generateAIItinerary(data: {
  destination: string;
  startDate: string;
  endDate: string;
  budget: { min: number; max: number; currency: string; };
  preferences: {
    travelStyle: ('adventure' | 'culture' | 'relaxation' | 'food' | 'nightlife')[];
    pace: 'slow' | 'moderate' | 'fast';
    groupType: 'solo' | 'couple' | 'family' | 'friends';
    interests: string[];
  };
  constraints?: {
    accessibility: boolean;
    dietaryRestrictions: string[];
    transportation: 'walking' | 'public' | 'car' | 'mixed';
  };
}) => Promise<{ generationId: string; status: string; }>

// Check generation status (real-time via Firestore listeners)
// No API needed - frontend subscribes to Firestore document

// Submit feedback
submitAIFeedback(data: {
  itineraryId: string;
  rating: number; // 1-5
  liked: string[]; // activity IDs
  disliked: string[]; // activity IDs
  comments?: string;
  actuallyUsed?: boolean;
}) => Promise<{ success: boolean; }>
```

### AI Processing Service API (External)

```typescript
// Process generation request
POST /generate
{
  generationId: string;
  userId: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: { min: number; max: number; currency: string; };
  preferences: UserGenerationPreferences;
  constraints?: GenerationConstraints;
  userProfile: {
    historicalPreferences?: any;
    previousFeedback?: any;
  };
}

// Health check
GET /health

// Generation status (internal - service updates Firestore directly)
// No external API needed
```

### Database Schema Extensions (Firestore)

```typescript
// New Firestore collections for AI generation

// Collection: ai_generations/{generationId}
interface ItineraryGeneration {
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestData: {
    destination: string;
    startDate: string;
    endDate: string;
    budget: { min: number; max: number; currency: string; };
    preferences: UserGenerationPreferences;
    constraints?: GenerationConstraints;
  };
  resultData?: {
    itineraryId: string;
    confidence: number;
    recommendations: any;
  };
  processingTimeMs?: number;
  apiCostsUsd?: number;
  createdAt: string; // ISO timestamp
  completedAt?: string; // ISO timestamp
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Enhanced users/{userId} document
interface UserDocumentAIExtensions {
  // Add to existing user document
  aiItineraryUsage?: {
    monthlyCount: number;
    dailyCount: number;
    lastGenerationDate: string;
    monthlyResetDate: string;
    totalGenerated: number;
    totalUsed: number;
  };
  
  aiPreferences?: {
    deliveryMethod: 'in_app' | 'email' | 'both';
    emailNotifications: boolean;
    pushNotifications: boolean;
    travelStyle: ('adventure' | 'culture' | 'relaxation' | 'food' | 'nightlife')[];
    defaultBudgetRange: { min: number; max: number; currency: string; };
    preferredPace: 'slow' | 'moderate' | 'fast';
    scheduledGeneration?: {
      enabled: boolean;
      frequency: 'weekly' | 'monthly';
      dayOfWeek?: number;
      dayOfMonth?: number;
      timeOfDay: string;
    };
  };
  
  aiLearningProfile?: {
    preferredDestinationTypes: string[];
    historicalFeedback: {
      averageRating: number;
      commonLikes: string[];
      commonDislikes: string[];
      travelPatterns: {
        budgetRange: { min: number; max: number; };
        tripDuration: { preferred: number; min: number; max: number; };
        seasonalPreferences: Record<string, number>;
      };
    };
  };
}

// Collection: activity_feedback/{feedbackId}
interface ActivityFeedback {
  id: string;
  userId: string;
  activityId: string;
  itineraryId: string;
  rating: number; // 1-5
  feedbackType: 'like' | 'dislike' | 'neutral';
  comments?: string;
  createdAt: string;
}

// Enhanced itineraries/{itineraryId} document
interface ItineraryAIExtensions {
  // Add to existing Itinerary interface
  isAIGenerated?: boolean;
  generationId?: string;
  aiMetadata?: {
    confidence: number; // 0-1
    generationType: 'manual_request' | 'scheduled' | 'smart_suggestion';
    modelVersion: string;
    generationDate: string;
    processingTimeMs: number;
    apiCosts: number;
    userFeedback?: {
      rating?: number;
      liked: string[];
      disliked: string[];
      actuallyUsed?: boolean;
      comments?: string;
    };
    recommendations: {
      reasoning: string[];
      alternatives: Array<{
        activityId: string;
        reason: string;
      }>;
    };
  };
}
```

## AI/ML Integration

### Recommendation Engine Architecture

```typescript
interface RecommendationEngine {
  // Content-based filtering using activity attributes
  getContentBasedRecommendations(
    userPreferences: UserPreferences,
    destination: string,
    constraints: TripConstraints
  ): Promise<Activity[]>;

  // Collaborative filtering using similar users
  getCollaborativeRecommendations(
    userId: string,
    destination: string
  ): Promise<Activity[]>;

  // Hybrid approach combining both methods
  getHybridRecommendations(
    userId: string,
    preferences: UserPreferences,
    destination: string,
    constraints: TripConstraints
  ): Promise<RankedActivity[]>;
}

interface RankedActivity {
  activity: Activity;
  score: number; // 0-1 confidence score
  reasoning: string[]; // Why this was recommended
  alternatives: Activity[]; // Similar options
}
```

### External Data Integration

```typescript
interface DataSourceManager {
  // Google Places API integration
  searchPlaces(query: PlaceSearchQuery): Promise<Place[]>;
  getPlaceDetails(placeId: string): Promise<PlaceDetails>;
  
  // Weather API integration
  getWeatherForecast(location: string, dates: DateRange): Promise<WeatherForecast>;
  
  // Event APIs (Eventbrite, local tourism boards)
  getEvents(location: string, dates: DateRange, categories: string[]): Promise<Event[]>;
  
  // Transportation APIs
  getTransportOptions(from: Location, to: Location, time: Date): Promise<TransportOption[]>;
}
```

## Itinerary Generation Algorithm

### Core Generation Flow

```typescript
class ItineraryGenerator {
  async generateItinerary(request: GenerationRequest): Promise<GeneratedItinerary> {
    // 1. Analyze user preferences and history
    const userProfile = await this.buildUserProfile(request.userId);
    
    // 2. Gather destination data
    const destinationData = await this.gatherDestinationData(request.destination);
    
    // 3. Get activity recommendations
    const recommendations = await this.getActivityRecommendations(
      userProfile, 
      request, 
      destinationData
    );
    
    // 4. Optimize itinerary structure
    const optimizedItinerary = await this.optimizeItinerary(
      recommendations,
      request.constraints
    );
    
    // 5. Add logistical details
    const detailedItinerary = await this.addLogistics(optimizedItinerary);
    
    return detailedItinerary;
  }

  private async optimizeItinerary(
    activities: RankedActivity[],
    constraints: TripConstraints
  ): Promise<OptimizedItinerary> {
    // Traveling Salesman Problem optimization for route
    // Time allocation based on activity duration and user pace
    // Budget optimization to fit within constraints
    // Weather-aware scheduling (outdoor vs indoor activities)
  }
}
```

### Machine Learning Pipeline

```typescript
interface MLPipeline {
  // Training data preparation
  prepareTrainingData(): Promise<TrainingDataset>;
  
  // Model training
  trainRecommendationModel(data: TrainingDataset): Promise<MLModel>;
  
  // Real-time inference
  predictUserPreferences(userId: string, context: TripContext): Promise<Predictions>;
  
  // Model evaluation and improvement
  evaluateModel(testData: TestDataset): Promise<ModelMetrics>;
  updateModel(feedbackData: FeedbackDataset): Promise<void>;
}
```

## Performance Optimization

### Caching Strategy

```typescript
interface CacheManager {
  // Cache destination data (attractions, restaurants)
  cacheDestinationData(destination: string, data: DestinationData): Promise<void>;
  
  // Cache user recommendations
  cacheUserRecommendations(userId: string, recommendations: Activity[]): Promise<void>;
  
  // Cache generation results for similar requests
  cacheSimilarGenerations(requestHash: string, result: GeneratedItinerary): Promise<void>;
}

// Redis cache implementation
const CACHE_DURATIONS = {
  DESTINATION_DATA: 24 * 60 * 60, // 24 hours
  USER_RECOMMENDATIONS: 6 * 60 * 60, // 6 hours
  GENERATION_RESULTS: 1 * 60 * 60, // 1 hour
  WEATHER_DATA: 2 * 60 * 60, // 2 hours
};
```

### Background Processing

```typescript
// Queue system for heavy computations
interface GenerationQueue {
  addGenerationJob(request: GenerationRequest): Promise<string>; // Returns job ID
  getJobStatus(jobId: string): Promise<JobStatus>;
  processJob(jobId: string): Promise<GeneratedItinerary>;
}

// Use Bull/BullMQ for Redis-based job queue
const generationQueue = new Queue('itinerary-generation', {
  redis: { port: 6379, host: 'localhost' },
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 5,
    attempts: 3,
    backoff: 'exponential',
  },
});
```

## Cost Management

### API Rate Limiting

```typescript
interface RateLimiter {
  checkGenerationLimit(userId: string): Promise<boolean>;
  incrementGenerationCount(userId: string): Promise<void>;
  getRemainingGenerations(userId: string): Promise<number>;
}

// Rate limits by subscription tier
const GENERATION_LIMITS = {
  FREE: { per_month: 1, per_day: 1 },
  PREMIUM: { per_month: 50, per_day: 5 },
  ENTERPRISE: { per_month: -1, per_day: -1 }, // Unlimited
};
```

### Cost Tracking

```typescript
interface CostTracker {
  trackAPICall(provider: string, endpoint: string, cost: number): Promise<void>;
  trackGenerationCost(generationId: string, totalCost: number): Promise<void>;
  getMonthlyAPISpend(): Promise<number>;
  getCostPerUser(userId: string): Promise<number>;
}
```

## Error Handling and Fallbacks

```typescript
class GenerationErrorHandler {
  async handleGenerationFailure(
    request: GenerationRequest,
    error: Error
  ): Promise<FallbackResponse> {
    switch (error.type) {
      case 'API_TIMEOUT':
        return this.generateBasicItinerary(request);
      
      case 'INSUFFICIENT_DATA':
        return this.suggestPopularDestinations(request.destination);
      
      case 'BUDGET_CONSTRAINTS':
        return this.generateBudgetAlternatives(request);
      
      default:
        return this.returnTemplateItinerary(request.destination);
    }
  }
}
```

## Testing Strategy

### Unit Tests
- Algorithm correctness
- Data transformation logic
- Error handling scenarios

### Integration Tests
- External API interactions
- Database operations
- Queue processing

### Performance Tests
- Generation time under load
- Memory usage optimization
- Concurrent request handling

### User Acceptance Tests
- End-to-end generation flow
- Subscription paywall behavior
- Mobile responsiveness

---

*Last Updated: July 21, 2025*
*Version: 1.0*
*Technical Lead: TBD*
