## Accommodations service (searchAccommodations)

Purpose
-------
This document explains how the `searchAccommodations` Cloud Function works, how we map user travel preferences into Places query/filter parameters, and gives a set of Postman-ready request bodies you can use to test each filter locally against the emulator or the deployed function.

Endpoint (local emulator)
--------------------------
- Callable endpoint (emulator):
  - http://127.0.0.1:5001/<PROJECT_ID>/us-central1/searchAccommodations
  - When testing against the emulator use the callable-shaped POST body (see examples below). The function accepts both callable-wrapped ({ data: { ... } }) and raw JSON bodies.

Input shape
-----------
The function expects these fields (all optional except `destination` when searching):

- destination: string (e.g. "Cancun, Mexico")
- destinationLatLng: { lat: number, lng: number }
- startDate / endDate: YYYY-MM-DD
- accommodationType: 'hotel'|'hostel'|'airbnb'|'resort'|'any'
- starRating: number (1-5)
- minUserRating: number (0-5)
- accessibility: { mobilityNeeds?: boolean; visualNeeds?: boolean; hearingNeeds?: boolean }
- groupSize: number
- maxResults: number (default 8)

High-level behavior
-------------------
1. The function builds a Google Places Text Search query (e.g. "hotel in Cancun, Mexico") and calls Places Text Search.
2. It maps Places results to a compact `Hotel` shape (id, placeId, name, address, lat/lng, rating, userRatingsTotal, inferred starRating, photos, amenities, distanceMeters).
3. After mapping it applies server-side filters: `minUserRating`, `starRating`, accessibility hints, and `maxResults`.

Mapping TravelPreferenceProfile -> search params
------------------------------------------------
When we start filtering based on user travel preferences (the `TravelPreferenceProfile` type), we map commonly used fields as follows:

- `preference.accommodation.type` -> `accommodationType` (hotel/hostel/airbnb/resort/any)
- `preference.accommodation.starRating` -> `starRating` (number)
- `preference.accessibility.mobilityNeeds` -> `accessibility.mobilityNeeds` (boolean)
- `preference.groupSize.preferred` -> `groupSize` (number) — used for future vendor filtering/pricing hints
- `preference.travelStyle` and `budgetRange` -> (future) price or `price_level` bias in Places (not implemented in the basic textsearch mapping yet)

Implementation notes / caveats
----------------------------
- Google Places does not reliably return wheelchair accessibility details in Text Search — treat accessibility filters as hints and expect limited coverage.
- `starRating` is inferred heuristically from `price_level` and `rating` when Google does not provide an explicit star rating.
- To make server-side filtering reproducible in tests, use fixtures under `tests/fixtures/places/*.json`.

Heuristic used in code
----------------------
When a numeric `starRating` is provided on the profile we derive a conservative `minUserRating` to filter results as follows:

- minUserRating = max(3.0, starRating - 1)

This keeps results reasonable (e.g., a 4-star preference will require around a 3.0+ user rating) while avoiding overly strict filters when starRating is low or missing. If you'd like a different mapping (for example, minUserRating = starRating - 0.5 or a stricter baseline of 3.5), tell me and I will adjust the implementation and tests.

Testing / Postman bodies
------------------------
Paste these JSON bodies into Postman (Body → raw → JSON) and POST to your local emulator endpoint. Replace `<EMULATOR_URL>` with your emulator URL or the deployed URL.

1) Basic search (callable-shaped) — same as the working example

{
  "data": {
    "destination": "Cancun, Mexico",
    "destinationLatLng": { "lat": 21.1619, "lng": -86.8515 },
    "startDate": "2025-01-10",
    "endDate": "2025-01-17",
    "accommodationType": "hotel",
    "starRating": 3,
    "minUserRating": 4.0,
    "maxResults": 6
  }
}

2) Filter by star rating only (3+)

{
  "data": {
    "destination": "Cancun, Mexico",
    "accommodationType": "any",
    "starRating": 3
  }
}

3) Filter by minimum user rating only (4.5+)

{
  "data": {
    "destination": "Cancun, Mexico",
    "minUserRating": 4.5
  }
}

4) Accommodation type variations (hostel, airbnb, resort)

Hostel:
{
  "data": { "destination": "Cancun, Mexico", "accommodationType": "hostel", "maxResults": 10 }
}

Airbnb (vacation rentals):
{
  "data": { "destination": "Cancun, Mexico", "accommodationType": "airbnb", "maxResults": 10 }
}

Resort:
{
  "data": { "destination": "Cancun, Mexico", "accommodationType": "resort", "maxResults": 10 }
}

5) Accessibility hint (mobilityNeeds true)

Note: coverage is limited; server will log a warning when filter cannot be fully applied.

{
  "data": {
    "destination": "Cancun, Mexico",
    "accessibility": { "mobilityNeeds": true },
    "maxResults": 8
  }
}

6) Group size hint (example for group of 4)

{
  "data": {
    "destination": "Cancun, Mexico",
    "groupSize": 4,
    "accommodationType": "any",
    "maxResults": 8
  }
}

7) Use only lat/lng bias (no textual destination)

{
  "data": {
    "destinationLatLng": { "lat": 21.1619, "lng": -86.8515 },
    "maxResults": 8
  }
}

8) Minimal request to test validation (missing destination) — expects HttpsError invalid-argument

{
  "data": { }
}

How to expand filtering
-----------------------
- Add server-side logic that reads the full `TravelPreferenceProfile` and translates additional fields to filters or scoring adjustments. Example:

  - `travelStyle: 'luxury'` -> prefer higher `price_level` and `starRating` when available
  - `budgetRange` -> bias results by `price_level` (if present in Places results) or post-filter by inferred price
  - `activities` -> when a user strongly prefers nature or relaxation, boost hotels whose `types` or `vendorRaw` include spa/park/beach references

- Implementation sketch (pseudo):

```ts
// profile -> params
const params = {
  accommodationType: profile.accommodation.type,
  starRating: profile.accommodation.starRating || undefined,
  minUserRating: profile.accommodation.starRating ? Math.max(3.5, profile.accommodation.starRating - 1) : 3.5
};

// After mapping, call Places and then post-filter/sort results
hotels = hotels.filter(h => h.rating >= params.minUserRating);
if (params.starRating) hotels = hotels.filter(h => h.starRating && h.starRating >= params.starRating);

// Apply boosts based on profile.activities (optional)
// hotels.sort((a,b) => score(b, profile) - score(a, profile));
```

Notes and next steps
--------------------
- Add tests that mock Places responses (use `tests/fixtures/places/*.json`) to assert filter behavior deterministically.
- Consider caching place details (or using Place Details API) if you need richer attributes like explicit amenities or accessibility fields.
- If you want, I can implement the first-pass mapping from `TravelPreferenceProfile` to call params and add unit tests that verify filtering logic using fixtures.
