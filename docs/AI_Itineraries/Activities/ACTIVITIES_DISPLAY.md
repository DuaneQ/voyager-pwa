# Activities — UI Display Contract

This document defines how AI-generated activities (Places API results) will be displayed in the AI itinerary UI. It specifies the expected API shape, the fields the UI will render, accessibility and layout guidelines, and SOLID-oriented implementation notes for the component.

## Expected API shape (minimally required)
Each activity object in `response.recommendations.activities` should include at least the following fields:

- id: string (Places `place_id` or a stable unique id)
- name: string
- types: string[] (Places types/categories)
- rating?: number
- user_ratings_total?: number
- geometry?: { location: { lat: number; lng: number } }
- vicinity?: string (short address / neighborhood)
- opening_hours?: any (optional summary)
- price_level?: number (optional)
- description?: string (optional; short excerpt or snippet)

If some fields are missing, the UI must gracefully omit or fallback (e.g., show "No rating" when rating is undefined).

## UI fields to render (per activity card)
- Title: name (required)
- Subtitle: vicinity or types.join(', ') fallback
- Rating: show rating and user_ratings_total when available (e.g., ★ 4.5 (120))
- Price: map price_level into strings ($, $$, $$$) if available
- Short description: render `description` when present
- Action buttons:
  - View details (opens full place details modal)
  - Add to itinerary (calls parent callback with the place object)

## Layout guidance
- Use a compact list/grid of cards. On desktop show 3 cards per row. On mobile show 1 card per row.
- Each card should be accessible (aria-label with name + vicinity) and keyboard navigable.

## SOLID design notes
- Single Responsibility (SRP): component must be presentational only — accept `activities: Activity[]` and `onAdd` / `onViewDetails` callbacks as props.
- Open/Closed: UI formatting options (e.g., showPrice boolean) should be optional props; behavior can be extended by composing the component rather than modifying it.
- Liskov Substitution: accept any data that conforms to the minimal contract; avoid runtime mutations.
- Interface Segregation: provide small prop interfaces rather than large monolithic ones.
- Dependency Inversion: do not import low-level services (e.g., fetch) inside the component; those are injected via props or handled in hooks/services.

## Error and empty states
- If `activities` is empty: show a friendly message and a button to re-run generation.
- If the array is missing or undefined: show the same empty state.
- If individual activity objects are missing optional fields (rating etc.) render fallbacks.

## Tests to add
- render a list of activities and assert name, vicinity, and rating rendered
- render activities where optional fields are missing and assert no crash and fallback text shown
- assert `onAdd` callback is invoked with correct object when Add button is clicked

## Example component contract
```ts
interface Activity {
  id: string;
  name: string;
  types?: string[];
  rating?: number;
  user_ratings_total?: number;
  geometry?: { location: { lat: number; lng: number } };
  vicinity?: string;
  description?: string;
}

interface Props {
  activities?: Activity[];
  onAdd?: (activity: Activity) => void;
  onViewDetails?: (activity: Activity) => void;
  showPrice?: boolean;
}
```

## Next steps
1. Implement `AIItineraryActivitiesDisplay` as a small presentational component.
2. Add unit tests described above following existing test patterns in `src/__tests__/components/`.
3. Wire the component into the AI itinerary display view.

> Keep the component small and testable; business logic (querying Places, parsing results) remains in `useAIGeneration` or server-side code.
