# Milestone 02 — Shared Extraction

Goal
- Extract platform-agnostic code into `/shared` and implement thin platform adapter contracts so the UI (RN-web) can consume services without platform-specific branches.

Why this matters
- Even though UI will be RN-web, side-effects (storage, notifications, payments, places, file uploads) differ by platform. Isolating side-effects behind adapters reduces duplication and prevents platform leak-through.

Acceptance criteria
- `/shared` package exists in repo and is consumable by both `/mobile` and web entry points.
- Types, pure utils, and core API clients are moved and covered by unit tests.
- Storage adapter interface implemented with web (localStorage) and mobile (AsyncStorage) implementations.
- Notifications adapter interface and a PoC `expo-notifications` mobile impl + no-op web impl exist.
- Places & Maps adapter interface defined and placeholders implemented for web and mobile.
- A sample screen in `/mobile` consumes one shared service (e.g., session or usage tracking) successfully.

High-level tasks
1. Create `/shared` package and workspace wiring (npm workspaces). Add `tsconfig` paths and build/test entries.
2. Move types and pure utils into `/shared` and update imports across the codebase.
3. Extract API clients and server-callable wrappers into `/shared` (make them accept a platform-agnostic HTTP client or Firebase callable wrapper).
4. Define adapter interfaces for storage, notifications, places, payments, media upload.
5. Implement web and mobile adapters for storage and notifications; add unit tests.
6. Wire one shared service (for example `shared/services/session.ts`) into the `/mobile` PoC.

Files and code to split (guidance)
- Candidate items to move into `/shared`:
  - `src/types/**` (all types)
  - `src/utils/**` (date formatting, helpers, small pure functions)
  - `src/services/*Client*` (API wrappers that call server functions)
  - `src/hooks/*` that are pure business logic (refactor UI-specific code out)

- Items to keep or rewrite in platform-adapter form:
  - `src/components/*MUI*` UI components - reimplement in RN UI kit
  - `service-worker.ts`, PWA registration - web-only
  - `react-google-places-autocomplete` usages - replace with adapter
  - `stripe-js` payment flows - replace/adapter for stripe-react-native or IAP

Risk & mitigation
- Risk: large changes across imports. Mitigation: do small incremental moves (types/utils first), run unit tests and CI after each subtask.

Estimate
- 3–7 days (single developer) to reach the acceptance criteria for Milestone 02.

---

See `stories/` for detailed, testable stories.
