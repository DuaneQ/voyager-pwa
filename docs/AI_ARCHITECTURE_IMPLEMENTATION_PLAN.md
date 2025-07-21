# AI Itinerary Generation - Implementation Plan
*Integrated Frontend + Separate AI Processing Service*

## Phase 1: Foundation Setup (Week 1-2)

### 1.1 AI Processing Service Setup
```bash
# Create separate AI service repository
mkdir voyager-ai-service
cd voyager-ai-service

# Initialize Node.js/Python service
npm init -y  # or python setup
```

**AI Service Structure:**
```
voyager-ai-service/
├── src/
│   ├── generators/
│   │   ├── openai-generator.ts
│   │   ├── places-integration.ts
│   │   └── route-optimizer.ts
│   ├── services/
│   │   ├── firebase-client.ts
│   │   └── generation-service.ts
│   ├── utils/
│   │   ├── validation.ts
│   │   └── formatting.ts
│   └── app.ts
├── Dockerfile
├── cloudbuild.yaml
└── deploy.yaml
```

### 1.2 Database Schema Updates (Voyager PWA)
```sql
-- Add to existing Firestore collections

-- Enhanced users collection
users/{userId} {
  // ... existing fields
  aiUsage: {
    freeGenerationsUsed: number;
    lastFreeGeneration: timestamp;
    totalGenerationsAllTime: number;
  };
  generationPreferences: {
    defaultBudgetRange: { min: number; max: number; currency: string; };
    preferredTravelStyle: string[];
    defaultPace: string;
    savedConstraints: object;
  };
}

-- New ai_generations collection
ai_generations/{generationId} {
  userId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: timestamp;
  completedAt?: timestamp;
  request: {
    destination: string;
    dates: { start: string; end: string; };
    budget: object;
    preferences: object;
    constraints?: object;
  };
  result?: {
    itineraryId: string;
    processingTimeMs: number;
    tokensUsed?: number;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

-- Enhanced itineraries collection
itineraries/{itineraryId} {
  // ... existing fields
  generatedBy?: 'ai' | 'manual';
  aiMetadata?: {
    generationId: string;
    model: string;
    confidence: number;
    alternativesGenerated: number;
  };
  feedback?: {
    rating?: number;
    liked: string[];
    disliked: string[];
    comments?: string;
    submittedAt?: timestamp;
  };
}
```

### 1.3 Environment Setup
```env
# AI Service (.env)
OPENAI_API_KEY=sk-...
GOOGLE_PLACES_API_KEY=...
FIREBASE_PROJECT_ID=voyager-pwa
FIREBASE_SERVICE_ACCOUNT_KEY=...
PORT=8080

# Voyager PWA (add to existing .env)
AI_SERVICE_URL=https://ai-service-url.run.app
AI_SERVICE_API_KEY=...
```

## Phase 2: Core AI Service (Week 3-4)

### 2.1 AI Service Implementation
```typescript
// src/services/generation-service.ts
export class ItineraryGenerationService {
  async generateItinerary(request: GenerationRequest): Promise<void> {
    // 1. Validate request
    // 2. Update status to 'processing'
    // 3. Call OpenAI with structured prompt
    // 4. Fetch places data from Google Places
    // 5. Optimize routes and timing
    // 6. Format as Voyager itinerary
    // 7. Save to Firestore
    // 8. Update status to 'completed'
  }
}

// src/generators/openai-generator.ts
export class OpenAIGenerator {
  async generateStructuredItinerary(params: GenerationParams): Promise<RawItinerary> {
    const prompt = this.buildPrompt(params);
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });
    return JSON.parse(response.choices[0].message.content);
  }
}
```

### 2.2 Firebase Functions Integration
```typescript
// functions/src/generateAIItinerary.ts
export const generateAIItinerary = functions.https.onCall(async (data, context) => {
  // 1. Authenticate user
  // 2. Check rate limits (free/premium)
  // 3. Create generation record
  // 4. Call AI service
  // 5. Return generation ID
});

// functions/src/submitAIFeedback.ts
export const submitAIFeedback = functions.https.onCall(async (data, context) => {
  // 1. Validate feedback data
  // 2. Update itinerary with feedback
  // 3. Store for ML improvement
});
```

## Phase 3: Frontend Integration (Week 5-6)

### 3.1 React Components
```typescript
// src/components/AIItineraryGenerator.tsx
export const AIItineraryGenerator: React.FC = () => {
  return (
    <div>
      <GenerationForm onSubmit={handleGenerate} />
      <GenerationProgress generationId={generationId} />
      <GenerationResult itinerary={result} onFeedback={handleFeedback} />
    </div>
  );
};

// src/components/GenerationForm.tsx
export const GenerationForm: React.FC<Props> = ({ onSubmit }) => {
  // Form for destination, dates, budget, preferences
  // Smart defaults from user profile
  // Validation and submission
};

// src/components/GenerationProgress.tsx
export const GenerationProgress: React.FC<{ generationId: string }> = ({ generationId }) => {
  // Real-time status updates via Firestore listener
  // Progress indicators
  // Estimated time remaining
};
```

### 3.2 Custom Hooks
```typescript
// src/hooks/useAIGeneration.ts
export const useAIGeneration = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  
  const generateItinerary = async (params: GenerationParams) => {
    // Call Firebase function
    // Handle rate limiting
    // Return generation ID
  };
  
  return { generateItinerary, isGenerating, generationId };
};

// src/hooks/useGenerationStatus.ts
export const useGenerationStatus = (generationId: string | null) => {
  // Real-time listener for generation status
  // Return status, progress, result
};
```

### 3.3 Rate Limiting & Premium Upsell
```typescript
// src/components/GenerationRateLimit.tsx
export const GenerationRateLimit: React.FC = () => {
  const { user } = useAuth();
  const { freeUsed, premiumUsed } = useAIUsage(user?.uid);
  
  return (
    <div>
      {!user?.isPremium && (
        <FreeTierDisplay used={freeUsed} limit={1} />
      )}
      {user?.isPremium && (
        <PremiumTierDisplay used={premiumUsed} limit={20} />
      )}
      <UpgradePrompt show={freeUsed >= 1 && !user?.isPremium} />
    </div>
  );
};
```

## Phase 4: Testing & Optimization (Week 7-8)

### 4.1 Testing Strategy
```typescript
// AI Service Tests
describe('ItineraryGenerationService', () => {
  it('should generate valid itinerary for Paris 3-day trip');
  it('should respect budget constraints');
  it('should handle invalid destinations gracefully');
  it('should optimize routes efficiently');
});

// Frontend Tests
describe('AIItineraryGenerator', () => {
  it('should show rate limit for free users');
  it('should track generation progress');
  it('should handle generation failures');
  it('should collect feedback properly');
});
```

### 4.2 Performance Monitoring
```typescript
// AI Service Monitoring
app.use('/metrics', prometheus.register.metrics());

// Track generation metrics
const generationDuration = new prometheus.Histogram({
  name: 'ai_generation_duration_seconds',
  help: 'Time taken to generate itinerary'
});

const generationErrors = new prometheus.Counter({
  name: 'ai_generation_errors_total',
  help: 'Total number of generation errors'
});
```

## Phase 5: Production Deployment (Week 9-10)

### 5.1 Deployment Configuration
```yaml
# cloudbuild.yaml for AI Service
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/voyager-ai-service', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/voyager-ai-service']
  - name: 'gcr.io/cloud-builders/gcloud'
    args: ['run', 'deploy', 'voyager-ai-service', 
           '--image', 'gcr.io/$PROJECT_ID/voyager-ai-service',
           '--platform', 'managed',
           '--region', 'us-central1',
           '--allow-unauthenticated']
```

### 5.2 Firebase Functions Deployment
```bash
# Deploy new functions
cd functions
npm run deploy

# Update Firestore rules for new collections
firebase deploy --only firestore:rules
```

### 5.3 Frontend Deployment
```bash
# Build and deploy with new AI features
npm run build
firebase deploy --only hosting
```

## Success Metrics

### Technical Metrics
- Generation success rate: >95%
- Average generation time: <60 seconds
- AI service uptime: >99.9%
- Frontend error rate: <1%

### Business Metrics
- Free-to-premium conversion: >10%
- AI feature adoption: >30% of active users
- Generated itinerary rating: >4.0/5
- User retention improvement: >15%

## Risk Mitigation

### Technical Risks
1. **AI Service Downtime**: Circuit breaker pattern, fallback messages
2. **High AI Costs**: Token usage monitoring, caching strategies
3. **Rate Limiting Issues**: Clear user communication, graceful degradation

### Business Risks
1. **Low Adoption**: A/B testing, user feedback integration
2. **High Churn**: Onboarding improvements, value demonstration
3. **Cost Overruns**: Strict usage monitoring, premium pricing adjustments

## Monitoring & Alerts

### AI Service Alerts
- Generation failure rate >5%
- Average response time >90 seconds
- Error rate >2%
- Memory usage >80%

### Business Alerts
- Daily AI generations <100
- Conversion rate <5%
- User complaints >10/day
- Cost per generation >$2

This implementation plan provides a clear roadmap for building the AI itinerary generation feature as an integrated frontend with a separate AI processing service, maintaining the stability of your existing PWA while adding powerful new capabilities.
