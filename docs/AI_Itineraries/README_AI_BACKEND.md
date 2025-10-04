# AI Itinerary Generation Backend Setup

This directory contains the backend Firebase Functions for AI-powered itinerary generation.

## Required Environment Variables

### OpenAI Configuration
```bash
# Set OpenAI API key
firebase functions:config:set openai.api_key="your-openai-api-key"

# Or set as environment variable
export OPENAI_API_KEY="your-openai-api-key"
```

### Google Maps Configuration (Optional)
```bash
# Set Google Maps API key for enhanced location data
firebase functions:config:set google.maps_api_key="your-google-maps-api-key"

# Or set as environment variable
export GOOGLE_MAPS_API_KEY="your-google-maps-api-key"
```

## Available Functions

### 1. generateItinerary
**Endpoint**: `generateItinerary` (Callable Function)
**Description**: Generate complete AI itineraries for premium users
**Required**: Premium subscription
**Rate Limit**: 10 requests per hour
**Storage**: Saves to `itineraries` collection with `ai_status: "completed"`

**Usage**:
```javascript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const generateItinerary = httpsCallable(functions, 'generateItinerary');

const result = await generateItinerary({
  destination: "Paris, France",
  startDate: "2025-08-01",
  endDate: "2025-08-07",
  budget: { total: 2000, currency: "USD" },
  groupSize: 2,
  tripType: "leisure",
  preferenceProfileId: "profile-1", // optional
  specialRequests: "Include art museums", // optional
  mustInclude: ["Eiffel Tower", "Louvre"], // optional
  mustAvoid: ["Crowded areas"] // optional
});
```

### 2. estimateItineraryCost
**Endpoint**: `estimateItineraryCost` (Callable Function)  
**Description**: Quick cost estimation for trip planning
**Required**: User authentication (premium or free)
**Rate Limit**: More lenient than full generation

**Usage**:
```javascript
const estimateCost = httpsCallable(functions, 'estimateItineraryCost');

const result = await estimateCost({
  destination: "Paris, France",
  startDate: "2025-08-01", 
  endDate: "2025-08-07",
  groupSize: 2,
  tripType: "leisure"
});
```

### 3. getGenerationStatus
**Endpoint**: `getGenerationStatus` (Callable Function)
**Description**: Check the status of an ongoing AI generation
**Required**: User authentication

**Usage**:
```javascript
const getStatus = httpsCallable(functions, 'getGenerationStatus');

const result = await getStatus({
  generationId: "gen_1234567890_abcdefgh"
});
```

### New: searchFlights (HTTP POST)

**Endpoint**: `/searchFlights` (HTTPS function)  
**Description**: Accepts a JSON payload with flight search parameters and returns a simplified list of flights from Amadeus (mapped). Useful for the AI Itinerary modal.

**Example payload**:
```json
{
  "departureAirportCode": "JFK",
  "destinationAirportCode": "LAX",
  "departureDate": "2025-09-01",
  "returnDate": "2025-09-08",
  "cabinClass": "ECONOMY",
  "preferredAirlines": ["DL","AA"],
  "stops": "ONE_OR_FEWER",
  "maxResults": 5
}
```

**Call example (emulator)**:
```bash
# after running `npm run serve` to start functions emulator
curl -X POST \\
  -H "Content-Type: application/json" \\
  -d '{"departureAirportCode":"JFK","destinationAirportCode":"LAX","departureDate":"2025-09-01","returnDate":"2025-09-08"}' \\
  http://localhost:5001/YOUR_PROJECT/us-central1/searchFlights
```

Logs: The function will console.log the incoming params and a sample of mapped flights for quick verification.

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

### ai_generations
Stores all AI generation requests and responses
```
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
