# AI Flight Itinerary Generation Flow (Comprehensive Documentation)

_Last updated: September 1, 2025_

---

## Overview
This document provides a complete reference for the AI-powered flight itinerary generation flow in Voyager PWA, covering frontend, backend, data models, progress tracking, error handling, performance, security, and testing.

---

## 1. End-to-End Architecture

### **Frontend (React/TypeScript)**
- **TravelPreferencesTab**: Entry for user travel profiles and modal launch
- **AIItineraryGenerationModal**: Collects flight preferences, triggers backend
- **useAIGeneration Hook**: Handles API calls, progress tracking, error management

### **Backend (Firebase Functions)**
- **generateItinerary**: Main callable function orchestrating the entire flow
- **searchFlights**: HTTP function for direct flight search (Amadeus integration)

### **External APIs**
- **Amadeus Flight API**: Real flight search, mapped to platform format
- **Google Places API**: Hotel and attraction search
- **OpenAI GPT-4o-mini**: AI itinerary generation

### **Firestore Collections**
- **ai_generations**: Stores requests, progress, and results
- **user_preferences**: Stores user travel profiles
- **ai_analytics**: Daily analytics and monitoring

---

## 2. Data Models

### **AIGenerationRequest**
```typescript
interface AIGenerationRequest {
  destination: string;
  departure?: string;
  startDate: string;
  endDate: string;
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

### **AIGenerationResponse**
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

---

## 3. Flow Breakdown

### **Frontend**
1. User selects travel profile and preferences in `TravelPreferencesTab`.
2. Modal (`AIItineraryGenerationModal`) collects flight details, dates, and preferences.
3. On submit, `useAIGeneration` calls backend with all data, including mapped airline codes.
4. Real-time progress updates via Firestore listener; progress bar and messages update in modal.
5. On completion, itinerary and flight options are displayed.

### **Backend**
1. `generateItinerary` validates user (premium, rate limits), fetches user info and preferences.
2. Orchestrates parallel API calls: Amadeus (flights), Google Places (hotels/attractions), OpenAI (AI itinerary).
3. Progress tracked in Firestore (`ai_generations`), with granular updates (15%, 30%, 45%, 65%, 85%, 100%).
4. Final result mapped to platform format and stored.
5. Errors handled with structured codes and real-time feedback.

---

## 4. Progress Tracking
- **Stages:** Finding flights → Finding hotels → Gathering POIs → Generating itinerary → Finalizing
- **Firestore Document:**
  - `progress: { stage, totalStages, message }`
  - `percent: number`
  - `status: 'processing' | 'completed' | 'failed'`
- **Frontend:** Listens for changes, updates progress bar and messages accordingly.

---

## 5. Error Handling
- **Common Error Codes:**
  - `unauthenticated`, `permission-denied`, `invalid-argument`, `resource-exhausted`, `not-found`, `internal`
- **Fallbacks:**
  - Static flight/hotel data if API fails
  - Template itinerary if OpenAI fails
- **User Feedback:**
  - Real-time error messages in modal
  - Progress status updates

---

## 6. Performance & Optimization
- **Parallel API Execution:** All external APIs called via `Promise.allSettled` for speed
- **Optimized Data Flow:** User data passed from frontend, minimal Firestore reads
- **Timeouts:** 45s for flights, 60s for attractions, 2GB memory for AI processing
- **Typical Generation Time:** 60-80 seconds

---

## 7. Security & Privacy
- **Authentication:** Firebase Auth required
- **Premium Validation:** Only premium users can generate itineraries
- **Rate Limiting:** 10 generations/day/user
- **Data Isolation:** Users can only access their own data
- **API Keys:** Managed via environment variables

---

## 8. Monitoring & Analytics
- **Function Logs:** Firebase Console > Functions
- **Firestore Analytics:** `ai_analytics` collection
- **Alerts:** High error rates, API quota usage, performance degradation

---

## 9. Testing & Deployment
- **Unit Tests:** Modal, hooks, backend functions, API clients
- **Integration Tests:** End-to-end flow, error/fallback scenarios
- **Local Development:**
  - `npm install`, `npm run build`, `npm run serve`, `npm test`
- **Deployment:**
  - `firebase deploy --only functions`
  - Monitor logs and analytics post-deploy

---

## 10. File Locations
- **Frontend:** `/src/components/forms/TravelPreferencesTab.tsx`, `/src/components/modals/AIItineraryGenerationModal.tsx`, `/src/hooks/useAIGeneration.ts`
- **Backend:** `/functions/src/aiItineraryProcessor.ts`, `/functions/src/searchFlights.ts`
- **API Clients:** `/functions/src/providers/amadeusClient.ts`, `/functions/src/providers/placesClient.ts`
- **Tests:** `/src/__tests__/components/AIItineraryGenerationModal.test.tsx`, `/src/__tests__/hooks/useAIGeneration.test.ts`
- **Docs:** `/docs/AI_Itineraries/AI_FLIGHT_ITINERARY_FLOW.md`

---

## 11. Future Enhancements
- Real-time flight/hotel API integration (production Amadeus, booking APIs)
- Multi-user collaborative planning
- Advanced personalization (ML-based)
- Multi-language support

---

**This document supersedes all previous AI flight itinerary docs.**
