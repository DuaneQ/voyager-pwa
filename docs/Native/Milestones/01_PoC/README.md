# Milestone 01 — Proof-of-Concept (PoC)

Goal
- Validate that Expo + RN-web can run your core auth UI and share business logic with the web app.
- Validate `expo-notifications` token acquisition on a physical device.

Acceptance criteria
- An Expo TypeScript app exists under `/mobile` and runs locally via `expo start`.
- A `shared/services/auth.ts` exists and supports email sign-in and Google sign-in wrappers.
- A `shared/storage` adapter is implemented with web (localStorage) and mobile (AsyncStorage) implementations.
- A `Login` screen in `/mobile` uses the shared auth and storage, and displays basic profile info after login.
- `expo-notifications` is wired in PoC and the device obtains a push token (displayed in the app UI). The server-side send will be deferred.

Stories (see stories/ directory for individual stories)
- S1: Scaffold Expo app and workspace
- S2: Extract minimal `shared/services/auth.ts` and `shared/storage`
- S3: Implement Login screen and wire auth + storage
- S4: Add `expo-notifications` demo and show token in UI

Estimate: 2–5 days (1 developer)

Dependencies
- Firebase project credentials (GoogleService-Info.plist, google-services.json) stored securely for builds
- Apple & Google accounts for later EAS build submission (not required for PoC)

Notes
- For speed, the PoC uses Firebase JS SDK inside Expo. If we later require native messaging or Crashlytics, we'll integrate `react-native-firebase` via EAS.