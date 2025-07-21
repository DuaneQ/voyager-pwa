# AI Service Development Guide
*Separate AI Processing Service for Voyager PWA*

## Service Overview

The AI Processing Service is a standalone Node.js/TypeScript application deployed on Google Cloud Run that handles all AI-powered itinerary generation for Voyager PWA.

## Technology Stack

### Core Technologies
- **Runtime**: Node.js 18+ with TypeScript
- **Framework**: Express.js with async/await patterns
- **AI Integration**: OpenAI GPT-4 with structured outputs
- **Location Data**: Google Places API
- **Database**: Firebase Admin SDK for Firestore
- **Deployment**: Google Cloud Run with container deployment

### Key Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "firebase-admin": "^11.0.0",
    "openai": "^4.0.0",
    "@google/maps": "^1.1.0",
    "zod": "^3.20.0",
    "winston": "^3.8.0",
    "helmet": "^6.0.0",
    "cors": "^2.8.0",
    "dotenv": "^16.0.0"
  }
}
```

## Project Structure

```
voyager-ai-service/
├── src/
│   ├── config/
│   │   ├── firebase.ts         # Firebase admin configuration
│   │   ├── openai.ts          # OpenAI client setup
│   │   └── environment.ts      # Environment variables
│   ├── controllers/
│   │   ├── generation.controller.ts  # Generation endpoints
│   │   └── health.controller.ts      # Health check
│   ├── services/
│   │   ├── itinerary-generator.ts    # Core generation logic
│   │   ├── places-service.ts         # Google Places integration
│   │   ├── route-optimizer.ts        # Route optimization
│   │   └── firestore-service.ts      # Database operations
│   ├── models/
│   │   ├── generation-request.ts     # Request validation schemas
│   │   ├── itinerary-response.ts     # Response type definitions
│   │   └── places-data.ts            # Places API types
│   ├── utils/
│   │   ├── validation.ts             # Request validation
│   │   ├── formatting.ts             # Data formatting utilities
│   │   ├── error-handling.ts         # Error handling middleware
│   │   └── logger.ts                 # Logging configuration
│   ├── middleware/
│   │   ├── auth.middleware.ts        # Request authentication
│   │   ├── rate-limit.middleware.ts  # Rate limiting
│   │   └── validation.middleware.ts  # Input validation
│   └── app.ts                        # Application setup
├── tests/
│   ├── unit/
│   ├── integration/
│   └── __mocks__/
├── Dockerfile
├── .dockerignore
├── cloudbuild.yaml
├── package.json
└── tsconfig.json
```

## Core Service Implementation

### 1. Generation Request Processing

```typescript
// src/services/itinerary-generator.ts
export class ItineraryGeneratorService {
  constructor(
    private openaiService: OpenAIService,
    private placesService: PlacesService,
    private routeOptimizer: RouteOptimizerService,
    private firestoreService: FirestoreService
  ) {}

  async generateItinerary(request: GenerationRequest): Promise<void> {
    const { generationId, userId, destination, preferences } = request;

    try {
      // Update status to processing
      await this.firestoreService.updateGenerationStatus(generationId, 'processing');

      // Generate base itinerary with AI
      const rawItinerary = await this.openaiService.generateStructuredItinerary({
        destination,
        startDate: request.startDate,
        endDate: request.endDate,
        budget: request.budget,
        preferences: request.preferences,
        constraints: request.constraints
      });

      // Enhance with real place data
      const enhancedItinerary = await this.placesService.enhanceWithPlaceData(rawItinerary);

      // Optimize routes and timing
      const optimizedItinerary = await this.routeOptimizer.optimizeItinerary(enhancedItinerary);

      // Format for Voyager schema
      const voyagerItinerary = this.formatForVoyager(optimizedItinerary, request);

      // Save to user's itineraries
      const itineraryId = await this.firestoreService.saveGeneratedItinerary(
        userId,
        voyagerItinerary,
        generationId
      );

      // Update generation status
      await this.firestoreService.updateGenerationStatus(generationId, 'completed', {
        itineraryId,
        processingTimeMs: Date.now() - request.startTime
      });

    } catch (error) {
      console.error('Generation failed:', error);
      await this.firestoreService.updateGenerationStatus(generationId, 'failed', {
        error: {
          code: error.code || 'GENERATION_ERROR',
          message: error.message,
          details: error.details
        }
      });
    }
  }

  private formatForVoyager(aiItinerary: AIItinerary, request: GenerationRequest): VoyagerItinerary {
    return {
      id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `AI-Generated: ${request.destination}`,
      description: `${this.calculateDuration(request)} AI-generated itinerary for ${request.destination}`,
      destination: request.destination,
      startDate: request.startDate,
      endDate: request.endDate,
      budget: request.budget,
      isPublic: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activities: aiItinerary.days.flatMap(day => 
        day.activities.map((activity, index) => ({
          id: `${day.date}_${index}`,
          name: activity.name,
          description: activity.description,
          location: {
            name: activity.location.name,
            address: activity.location.address,
            coordinates: activity.location.coordinates,
            placeId: activity.location.placeId
          },
          category: activity.category,
          duration: activity.duration,
          cost: activity.estimatedCost,
          date: day.date,
          startTime: activity.startTime,
          endTime: activity.endTime,
          bookingUrl: activity.bookingUrl,
          rating: activity.rating,
          photos: activity.photos?.slice(0, 3) || []
        }))
      ),
      // AI-specific metadata
      isAIGenerated: true,
      generationId: request.generationId,
      aiConfidence: aiItinerary.confidence,
      generationDate: new Date().toISOString(),
      aiMetadata: {
        generationType: 'manual',
        modelVersion: 'gpt-4',
        processingTimeMs: Date.now() - request.startTime,
        alternativesConsidered: aiItinerary.alternativesConsidered || 0
      }
    };
  }
}
```

### 2. OpenAI Integration

```typescript
// src/services/openai.service.ts
export class OpenAIService {
  constructor(private client: OpenAI) {}

  async generateStructuredItinerary(params: GenerationParams): Promise<AIItinerary> {
    const prompt = this.buildPrompt(params);
    
    const response = await this.client.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: "You are an expert travel planner. Generate detailed, well-researched itineraries in JSON format."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 4000
    });

    const result = JSON.parse(response.choices[0].message.content);
    return this.validateAndFormatResponse(result);
  }

  private buildPrompt(params: GenerationParams): string {
    return `
Generate a detailed ${this.calculateDuration(params)} itinerary for ${params.destination}.

Requirements:
- Dates: ${params.startDate} to ${params.endDate}
- Budget: ${params.budget.min}-${params.budget.max} ${params.budget.currency}
- Travel style: ${params.preferences.travelStyle.join(', ')}
- Pace: ${params.preferences.pace}
- Group: ${params.preferences.groupType}
- Interests: ${params.preferences.interests.join(', ')}

${params.constraints ? `Constraints:
- Accessibility: ${params.constraints.accessibility ? 'Required' : 'Not required'}
- Dietary restrictions: ${params.constraints.dietaryRestrictions?.join(', ') || 'None'}
- Transportation: ${params.constraints.transportation}` : ''}

Return a JSON object with this exact structure:
{
  "destination": "${params.destination}",
  "totalDays": number,
  "estimatedTotalCost": { "min": number, "max": number, "currency": string },
  "confidence": number (0-1),
  "alternativesConsidered": number,
  "days": [
    {
      "date": "YYYY-MM-DD",
      "theme": "string",
      "activities": [
        {
          "name": "string",
          "description": "string",
          "category": "attraction|restaurant|activity|accommodation|transport",
          "location": {
            "name": "string",
            "address": "string",
            "searchQuery": "string for Google Places"
          },
          "duration": number (minutes),
          "startTime": "HH:MM",
          "endTime": "HH:MM",
          "estimatedCost": { "min": number, "max": number, "currency": string },
          "priority": "high|medium|low",
          "tips": ["string"]
        }
      ]
    }
  ],
  "generalTips": ["string"],
  "packingRecommendations": ["string"]
}

Make it detailed, realistic, and tailored to the specified preferences and constraints.
    `;
  }
}
```

### 3. Google Places Integration

```typescript
// src/services/places.service.ts
export class PlacesService {
  constructor(private client: Client) {}

  async enhanceWithPlaceData(itinerary: AIItinerary): Promise<EnhancedItinerary> {
    const enhancedDays = await Promise.all(
      itinerary.days.map(async (day) => ({
        ...day,
        activities: await Promise.all(
          day.activities.map(async (activity) => {
            try {
              const placeData = await this.findPlace(activity.location.searchQuery);
              return {
                ...activity,
                location: {
                  ...activity.location,
                  coordinates: placeData.geometry?.location,
                  placeId: placeData.place_id,
                  address: placeData.formatted_address
                },
                rating: placeData.rating,
                photos: placeData.photos?.map(photo => ({
                  url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${process.env.GOOGLE_PLACES_API_KEY}`,
                  attribution: photo.html_attributions?.[0]
                })),
                openingHours: placeData.opening_hours,
                website: placeData.website
              };
            } catch (error) {
              console.warn(`Could not enhance activity: ${activity.name}`, error);
              return activity;
            }
          })
        )
      }))
    );

    return { ...itinerary, days: enhancedDays };
  }

  private async findPlace(query: string): Promise<any> {
    const response = await this.client.findPlaceFromText({
      params: {
        input: query,
        inputtype: 'textquery',
        fields: [
          'place_id',
          'name',
          'formatted_address',
          'geometry',
          'rating',
          'photos',
          'opening_hours',
          'website'
        ],
        key: process.env.GOOGLE_PLACES_API_KEY!
      }
    });

    return response.data.candidates[0];
  }
}
```

## Deployment Configuration

### Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY dist/ ./dist/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S voyager-ai -u 1001
USER voyager-ai

EXPOSE 8080

CMD ["node", "dist/app.js"]
```

### Cloud Build Configuration
```yaml
# cloudbuild.yaml
steps:
  # Build TypeScript
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['ci']
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['run', 'build']
  
  # Build Docker image
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/voyager-ai-service:$COMMIT_SHA', '.']
  
  # Push to Container Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/voyager-ai-service:$COMMIT_SHA']
  
  # Deploy to Cloud Run
  - name: 'gcr.io/cloud-builders/gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'voyager-ai-service'
      - '--image=gcr.io/$PROJECT_ID/voyager-ai-service:$COMMIT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--memory=2Gi'
      - '--cpu=2'
      - '--timeout=300'
      - '--concurrency=10'
      - '--max-instances=20'

substitutions:
  _SERVICE_NAME: voyager-ai-service

options:
  logging: CLOUD_LOGGING_ONLY
```

## Monitoring & Observability

### Health Checks
```typescript
// src/controllers/health.controller.ts
export class HealthController {
  async checkHealth(req: Request, res: Response): Promise<void> {
    const checks = await Promise.allSettled([
      this.checkOpenAI(),
      this.checkGooglePlaces(),
      this.checkFirestore()
    ]);

    const health = {
      status: checks.every(check => check.status === 'fulfilled') ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        openai: checks[0].status === 'fulfilled' ? 'up' : 'down',
        googlePlaces: checks[1].status === 'fulfilled' ? 'up' : 'down',
        firestore: checks[2].status === 'fulfilled' ? 'up' : 'down'
      }
    };

    res.status(health.status === 'healthy' ? 200 : 503).json(health);
  }
}
```

### Metrics Collection
```typescript
// src/utils/metrics.ts
export class MetricsCollector {
  private static instance: MetricsCollector;
  
  recordGenerationAttempt(destination: string): void {
    // Track generation attempts by destination
  }
  
  recordGenerationSuccess(processingTimeMs: number): void {
    // Track successful generations and processing time
  }
  
  recordGenerationFailure(errorType: string): void {
    // Track failures by error type
  }
  
  recordTokenUsage(tokens: number): void {
    // Track OpenAI token consumption
  }
}
```

This AI service provides a robust, scalable foundation for generating high-quality itineraries while maintaining separation from your core Voyager PWA application.
