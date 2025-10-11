## Finalized decisions (confirmed)
These are the choices you provided and the concrete plan items derived from them.

--- 
- Runtime: Expo-managed app with EAS for production/native builds.
- Payments: Stripe (we will plan for `stripe-react-native` and handle Apple/Google policy implications).
- Push notifications: start with `expo-notifications` (PoC) and migrate to `@react-native-firebase/messaging` if/when we need advanced native features.
- Package manager: npm (same as the web project).
- Node / environment: use the same Node version as the web project (add `.nvmrc` if desired).
- Crash reporting: Firebase Crashlytics (configure after EAS builds); consider Sentry later if needed.
- App IDs / accounts: not yet — we will list exact Firebase / App Store / Play Console steps below.
- CI / EAS: we will use EAS Build & EAS Submit for native artifacts; I will add EAS config and example GitHub Actions snippets.
- RN-web: We will replace the existing web UI with a unified react-native-web UI (single codebase for mobile + web). The existing web app will be kept during migration and retired once RN-web parity is complete.
- Secrets storage: GitHub repository secrets for CI, and EAS secrets for build-time private files (APNs, keystore, google-services files).

No UNANSWERED.md will be created — this file now documents the decisions. If anything else needs clarifying, we'll add a short TODO section at the end of this doc.

---
## Push notifications — concrete steps (expo-notifications, PoC → production)
1. PoC (Expo-managed):
  - Install and use `expo-notifications` to request permissions and get a push token on device.
## Payments (Stripe) — policy and approach
- Integration: `stripe-react-native` (native SDK) — requires EAS builds.
- Apple policy: If your premium features are digital content consumed within the app (AI itineraries), Apple typically requires using StoreKit / IAP for subscriptions. That means:
## EAS (Expo Application Services) — summary & first steps
- What EAS does for us:
  - `eas build` produces native binaries (IPA/AAB) for iOS and Android in the cloud.
  - `eas submit` uploads artifacts to App Store Connect / Google Play.
## RN-web and replacing the web project
- You chose to replace the existing web UI with a unified RN-web codebase. Implications:
  - All UI will be implemented using React Native primitives and a cross-platform UI kit (e.g., React Native Paper) so the same code renders on mobile and web via `react-native-web`.
  - Web-only features (PWA service worker, SEO, server-side rendering) need re-evaluation. If SEO or SSR is critical, keep the web project for those pages or use a hybrid approach.
## Secrets & CI: recommended GitHub secret names
Store these in GitHub repository secrets and/or EAS secrets:
- `FIREBASE_SERVICE_ACCOUNT_DEV` / `FIREBASE_SERVICE_ACCOUNT_MUNDO1_1` (JSON for CI deploys)
- `REACT_APP_GOOGLE_PLACES_API_KEY`
## Minimum OS guidance
- Recommended baseline for support:
  - iOS: 13+
  - Android: API 26+ (Android 8.0+)
## Crash reporting (Firebase Crashlytics)
- For Expo-managed workflow Crashlytics requires EAS builds and either RNFB integration or native upload of mapping files. We'll configure Crashlytics after we have EAS production builds.
## Milestones and stories
- You requested breaking work into milestones and stories. `docs/Native/Milestones` now contains `01_PoC` (scaffold, auth, storage, notifications demo). We'll add further milestone directories (`02_Shared_Extraction`, `03_UI_Migration`, etc.) and story files in each.

---
## Next actions (short, actionable)
1. Confirm you want me to scaffold the Expo PoC now (I will create `/mobile`, `/shared`, and initial story commits).
2. Provide Apple Developer and Google Play access details when you're ready for EAS credential setup (or I can document how to generate the files for you to upload).
3. When payments are ready, confirm subscription handling strategy (IAP vs Stripe) and we'll add payment stories to `04_Native_Integrations`.

If you want me to scaffold the PoC now say: "Please scaffold the Expo PoC" and I'll create the files, commit to a branch, and provide run instructions.
# Native App Migration Plan (Expo + Monorepo)

Purpose
- Capture a practical, actionable plan to convert the Voyager PWA into a React Native mobile app using Expo while keeping the web app in the repo.
- Focus on reusing as much existing TypeScript code (types, services, business logic) as possible and replacing only the UI and platform-specific integrations.

Top-level goals
- Monorepo layout with `mobile` and `shared` packages; we will replace the existing `web` UI with a unified React Native / react-native-web codebase so a single UI codebase serves iOS, Android and Web.
- Use Expo (managed workflow) for the mobile app and react-native-web for web. Use EAS for custom native builds when needed.
- Reuse platform-agnostic hooks, services, and types from the current web app in `shared`.
- Deliver a small PoC quickly (Expo app that signs in with Firebase and displays profile data).

Assumptions & decision summary
- You will move to an Expo-managed + EAS workflow.
- You will use Stripe for payments (plan for stripe-react-native; note Apple/Google policy concerns — see Payments section).
- Use `expo-notifications` for push notifications initially (migration path to react-native-firebase messaging exists if needed).
- You plan to replace the existing web UI with a unified RN-web codebase (single UI codebase for mobile + web).
- Firebase remains the primary backend (Auth, Firestore, Storage, Functions).

Monorepo layout (recommended)
- /mobile        — Expo-managed React Native app (TypeScript) that also targets web via react-native-web
- /shared        — platform-agnostic TypeScript modules (types, services, business logic)
- NOTE: we will *replace* the existing web UI with `react-native-web` UI components over time. The `web/` folder can be kept temporarily for reference during migration but will be retired once RN-web parity is acceptable.
- package.json + workspace config (npm workspaces) at repo root

Why monorepo
- Simplifies sharing TypeScript code and types between mobile and web.
- Easier to keep business logic and API clients consistent.
- Simplifies CI to run mobile + web checks from a single repo and share build/test tooling.

Expo choice rationale
- Fast iteration (Expo Go) and simple developer onboarding.
- EAS builds handle custom native modules (Stripe, Google Maps native, etc.) when needed.
- Expo supports react-native-web so the RN UI can run on the web and replace the old MUI-based UI.
- Tradeoff: some native features (advanced messaging, native Crashlytics, custom native SDKs) require EAS builds and possibly a custom dev client.

What is reusable (high-level)
- TypeScript types: `src/types/**`
- Business logic: `src/utils/**`, helper libraries, AI request/response models
- Network/API/Functions wrappers: code that only uses fetch/axios or callable wrappers (may need small abstraction)
- Non-UI hooks that do not access DOM or browser globals (or that can be refactored into core functions)
- NOTE: We will extract these into `/shared` so both mobile and RN-web import the same logic.

What must be adapted/replaced
- UI layer (Material-UI, DOM, CSS) → React Native components + RN UI library (React Native Paper / UI Kitten / styled-components)
- React Router → React Navigation (or Expo Router)
- Browser APIs: localStorage, service workers — need platform adapters (AsyncStorage on mobile, RN-web shim on web)
- Web-only libraries: react-google-places-autocomplete, stripe-js — replace with cross-platform adapters (`react-native-google-places-autocomplete` and `stripe-react-native` via EAS)
- Push notifications (web push replaced by APNs/FCM via `expo-notifications` or RNFB messaging)

Core patterns & contracts to implement
1) Shared modules contract
- `shared/` exposes platform-agnostic helpers and services.
- Keep public API small and well typed.

2) Storage adapter interface (example)
- getItem(key): Promise<string | null>
- setItem(key, value: string): Promise<void>
- removeItem(key): Promise<void>

Implementations
- web → localStorage wrapper
- mobile → `@react-native-async-storage/async-storage` wrapper

3) Platform adapter pattern
- For each platform-specific dependency (Places, Notifications, Payments) create a small adapter that exposes the same async API but delegates to platform implementations behind the scenes.
- For example, `shared/adapters/notifications.ts` will expose `registerForPush()` and `getDeviceToken()`; the mobile implementation uses `expo-notifications`, while the RN-web implementation can fall back to web push or a no-op.

Migration checklist (file-level guidance)
- Move to `shared/` (platform-agnostic):
  - `src/types/`
  - `src/utils/` (date formatting, helpers)
  - `src/services/openai*` (review for dependencies on window)
  - API clients and wrappers that call Firebase functions (wrap JS SDK or fetch)

- Keep in `web/` (web-specific):
  - MUI components
  - service-worker, PWA-related code
  - anything directly using DOM, CSS, or window

- Re-implement in `mobile/`:
  - All screens and components built with RN primitives and RN UI library
  - Navigation using React Navigation / Expo Router
  - Places autocomplete (native) and map components
  - Media components (expo-av / react-native-video)
  - Push notifications (expo-notifications or react-native-firebase messaging via EAS)

PoC (priority, 2–5 days)
- Objective: Prove shared code reuse and Expo + Firebase integration, plus expo-notifications behavior on device and RN-web parity on the web.
- Tasks:
 1. Create `mobile/` with an Expo TypeScript app.
 2. Extract minimal auth service from the web app to `shared/services/auth.ts` (email sign-in + Google sign-in wrapper).
 3. Implement a small `shared/storage.ts` and an `mobile` implementation using `@react-native-async-storage/async-storage`.
 4. Add `expo-notifications` integration in the mobile PoC and demonstrate push token acquisition (server sending deferred).
 5. Create a `Login` screen in `mobile/` using the shared auth service.
 6. Start app in Expo Go and confirm email login + profile read works, and validate RN-web rendering of the same screen in the browser.

Detailed PoC commands (examples)
- Monorepo init (pnpm example):
```bash
# from repo root
pnpm init -w
# create packages
mkdir mobile shared
cd mobile
npx create-expo-app -t blank --name voyager-mobile --template expo-template-blank-typescript
```
- Add `shared` as a workspace package and adjust tsconfig paths to reference it.

Native services & libraries (short list)
- Firebase: use Firebase JS SDK in Expo for PoC; plan to add `react-native-firebase` modules later if you need advanced native features (Crashlytics is supported via RNFB or native config)
- Google Places: `react-native-google-places-autocomplete` or native Places SDK via config plugin
- Maps: `react-native-maps` (+ native config)
- Video: `expo-av` (in Expo) or `react-native-video`
- Payments: `stripe-react-native` (requires native build / EAS) — be mindful of App Store in-app purchase rules for subscriptions
- Push: `expo-notifications` (Expo-managed PoC) with a migration path to `@react-native-firebase/messaging` if needed

CI / Build / Release
- Development: use Expo Go for fast iteration; use EAS build for release/test builds that require native modules.
- EAS: you'll use EAS Build to produce production IPA/APKs and EAS Submit to upload to stores. EAS also provides secure storage for build-time secrets (APNs, keystores).
- CI: add mobile test step (Jest + RN Testing Library) and E2E via Detox or Cypress (web). Use GitHub Actions to call EAS CLI for automated builds and submits.
- Release: App Store Connect and Google Play Console setup; configure EAS Submit or Fastlane for automation.

Security, privacy, and App Store considerations
- Apple Store policies on in-app purchases (if the product is digital and consumed in the app, consider StoreKit / IAP)
- Request only required permissions (camera, mic, location). Add privacy text for App Store.
- Do not embed secrets in the app; server-side verify any purchases and keep API keys in secure storage or server.

Risks & mitigations
- Video-heavy flows: need testing on real devices; use native video modules and optimize upload strategies.
- Stripe + Apple/Google store rules: be aware that Apple may require in-app purchases for digital subscriptions consumed inside the app. We should decide on the payments strategy early and implement server-side entitlement verification.
- Native SDK surprises: plan for EAS builds and a custom dev client if you rely on unsupported modules in Expo Go.

Project timeline (rough)
- PoC (auth + profile + expo-notifications token): 2–5 days
- Shared code extraction & storage adapter: 3–7 days
- Screen-by-screen migration (RN-web parity): 4–10 weeks (iterative)
- Native integrations (Stripe, notifications full server integration, maps, video): 1–3 weeks per major integration

Next steps (short-term)
1. Create `/mobile` Expo app skeleton and add it to repository as a workspace. (I can scaffold this for you.)
2. Extract a minimal `shared/services/auth.ts` and `shared/storage` to reuse in PoC.
3. Implement `expo-notifications` in the PoC and confirm push token acquisition on device.
4. Implement the mobile `Login` screen and confirm the flow works in Expo and renders via RN-web in the browser.

What I can do next for you
- Scaffold the monorepo workspace and the Expo PoC (I will):
  - create `/mobile` using `create-expo-app`,
  - add `shared` package skeleton,
  - extract minimal auth service and storage adapter,
  - implement a simple login screen in mobile and add `expo-notifications` demo code.

If you want me to scaffold that PoC now, say "Please scaffold the Expo PoC" and I'll create the files and a runnable `/mobile` app in the repo and report back with commands to run locally.
