# AI Itinerary Backend — Overview

This document replaces and consolidates earlier docs for the AI itinerary backend. It describes the runtime flow, callable function contracts, important invariants, security / rate limit rules, recommended testing steps, and minimal deployment notes. The goal is precise, non-redundant engineering guidance for contributors.

Status
- Up-to-date as of Oct 2025
- Uses the Firebase Functions backend in /functions
- Primary model: gpt-4o-mini (cost-aware), used by the `generateItineraryWithAI` callable

Principles
- Server-side generation only; clients call callable functions (`httpsCallable`) with a { data: ... } payload.
- All calls require authenticated users; premium-only rules are enforced server-side where required.
- Deterministic mapping: external provider results (flights, hotels, activities) are mapped to compact, documented shapes and stored in the `itineraries` collection. Each itinerary document is the single source-of-truth for AI-generated trips and contains request, progress, response, and generationMetadata.
- Fail-safe behavior: partial failures are returned with structured error codes; no secrets are returned to clients.

High-level flow
1. Frontend builds an AIGenerationRequest and calls `generateItineraryWithAI` (callable) with { data: request }.
2. Function verifies auth, premium status (if required), and basic request validation.
3. Function prepares parallel external calls (optional): flights, accommodations, activities, and the AI model call. Calls run in parallel when applicable.
4. AI call receives a generationId and a stable payload that includes sanitized recommendations and search results (no secret data).
5. Function stores the request with status `pending`/`processing` in `/itineraries/{id}` and updates status to `completed` or `failed` when done. The itinerary document includes a `progress` subfield for real-time listeners and a `generationMetadata` object for debugging (redact secrets before saving or apply TTL to raw traces).
6. For completed results the function updates `response` and sets `ai_status: "completed"` on the same itinerary document.
7. Function returns a compact result to client: { success: boolean, id?: string, generationId?: string, error?: { code, message } }.

Callable Functions (production names)
- generateItineraryWithAI (https.onCall)
  - Purpose: Full itinerary generation. May call OpenAI and other search helpers (flights/hotels/activities) in parallel.
  - Input: { destination, startDate, endDate, preferenceProfile?: object|id, generationId?: string, tripType?, mustInclude?, mustAvoid?, flightPreferences?, transportType? }
  - Output: { success: true, generationId, savedDocId? } or structured error: { success: false, error: { code, message } }
  - Errors: unauthenticated, permission-denied (premium), invalid-argument, resource-exhausted (rate limit), internal
  - Important: Accepts both canonical request shape and a transport-specific shape (origin + destination + transportType).

- estimateItineraryCost (https.onCall)
  - Purpose: Lightweight cost estimates; lower rate limits than full generation.
  - Input: minimal dates/destination/groupSize
  - Output: { success, estimate: { total, perPerson, byCategory } }

- getGenerationStatus (https.onCall)
  - Purpose: Polling endpoint; returns stored status for generationId.
  - Input: { generationId }
  - Output: { status: 'pending'|'processing'|'completed'|'failed', progress?: { stage, percent, message }, error?: { code, message } }

HTTP Functions (helpers)
- searchFlights (https.onCall/http)
- searchAccommodations (https.onCall/http)
  - Purpose: Helper endpoints used by generateItineraryWithAI and by the UI. They map provider responses to compact shapes consumed by the AI prompt and by the UI.

Data shapes (summary)
- AIGenerationRequest (client -> function) — minimal authoritative shape
  - destination: string
  - startDate: string (YYYY-MM-DD)
  - endDate: string (YYYY-MM-DD)
  - preferenceProfile?: object | preferenceProfileId
  - tripType?: 'leisure'|'business'|... (optional)
  - mustInclude?: string[]
  - mustAvoid?: string[]
  - flightPreferences?: { class?: string; preferredAirlines?: string[] }
  - transportType?: string (explicit signal, e.g. 'airplane')

- AIGenerationResponse (function -> client)
  - success: boolean
  - generationId?: string
  - savedDocId?: string (optional canonical itinerary id)
  - error?: { code: string, message: string, details?: any }

Persistence
 - /itineraries/{id}: canonical user-visible itinerary documents used by the rest of the application (search, display, public pages). Each document stores the original `request`, a `progress` field for real-time updates (e.g. { stage, percent, message }), `response` with the finalized itinerary data, and `generationMetadata` for debug traces (redact secrets and consider TTL for raw responses). UI listeners and pages must read from `/itineraries` for both progress and final results. Code references: `src/hooks/useAIGeneratedItineraries.ts` (reads), `src/components/pages/PublicAIItineraryPage.tsx` (reads), and app-level itinerary hooks/readers.
 - /ai_analytics/{date}: daily metrics for monitoring (counts, processing time, failures)

Note: across the codebase `itineraries` is the single source-of-truth for AI-generated itineraries and their progress. Remove or migrate any legacy code or tests that reference deprecated generation paths; update them to use `/itineraries/{id}` and the itinerary document shape described above.

Rate limiting & quota
- Enforced server-side and mirrored in frontend usage tracking
- Preferred rule examples (server enforces):
  - Premium: up to 10 full generations / hour
  - Free: restricted — cost estimation allowed but full generation blocked
  - Global: per-user throttling to prevent abuse

Security & secrets
- Functions must never embed secrets in responses
- OpenAI / provider API keys should be stored in Functions environment (or as config) and not returned to clients
- All callable functions must validate context.auth.uid and enforce role/premium rules where required
- Audit logs should avoid writing PII in plaintext; prefer hashed identifiers for user-sensitive logs

Logging & observability
- Use structured console logs for function debugging with clear prefixes (e.g. [AI_GEN] )
- Record processingTimeMs in the saved itinerary document at `/itineraries/{id}` for monitoring
- Track provider call durations and response sizes for cost optimization

Testing checklist
- Unit test function helpers (mapItineraryToFlight, formatDurationMinutes, fetchAllTextSearchResults)
- Emulator integration tests for `generateItineraryWithAI` using firebase emulator (auth + firestore)
- Mock the OpenAI response in unit tests and assert storage + returned shapes
- Frontend: mock callable functions in tests and assert UI progress flows and error states

Local development
- Use Firebase emulator for functions and Firestore
- Example (short):

```bash
# From repo root
npm install
# Start functions emulator
cd functions && npm run build && firebase emulators:start --only functions,firestore,auth
# Run frontend locally (if needed):
cd .. && npm start
```

Deployment
- Standard: `firebase deploy --only functions:generateItineraryWithAI` or deploy all functions
- Observe function memory/timeout settings in `functions/src/index.ts` or individual function exports

Minimal troubleshooting
- If AI returns invalid JSON: log the assistant raw output and fail fast (do not persist invalid JSON)
- If provider calls time out: return partial result with `status: 'failed'` and include provider diagnostics in logs (not returned to clients unless safe)

Appendix: one-line best practices
- Mock external providers in tests; assert stored documents and statuses; keep the client contract minimal and stable.

---

This file intentionally replaces older or duplicated docs in this folder. For implementation-specific notes (refactors, deep-dive analysis), please see individual files such as `AI_ITINERARY_DISPLAY_REFACTORING.md`, `AI_GENERATION_COMPLETE_STATUS.md`, and `AI_BACKEND_INTEGRATION_SUMMARY.md`.
