## AI-generated Daily Itineraries — Implementation Story

This document describes the end-to-end design and implementation story for using OpenAI to construct daily itineraries for `AIItineraryDisplay`. It covers the runtime data flow, system+user prompt drafts, a strict JSON output schema, integration notes for frontend/backend, acceptance criteria, and example tests.

---

## 1) Narrative: end-to-end flow

1. Inputs collected by the app
  - destination (string)
  - startDate, endDate (ISO date strings)
  - preferenceProfile (all user preferences including dietaryRestrictions, cuisineTypes, accessibility, activity priorities, foodBudgetLevel)
  - activities[] (array of place-like objects or keywords derived from Google Places TextSearch results)
  - restaurants[] (array of place-like objects from Places TextSearch/Nearby Search)
  - rawPlaces: the raw Places API objects (both activity and restaurant results)
  - destinationLatLng (optional)

2. Orchestration (frontend)
  - `useAIGeneration` collects searches (flights, hotels, activities/restaurants) and calls a backend routine to run the LLM generation OR calls the LLM server-side recommended for key safety and token control).
  - The payload passed to the model includes: trip window, preferences, `activities[]` (full place objects and simplified fields), `restaurants[]`, and runtime metadata (search keywords, counts).

3. LLM behavior
  - The LLM maps raw place results to a per-day schedule honoring constraints:
    - Up to 2 activities per day (non-overlapping)
    - Three meal slots per day (breakfast, lunch, dinner). If restaurants[] contains matching open places for a slot, assign one; otherwise mark slot flexible and propose alternatives (see fallback below).
    - Respect place opening hours (use `opening_hours` from Places data). Do not schedule a visit outside opening hours.
    - Honor all user preferences (dietary restrictions exclude restaurants that fail restrictions; mobility/accessibility flags reduce walking time and prefer accessible venues).
    - Prioritize high-rated results but encourage diversity across days; avoid repeating identical categories.
    - If a restaurant likely requires reservation (based on `business_status`, `user_ratings_total`, or place metadata like `has_reservations` when available), set `requiresReservation: true` and include `booking` hints/links.

4. Post-processing and validation (backend)
  - Validate every placeId included by the model against Places API (lightweight fetch) to ensure the place is valid and get canonical coordinates and URL.
  - Enforce schedule constraints (no overlap) and normalize times to the user's timezone.
  - Return the result to `useAIgeneration.ts` along with metadata: prompt, model, searchKeywords, placesUsed, and confidence hints.

5. Display
  - `AIItineraryDisplay` reads the saved generation and renders each day with activities and meals.
  - Offer edit controls to the user; edits should persist back to the saved generation.

6. Observability
  - Log input keywords, places counts, and the model’s raw text response plus parsed JSON.
  - Save trace metadata: generationId, model name, prompt version, and selected placeIds.

---

## 2) System and user prompt drafts

System prompt (tone + constraints):
```
You are an expert travel planner assistant. Produce a JSON itinerary for a multi-day trip that strictly follows the JSON schema provided. Be playful in tone but concise in text fields. Honor user preferences, opening hours, and accessibility flags. Never invent real-world facts about places beyond what is present in the provided place objects. If information is missing, respond with null for that field and include a human-readable note in metadata.fallbackReasons. Always output valid JSON and no extra commentary.  Provide recommendations for the trip based on the destination and the user's activity and food preference.
```

User prompt (payload summary):
```
Create a day-by-day itinerary for the following trip. Use the provided places to choose up to 2 activities per day and one restaurant for each meal slot. Ensure activities do not overlap with meal windows. Respect opening_hours and user preferences.

Input: { destination, startDate, endDate, preferenceProfile, activities, restaurants, rawPlaces }

Output: produce JSON that matches the schema exactly.
```

Prompt engineering notes:
- Keep token usage reasonable by passing only necessary fields from rawPlaces (place_id, name, types, rating, user_ratings_total, opening_hours, vicinity/formatted_address, website if available, plus a short `note` derived by the server if needed).
- If the model suggests a place that lacks opening hours, the backend will verify and may mark as `requiresValidation` in metadata.

---

## 3) Strict JSON output schema (canonical)
Provide this schema to the model and validate the response strictly before saving.

Schema (illustrative TypeScript type):
```ts
type ItineraryGeneration = {
  generationId: string;
  model: string; // e.g., gpt-4o-mini
  destination: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  days: Day[]; // ordered list
  metadata: {
    searchKeywords: string[]; // keywords used
    placesUsed: string[]; // placeIds selected
    promptVersion: string;
    fallbackReasons?: string[];
    generatedAt: string; // ISO timestamp
  }
}

type Day = {
  date: string; // YYYY-MM-DD
  items: ItineraryItem[]; // ordered by startTime
}

type ItineraryItem = {
  id: string; // client generated stable id
  placeId?: string | null; // Google place_id when tied to a place
  title: string; // short title
  type: 'activity' | 'restaurant' | 'transit' | 'free' | 'note';
  startTime: string | null; // ISO time or null for flexible
  durationMinutes: number | null; // null if unknown
  // estimated pricing: either a single numeric estimate or a price band
  price?: { amount?: number | null; currency?: string | null } | null;
  priceEstimate?: { low?: number | null; high?: number | null; currency?: string | null } | null;
  address?: string | null;
  coordinates?: { lat: number; lng: number } | null;
  rating?: number | null;
  description?: string | null; // short blurb in playful tone
  website?: string | null;
  booking?: { url?: string | null; note?: string | null } | null;
  requiresReservation?: boolean; // true if reservation likely needed
  confidence?: number; // 0..1
}
```

Validation rules (server enforced):
- `days` must cover each calendar date from startDate to endDate inclusive.
- No more than 2 items of `type==='activity'` per `Day`.
- There must be ≤1 restaurant assigned per meal slot (breakfast: 06:00-10:30, lunch: 11:00-15:00, dinner: 17:00-21:30). Restaurant items should have startTime within those windows when possible.
- Items must not overlap in time. If the model emits overlapping items, the backend will adjust schedule to avoid overlap while preserving user preferences.
 - If available, an item may include `price` or `priceEstimate` fields; the backend should validate numeric ranges and currency codes when present.

---

## 4) Integration notes

Engineering constraints (non-functional requirements):
- Adhere to S.O.L.I.D principles; keep implementations single-responsibility and testable.
- Keep the initial implementation simple; prefer small, well-tested changes over broad refactors.
- Do not alter the existing `ai_itineraries` object shape used by Flights and Accommodations. Append or nest the activities/restaurant data under a new `activities` or `recommendations` field inside the existing generation object so existing consumers (flights/hotels) remain unaffected.
- Ensure Flight and Accommodations flows remain untouched. Any migration must be non-destructive and backward-compatible.


Where to run the model
- Recommended: server-side (Cloud Functions or server component) to secure prompt & API key and to post-process responses before saving. The frontend `useAIGeneration` hook already aggregates searches—send that payload to the server function `generateItineraryWithAI` which calls OpenAI.

Pre-processing (server)
- Reduce rawPlaces payload to necessary fields before sending to the model to save tokens.
- Attach simple heuristics (estimated visit duration per place type, walking time multipliers based on accessibility) so the model can schedule appropriately.

Post-processing (server)
- Validate the returned JSON against schema (strict). If invalid, retry with sanitized instructions or return a clear error for debugging.
- For each placeId returned, re-query Places API for authoritative opening_hours and website (to detect reservation info). If a place is no longer valid, mark it in `metadata.fallbackReasons` and remove/replace in the itinerary.
- Normalize times into the user's timezone.
- The useAIGeneration will send the intial request to the searchActivities.ts.  When the useAIGeneration receives the activities and restaurant response it will send that payload to the AI Model.  After the AI Model contructs the AI Itinerary it will send the results back to the useAIGeneration that will persist to Firestore `ai_generations` collection with fields: requestPayload, parsedResponse, rawModelResponse, metadata (promptVersion, model, placesUsed).

Frontend integration
- `useAIGeneration` should: 1) call function to generate itinerary, 2) wait for response and store generationId, 3) show progress UI while generation runs, 4) once saved, open `AIItineraryDisplay` which reads `ai_generations/{generationId}` and renders days in addition to the already existing flight and accomodations.
- Provide the user ability to edit items; edits should patch the stored generation document.

Logging & troubleshooting
- Log: input keywords, counts, shortened place lists, model name, promptVersion, time-to-generate, and selected placeIds. Keep rawModelResponse in Firestore for debugging for a limited TTL.

---

## 5) Acceptance criteria & example tests

Acceptance criteria (high level)
- Generated itinerary JSON validates against the schema.
- Each day contains ≤2 activities and meal slots filled when matching restaurants exist.
- No scheduled item violates opening_hours.
- User preferences (dietary restrictions, accessibility, budget) are honored in the results.
- Restaurants flagged with `requiresReservation` when reservation is likely; booking URLs included when available.
 - If price information is available from Places or derived heuristics, the itinerary items should include `price` or `priceEstimate`. Prices should respect the user's `foodBudgetLevel` when possible.
- Response time for generation (server-side) is reasonable: typical <6s for common trips; worst-case <15s.

Unit/Integration tests (examples)
- Unit: Given a small mock `rawPlaces` set (3 activities, 4 restaurants) and a 2-day trip, assert that parser + schema validation accepts the model output and `days` covers two dates.
- Integration: With mocked OpenAI model (fixture response) and mocked Places re-validation, call `generateItineraryWithAI` and assert:
  - `ai_generations/{generationId}` saved
  - activities ≤2 per day
  - restaurants assigned to meal slots
  - no overlapping times
- E2E smoke: real Places search + real model call for a short trip and assert the response saves and UI renders without schema errors.

Edge cases & fallback behavior
- Sparse results: Do not invent places. If insufficient places exist, the model should: 1) expand the radius in metadata suggestion (e.g., "expanded search radius to 25km"), 2) prefer flexible day with `type:'note'` items like "Free morning — explore local cafes" and indicate `confidence: 0.3` for lower-confidence suggestions. Record fallback reasons in metadata.
- Conflicting times: If the model schedules overlapping items, backend will shift non-critical items later or mark items as flexible (startTime=null) and record the adjustment in metadata.

---

## 6) Example model prompt + minimal payload (JSON)

Minimal payload to server function (example):
```json
{
  "destination":"Portland, OR",
  "startDate":"2025-10-01",
  "endDate":"2025-10-03",
  "preferenceProfile":{ "cuisineTypes":["mexican"], "dietaryRestrictions":[], "accessibility":{} },
  "activities":[ {"place_id":"ChIJ...", "name":"Powell's Books", "types":["book_store"], "rating":4.7, "opening_hours":{...} } ],
  "restaurants":[ {"place_id":"ChIJ...", "name":"Taqueria", "types":["restaurant"], "rating":4.6, "opening_hours":{...} } ]
}
```

System prompt (short):
```
You are an itinerary planning assistant. Produce only JSON that matches the provided schema. Use the places arrays to choose up to 2 activities per day and one restaurant per meal slot. Do not invent places. Respect opening_hours and preferences.
```

User prompt (short):
```
Create a playful but concise day-by-day itinerary for the user. Make sure restaurants are assigned to breakfast/lunch/dinner windows and activities do not overlap. Include website and booking links where available.
```

---

## 7) Next steps and follow-ups
- Implement `generateItineraryWithAI` server function that accepts the `useAIGeneration` payload.
- Add JSON schema validation (AJV) in the server code before persisting.
- Add unit tests and one integration test with a mocked model. Maintain logs of prompt + model response for troubleshooting.

For questions #9 and #13 (guidance):
- #9: If Places results are sparse, do not invent items; expand radius, relax filters, or mark the day flexible with suggested activities derived from place types (e.g., "visit a local park" if only parks exist). Provide fallbackReasons in metadata.
- #13: The model output should be saved to `ai_generations` exactly as the validated JSON. The `useAIGeneration` hook should call the server function, receive the `generationId`, and then render `AIItineraryDisplay` reading from that document. Save rawModelResponse to Firestore for debug traces (TTL-limited).

---

Document author: Technical story produced for the AI itinerary implementation. Place this file in `docs/AI_Itineraries` and use as the canonical spec for development and QA.
