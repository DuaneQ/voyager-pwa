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
- **Cloud Functions**: Email, notification, and Stripe integration

### Development Tools
- **Jest**: Unit testing framework
- **React Testing Library**: Component testing
- **Cypress**: E2E and component testing
- **GitHub Actions**: CI/CD pipeline
- **ESLint/Prettier**: Code quality and formatting

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
   - Add your domain to authorized domains

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
│   └── auth/            # Auth-related components (Reset, ResendEmail, TermsGuard)
├── hooks/               # Custom React hooks
│   ├── useUsageTracking.ts   # Usage tracking and premium logic
│   ├── useStripePortal.ts    # Stripe billing portal integration
│   └── ...
├── utils/               # Utility functions
│   └── searchCache.ts   # Intelligent search caching
├── types/               # TypeScript type definitions
├── environments/        # Firebase configuration
└── __tests__/           # Jest and Cypress test files
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

## 🧪 Testing

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
- **Integration Tests**: Real-time database and Stripe interaction testing
- **E2E Tests**: End-to-end testing with Cypress
- **Component Tests**: Isolated component testing with Cypress
- **Mock Services**: Firebase and Stripe services mocked for testing environments

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
| Users | Without Cache | With Cache | Savings |
|-------|---------------|------------|---------|
| 1K    | $1.71        | $1.33      | $0.38   |
| 10K   | $17.30       | $13.52     | $3.78   |
| 100K  | $176.00      | $138.20    | $37.80  |

## 🔐 Security

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
  }
}
```

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
