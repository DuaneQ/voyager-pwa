# AI Itinerary Backend - Setup & API Reference

## Overview

This document provides setup instructions, environment configuration, and API reference for the AI itinerary generation backend. 

**For comprehensive architecture and system design**, see: [AI System Architecture](AI_SYSTEM_ARCHITECTURE.md)  
**For detailed function contracts and implementation**, see: [AI Backend Overview](AI_BACKEND_OVERVIEW.md)

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Firebase CLI installed (`npm install -g firebase-tools`)
- Firebase project with Functions, Firestore, and Auth enabled

### Environment Setup

#### Required API Keys
```bash
# OpenAI Configuration (REQUIRED)
export OPENAI_API_KEY="sk-your-openai-api-key"

# Google Places API (REQUIRED)
export GOOGLE_PLACES_API_KEY="your-google-places-api-key"

# SerpAPI for Flight Search (REQUIRED)
export SERPAPI_API_KEY="your-serpapi-api-key"
```

#### Firebase Configuration
```bash
# Set via Firebase CLI (alternative to environment variables)
firebase functions:config:set openai.api_key="your-key"
firebase functions:config:set google.places_api_key="your-key"
```

## Available Functions

### Core AI Generation Functions

#### 1. generateItineraryWithAI (Primary Function)
**Type**: Firebase Callable Function  
**Description**: Complete AI itinerary generation with real-time progress tracking  
**Authentication**: Required (Firebase Auth)  
**Authorization**: Premium subscription required  
**Rate Limit**: 10 generations per hour  
**Timeout**: 540 seconds (9 minutes)  
**Memory**: 2GB allocation for AI processing  

**Request Format**:
```typescript
interface AIGenerationRequest {
  destination: string;           // "Paris, France"
  startDate: string;            // "2025-08-01" (YYYY-MM-DD)
  endDate: string;              // "2025-08-07" (YYYY-MM-DD)
  budget?: {
    total: number;              // 2000
    currency: 'USD' | 'EUR' | 'GBP';
  };
  groupSize?: number;           // 2
  tripType?: 'leisure' | 'business' | 'adventure' | 'romantic' | 'family';
  preferenceProfileId?: string; // "profile-123"
  specialRequests?: string;     // "Include art museums"
  mustInclude?: string[];       // ["Eiffel Tower", "Louvre"]
  mustAvoid?: string[];         // ["Crowded areas"]
  flightPreferences?: {
    class?: string;
    preferredAirlines?: string[];
  };
  transportType?: string;
}
```

**Usage Example**:
```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const generateItinerary = httpsCallable(functions, 'generateItineraryWithAI');

const result = await generateItinerary({ data: {
  destination: "Paris, France",
  startDate: "2025-08-01",
  endDate: "2025-08-07",
  budget: { total: 2000, currency: "USD" },
  groupSize: 2,
  tripType: "leisure"
}});

// Response: { success: true, generationId: "...", savedDocId: "..." }
```

> ⚠️ **Note**: The following functions documented in older versions do NOT exist:
> - `estimateItineraryCost` - Not implemented
> - `getGenerationStatus` - Not implemented (progress tracked client-side only)

### Helper Search Functions

#### 2. searchFlights
**Type**: Firebase Callable Function  
**Description**: Search flight options using SerpAPI Google Flights  
**Provider**: SerpAPI (NOT Amadeus)

**HTTP Usage**:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"data":{"departureAirportCode":"ATL","destinationAirportCode":"CDG","departureDate":"2025-08-01","returnDate":"2025-08-07"}}' \
  http://localhost:5001/YOUR_PROJECT/us-central1/searchFlights
```

#### 3. searchAccommodations
**Type**: Firebase Callable Function  
**Description**: Search hotels using Google Places API  

#### 4. searchActivities
**Type**: Firebase Callable Function  
**Description**: Search activities and restaurants using Google Places API  

### Function Call Pattern
**Important**: All Firebase Functions expect requests in the format:
```javascript
await functionCall({ data: yourPayload })
```

## Data Models

### Request Format
```typescript
interface AIGenerationRequest {
  destination: string;
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  budget: {
    total: number;
    currency: 'USD' | 'EUR' | 'GBP';
  };
  groupSize: number;
  tripType: 'business' | 'leisure' | 'adventure' | 'romantic' | 'family';
  preferenceProfileId?: string;
  specialRequests?: string;
  mustInclude?: string[];
  mustAvoid?: string[];
}
```

### Response Format
```typescript
interface AIGenerationResponse {
  success: boolean;
  data?: {
    itinerary: GeneratedItinerary;
    metadata: {
      generationId: string;
      confidence: number;
      processingTime: number;
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
```

## Database Collections

### itineraries
Stores AI-generated itineraries and their generation progress. This is the canonical collection for AI-generated content and includes request, progress, response, and generationMetadata for debugging (redact secrets when present or apply TTL to raw traces).
```
/itineraries/{id}
{
  id: string;
  userId: string;
  ai_status: 'pending' | 'processing' | 'completed' | 'failed';
  request: AIGenerationRequest;
  progress?: { stage: string; percent?: number; message?: string };
  response?: AIGenerationResponse;
  generationMetadata?: { generationId?: string; promptVersion?: string; model?: string; rawModelResponse?: any };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  processingTimeMs?: number;
  errorDetails?: any;
}
```

### user_preferences  
Stores user travel preference profiles
```
/user_preferences/{userId}
{
  profiles: TravelPreferenceProfile[];
  defaultProfileId: string;
  inferredPreferences: InferredPreferences;
  lastUpdated: Timestamp;
}
```

### ai_analytics
Daily analytics for monitoring system performance
```
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

## Error Handling

### Common Error Codes
- `unauthenticated`: User not logged in
- `permission-denied`: Premium subscription required
- `invalid-argument`: Invalid request parameters
- `resource-exhausted`: Rate limit exceeded
- `not-found`: Resource not found
- `internal`: Internal server error

### Rate Limiting
- **Premium Users**: 10 AI generations per hour
- **Free Users**: 1 cost estimation per week
- **Cost Estimation**: More lenient limits for quick estimates

## Recent Updates (October 2025)

### ✅ Frontend Component Refactoring
- **AIItineraryDisplay**: Refactored 2051-line monolithic component into focused sections
- **AIItineraryHeader**: Extracted as reusable component (187 lines)
- **Data Consistency**: Fixed query mismatch - all AI itineraries now display correctly
- **UI Cleanup**: Removed duplicate dropdown elements for better UX

### ✅ Data Model Standardization
- **Storage Field**: AI itineraries consistently use `ai_status: "completed"`
- **Query Field**: `useAIGeneratedItineraries` queries correct field
- **Result**: All user AI itineraries appear in dropdown (was showing only 1 of 3)

### 📁 Updated Documentation
- `AI_ITINERARY_DISPLAY_REFACTORING.md` - Detailed refactoring documentation
- `FRONTEND_TECHNICAL_STORIES.md` - Updated implementation phases
- `AI_GENERATION_COMPLETE_STATUS.md` - Current system status

## Testing

### Local Development
```bash
# Install dependencies
npm install

# Build functions
npm run build

# Start local emulator
npm run serve

# Run tests
npm test
```

### Test with Frontend
The frontend `useAIGeneration` hook is already configured to work with these functions. Make sure to:

1. Set up Firebase configuration in your frontend
2. Ensure user has premium subscription for full generation
3. Handle loading states and error messages appropriately

## Deployment

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:generateItinerary

# Check function logs
firebase functions:log --only generateItinerary
```

## Monitoring

- Check Firebase Console > Functions for execution logs
- Monitor Firestore collections for generation history
- Review daily analytics in `ai_analytics` collection
- Set up alerts for high error rates or processing times

## Cost Optimization

- Using `gpt-4o-mini` for cost-effective AI generation
- Implementing proper rate limiting to prevent abuse
- Caching destination and weather data where possible
- Fallback mechanisms for external API failures
