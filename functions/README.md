# TravalPass React Native (Expo)

A React Native Expo replica of the **voyager-pwa** project with improved architecture following S.O.L.I.D principles. This mobile app maintains exact same functionality as the PWA while implementing better code organization, reusability, and maintainability.

## 🚀 Current Status: Ads Phase 2 Branch (`ads-phase2`)

**Branch:** `ads-phase2` | **Version:** 1.8.0 | **Build:** 37

### What's New (Mar 2026)
- ✅ **Full Ad System**: 10 Cloud Functions deployed to production — selectAds, logAdEvents, reviewCampaign, getPendingCampaigns, processAdVideoWithMux, and more
- ✅ **Video Feed Ads**: SponsoredVideoCard with IAB-compliant 1-second viewability, quartile tracking, click throttling
- ✅ **AI Slot Ads**: PromotionCard with impression tracking in AI-generated itineraries
- ✅ **Interstitial Ads**: Pacing and queue mechanics for zero-results and swipe-triggered display
- ✅ **Ad Tracking Pipeline**: Batched event system (impressions, clicks, quartiles) with session dedup
- ✅ **Budget & Billing**: CPM ($5/1000 impressions) and CPC ($0.50/click) with atomic Firestore transactions
- ✅ **All Tests Passing**: TypeScript clean, 2464 unit tests, 419 function tests

---

## ✅ Recent Simplification: Firebase Web SDK Authentication (Jan 2025)

**Architecture Change:** Migrated from REST API + custom tokens to Firebase Web SDK

**Benefits:**
- Direct Firebase Web SDK integration (v12.5.0 works with RN 0.81.5)
- Eliminated 765+ lines of complex REST API code
- Removed custom token generation dependency
- Authentication flow now matches PWA exactly
- Profile loading properly separated from sign-in flow

**Documentation:** See [docs/auth/SIMPLE_AUTH_FLOW.md](docs/auth/SIMPLE_AUTH_FLOW.md) for migration details

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (you can use the global CLI or the local binary: `npm install -g expo-cli` or use `npx expo start`)
- Xcode (for iOS simulator) — install from the Mac App Store
- Android Studio / Android Emulator (for Android development)
- For Firebase Auth persistence on React Native install `@react-native-async-storage/async-storage` (recommended)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <repository-url>
cd voyager-RN
npm install
```

2. **Verify Firebase connection:**
```bash
node test-database.js
```

3. **Start development server:**
```bash
npm start
# or
expo start
```

4. **Run on specific platforms:**
```bash
# Start Expo dev server
npm start

# Launch directly (builds and runs)
npm run start:ios       # iOS simulator
npm run start:android   # Android emulator
npm run start:web       # Web browser
```

## 📚 Complete Scripts Documentation

For comprehensive guide to all available scripts including testing, CI/CD, and troubleshooting:

**See: [docs/SCRIPTS_GUIDE.md](docs/SCRIPTS_GUIDE.md)**

Quick command reference:
```bash
# Development
npm start                    # Start dev server
npm run start:ios            # Launch iOS

# Unit Tests
npm test                     # Run once
npm run test:watch           # Watch mode

# E2E Tests
npm run e2e:ios              # iOS (headed)
npm run e2e:android          # Android (headed)
npm run e2e:all:headless     # Both platforms (CI/CD)
npm run e2e:all:headless:3x  # Stability validation
```

## 🚀 Cloud Functions Deployment

When deploying Firebase Cloud Functions, use the pinned `firebase-tools` version from package.json to avoid supply-chain attacks:

```bash
# Deploy specific function to dev
cd /path/to/voyager-pwa
npx firebase-tools@14.25.1 deploy --only functions:generateFullItinerary --project mundo1-dev

# Deploy multiple functions
npx firebase-tools@14.25.1 deploy --only functions:generateFullItinerary,functions:verifyPlaces --project mundo1-dev

# Deploy all functions
npx firebase-tools@14.25.1 deploy --only functions --project mundo1-dev
```

**Security Note:** Always use a pinned version (not `@latest`) to prevent supply-chain attacks. Update the version in both `package.json` and this README when upgrading.

**Note:** If you encounter "Error generating the service identity for pubsub/eventarc", run:
```bash
gcloud beta services identity create --service=pubsub.googleapis.com --project=mundo1-dev
gcloud beta services identity create --service=eventarc.googleapis.com --project=mundo1-dev
```

### Development Environment Setup

1. **iOS Development:**
   - Install Xcode from the App Store
   - Open Xcode once and accept the license prompts
   - Open the Simulator app (Xcode → Open Developer Tool → Simulator) and boot a device (or use `open -a Simulator`)
   - To run the app from your project root:
     ```bash
     npm run ios
     # or
     npx expo start --ios
     ```
   
   > **⚠️ Note:** After adding native modules (e.g., `expo-contacts`, contact invite functionality), use `npx expo run:ios` instead of `npx expo start`. This compiles native code directly to the simulator and is required when native dependencies change:
   > ```bash
   > npx expo run:ios
   > 
   > # If you need to clear the Metro cache:
   > npx expo run:ios --clear
   > 
   > # If you need a full rebuild:
   > npx expo run:ios --no-build-cache
   > ```
   
   **Testing Release Builds on Simulator (iPhone 17 Pro):**
   ```bash
   # Shutdown all simulators first
   xcrun simctl shutdown all
   
   # Boot iPhone 17 Pro simulator
   xcrun simctl boot "iPhone 17 Pro"
   open -a Simulator
   
   # Build release configuration
   cd ios
   xcodebuild -workspace TravalPass.xcworkspace \
     -scheme TravalPass \
     -configuration Release \
     -sdk iphonesimulator \
     -destination 'name=iPhone 17 Pro' \
     -derivedDataPath ./build
   
   # Install and launch
   SIMULATOR_ID=$(xcrun simctl list devices | grep "iPhone 17 Pro" | grep "Booted" | grep -oE '\([A-F0-9-]+\)' | tr -d '()')
   xcrun simctl install $SIMULATOR_ID ./build/Build/Products/Release-iphonesimulator/TravalPass.app
   xcrun simctl launch $SIMULATOR_ID com.travalpass.app
   cd ..
   ```
   
   **Why xcodebuild instead of `npx expo run:ios --configuration Release`?**  
   Expo detects physical iOS devices even when simulators are booted, causing "No code signing certificates" errors. Using xcodebuild directly targets the simulator explicitly.

2. **Android Development:**
    - Install Android Studio and open SDK Manager
    - Ensure you have installed at least one SDK Platform (API 33+) and the following SDK Tools: Android SDK Platform-Tools, Android Emulator, Command-line Tools
    - Create an Android Virtual Device (AVD) in Device Manager (Tools → Device Manager)
    - Add the following to your `~/.zshrc` (adjust if your SDK path differs):
       ```bash
       export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
       export PATH="$PATH:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin"
       ```
    - Reload your shell and verify:
       ```bash
       source ~/.zshrc
       adb --version
       emulator -list-avds
       ```
    - Boot an AVD from Android Studio Device Manager or run:
       ```bash
       emulator -avd <AVD_NAME>
       npm run android
       ```

3. **Physical Device Testing:**
   - Install Expo Go app on your device
   - Scan QR code from `expo start` command

## 🏗️ Architecture Overview

This project improves upon the original PWA architecture by implementing clean code principles and better separation of concerns.

### Directory Structure

```
src/
├── components/              # Pure UI components (Single Responsibility)
│   ├── common/             # Reusable UI components
│   ├── auth/               # Authentication-specific components
│   ├── chat/               # Chat-related components  
│   ├── profile/            # Profile-specific components

## Troubleshooting: "No Android connected device found" error

If you see an error like:

```
CommandError: No Android connected device found, and no emulators could be started automatically.
Please connect a device or create an emulator (https://docs.expo.dev/workflow/android-studio-emulator).
Then follow the instructions here to enable USB debugging:
https://developer.android.com/studio/run/device.html#developer-device-options. If you are using Genymotion go to Settings -> ADB, select "Use custom Android SDK tools", and point it at your Android SDK directory.
```

Follow these steps to resolve it (macOS / zsh):

1. Verify Android SDK and platform-tools are installed and on your PATH

    - Confirm SDK location (default on macOS):

       ```bash
       ls "$HOME/Library/Android/sdk"
       ```

    - Add these to your `~/.zshrc` (adjust if SDK path differs):

       ```bash
       export ANDROID_SDK_ROOT="$HOME/Library/Android/sdk"
       export PATH="$PATH:$ANDROID_SDK_ROOT/platform-tools:$ANDROID_SDK_ROOT/emulator:$ANDROID_SDK_ROOT/cmdline-tools/latest/bin"
       ```

    - Reload your shell:

       ```bash
       source ~/.zshrc
       ```

    - Verify `adb` and emulator are available:

       ```bash
       adb --version
       emulator -list-avds
       ```

2. Create or start an Android Virtual Device (AVD)

    - Open Android Studio → Device Manager → Create Virtual Device (choose a phone and API level).
    - After creating an AVD you can start it from Device Manager or via CLI:

       ```bash
       emulator -avd <AVD_NAME>
       ```

    - Once started, you can run the app with Expo (this will attempt to open the emulator if needed):

       ```bash
       npm run android
       # or via expo directly
       npx expo start --android
       ```

3. Using a physical Android device (enable USB debugging)

    - On the Android device: Settings → About phone → tap "Build number" 7 times to enable Developer options.
    - Settings → System → Developer options → enable "USB debugging".
    - Connect the device via USB, then on macOS run:

       ```bash
       adb devices
       ```

       You should see your device listed. If it says "unauthorized", accept the debug prompt on the phone.

4. Genymotion users

    - Genymotion uses its own virtual devices. To make Genymotion work with `adb`:
       - Open Genymotion → Settings → ADB
       - Select "Use custom Android SDK tools" and point to your Android SDK folder (e.g. `$HOME/Library/Android/sdk`).
       - Restart Genymotion and run your Genymotion VM. Run `adb devices` to confirm it's visible.

5. Common troubleshooting commands

    ```bash
    # Restart adb server
    adb kill-server && adb start-server

    # List connected devices
    adb devices -l

    # Show running emulators
    emulator -list-avds

    # Start a specific AVD by name
    emulator -avd <AVD_NAME>
    ```

6. Additional tips

    - Ensure virtualization is enabled in BIOS/firmware. On macOS use Hypervisor.framework or Intel HAXM (older machines).
    - If Expo still cannot launch an emulator automatically, start the AVD yourself first and then run `npm run android` or `npx expo start --android`.
    - Accept Android SDK licenses via:

       ```bash
       yes | sdkmanager --licenses
       ```

    - If you installed Android Studio after opening a terminal, restart the terminal so PATH updates take effect.

If you still have issues, paste the full error output here and I'll help debug the specific failure.

│   └── search/             # Search-related components
├── pages/                  # Page components (composition only)
│   ├── AuthPage.tsx        # Single orchestrator for authentication
│   ├── MainPages/          # Primary app pages
│   └── index.ts            # Page exports
├── services/               # Business logic & external APIs
│   ├── auth/               # Authentication services
│   ├── chat/               # Chat-related services
│   ├── firebase/           # Firebase service abstractions
│   ├── search/             # Search & matching services
│   └── storage/            # Local storage services
├── repositories/           # Data access layer (Repository Pattern)
│   ├── UserRepository.ts   # User data operations
│   ├── ChatRepository.ts   # Chat data operations
│   └── ItineraryRepository.ts # Itinerary data operations
├── models/                 # Domain models & interfaces
│   ├── User.ts            # User domain model
│   ├── Chat.ts            # Chat domain model
│   ├── Itinerary.ts       # Itinerary domain model
│   └── common/            # Shared types
├── hooks/                  # Custom React hooks
│   ├── auth/              # Authentication hooks
│   ├── chat/              # Chat hooks
│   └── search/            # Search hooks
├── context/                # React Context providers
├── navigation/             # React Navigation setup
├── utils/                  # Pure utility functions
├── constants/              # App constants
└── config/                 # Environment & Firebase config
```

### Key Architecture Principles

#### S.O.L.I.D Principles Implementation

1. **Single Responsibility Principle**
   - Screens only handle UI composition and navigation
   - Services handle specific business logic
   - Repositories handle data persistence
   - Components focus solely on UI rendering

2. **Open/Closed Principle**
   - Service interfaces allow extension without modification
   - Repository pattern enables new data sources
   - Component composition over inheritance

3. **Liskov Substitution Principle**
   - All service implementations are interchangeable
   - Repository implementations use consistent interfaces

4. **Interface Segregation Principle**
   - Small, focused interfaces over large ones
   - Separate models for different concerns

5. **Dependency Inversion Principle**
   - Screens depend on service abstractions
   - Services depend on repository interfaces
   - No direct external dependencies in UI layer

## 🔧 Development Workflow

### Running the App

```bash
# Start development server with full options
expo start

# Quick platform starts
npm run ios        # Start iOS simulator
npm run android    # Start Android emulator
npm run web        # Start web browser
```

### Production Deployment (EAS Build)

**Prerequisites:**
1. Increment version numbers in `app.json` and `package.json`
   - `version`: e.g., 1.7.0 → 1.7.1
   - iOS `buildNumber`: e.g., 26 → 27
   - Android `versionCode`: e.g., 18 → 19
2. Commit and push all changes to git

**Deploy to iOS App Store (auto-submit):**
```bash
eas build --platform ios --profile production --auto-submit
```

**Deploy to Google Play Store (auto-submit):**
```bash
eas build --platform android --profile production --auto-submit
```

**Deploy to Both Stores:**
```bash
eas build --platform all --profile production --auto-submit
```

**Manual submission (build only, no auto-submit):**
```bash
# iOS only
eas build --platform ios --profile production

# Android only
eas build --platform android --profile production
```

**⚠️ Important:** Each successful EAS build counts against your quota. Always test locally in Release mode before building:
```bash
# iOS Release mode test
npx expo run:ios --configuration Release

# Android Release mode test
npx expo run:android --variant release
```

### Database Testing

```bash
# Verify Firebase connectivity
node test-database.js

# Simple connection test
node simple-test.js
```

### Code Quality

```bash
# TypeScript type checking
npx tsc --noEmit

# Linting (when configured)
npx eslint src/

# Format code (when configured)
npx prettier --write src/
```

## 📱 Features

This React Native app replicates all voyager-pwa functionality:

### Core Features
- **User Authentication** - Firebase Auth with email/password and Google Sign-In
- **Travel Matching** - Swipe-based itinerary matching system
- **Real-time Chat** - Messaging between matched travelers
- **Video Feed** - TikTok-style travel video sharing
- **Profile Management** - User profiles with photos and preferences
- **Search & Filters** - Advanced itinerary search with filters

### Technical Features
- **Cross-platform** - iOS, Android, and Web support
- **Offline Support** - AsyncStorage for local data caching
- **Real-time Updates** - Firebase real-time database integration
- **Push Notifications** - ✅ **Working** - Expo push notification system with FCM/APNs ([see docs](docs/push-notifications/))
  - New match notifications
  - Chat message notifications
  - Video comment notifications
  - iOS/Android support (Web excluded)
  - Critical iOS token refresh bug fixed (Feb 15, 2026)
- **Deep Linking** - Custom URL scheme support

## � Push Notifications

**Status**: ✅ **Fully Working** (as of February 15, 2026)

### Overview
TravalPass uses `expo-notifications` with Firebase Cloud Messaging (FCM) for cross-platform push notifications:

- **iOS**: APNs tokens automatically converted to FCM format via cloud function
- **Android**: Native FCM tokens
- **Web**: Not supported (intentionally excluded)

### Notification Types
1. **New Match Notifications** - When two travelers mutually like each other's itineraries
2. **Chat Message Notifications** - Real-time alerts for new messages
3. **Video Comment Notifications** - Alerts when someone comments on your video

### Architecture
- **Client**: `NotificationService` class handles permissions, token registration/refresh, and notification display
- **Server**: Firebase Cloud Functions trigger on Firestore events (`onCreate`) to send notifications
- **Token Storage**: FCM tokens stored as array field on user document (`users/{uid}.fcmTokens[]`)

### Recent Critical Fixes (Feb 15, 2026)
- ✅ **iOS Token Refresh Bug** - Fixed overnight notification failures caused by APNs→FCM conversion missing in token refresh listener
- ✅ **Re-registration Loop** - Fixed infinite re-registration by adding `useCallback` memoization
- ✅ **Privacy Violation** - Removed user IDs from production logs
- ✅ **Security Risk** - Deleted debug utility that logged FCM tokens

### Documentation
- **[Push Notification Plan](docs/push-notifications/PUSH_NOTIFICATION_PLAN.md)** - Complete architecture and implementation guide
- **[Recent Fixes (Feb 15, 2026)](docs/push-notifications/NOTIFICATION_FIXES_FEB_15_2026.md)** - Detailed fix documentation
- **[Debugging Guide (Feb 14, 2026)](docs/push-notifications/NOTIFICATION_DEBUGGING_FEB_14_2026.md)** - Original issue investigation
- **[Quick Checklist](docs/push-notifications/NOTIFICATION_CHECKLIST.md)** - Troubleshooting checklist

### Known Issues (Low Priority)
- Badge count hardcoded to 1 (not actual unread count)
- No periodic token cleanup (stale tokens accumulate)
- Missing `collapseKey` on match/video notifications
- Dev/prod Firebase config mismatch potential

See [NOTIFICATION_FIXES_FEB_15_2026.md](docs/push-notifications/NOTIFICATION_FIXES_FEB_15_2026.md) for details.

## �🔄 Migration from Current Structure

The project is designed to gradually migrate from the current structure to the improved architecture:

### Current Issues Being Addressed
1. **Component Duplication** - Removing `*Working.tsx` vs regular component duplication
2. **Mixed Responsibilities** - Separating UI, business logic, and data access
3. **Direct Firebase Calls** - Abstracting through repository pattern
4. **No Service Layer** - Adding proper business logic abstraction
5. **Missing Domain Models** - Creating typed domain models

### Migration Strategy
1. **Extract Services** - Move business logic from components to services
2. **Create Repositories** - Abstract Firebase calls through repository interfaces
3. **Define Domain Models** - Create proper TypeScript models
4. **Refactor Components** - Make components pure UI with no business logic
5. **Implement Dependency Injection** - Use service injection pattern

## 🔗 Integration with voyager-pwa

### Shared Resources
- **Firebase Database** - Identical database structure and configuration
- **Authentication** - Same Firebase Auth setup
- **Data Models** - Compatible interfaces and types
- **Business Logic** - Equivalent functionality and user flows

### Key Differences
- **UI Framework** - React Native vs React web components
- **Navigation** - React Navigation vs React Router
- **Storage** - AsyncStorage vs localStorage
- **Platform APIs** - Native mobile APIs vs web APIs

## 🚀 Deployment

### Development Builds
```bash
# Create development build
expo build:ios --type simulator
expo build:android --type apk
```

### Production Builds
```bash
# iOS App Store
expo build:ios --type archive

# Android Play Store
expo build:android --type app-bundle
```

### Environment Configuration
- **Development** - Uses `mundo1-dev` Firebase project
- **Production** - Uses `mundo1-1` Firebase project
- **Configuration** - Managed in `src/config/firebaseConfig.ts`

## 🧪 Testing

### Testing Strategy
- **Unit Tests** - Fast, mocked tests (Jest with mocks) ✅
- **Integration Tests** - Firebase emulator tests validating matching logic ✅
- **Component Tests** - React Native Testing Library for UI components ✅
- **E2E Tests** - Detox for full end-to-end user flows ✅

### Running Tests Locally
```bash
# Unit tests only (fast, mocked)
npm test

# Integration tests only (requires Firebase emulators)
npm run test:integration

# All tests (unit + integration)
npm run test:all

# E2E tests
npm run e2e:all:headless
```

### Test Status: ✅ ALL PASSING
- **Unit Tests**: 29/29 passing
- **Integration Tests**: 55/55 passing (COMPREHENSIVE - see [docs/COMPREHENSIVE_INTEGRATION_TESTS.md](docs/COMPREHENSIVE_INTEGRATION_TESTS.md))
- **E2E Tests**: Configured and working

### Integration Test Coverage
The integration tests now provide **comprehensive coverage** (55 tests) of ALL matching criteria:
- ✅ **Destination Matching** (2 tests) - exact match required
- ✅ **Date Overlap Logic** (6 tests) - all overlap scenarios
- ✅ **Age Range Filtering** (5 tests) - boundaries + edge cases
- ✅ **Gender Preference** (3 tests) - all options
- ✅ **Status Preference** (2 tests) - all options
- ✅ **Sexual Orientation Preference** (2 tests) - all options
- ✅ **Blocking Logic** (3 tests) - bidirectional blocking
- ✅ **Combined Filters** (2 tests) - multiple criteria together
- ✅ **Edge Cases** (4 tests) - missing fields, boundaries

**Coverage**: ~95% of matching algorithm logic ✅

### CI/CD Testing
Tests run **in parallel** on GitHub Actions for faster feedback:
- **Unit Tests Workflow** (`ci.yml`) - Jest unit tests with coverage (~2-3 min)
- **Integration Tests Workflow** (`integration-tests.yml`) - Firebase emulator tests (~4-6 min)
- Both workflows run simultaneously on PRs and merges

### Critical Integration Tests ✅
The integration tests validate the **most important feature** - comprehensive travel matching:
- ✅ **Destination matching** - exact string match - **WORKING**
- ✅ **Date overlap logic** (6 scenarios) - partial, exact, contained, no overlap - **WORKING**
- ✅ **Age range filtering** (5 scenarios) - within/outside range, boundaries - **WORKING**
- ✅ **Gender preference** (3 scenarios) - exact match, "No Preference" - **WORKING**
- ✅ **Status preference** (2 scenarios) - exact match, "No Preference" - **WORKING**
- ✅ **Sexual orientation** (2 scenarios) - exact match, "No Preference" - **WORKING**
- ✅ **Blocking logic** (3 scenarios) - bidirectional blocking - **WORKING**
- ✅ **Combined filters** (2 scenarios) - all criteria together - **WORKING**
- ✅ **Edge cases** (4 scenarios) - missing data, boundaries - **WORKING**

**Total**: 55 comprehensive integration tests - **ALL PASSING** ✅

**See:**
- [docs/COMPREHENSIVE_INTEGRATION_TESTS.md](docs/COMPREHENSIVE_INTEGRATION_TESTS.md) - Complete test breakdown
- [docs/INTEGRATION_TESTS_FIXED.md](docs/INTEGRATION_TESTS_FIXED.md) - How we fixed ECONNREFUSED errors
- [docs/INTEGRATION_TESTS_CI_SETUP.md](docs/INTEGRATION_TESTS_CI_SETUP.md) - CI/CD setup guide

## 📚 Additional Resources

### Documentation
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/docs/getting-started)
- [Firebase React Native](https://rnfirebase.io/)
- [TypeScript React Native](https://reactnative.dev/docs/typescript)

### Development Tools
- [React Native Debugger](https://github.com/jhen0409/react-native-debugger)
- [Flipper](https://fbflipper.com/) - Desktop debugging platform
- [Reactotron](https://github.com/infinitered/reactotron) - Desktop app for inspecting React Native

## 🤝 Contributing

### Pull Request Process
**✅ Automated Reviews Enabled by Default**

All pull requests automatically receive:
- 🤖 Automated code quality review
- 🔍 TypeScript type checking
- 📊 Change analysis and statistics
- ⚠️ Code quality warnings (console.log, missing tests, etc.)
- 👤 Automatic reviewer assignment via CODEOWNERS

### Code Guidelines
1. Follow the S.O.L.I.D principles outlined in the architecture
2. Maintain exact functional parity with voyager-pwa
3. Use TypeScript with strict typing (no `any` types)
4. Implement proper error handling and logging
5. Write unit tests for services and repositories
6. Follow the established file naming conventions
7. Remove debug console.log statements before submitting PRs
8. Update tests when modifying code functionality

For detailed workflow information, see [.github/workflows/README.md](.github/workflows/README.md)

## 📄 License

This project is a replica of voyager-pwa for mobile platforms and follows the same licensing terms.

---

**Note**: This app shares the same Firebase database as voyager-pwa. Ensure proper environment configuration before development to avoid conflicts with production data.