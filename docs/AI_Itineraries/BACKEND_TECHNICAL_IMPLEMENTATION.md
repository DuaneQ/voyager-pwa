# AI Itineraries - Backend Technical Implementation

## Overview
This document outlines the backend technical implementation for the AI-powered auto-generated itineraries feature. Each API endpoint and service is broken down with detailed technical specifications, data flows, and integration requirements.

---

## Backend Architecture Overview

### Current Backend Structure
```
functions/
├── src/
│   ├── api/              # API endpoint handlers
│   ├── services/         # Business logic services
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript type definitions
│   ├── middleware/       # Authentication, validation middleware
│   └── integrations/     # External API integrations
```

### Technology Stack
- **Firebase Functions** (Node.js runtime)
- **TypeScript** for type safety
- **Firestore** for data persistence
- **Firebase Auth** for user authentication
- **External APIs**: OpenAI/Claude, Google Places, Weather APIs

---

## Backend Technical Implementation

### **BE-1: On-Demand AI Generation API**
*Corresponds to User Story 2: Premium User Requests Auto-Generated Itinerary*

#### **BE-1.1: Core AI Generation Endpoint**

**Endpoint:** `POST /api/ai/generate-itinerary`

**Technical Scope:**
- Premium user authentication & validation
- Trip parameter processing & validation
- AI prompt engineering & API integration
- Itinerary data structuring & storage
- Real-time progress updates via Server-Sent Events

**Files to Create:**
```
functions/src/api/ai/generateItinerary.ts             [NEW]
functions/src/services/aiItineraryService.ts          [NEW]
functions/src/services/promptEngineering.ts           [NEW]
functions/src/integrations/openaiClient.ts            [NEW]
functions/src/types/aiItinerary.ts                    [NEW]
functions/src/middleware/premiumAuth.ts               [NEW]
functions/src/utils/itineraryValidator.ts             [NEW]
```

#### **Implementation Details:**

##### **1. Request/Response Types**
```typescript
// functions/src/types/aiItinerary.ts
export interface AIGenerationRequest {
  destination: string;
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
```

##### **2. Main API Handler**

**Purpose**: The main Express.js route handler that orchestrates the entire AI generation process. This is the entry point for all AI itinerary generation requests.

**Key Responsibilities:**
- **Authentication & Authorization**: Validates premium user status and subscription
- **Request Validation**: Ensures all required parameters are provided and valid
- **Rate Limiting**: Prevents abuse by limiting requests per user per time window
- **Server-Sent Events**: Sets up real-time progress streaming to the frontend
- **Error Handling**: Comprehensive error management with appropriate HTTP status codes
- **Process Orchestration**: Coordinates the multi-stage generation process

**Data Flow:**
1. Validates Firebase Auth token and premium subscription
2. Validates request payload (destination, dates, budget, etc.)
3. Checks rate limits (10 requests/hour for premium users)
4. Initializes AIItineraryService with unique generation ID
5. Sets up SSE connection for real-time progress updates
6. Streams progress updates as each stage completes
7. Returns final itinerary result or error response

```typescript
// functions/src/api/ai/generateItinerary.ts
import { Request, Response } from 'express';
import { validatePremiumUser } from '../../middleware/premiumAuth';
import { AIItineraryService } from '../../services/aiItineraryService';
import { validateGenerationRequest } from '../../utils/itineraryValidator';

export const generateItinerary = async (req: Request, res: Response) => {
  try {
    // 1. Authenticate and validate premium user
    const user = await validatePremiumUser(req);
    if (!user.hasPremium) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'PREMIUM_REQUIRED',
          message: 'Premium subscription required for AI itinerary generation'
        }
      });
    }

    // 2. Validate request payload
    const validationResult = validateGenerationRequest(req.body);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid request parameters',
          details: validationResult.errors
        }
      });
    }

    // 3. Check rate limiting (prevent abuse)
    const rateLimitCheck = await checkRateLimit(user.uid);
    if (!rateLimitCheck.allowed) {
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Try again in ${rateLimitCheck.resetTime} seconds`
        }
      });
    }

    // 4. Initialize generation process
    const generationId = generateUniqueId();
    const aiService = new AIItineraryService(user.uid, generationId);

    // 5. Set up Server-Sent Events for progress updates
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // 6. Start generation process
    const result = await aiService.generateItinerary(
      req.body as AIGenerationRequest,
      (progress) => {
        // Send progress updates to frontend
        res.write(`data: ${JSON.stringify(progress)}\n\n`);
      }
    );

    // 7. Send final result
    res.write(`data: ${JSON.stringify(result)}\n\n`);
    res.end();

  } catch (error) {
    console.error('AI Generation Error:', error);
    
    const errorResponse = {
      success: false,
      error: {
        code: 'GENERATION_FAILED',
        message: 'Failed to generate itinerary',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    };

    if (res.headersSent) {
      res.write(`data: ${JSON.stringify(errorResponse)}\n\n`);
      res.end();
    } else {
      res.status(500).json(errorResponse);
    }
  }
};
```

##### **3. AI Itinerary Service**

**Purpose**: The core business logic service that orchestrates the AI generation process through multiple stages. This is the brain of the AI itinerary system.

**Key Responsibilities:**
- **Multi-Stage Processing**: Breaks down generation into 5 distinct stages with progress tracking
- **Data Integration**: Combines user preferences, behavioral analysis, destination data, and weather
- **AI Orchestration**: Manages communication with OpenAI/Claude APIs using engineered prompts
- **Optimization**: Post-processes AI output for timing, logistics, and cost accuracy
- **Database Management**: Saves generation results and maintains audit trails

**Processing Stages:**
1. **Preference Analysis** (Stage 0): Loads user preferences + analyzes past behavior patterns
2. **Destination Research** (Stage 1): Gathers destination info, activities, and weather data
3. **AI Generation** (Stage 2): Sends engineered prompt to AI and receives structured itinerary
4. **Optimization** (Stage 3): Validates timing, optimizes routes, checks business hours
5. **Finalization** (Stage 4): Calculates costs, adds booking info, saves to database

**Technical Features:**
- **Behavioral Analysis**: Analyzes user's past itineraries, likes, and ratings for personalization
- **Error Recovery**: Comprehensive error handling with detailed logging for debugging
- **Confidence Scoring**: Calculates confidence scores based on data quality and AI responses
- **Cost Calculation**: Breaks down costs by category (accommodation, food, activities, transport)
- **Recommendation Engine**: Generates alternative activities and accommodations

```typescript
// functions/src/services/aiItineraryService.ts
import { OpenAIClient } from '../integrations/openaiClient';
import { PromptEngineering } from './promptEngineering';
import { UserPreferencesService } from './userPreferencesService';
import { GooglePlacesService } from '../integrations/googlePlacesService';
import { FirestoreService } from './firestoreService';

export class AIItineraryService {
  private openaiClient: OpenAIClient;
  private promptService: PromptEngineering;
  private preferencesService: UserPreferencesService;
  private placesService: GooglePlacesService;
  private firestoreService: FirestoreService;

  constructor(
    private userId: string,
    private generationId: string
  ) {
    this.openaiClient = new OpenAIClient();
    this.promptService = new PromptEngineering();
    this.preferencesService = new UserPreferencesService();
    this.placesService = new GooglePlacesService();
    this.firestoreService = new FirestoreService();
  }

  async generateItinerary(
    request: AIGenerationRequest,
    progressCallback: (progress: any) => void
  ): Promise<AIGenerationResponse> {
    
    const startTime = Date.now();
    
    try {
      // Stage 1: Analyze user preferences
      progressCallback({
        stage: 0,
        message: 'Analyzing your preferences...',
        details: 'Loading your travel style and activity preferences'
      });

      const userPreferences = await this.getUserPreferences(request.preferenceProfileId);
      const behaviorAnalysis = await this.analyzePastBehavior();
      
      // Stage 2: Research destination
      progressCallback({
        stage: 1,
        message: 'Researching your destination...',
        details: `Gathering information about ${request.destination}`
      });

      const destinationInfo = await this.placesService.getDestinationInfo(request.destination);
      const activities = await this.placesService.findActivities(request.destination, userPreferences);
      const weather = await this.getWeatherForecast(request.destination, request.startDate, request.endDate);

      // Stage 3: Generate AI itinerary
      progressCallback({
        stage: 2,
        message: 'Creating your personalized itinerary...',
        details: 'AI is crafting the perfect trip based on your preferences'
      });

      const aiPrompt = this.promptService.buildItineraryPrompt({
        request,
        userPreferences,
        behaviorAnalysis,
        destinationInfo,
        activities,
        weather
      });

      const aiResponse = await this.openaiClient.generateItinerary(aiPrompt);
      const parsedItinerary = this.parseAIResponse(aiResponse);

      // Stage 4: Optimize and validate
      progressCallback({
        stage: 3,
        message: 'Optimizing your schedule...',
        details: 'Fine-tuning timing and logistics'
      });

      const optimizedItinerary = await this.optimizeItinerary(parsedItinerary);
      const validatedItinerary = await this.validateItinerary(optimizedItinerary);

      // Stage 5: Calculate costs and finalize
      progressCallback({
        stage: 4,
        message: 'Calculating costs and finalizing...',
        details: 'Adding cost estimates and booking information'
      });

      const costBreakdown = await this.calculateCosts(validatedItinerary);
      const recommendations = await this.generateRecommendations(validatedItinerary);

      // Save to database
      await this.saveGeneration(validatedItinerary, costBreakdown, recommendations);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          itinerary: validatedItinerary,
          metadata: {
            generationId: this.generationId,
            confidence: this.calculateConfidence(validatedItinerary),
            processingTime,
            aiModel: 'gpt-4-turbo',
            version: '1.0.0'
          },
          recommendations,
          costBreakdown
        }
      };

    } catch (error) {
      // Log error for debugging
      await this.logGenerationError(error);
      
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  private async getUserPreferences(profileId?: string): Promise<any> {
    const preferences = await this.preferencesService.getPreferences(this.userId, profileId);
    const inferredPrefs = await this.preferencesService.getInferredPreferences(this.userId);
    
    // Merge explicit preferences with inferred ones
    return this.preferencesService.mergePreferences(preferences, inferredPrefs);
  }

  private async analyzePastBehavior(): Promise<any> {
    // Analyze user's past itineraries, liked content, ratings
    const pastItineraries = await this.firestoreService.getUserItineraries(this.userId);
    const likedContent = await this.firestoreService.getUserLikes(this.userId);
    const ratings = await this.firestoreService.getUserRatings(this.userId);

    return {
      preferredDestinationTypes: this.extractDestinationPatterns(pastItineraries),
      activityPreferences: this.extractActivityPatterns(likedContent),
      budgetPatterns: this.extractBudgetPatterns(pastItineraries),
      groupSizePreferences: this.extractGroupPatterns(pastItineraries),
      seasonalPreferences: this.extractSeasonalPatterns(pastItineraries)
    };
  }

  private parseAIResponse(aiResponse: string): GeneratedItinerary {
    try {
      // Parse AI response (JSON or structured text)
      const parsed = JSON.parse(aiResponse);
      
      // Validate structure and fill in required fields
      return {
        id: this.generationId,
        destination: parsed.destination,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        description: parsed.description,
        activities: parsed.activities || [],
        
        // Default platform fields (will be customizable by user)
        gender: 'any',
        status: 'any',
        sexualOrientation: 'any',
        startDay: 0,
        endDay: 999,
        lowerRange: 18,
        upperRange: 99,
        likes: [],
        
        dailyPlans: parsed.dailyPlans || [],
        aiGenerated: true,
        generationMetadata: {
          model: 'gpt-4-turbo',
          confidence: 0.85,
          preferences: {},
          createdAt: new Date()
        }
      };
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${error.message}`);
    }
  }

  private async optimizeItinerary(itinerary: GeneratedItinerary): Promise<GeneratedItinerary> {
    // Optimize travel times between activities
    // Check for logical flow and timing conflicts
    // Suggest transportation options
    // Validate business hours and availability
    
    for (const dailyPlan of itinerary.dailyPlans) {
      dailyPlan.activities = await this.optimizeDailySchedule(dailyPlan.activities);
      dailyPlan.transportation = await this.calculateTransportation(dailyPlan.activities);
    }

    return itinerary;
  }

  private async calculateCosts(itinerary: GeneratedItinerary): Promise<any> {
    let totalCost = 0;
    const categoryBreakdown = {
      accommodation: 0,
      food: 0,
      activities: 0,
      transportation: 0,
      misc: 0
    };

    // Calculate costs for each day
    const byDay = [];
    for (const dailyPlan of itinerary.dailyPlans) {
      let dayTotal = 0;
      
      for (const activity of dailyPlan.activities) {
        dayTotal += activity.cost.amount;
        categoryBreakdown[activity.category as keyof typeof categoryBreakdown] += activity.cost.amount;
      }
      
      byDay.push({
        day: dailyPlan.day,
        date: dailyPlan.date,
        total: dayTotal
      });
      
      totalCost += dayTotal;
    }

    return {
      total: totalCost,
      perPerson: totalCost, // Will adjust based on group size
      byCategory: categoryBreakdown,
      byDay
    };
  }

  private async saveGeneration(
    itinerary: GeneratedItinerary, 
    costBreakdown: any, 
    recommendations: any
  ): Promise<void> {
    await this.firestoreService.saveAIGeneration({
      id: this.generationId,
      userId: this.userId,
      itinerary,
      costBreakdown,
      recommendations,
      createdAt: new Date(),
      status: 'completed'
    });
  }
}
```

##### **4. Prompt Engineering Service**

**Purpose**: The intelligent prompt construction service that transforms user data into optimized AI prompts. This is the key to getting high-quality, personalized itineraries from the AI.

**Key Responsibilities:**
- **Dynamic Prompt Construction**: Builds context-aware prompts based on user preferences, behavior, and trip parameters
- **Data Formatting**: Converts complex user data into AI-readable format with proper context
- **Instruction Engineering**: Crafts specific instructions to guide AI toward desired output format and quality
- **Context Integration**: Seamlessly combines multiple data sources (preferences, weather, activities, destination info)
- **Output Specification**: Defines exact JSON schema for consistent, parseable AI responses

**Prompt Components:**
1. **Trip Context**: Destination, dates, group size, budget, trip type
2. **User Personalization**: Travel style, activity preferences (0-10 scale), food restrictions, accommodation preferences
3. **Behavioral Insights**: Past destination patterns, activity preferences, budget history, seasonal trends
4. **Destination Data**: Local activities, weather forecast, venue information, cultural context
5. **Special Requirements**: Must-include/avoid items, accessibility needs, special requests
6. **Format Specification**: Detailed JSON schema with examples for consistent AI output

**Technical Features:**
- **Adaptive Prompting**: Adjusts prompt complexity based on available user data
- **Context Optimization**: Balances prompt length with information richness for optimal AI performance
- **Format Enforcement**: Ensures AI returns structured JSON with all required fields
- **Error Prevention**: Includes specific instructions to prevent common AI generation errors

```typescript
// functions/src/services/promptEngineering.ts
export class PromptEngineering {
  
  buildItineraryPrompt(context: {
    request: AIGenerationRequest;
    userPreferences: any;
    behaviorAnalysis: any;
    destinationInfo: any;
    activities: any[];
    weather: any;
  }): string {
    
    const { request, userPreferences, behaviorAnalysis, destinationInfo, activities, weather } = context;
    
    return `
You are an expert travel planner creating a detailed ${this.getTripDuration(request.startDate, request.endDate)}-day itinerary for ${request.destination}.

## Trip Details:
- Destination: ${request.destination}
- Dates: ${request.startDate} to ${request.endDate}
- Group Size: ${request.groupSize} ${request.groupSize === 1 ? 'person' : 'people'}
- Budget: $${request.budget.total} ${request.budget.currency} total
- Trip Type: ${request.tripType}

## User Preferences:
${this.formatPreferences(userPreferences)}

## Past Behavior Insights:
${this.formatBehaviorAnalysis(behaviorAnalysis)}

## Destination Information:
${this.formatDestinationInfo(destinationInfo)}

## Available Activities:
${this.formatActivities(activities)}

## Weather Forecast:
${this.formatWeather(weather)}

## Special Requirements:
${request.specialRequests || 'None specified'}
${request.mustInclude?.length ? `Must Include: ${request.mustInclude.join(', ')}` : ''}
${request.mustAvoid?.length ? `Must Avoid: ${request.mustAvoid.join(', ')}` : ''}

## Instructions:
Create a detailed day-by-day itinerary that:
1. Respects the user's preferences and past behavior
2. Optimizes travel time and logistics
3. Balances different types of activities
4. Stays within the specified budget
5. Considers weather conditions
6. Includes specific timing, costs, and booking information
7. Provides local tips and alternatives

## Required JSON Format:
{
  "destination": "${request.destination}",
  "startDate": "${request.startDate}",
  "endDate": "${request.endDate}",
  "description": "A compelling 2-3 sentence description of this trip",
  "activities": ["category1", "category2", ...],
  "dailyPlans": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "theme": "Day theme/focus",
      "activities": [
        {
          "id": "unique-id",
          "name": "Activity Name",
          "description": "Detailed description",
          "category": "cultural|adventure|food|shopping|relaxation|nightlife|nature|photography",
          "location": {
            "name": "Venue Name",
            "address": "Full Address",
            "coordinates": {"lat": 0.0, "lng": 0.0}
          },
          "timing": {
            "startTime": "HH:MM",
            "endTime": "HH:MM",
            "duration": 120
          },
          "cost": {
            "amount": 25.00,
            "currency": "USD",
            "perPerson": true
          },
          "bookingInfo": {
            "requiresReservation": false,
            "bookingUrl": "https://...",
            "phone": "+1-xxx-xxx-xxxx",
            "advanceBookingDays": 3
          },
          "tips": ["Local tip 1", "Local tip 2"],
          "alternatives": ["Alternative option 1", "Alternative option 2"]
        }
      ],
      "meals": [
        {
          "type": "breakfast|lunch|dinner",
          "name": "Restaurant Name",
          "cuisine": "Cuisine Type",
          "location": {...},
          "cost": {...},
          "description": "Why this choice"
        }
      ],
      "transportation": [
        {
          "from": "Location A",
          "to": "Location B",
          "method": "walking|uber|public|taxi",
          "duration": 15,
          "cost": 5.00,
          "notes": "Booking or timing notes"
        }
      ],
      "estimatedCost": 150.00,
      "notes": "Any special notes for this day"
    }
  ]
}

Generate the complete itinerary following this exact format.
    `.trim();
  }

  private formatPreferences(preferences: any): string {
    if (!preferences) return 'No specific preferences provided';
    
    return `
- Travel Style: ${preferences.travelStyle || 'Not specified'}
- Budget Range: $${preferences.budgetRange?.min}-${preferences.budgetRange?.max} per day
- Activity Preferences (0-10 scale):
  ${Object.entries(preferences.activities || {})
    .map(([activity, score]) => `  • ${activity}: ${score}/10`)
    .join('\n')}
- Food Preferences: ${preferences.foodPreferences?.cuisineTypes?.join(', ') || 'Open to all'}
- Dietary Restrictions: ${preferences.foodPreferences?.dietaryRestrictions?.join(', ') || 'None'}
- Accommodation: ${preferences.accommodation?.type} (${preferences.accommodation?.starRating} stars)
- Transportation: ${preferences.transportation?.primaryMode}
- Accessibility Needs: ${this.formatAccessibilityNeeds(preferences.accessibility)}
    `.trim();
  }

  private formatBehaviorAnalysis(analysis: any): string {
    if (!analysis) return 'No behavioral data available';
    
    return `
- Preferred Destination Types: ${analysis.preferredDestinationTypes?.join(', ') || 'Various'}
- Common Activity Patterns: ${analysis.activityPreferences?.join(', ') || 'Mixed'}
- Typical Budget Range: $${analysis.budgetPatterns?.average || 'Unknown'} per day
- Preferred Group Size: ${analysis.groupSizePreferences?.most_common || 'Unknown'}
- Seasonal Preferences: ${analysis.seasonalPreferences?.join(', ') || 'Year-round'}
    `.trim();
  }

  private getTripDuration(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  // Additional formatting methods...
}
```

##### **5. Rate Limiting and Authentication Middleware**

**Purpose**: The supporting middleware functions that the Main API Handler calls to validate user permissions and prevent system abuse. These are the **implementation details** of the authentication/rate limiting that happens in steps 1-3 of the Main API Handler.

**Relationship to Main API Handler**: 
- **Step 1** of Main API Handler calls `validatePremiumUser(req)` → implemented in this section
- **Step 3** of Main API Handler calls `checkRateLimit(user.uid)` → implemented in this section
- This section shows **HOW** those validation functions work internally

**Key Responsibilities:**
- **Premium Authentication**: Validates Firebase Auth tokens and verifies active premium subscriptions
- **Subscription Validation**: Checks subscription status, expiration dates, and cancellation status
- **Rate Limiting**: Enforces usage limits per user tier (10 requests/hour for premium, 1/week for teasers)
- **Abuse Prevention**: Tracks usage patterns and prevents system overload
- **Security Enforcement**: Ensures only authorized users can access expensive AI generation features

**Authentication Flow:**
1. **Token Validation**: Verifies Firebase Auth Bearer token from request headers
2. **User Lookup**: Retrieves user profile and subscription data from Firestore
3. **Subscription Check**: Validates premium status, expiration, and cancellation status
4. **Rate Limit Check**: Counts recent requests within time window and enforces limits
5. **Access Decision**: Grants or denies access with appropriate error codes

**Rate Limiting Strategy:**
- **Premium Users**: 10 AI generations per hour (prevents abuse while allowing normal usage)
- **Free Users**: 1 teaser per week (drives conversion while providing value)
- **Time Window Tracking**: Sliding window approach using Firestore timestamps
- **Graceful Degradation**: Clear error messages with reset time information

**Security Features:**
- **Token Expiration**: Validates Firebase token expiration and freshness
- **Subscription Integrity**: Cross-references multiple subscription fields for accuracy
- **Usage Analytics**: Tracks generation patterns for abuse detection
- **Error Logging**: Comprehensive logging for security monitoring and debugging

```typescript
// functions/src/middleware/premiumAuth.ts
import { Request } from 'express';
import { auth } from 'firebase-admin';
import { firestore } from 'firebase-admin';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  hasPremium: boolean;
  subscriptionType: string;
  subscriptionEndDate: Date;
}

export async function validatePremiumUser(req: Request): Promise<AuthenticatedUser> {
  // 1. Verify Firebase Auth token
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('No valid authorization token provided');
  }

  const token = authHeader.split('Bearer ')[1];
  const decodedToken = await auth().verifyIdToken(token);

  // 2. Get user profile and subscription status
  const userDoc = await firestore()
    .collection('users')
    .doc(decodedToken.uid)
    .get();

  if (!userDoc.exists) {
    throw new Error('User profile not found');
  }

  const userData = userDoc.data()!;
  
  // 3. Validate premium subscription
  const hasPremium = await validateSubscription(userData);

  return {
    uid: decodedToken.uid,
    email: decodedToken.email!,
    hasPremium,
    subscriptionType: userData.subscriptionType || 'free',
    subscriptionEndDate: userData.subscriptionEndDate?.toDate()
  };
}

async function validateSubscription(userData: any): Promise<boolean> {
  if (userData.subscriptionType !== 'premium') {
    return false;
  }

  if (userData.subscriptionCancelled) {
    return false;
  }

  if (userData.subscriptionEndDate && userData.subscriptionEndDate.toDate() < new Date()) {
    return false;
  }

  return true;
}

// Rate limiting for AI generation
const RATE_LIMITS = {
  premium: { requests: 10, window: 3600 }, // 10 requests per hour
  free: { requests: 1, window: 604800 }    // 1 request per week (for teasers)
};

export async function checkRateLimit(userId: string): Promise<{allowed: boolean, resetTime?: number}> {
  const now = Date.now();
  const windowStart = now - (RATE_LIMITS.premium.window * 1000);

  // Get recent generations for this user
  const recentGenerations = await firestore()
    .collection('ai_generations')
    .where('userId', '==', userId)
    .where('createdAt', '>=', new Date(windowStart))
    .get();

  if (recentGenerations.size >= RATE_LIMITS.premium.requests) {
    const oldestGeneration = recentGenerations.docs
      .sort((a, b) => a.data().createdAt.seconds - b.data().createdAt.seconds)[0];
    
    const resetTime = Math.ceil((oldestGeneration.data().createdAt.seconds * 1000 + RATE_LIMITS.premium.window * 1000 - now) / 1000);
    
    return { allowed: false, resetTime };
  }

  return { allowed: true };
}
```

#### **BE-1.2: Database Schema & Data Models**

**Purpose**: The data persistence layer that stores AI generation requests, results, and analytics. This provides audit trails, performance monitoring, and data for system improvements.

**Key Collections:**
- **AI Generations**: Complete generation history with requests, responses, and metadata
- **User Preferences**: Travel preference profiles and inferred behavioral data
- **Analytics**: Daily metrics for monitoring system performance and usage patterns

**Data Relationships:**
- AI generations link to user preferences for personalization
- Analytics aggregate generation data for insights
- Error tracking enables system reliability improvements

##### **Firestore Collections:**

```typescript
// AI Generations Collection
/ai_generations/{generationId}
{
  id: string;
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  request: AIGenerationRequest;
  response?: AIGenerationResponse;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  processingTimeMs: number;
  errorDetails?: any;
}

// User Preferences Collection  
/user_preferences/{userId}
{
  profiles: TravelPreferenceProfile[];
  defaultProfileId: string;
  inferredPreferences: InferredPreferences;
  lastUpdated: Timestamp;
}

// AI Generation Analytics
/ai_analytics/{date}
{
  date: string; // YYYY-MM-DD
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  averageProcessingTime: number;
  popularDestinations: string[];
  commonFailureReasons: string[];
}
```

#### **BE-1.3: External API Integrations**

**Purpose**: The external service integration layer that connects with third-party APIs for AI generation, destination data, and weather information. This extends the system's capabilities beyond internal data.

**Key Integrations:**
- **OpenAI/Claude API**: Core AI generation with structured JSON responses
- **Google Places API**: Destination information, activities, and venue data
- **Weather APIs**: Real-time and forecast data for trip planning
- **Maps/Routing APIs**: Transportation and logistics optimization

**Integration Features:**
- **Error Handling**: Comprehensive error recovery for external API failures
- **Rate Limiting**: Respects external API rate limits and quotas
- **Response Caching**: Optimizes performance and reduces API costs
- **Fallback Strategies**: Graceful degradation when external services are unavailable

##### **OpenAI/Claude Integration:**
```typescript
// functions/src/integrations/openaiClient.ts
import OpenAI from 'openai';

export class OpenAIClient {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async generateItinerary(prompt: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are an expert travel planner. Always respond with valid JSON in the exact format requested.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: 'json_object' }
      });

      return response.choices[0].message.content || '';
      
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }
}
```

---

## Next Steps

This covers the foundational on-demand AI generation API. The next APIs to implement would be:

1. **BE-2**: User Preferences Management API
2. **BE-3**: Free User Teaser API  
3. **BE-4**: Real-time Optimization API
4. **BE-5**: Feedback Collection API

Would you like me to continue with any of these next, or would you like to dive deeper into any aspect of the AI generation implementation?
