# Extraction Map — move to /shared (recommended)

This document shows a suggested extraction map for moving platform-agnostic code into a `/shared` package (for the Expo + RN-web migration). Use this as a conservative starting point — move only code that's purely logic or UI-agnostic.

Legend
- -> means move into `/shared`
- (R) required for runtime on both platforms
- (T) tests depend on it

Overview (high-level)

src/
├─ components/          # UI — mostly platform specific, extract only small shared UI atoms
│  ├─ layout/           -> /shared/ui/layout/   (small atoms like IconButton, Avatar) (T)
│  └─ common/           -> /shared/ui/common/   (buttons, form controls as thin wrappers)
├─ hooks/               -> /shared/hooks/        (platform-agnostic hooks: useUsageTracking, useAIGeneration) (R,T)
├─services/             -> /shared/services/     (API clients, auth wrapper, search, itineraries) (R,T)
├─types/                -> /shared/types/        (TS types & interfaces) (R,T)
├─utils/                -> /shared/utils/        (searchCache.ts, date helpers, formatters) (R,T)
├─Context/              -> /shared/context/      (UserProfileContext, AlertContext) (R)
└─assets/               -> /mobile/assets or keep in web build (images may be platform-specific)

Detailed recommendations

- `src/hooks/useUsageTracking.ts` -> `/shared/hooks/useUsageTracking.ts` (R)
  - Keeps usage limit logic consistent across platforms.

- `src/hooks/useAIGeneration.ts` -> `/shared/hooks/useAIGeneration.ts` (R)
  - Or wrap server calls in a shared service: `/shared/services/generateItinerary.ts`

- `src/services/*` (api clients, firebase wrappers) -> `/shared/services/` (R)
  - Example: `searchActivities`, `itineraries`, `auth`, `profileValidation`.
  - Keep Firebase-specific initialization outside shared if platform SDKs differ; provide an adapter factory.

- `src/types/` -> `/shared/types/` (R)
  - All DTOs and shared TypeScript types.

- `src/utils/searchCache.ts` -> `/shared/utils/searchCache.ts` (R)
  - Abstract storage (localStorage vs AsyncStorage) behind a storage adapter, implemented per platform.

- `src/components/modals/AIItineraryGenerationModal.tsx` -> leave in web repo, create a thin RN wrapper -> `/mobile/components/AIItineraryGenerationModal.native.tsx`
  - Move validation & generation logic to `shared/services/generateItinerary` so UI becomes thin.

- `src/components/forms/SignUpForm.tsx` -> keep UI in web code, but move auth logic to `shared/services/auth.ts`

Adapters (pattern)

- /shared/adapters/storage.ts
  - Interface: getItem, setItem, removeItem
  - Web impl: localStorage; Mobile impl: AsyncStorage

- /shared/adapters/places.ts
  - Interface: searchPlaces, getPlaceDetails
  - Web impl: google-places web client; Mobile impl: native Places SDK wrapper

- /shared/adapters/notifications.ts
  - registerToken, requestPermissions
  - Mobile: expo-notifications; Web: FCM via service worker

Migration steps (recommended)
1. Create `/shared` package in monorepo (npm workspace). Add `tsconfig` path mappings.
2. Move `src/types`, `src/utils/searchCache.ts`, `src/hooks/useUsageTracking.ts`, `src/services/*` to `/shared` with minimal exports.
3. Add adapters with `shared/adapters` and provide implementations under `/web` and `/mobile` packages.
4. Update imports across the web app to reference `/shared` package.
5. Start mobile PoC with Expo and consume `/shared` package; iterate on adapters.

Notes
- Don't move UI-heavy components wholesale; instead extract logic and keep platform-specific presentation.
- Preserve tests: update Jest config to resolve `shared` paths.
