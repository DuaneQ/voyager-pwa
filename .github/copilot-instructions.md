# Voyager PWA - AI Coding Agent Instructions

## Architecture Overview

This is a **travel matching PWA** built with React 18, TypeScript, Firebase, and Stripe. Key features: swipe-based itinerary matching, AI travel generation (premium), real-time chat, video sharing, and usage tracking with freemium model.

### Core Stack & Service Boundaries
- **Frontend**: React 18 + TypeScript in `src/`, React Router, Material-UI
- **Backend**: Firebase Functions in `functions/src/`, Firestore, Storage, Auth
- **AI Features**: OpenAI GPT-4o-mini integration (premium only) with Google Places/SerpAPI
- **Payments**: Stripe subscriptions with webhook handling
- **Cache**: 5-minute search cache reduces Firebase costs by 70-80% (`src/utils/searchCache.ts`)

## Critical Development Patterns

### 1. Usage Tracking & Premium Logic
**Pattern**: All user interactions go through `useUsageTracking()` hook
```typescript
// Free users: 10 interactions/day, Premium: unlimited
const { hasReachedLimit, trackView, hasPremium } = useUsageTracking();
if (hasReachedLimit()) return; // Block interaction
await trackView(); // Track each like/dislike
```
**Files**: `src/hooks/useUsageTracking.ts`, Firestore `users.dailyUsage`

### 2. AI Generation Architecture (5-Stage Process)
**Pattern**: Multi-stage generation with real-time progress tracking
```typescript
// Stage sequence: preferences → activities → AI → optimization → finalization
const { generateItinerary, progress } = useAIGeneration();
// Progress: { stage: string; percent: number; message?: string }
```
**Key Files**:
- Frontend: `src/hooks/useAIGeneration.ts`, `src/components/modals/AIItineraryGenerationModal.tsx`
- Backend: `functions/src/generateItineraryWithAI.ts`
- Types: `src/types/AIGeneration.ts`

### 3. Firebase Function Calling Pattern
**Pattern**: All functions use `httpsCallable` with `{ data: payload }` wrapper
```typescript
const functions = getFunctions();
const searchFlights = httpsCallable(functions, 'searchFlights');
const result = await searchFlights({ destination: 'Paris', startDate: '2025-08-01' });
```
**Critical**: Functions expect `data` property, return `{ success: boolean, ...result }`

### 4. Search Caching Strategy
**Pattern**: 5-minute cache with localStorage persistence
```typescript
// Auto-caching in search hooks - check cache first, fallback to Firestore
const cacheKey = searchCache.generateCacheKey({ destination, userProfile });
const cached = searchCache.get(cacheKey);
if (cached) return cached; // 70-80% cost reduction
```

### 5. Environment & Config Management
**Pattern**: Dev/prod configs with emulator detection
- **Dev**: `mundo1-dev` project, localhost detection
- **Prod**: `mundo1-1` project
- **Emulators**: Auto-detect by hostname, Cypress always uses dev config
- **Critical**: Hardcoded API keys in functions are intentional (no Firebase env secrets support)

## Essential Workflows

### Development Commands
```bash
# Start with legacy OpenSSL (required for Node compatibility)
npm start  # Includes NODE_OPTIONS=--openssl-legacy-provider

# Firebase Emulators (check firebase.json for ports)
firebase emulators:start --only functions  # Functions: 5001
firebase emulators:start  # Full suite: UI at 4100

# Testing
npm test                    # Jest unit tests
npm run test:coverage      # With coverage reports
npm run cypress:run:e2e    # E2E tests
npm run cypress:run:component  # Component tests

# AI Function Testing (curl example)
curl -X POST "http://localhost:5001/mundo1-dev/us-central1/searchAccommodations" \
  -H "Content-Type: application/json" \
  -d '{"data":{"destination":"Paris","startDate":"2025-08-01","endDate":"2025-08-07"}}'
```

### Build & Deploy
```bash
npm run build  # Includes version injection and build time
# CI/CD via GitHub Actions: .github/workflows/
```

## Project-Specific Conventions

### 1. Component Structure
- **Pages**: `src/components/pages/` - Route components with authentication guards
- **Modals**: `src/components/modals/` - Feature-specific modals (AI generation, etc.)
- **Layout**: `src/components/layout/` - `BottomNavigation`, `Header`
- **Context Providers**: Wrap App.tsx - `UserProfileContext`, `AlertContext`, `NewConnectionContext`

### 2. Data Flow Patterns
```
User Action → Usage Check → Firebase Function → Cache Update → UI Refresh
Search Request → Cache Check → (Cache Miss) → Firestore → Cache Store
AI Generation → Multi-stage Progress → Save to ai_generations → Display
```

### 3. Firebase Collections Schema
- `users`: Profile data, usage tracking, premium status
- `itineraries`: User-created travel plans (searchable by all authenticated users)
- `ai_generations`: Premium AI-generated itineraries (private to user)
- `connections`: User matches with chat messages subcollection
- `feedback`: User feedback with auto-email triggers

### 4. Security & Auth Patterns
- **Route Protection**: All routes use `<Protected>` + `<SimpleTermsGuard>` wrappers
- **Firestore Rules**: Users can only access their own private data
- **Premium Validation**: Server-side verification in Cloud Functions
- **FCM Tokens**: Stored in user profiles, cleaned up on invalid tokens

## Testing Approach

### Key Test Files
- **AI Modal**: `src/__tests__/modals/AIItineraryGenerationModal.test.tsx` (14 comprehensive test cases)
- **Functions**: `functions/src/__tests__/` - Integration tests with mocked services
- **Mocks**: `src/__mocks__/` - Firebase, OpenAI, Stripe service mocks

### Testing Strategy
- **Unit**: Jest + React Testing Library for components/hooks
- **Integration**: Firebase emulator tests for Cloud Functions
- **E2E**: Cypress for full user flows
- **Mocking**: All external APIs (OpenAI, Google Places, Stripe) mocked in tests

## Integration Points

### External Dependencies
- **OpenAI**: GPT-4o-mini for itinerary generation (functions only)
- **Google Places**: Location search and place details
- **SerpAPI**: Flight search data
- **Stripe**: Payment processing with webhook validation
- **Firebase Cloud Messaging**: Push notifications (Safari limitations handled)

### Cross-Component Communication
- **User State**: Shared via `UserProfileContext` with localStorage persistence
- **Real-time Updates**: Firestore listeners for chat messages, connection updates
- **Progress Tracking**: AI generation uses progress callbacks from hooks to modals
- **Error Handling**: Global `AlertContext` for user-facing error messages

## Performance Considerations

- **Bundle Splitting**: Lazy loading with `Suspense` for route components
- **PWA Optimization**: Service worker caching, offline support
- **Search Cache**: 5-minute TTL reduces Firebase read operations significantly
- **Image Optimization**: Firebase Storage integration with CDN caching
- **Rate Limiting**: AI generation limited to 10/hour for premium users

## Debugging & Troubleshooting

### Common Issues
1. **OpenSSL Legacy**: Always use `NODE_OPTIONS=--openssl-legacy-provider` for builds
2. **Safari CORS**: Firestore persistence disabled in dev mode for Safari
3. **Emulator Ports**: Check `firebase.json` - UI at 4100, Functions at 5001
4. **FCM Tokens**: iOS/Safari have limited support, tokens auto-cleaned on errors
5. **AI Generation**: Check both client and server logs, functions have extensive logging

### Debug Utilities
- **Simple Browser**: Use built-in VS Code browser to preview localhost:4100 (emulator UI)
- **Firestore Debug**: `src/debug/testFirestore.ts` imported in App.tsx
- **Cache Stats**: `searchCache.getStats()` for performance monitoring
- **Planning Mode**: See README.md for structured development workflow with agents

This codebase follows a **freemium model** with sophisticated usage tracking, premium AI features, and performance optimizations. Focus on preserving the usage tracking flows and Firebase integration patterns when making changes.