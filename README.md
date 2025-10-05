# Voyager PWA - Travel Matching Platform

A Progressive Web App (PWA) that connects travelers with similar interests, destinations, and travel styles. Built with React, TypeScript, and Firebase.

## 🚀 Features

### Core Functionality
- **Travel Matching**: Swipe-based interface to like/pass on travel itineraries
- **Smart Search**: Search for travel companions by destination, dates, and preferences
- **Real-time Chat**: In-app messaging system for matched travelers
- **User Profiles**: Detailed profiles with travel preferences and history
- **Itinerary Creation**: Create and share detailed travel plans
- **Premium Subscriptions**: Stripe-powered payments and usage tracking
- **Usage Tracking**: Daily interaction limits and premium unlocks
- **Bottom Navigation**: Mobile-friendly persistent navigation bar

### 🤖 AI-Powered Features (NEW)
- **AI Itinerary Generation**: Premium users can generate personalized itineraries using OpenAI
- **Smart Travel Preferences**: AI learns from user behavior and preferences
- **Cost Estimation**: Instant trip cost estimates for any destination
- **Intelligent Recommendations**: AI-powered activity and accommodation suggestions
- **Multi-stage Generation**: 5-stage process with real-time progress tracking
- **Behavioral Analysis**: AI analyzes past trips to improve future recommendations

### 📺 Video Integration
- **Video Sharing**: Share travel videos through secure Firebase storage
- **Video Upload**: Direct video upload with progress tracking
- **Optimized Playback**: Efficient video streaming and caching
- **Privacy Controls**: Secure video sharing with access controls

### Performance Features
- **Intelligent Caching**: 5-minute search cache reduces Firebase costs by 70-80%
- **Offline Support**: PWA capabilities for offline browsing
- **Progressive Loading**: Pagination and lazy loading for optimal performance
- **Real-time Updates**: Live notifications for new matches and messages

### Upcoming Features
- **Advanced Filters**: Enhanced search capabilities for premium users
- **Push Notifications**: Real-time alerts for matches and messages
- **Travel Groups**: Multi-traveler itinerary matching
- **Itinerary Sharing**: Social features for travel planning
- **Review System**: Post-trip reviews and ratings
- **AI Teasers**: Free users get preview of AI capabilities
- **Live Itinerary Updates**: Real-time optimization of generated itineraries

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Firebase** (Firestore, Auth, Cloud Messaging)
- **Stripe** (Billing portal, premium subscriptions)
- **PWA** capabilities with service workers
- **Responsive Design** for mobile and desktop

### Backend Services
- **Firebase Firestore**: Real-time database
- **Firebase Authentication**: Google OAuth integration
- **Firebase Cloud Messaging**: Push notifications
- **Firebase Hosting**: Static site hosting
- **Firebase Storage**: Video and media file storage
- **Cloud Functions**: Email, notification, and Stripe integration
- **OpenAI Integration**: AI itinerary generation with GPT-4o-mini
- **Google Places API**: Location data and activity discovery

### Development Tools
- **Jest**: Unit testing framework
- **React Testing Library**: Component testing
- **Cypress**: E2E and component testing
- **GitHub Actions**: CI/CD pipeline
- **ESLint/Prettier**: Code quality and formatting

## 🧰 Developer Tools & Agentic Workflows

### Simple Browser (preview local pages / emulators)

You can preview locally-hosted pages or emulator UIs directly inside Visual Studio Code using the built-in Simple Browser. This is especially handy for verifying the Firebase Emulator UI or a local dev server without leaving the editor.

- Open Simple Browser from the command palette or run the `open_simple_browser` helper in the editor.
- Example URLs to preview:
  - Firebase Emulator UI: `http://localhost:4000` (default - check your emulator output for the actual port)
  - Functions emulator HTTP endpoint: `http://localhost:5001/<PROJECT_ID>/us-central1/<FUNCTION_NAME>`
  - Local web app (React dev server): `http://localhost:3000`

Usage notes:
- The Simple Browser is read-only for many developer tasks; use it for quick previews, not full-featured debugging.
- If a page requires auth or special headers (for example callable functions), use a normal browser or Postman for full request control.

### Planning Mode — Agentic Development Workflow

Planning Mode helps you work with an agent (local or remote) to drive development tasks in small, verifiable steps. Use this lightweight process when pairing with an automated assistant or when you want to keep changes traceable and safe.

1. Create a short task statement describing the goal and acceptance criteria.
2. Break the goal into a small checklist of concrete steps (3–6 items). Keep one item "in-progress" at a time.
3. For each step:
   - Make minimal, well-scoped edits.
   - Run quick validation (lint, build, or run a focused unit test).
   - Commit the change with a descriptive message.
4. After completing the checklist, run a smoke test (start the dev server or emulator) and validate end-to-end behaviour.
5. If anything fails, revert the last change or open a targeted follow-up task to fix it.

Best practices:
- Prefer small, reversible changes. Keep pull requests focused on a single intent.
- Use environment variables or secrets for API keys; never commit long-lived credentials.
- Add a short note in the PR description about which steps from the checklist were executed and the verification commands that were run.

When pairing with an automated agent:
- Share the current task checklist and allow the agent to operate one step at a time.
- Require the agent to run tests or run the emulator for any change that touches runtime behaviour.
- Ask the agent to summarize changes and next steps after every 3–5 edits.

These practices keep development predictable, auditable, and safe while enabling fast, iterative progress.

#### Step-by-step: Using Planning Mode (practical)

Follow this concise workflow when pairing with an agent or working alone using the Planning Mode guidance above.

1. Create a short task card (one-paragraph) with acceptance criteria. Example:

  "Fix `searchAccommodations` emulator test: ensure Google Places key is read from env and emulator returns mapped hotels. Acceptance: callable function returns success:true and >0 hotels for Cancun test."

2. Break the task into a checklist of small steps (3–6 items). Example checklist:

  - [ ] Add environment config fallback in `functions/src/searchAccommodations.ts`
  - [ ] Update local `.env` or functions config with a valid Places API key
  - [ ] Restart Firebase emulator and run a sample POST via curl/Postman
  - [ ] Confirm logs and response shape; update mapping if required
  - [ ] Commit & push with descriptive message and attach logs

3. Mark the first checklist item as "in-progress" and perform the change. Keep commits atomic.

4. Run quick validation for that step (lint or targeted test). Example commands:

  ```bash
  # Start functions emulator only
  npx firebase emulators:start --only functions

  # Test callable function via curl (emulator)
  curl -s -X POST \
    -H "Content-Type: application/json" \
    -d '{"data":{"destination":"Cancún, Mexico","startDate":"2025-11-10","endDate":"2025-11-15"}}' \
    "http://localhost:5001/<PROJECT_ID>/us-central1/searchAccommodations" | jq
  ```

5. If validation passes, mark the item completed and move to the next item. If it fails, capture logs and create a sub-task with the failing step and error output.

6. After all checklist items are completed, run a smoke test: start the full dev server and emulator(s) and exercise the end-to-end flow described in the acceptance criteria.

7. Prepare a short PR description listing:
  - The task statement and acceptance criteria
  - The executed checklist and verification commands
  - Any remaining TODOs or follow-ups

Templates
- Quick checklist template (copy into PR body):

  Task: <one-line task statement>
  Acceptance: <pass/fail criteria>

  Checklist:
  - [ ] Step 1: <short description>
  - [ ] Step 2: <short description>
  - [ ] Step 3: <short description>

  Validation commands used:
  - `npx firebase emulators:start --only functions`
  - `curl ...` (see above)

This step-by-step section gives contributors a reproducible pattern for safely working with agents and for maintaining clear audit trails for changes.
## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Firebase account

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/voyager-pwa.git
   cd voyager-pwa
   ```

2. **Install dependencies**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```properties
   # Environment
   REACT_APP_ENV=development
   SKIP_PREFLIGHT_CHECK=true

   # Google Services
   REACT_APP_GOOGLE_PLACES_API_KEY=your_google_places_api_key

   # OpenAI Configuration (for Firebase Functions)
   OPENAI_API_KEY=your_openai_api_key
   
   # Google Maps (optional, for enhanced location data)
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key

   # Firebase Configuration
   REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=your-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   REACT_APP_FIREBASE_APP_ID=your_app_id
   REACT_APP_FIREBASE_MEASUREMENT_ID=your_measurement_id

   # Firebase Cloud Messaging
   REACT_APP_VAPID_KEY=your_vapid_key

   # App Configuration
   REACT_APP_VERSION=1.0.0-beta
   ```

4. **Firebase Setup**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication (Google provider)
   - Enable Firestore Database
   - Enable Cloud Messaging
   - Enable Cloud Storage for video uploads
   - Add your domain to authorized domains
   - Set up Firebase Functions environment variables:
     ```bash
     firebase functions:config:set openai.api_key="your-openai-api-key"
     firebase functions:config:set google.maps_api_key="your-google-maps-api-key"
     ```

5. **Start Development Server**
   ```bash
   npm start
   ```

## 🔧 Architecture

### Key Components
```
src/
├── components/           # React components
│   ├── pages/           # Page components
│   ├── forms/           # Form components (SignInForm, SignUpForm, etc.)
│   ├── layout/          # Layout components (BottomNavigation, etc.)
│   ├── modals/          # Modal components
│   │   └── AIItineraryGenerationModal.tsx  # AI generation interface
│   └── auth/            # Auth-related components (Reset, ResendEmail, TermsGuard)
├── hooks/               # Custom React hooks
│   ├── useUsageTracking.ts   # Usage tracking and premium logic
│   ├── useStripePortal.ts    # Stripe billing portal integration
│   ├── useAIGeneration.ts    # AI itinerary generation hook
│   ├── useTravelPreferences.ts  # Travel preference management
│   └── ...
├── utils/               # Utility functions
│   └── searchCache.ts   # Intelligent search caching
├── types/               # TypeScript type definitions
│   └── AIGeneration.ts  # AI generation types and constants
├── environments/        # Firebase configuration
└── __tests__/           # Jest and Cypress test files
    └── modals/          # Modal component tests
        └── AIItineraryGenerationModal.test.tsx  # AI modal tests
```

### Data Flow
1. **User Search** → Check cache → Firebase (if cache miss) → Update cache
2. **User Interaction** → Track usage (with `useUsageTracking`) → Update user profile
3. **Premium Subscription** → Stripe payment → Unlock unlimited usage
4. **Matching Logic** → Real-time updates → Push notifications
5. **Navigation** → BottomNavigation component for mobile UX

### Cloud Functions
- **notifyNewConnection**: Email notification on new connection
- **sendNewMessageNotification**: FCM push on new message
- **notifyFeedbackSubmission**: Email on feedback
- **notifyViolationReport**: Admin alert on violation
- **createStripePortalSession**: Stripe billing portal for premium users
- **stripeWebhook**: Stripe event handling (subscription, payment)
- **videoShare**: Secure video sharing with access controls

#### 🤖 AI Functions (NEW)
- **generateItinerary**: Complete AI itinerary generation for premium users
- **estimateItineraryCost**: Quick cost estimation for any user
- **getGenerationStatus**: Check status of ongoing AI generation

## � AI Itinerary Generation

### How It Works
The AI system generates personalized travel itineraries using a sophisticated 5-stage process:

1. **Preference Analysis** (20%) - Analyzes user travel preferences and past behavior
2. **Destination Research** (40%) - Gathers location data, activities, and weather information
3. **AI Generation** (60%) - Creates personalized itinerary using OpenAI GPT-4o-mini
4. **Optimization** (80%) - Fine-tunes timing, routes, and logistics
5. **Finalization** (100%) - Adds costs, booking info, and saves to database

### Features
- **Premium Only**: Full AI generation requires premium subscription
- **Cost Estimation**: Free users can get cost estimates
- **Smart Preferences**: AI learns from user behavior patterns
- **Real-time Progress**: Live updates during the generation process
- **Detailed Itineraries**: Complete day-by-day plans with activities, meals, and transportation
- **Rate Limiting**: 10 generations per hour for premium users

### Usage
```javascript
import { useAIGeneration } from '../hooks/useAIGeneration';

const { generateItinerary, isGenerating, progress, result } = useAIGeneration();

await generateItinerary({
  destination: "Paris, France",
  startDate: "2025-08-01",
  endDate: "2025-08-07",
  budget: { total: 2000, currency: "USD" },
  groupSize: 2,
  tripType: "leisure",
  preferenceProfileId: "profile-1"
});
```

### Backend Architecture
```
functions/src/
├── api/ai/
│   └── generateItinerary.ts     # Main API endpoints
├── services/
│   ├── aiItineraryService.ts    # Core generation logic
│   └── promptEngineering.ts     # AI prompt optimization
├── integrations/
│   ├── openaiClient.ts          # OpenAI API integration
│   └── googlePlacesService.ts   # Location data service
├── middleware/
│   └── premiumAuth.ts           # Authentication & rate limiting
└── types/
    └── aiItinerary.ts           # TypeScript definitions
```

> 📊 **Detailed Architecture**: See [AI_ARCHITECTURE_DIAGRAM.md](AI_ARCHITECTURE_DIAGRAM.md) for comprehensive system diagrams including data flow, sequence diagrams, and database relationships.

## 📺 Video Integration

### Features
- **Secure Upload**: Direct video upload to Firebase Storage
- **Access Controls**: Privacy settings for video sharing
- **Optimized Streaming**: Efficient video playback with caching
- **Progress Tracking**: Real-time upload progress indication

### Implementation
- **Firebase Storage**: Secure video file storage
- **Cloud Functions**: Video processing and access control
- **React Components**: Video player with custom controls
- **Security Rules**: Firestore-based access permissions

## �🧪 Testing

### Run Tests
```bash
# Run Jest unit tests
npm test

# Run Jest tests with coverage
npm run test:coverage

# Run Jest tests in CI mode
npm run test:ci

# Run Cypress E2E tests
npm run cypress:run:e2e

# Run Cypress component tests
npm run cypress:run:component

# Open Cypress interactive test runner
npm run cypress:open
```

### Test Structure
- **Unit Tests**: Individual component and hook testing with Jest (see `src/__tests__`)
- **AI Modal Tests**: Comprehensive testing of AI generation interface (14 test cases)
- **Integration Tests**: Real-time database and Stripe interaction testing
- **E2E Tests**: End-to-end testing with Cypress
- **Component Tests**: Isolated component testing with Cypress
- **Mock Services**: Firebase, OpenAI, and Stripe services mocked for testing environments

### Cypress Testing
```bash
# Run Cypress tests interactively
npx cypress open

# Run Cypress tests in CI mode
npx cypress run

# Run specific test file
npx cypress run --spec "cypress/e2e/profile_login.cy.ts"
```

**Note**: Cypress tests use mocked Firebase services and environment variables to avoid external dependencies during testing.

## 📊 Performance & Costs

### Search Cache Performance
- **Cache Duration**: 5 minutes
- **Cache Size**: 50 stored searches
- **Cost Reduction**: 70-80% Firebase read operations
- **Performance**: <50ms cached responses vs 500ms+ network requests

### Firebase Cost Estimates (Monthly)
| Users | Without Cache | With Cache | AI Features | Total Savings |
|-------|---------------|------------|-------------|---------------|
| 1K    | $1.71        | $1.33      | +$15.00     | $0.38         |
| 10K   | $17.30       | $13.52     | +$150.00    | $3.78         |
| 100K  | $176.00      | $138.20    | +$1500.00   | $37.80        |

*AI feature costs include OpenAI API usage at $0.15 per generation*

## � API Reference

### AI Generation Functions

#### `generateItinerary`
**Type**: Firebase Callable Function  
**Access**: Premium users only  
**Rate Limit**: 10 requests/hour  

```javascript
const result = await generateItinerary({
  destination: "Paris, France",
  startDate: "2025-08-01", 
  endDate: "2025-08-07",
  budget: { total: 2000, currency: "USD" },
  groupSize: 2,
  tripType: "leisure",
  preferenceProfileId: "profile-1", // optional
  mustInclude: ["Eiffel Tower"], // optional
  mustAvoid: ["Crowded areas"] // optional
});
```

#### `estimateItineraryCost`
**Type**: Firebase Callable Function  
**Access**: All authenticated users  
**Rate Limit**: More lenient than full generation  

```javascript
const estimate = await estimateItineraryCost({
  destination: "Paris, France",
  startDate: "2025-08-01",
  endDate: "2025-08-07", 
  groupSize: 2,
  tripType: "leisure"
});
// Returns: { success: true, estimatedCost: 1800, currency: "USD" }
```

#### `getGenerationStatus`
**Type**: Firebase Callable Function  
**Access**: Authenticated users (own generations only)  

```javascript
const status = await getGenerationStatus({
  generationId: "gen_1234567890_abcdefgh"
});
// Returns: { id, status, createdAt, response?, error? }
```

### Video Functions

#### `videoShare`
**Type**: Firebase Callable Function  
**Access**: Authenticated users  

```javascript
const shareUrl = await videoShare({
  videoId: "video123",
  recipientId: "user456"
});
```

## �🔐 Security

### Firebase Security Rules
```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Itineraries are readable by all authenticated users
    match /itineraries/{itineraryId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // AI-generated itineraries are stored in `/itineraries` and are readable by authenticated users.
    // Writes are allowed by the owner or service account (functions) according to server-side rules.
    match /itineraries/{itineraryId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null && (request.auth.uid == request.resource.data.userId || request.auth.token.admin == true);
    }
    
    // User preferences are private
    match /user_preferences/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### AI Security Measures
- **Premium Validation**: AI generation requires active premium subscription
- **Rate Limiting**: Prevents abuse with intelligent request limits
- **Input Sanitization**: All user inputs are validated and sanitized
- **Error Masking**: Sensitive error details hidden in production
- **Usage Analytics**: Monitoring for unusual patterns and abuse
- **Cost Controls**: Built-in safeguards against runaway AI costs

### Authentication
- **Google OAuth**: Secure authentication via Firebase Auth
- **Protected Routes**: Authentication required for all features
- **User Profiles**: Secure user data management

## 📱 PWA Features

### Service Worker
- **Offline Support**: Cache critical resources
- **Push Notifications**: Background message handling
- **App-like Experience**: Install prompt and app icons

### Performance Optimizations
- **Code Splitting**: Lazy loading of components
- **Image Optimization**: Responsive images and lazy loading
- **Bundle Optimization**: Tree shaking and minification

## 🔮 Upcoming Features

### Premium Subscriptions
- **Free Tier**: 10 interactions per day
- **Premium Tier**: Unlimited interactions
- **Stripe Integration**: Secure payment processing
- **Usage Tracking**: Real-time usage monitoring

### Enhanced Features
- **Advanced Search**: Filters by interests, budget, travel style
- **Travel Groups**: Multi-traveler itinerary matching
- **Itinerary Sharing**: Social features for travel planning
- **Review System**: Post-trip reviews and ratings

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests and ensure they pass
6. Submit a pull request

### Code Standards
- **TypeScript**: Strong typing for all components
- **ESLint**: Enforced code quality standards
- **Testing**: Minimum 80% test coverage
- **Documentation**: Clear comments and README updates

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For questions or support:
- **Email**: support@travalpass.com
- **GitHub Issues**: [Project Issues](https://github.com/yourusername/voyager-pwa/issues)


---
# Voyager PWA - Travel Matching Platform

[![codecov](https://codecov.io/gh/DuaneQ/voyager-pwa/branch/main/graph/badge.svg)](https://codecov.io/gh/DuaneQ/voyager-pwa)
[![Build Status](https://github.com/DuaneQ/voyager-pwa/actions/workflows/firebase-hosting-merge.yml/badge.svg)](https://github.com/DuaneQ/voyager-pwa/actions/workflows/firebase-hosting-merge.yml)
[![Preview Build Status](https://github.com/DuaneQ/voyager-pwa/actions/workflows/firebase-hosting-pull-request.yml/badge.svg)](https://github.com/DuaneQ/voyager-pwa/actions/workflows/firebase-hosting-pull-request.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=flat&logo=Firebase&logoColor=white)](https://firebase.google.com/)


**Built with ❤️ for travelers by travelers**

Hi Fellow Travelers,
I hope this message finds you well! I wanted to personally reach out and share something close to my heart: TravalPass.com was created after my own journey of rediscovery. When I found myself without a travel companion, I realized how many others love to travel but don’t always have someone to share the adventure with. That inspired me to build a platform where solo travelers, couples, and groups can connect with like-minded people heading to the same destinations.
If you think TravalPass.com could help your community, I’d love for you and your members to try it out at TravalPass.com.  TravalPass.info is an information site that explains TravalPass in detail. There’s a feedback button right in the app—early feedback from your group would be invaluable in shaping TravalPass.com to better serve real travelers like you.
Thank you for all you do to bring travelers together!
