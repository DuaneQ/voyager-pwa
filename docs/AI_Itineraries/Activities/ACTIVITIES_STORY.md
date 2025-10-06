# AI Itineraries — Activities

## Goal
Use the user's travel preference profile (Activities + Food preferences) to search for relevant activities at the destination using Google Places (or a similar Places API). Activity results should be returned alongside flights and accommodations in the AI generation workflow and saved into the saved itinerary document at `/itineraries/{id}` under `response.recommendations.activities`.

## User story
AS A traveler
I WANT AI-generated itineraries to include suggested activities and experiences tailored to my activity and food preferences
SO THAT I can quickly see things to do and places to eat when planning a trip.

## Acceptance criteria
- [ ] When a user generates an AI itinerary the generation process queries Google Places for activities at the destination.
- [ ] The search uses the preference profile's activity scores (e.g., high "food" weight biases restaurants/food tours) and foodPreferences.cuisineTypes.
- [ ] Results are stored alongside flights and accommodations in the saved itinerary document at `/itineraries/{id}` under `response.recommendations.activities`.
- [ ] The saved activity objects include at minimum: id, name, types/categories, rating, user_ratings_total, geometry/location, and a short description or vicinity when available.
- [ ] The UI can render activities from the generated itinerary (this will be done in a follow-up UI task).

## Mapping preferences -> Places query
- Destination string or destinationAirportCode -> places location (use places textSearch or nearbySearch with lat/lng if available)
- activities weights (0-10) -> generate a prioritized list of Places `types` and keywords. Example mappings:
  - food >= 7 -> search for `restaurant`, `food`, `meal_takeaway`, use cuisineTypes as keywords
  - cultural >= 7 -> search for `museum`, `art_gallery`, `point_of_interest`, `historic_site`
  - adventure >= 7 -> search for `hiking`, `park`, `natural_feature`, `tourist_attraction`
  - nightlife >= 7 -> search for `bar`, `night_club`, `entertainment`
  - shopping >= 7 -> search for `shopping_mall`, `store`, `market`
  - relaxation >= 7 -> search for `spa`, `beach`, `park`
  - photography >= 7 -> search for `scenic_lookout`, `point_of_interest`, `landmark`

- Use the preference confidence via weight multipliers to request more or fewer results per category.

## Implementation notes (follow flights/hotels pattern)
- In `useAIGeneration` (or a shared service used by it):
  1. Build an `activitiesQuery` payload derived from the selected preference profile and form inputs (destination string, destinationLatLng if available).
  2. Call the Places API (preferably server-side via an existing cloud function or a proxied endpoint) with categories/keywords and location.
  3. Parse the Places response defensively (mirror accommodations parsing) to extract an array of activity objects.
  4. Add the result to the parallel promise set used by `useAIGeneration` and store the returned activities under `response.recommendations.activities` when saving the itinerary document at `/itineraries/{id}`.
  5. Implement graceful fallback: if the Places call fails, continue and save an empty array for activities and include a warning in metadata.

- Promise pattern: include activitiesCall alongside flightCall and accommodationsCall in the Promise.allSettled set. Guarantee that failing one does not cancel the others.

## Saved schema suggestion
```
response: {
  success: true,
  data: {
    itinerary: { ... },
    recommendations: {
      flights: [...],
      accommodations: [...],
      activities: [
        {
          id: string, // places place_id
          name: string,
          types: string[],
          rating?: number,
          user_ratings_total?: number,
          geometry?: { location: { lat: number; lng: number } },
          vicinity?: string,
          opening_hours?: any,
          price_level?: number,
        }
      ]
    }
  }
}
```

## Security & Quotas
- Call Places from a cloud function or server-side endpoint to protect API keys and to consolidate quota usage and caching.
- Cache common destinations or high-frequency queries for a short TTL to reduce quota consumption.

## Tests & Mocks
- Unit test: mock the Places call and assert activities are added to recommendations and saved to the itinerary document at `/itineraries/{id}`.
- Integration test: with local emulator or stubbed function, simulate Places responses for multiple categories and ensure merging behavior is correct.

## Next steps
- Implement Places call in cloud function (or reuse existing server-side search functions).
- Wire activities promise into `useAIGeneration` Promise.allSettled and save results in the canonical itinerary document (`/itineraries/{id}`).
- Add UI rendering for activities in the AI itinerary display component.

> Notes: follow the same defensive parsing logic used for `searchAccommodations` above; the Places response shape can vary depending on the API method used (textSearch / nearbySearch / placeDetails).
