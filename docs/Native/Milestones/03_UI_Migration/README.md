# Milestone 03 — UI Migration (RN-web parity)

Goal
- Rebuild the app screens using React Native primitives and a cross-platform UI kit so the UI runs on both mobile and web via react-native-web.

Acceptance criteria
- Core screens (Login, Home feed, Search, Itinerary detail) are implemented in RN components and render correctly in Expo and web.
- Navigation uses React Navigation or Expo Router.
- CI runs a RN-web build for the web entry and the mobile app runs in Expo.

Stories
- S1: Login screen (already in PoC)
- S2: Home feed / video feed
- S3: Search screen & caching
- S4: Itinerary generation UI (AI modal)
- S5: Chat & connections

Estimate: 4–8 weeks (iterative), break into per-screen stories.

Notes
- Convert and test screens one-by-one; rely on shared services and adapters for platform differences.
*** End Patch