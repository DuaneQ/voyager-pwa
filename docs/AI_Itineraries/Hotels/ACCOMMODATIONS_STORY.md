# Accommodations (Hotels) Story & Technical Specification

Last updated: September 1, 2025

## Story (User-facing)
As a traveler using Voyager's AI itinerary generator, I want the system to include recommended accommodations that match my travel preferences (especially star rating and user ratings), so that the AI-generated itinerary includes suitable hotel options alongside flights.

## Summary
Implement a single Firebase Callable function `searchAccommodations` that queries Google Places (via the existing `placesClient`) for hotels, applies filters derived from `TravelPreferenceProfile` (focus: `accommodation.starRating` and user ratings), and returns a normalized list of hotel recommendations. Update the frontend `useAIGeneration` hook to call this function alongside `searchFlights` and wait for both results before writing the canonical itinerary document at `/itineraries/{id}` so `response.recommendations` includes both `flights` and `hotels`.

## Checklist of requirements
- New callable Cloud Function `searchAccommodations` using `placesClient`.
- Use preference fields from `TravelPreferenceProfile`: `accommodation.type`, `accommodation.starRating`, `accessibility.mobilityNeeds`, `groupSize.preferred` (used as hints). Focus on star rating and Google user rating threshold (e.g., >= 3.5).
- Exclude price filters for now.
- `useAIGeneration` must call both callables, wait for both to settle, then `setDoc` with both datasets.
- Function and provider design must follow SOLID and be unit-testable.

## Assumptions
- We'll use the existing `placesClient` (extend with `findHotels(params)` if needed).
- If star rating is not available from Places, return `starRating: null` (do not invent values).
- Default `minUserRating` = 3.5 when not provided.
- `maxResults` default = 8 to limit quota usage and detail fetches.

## Cloud Function: `searchAccommodations` (callable)

Request shape:
```json
{
  "destination": "Paris, France",
  "destinationLatLng": { "lat": 48.8566, "lng": 2.3522 }, // optional
  "startDate": "2025-09-01",
  "endDate": "2025-09-08",
  "accommodationType": "hotel", // 'hotel'|'hostel'|'airbnb'|'resort'|'any'
  "starRating": 4, // optional
  "minUserRating": 4.0, // optional, default 3.5
  "accessibility": { "mobilityNeeds": true }, // optional
  "groupSize": 2, // optional
  "maxResults": 6
}
```

Response shape:
```json
{
  "success": true,
  "data": {
    "searchId": "hotels_1693570000_abcd",
    "hotels": [
      {
        "id": "place_1",
        "placeId": "ChIJ...",
        "name": "Hotel Example",
        "address": "1 Rue Example, 75001 Paris",
        "lat": 48.8566,
        "lng": 2.3522,
        "rating": 4.5,
        "userRatingsTotal": 1250,
        "starRating": 4,
        "types": ["lodging","hotel"],
        "photos": ["https://..."],
        "wheelchairAccessible": null,
        "amenities": ["wifi","parking"],
        "distanceMeters": 1200,
        "vendorRaw": { /* raw provider response (optional) */ }
      }
    ]
  }
}
```

Errors: standard `error: { code, message, details }` on failure.

## Provider changes
- Extend `functions/src/providers/placesClient.ts` (or existing provider) with `findHotels(params)` that:
  - Executes a Places TextSearch or NearbySearch using `accommodationType`, optional lat/lng, and keywords (e.g., "hotel", "resort").
  - For each candidate, fetch Place Details to gather rating, userRatingsTotal, types, photos, address, and any accessibility mentions.
  - Filter by `starRating` (>= requested) and `minUserRating` (>= requested).
  - Map to normalized hotel shape.
  - Respect a bounded concurrency for Place Details fetches (e.g., p-limit to 4 concurrent).

## `useAIGeneration` hook changes (frontend)
- Replace the single `searchFlights` call with parallel calls to both callables and wait for both to settle.
- Example flow:
  - const searchFlights = httpsCallable(functions, 'searchFlights');
  - const searchAccommodations = httpsCallable(functions, 'searchAccommodations');
  - const [flightRes, hotelRes] = await Promise.allSettled([
      searchFlights(flightPayload),
      searchAccommodations(hotelPayload)
    ]);
  - Extract `flights` and `hotels` from fulfilled results. If a promise was rejected, record the error into `response.error` and set `status: 'partial'`.
  - Only after both settle, call `setDoc(doc(db,'itineraries', itineraryId), { ... response: { recommendations: { flights, hotels } }})`.

- Keep the rest of the hook minimal; do not perform heavy transformations on the frontend.

## Firestore shape example (`itineraries`)
```js
{
  id: 'gen_...',
  userId: 'uid_123',
  status: 'completed' | 'partial',
  request: { /* AIGenerationRequest */ },
  response: {
    success: true,
    data: {
      itinerary: { ... },
      recommendations: {
        flights: [ /* from searchFlights */ ],
        hotels: [ /* from searchAccommodations */ ]
      },
      metadata: { generationId: 'gen_...', aiModel: 'flight-search-v1' }
    },
    error: { /* optional */ }
  },
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

## Acceptance criteria
1. New callable `searchAccommodations` exists and returns normalized hotel objects.
2. `useAIGeneration` calls both `searchFlights` and `searchAccommodations`, waits for both to settle, and writes a single itinerary document at `/itineraries/{id}` containing both `flights` and `hotels` arrays.
3. Hotels respect `accommodation.starRating` and a default user rating threshold.
4. Partial failures still write a document with available data and record errors.
5. Functions and provider are unit-tested.

## Edge cases
- No lat/lng available: fallback to text-based search by `destination` string.
- No hotels found: write an empty array and set `status` to `completed` (no results).
- Google Places rate limits: return partial results and log details.
- Accessibility flags may not be present in Places details; set `wheelchairAccessible: null` when unknown.

## SOLID & design notes
- `searchAccommodations` is a thin orchestrator: validate request, call `placesClient.findHotels`, map response, return result.
- `placesClient` encapsulates provider logic and can be swapped if needed.
- Keep frontend `useAIGeneration` lightweight (no raw API parsing).

## Tests to add
- Unit tests for `placesClient.findHotels` (mock Places responses).
- Unit tests for `searchAccommodations` (mock `placesClient`).
- Hook tests for `useAIGeneration` to ensure `setDoc` is called with `flights` and `hotels` (mock callables).
- Partial failure test: one callable rejects, the `/itineraries/{id}` doc includes the available data and error details.

---

If you want, I can implement the Cloud Function `functions/src/searchAccommodations.ts` and the `placesClient.findHotels` and then update `src/hooks/useAIGeneration.ts` to call both callables and write the merged document — then run unit tests and report results. Proceed? (No further questions from me given your prior inputs.)
