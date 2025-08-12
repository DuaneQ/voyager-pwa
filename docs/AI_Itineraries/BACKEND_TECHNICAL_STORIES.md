**Story 2: Premium User Requests Auto-Generated Itinerary**
```
As a premium subscriber,
I want to generate a complete itinerary by inputting my trip parameters,
So that I can quickly get a detailed travel plan without manual research.

Acceptance Criteria:
- User must have active premium subscription
- User inputs trip parameters: destination, dates, group size, trip type
- User selects travel preference profile (from Story 1) 
- System generates complete itinerary with daily activities, timing, and logistics
- There's a backend service that find real flight data to provide in the itinerary.
- There's a backend service to validate if the user is a premium user.  The user record has 
subscriptionType that should === ai_premium
- There's a backend service to find lodging based on the user preferences.
- There's a prompt that will receive the user's preferences and create a daily itinerary.
- The system generates daily itinerary for the generation of the trip.
- The daily itinerary consists of suggestions for breakfast, lunch, dinner and excursions and activities based on user preferences.
- Generated itinerary is saved to user's account as searchable content
- The generated itinerary is normalized so that it can be used in Search.tsx drop down selector so the user can use the ai generated itineraries to find matches.
- Generation process shows progress indicators ("Finding activities...", "Optimizing schedule...")
- Itinerary includes all fields needed for platform search functionality
```

**Story 3: Editable AI-Generated Itinerary**
```
As a user,
I want to edit my AI-generated itinerary after it is created,
So that I can customize my travel plans to better fit my needs.

Acceptance Criteria:
- User can update, add, or remove activities, flights, hotels, and notes
- Edits are saved and reflected in the itinerary display (AIItineraryDisplay.tsx)
- Edit history or last-modified timestamp is tracked (updatedAt, updatedBy)
- Updates are written directly to Firestore from the UI (no backend update endpoint)
- Firestore Security Rules restrict edits to the owner or participants with edit permission
```

**Story 4: Share AI-Generated Itinerary**
```
As a user,
I want to share my itinerary with others,
So that my travel companions or friends can view or collaborate.

Acceptance Criteria:
- User can enable sharing via Firestore fields: visibility ('private' | 'link' | 'invited'), sharedWith (emails/userIds), participants
- Shared itineraries can be public (read-only via link token) or private
- Shared users can view (and optionally edit) the itinerary per permissions
- Optional Cloud Function may generate a secure shareId token; otherwise sharing is managed via Firestore writes from the UI
```

**Story 5: Group Itinerary Collaboration**
```
As a group traveler,
I want to collaborate on an itinerary with my group,
So that everyone can contribute and see updates.

Acceptance Criteria:
- Itinerary stores a participants[] array (user IDs) with roles (viewer/editor)
- Participants can view and edit the itinerary based on role
- System tracks who made each change (updatedBy/updatedAt)
- Access is enforced by Firestore Security Rules; no extra backend endpoints required
```

**Story 6: Rate Limiting for Premium Users**
```
As a premium user,
I want to generate up to 10 itineraries per day,
So that I can plan multiple trips without hitting unexpected limits.

Acceptance Criteria:
- Backend tracks itinerary generation count per user per day
- If limit exceeded, user receives a clear error message
- Rate limiting logic is enforced in backend service
```

**Story 7: Flight, Hotel, and Attraction Data Integration**
```
As a user,
I want my itinerary to include real flight, hotel, and attraction options,
So that my travel plan is actionable and up-to-date.

Acceptance Criteria:
- Backend integrates with the Amadeus API for flight data, covering all major American, European, and Asian airlines (including Delta Air Lines)
- Backend uses Google Places API for hotels and attractions
- API keys and credentials are securely managed
- If external APIs fail, backend returns a clear error and logs details
```

**Story 8: Travel Preference Profile Handling**
```
As a user,
I want the system to handle cases where I have not created a travel preference profile,
So that I can still generate an itinerary or be prompted to create one.

Acceptance Criteria:
- If no travel preference profile exists, backend triggers a popup in the UI
- User can choose to proceed with a generic itinerary or create a profile
- Backend generates a generic itinerary if user proceeds without a profile
```

**Story 9: Progress Feedback During Generation (Firestore Snapshots)**
```
As a user,
I want to see progress indicators while my itinerary is being generated,
So that I know the system is working and what stage it is in.

Acceptance Criteria:
- Backend writes progress updates to a Firestore job document (itineraryJobs/{jobId}) with fields: status, stage, percent, message
- Frontend subscribes to Firestore snapshot listeners on itineraryJobs/{jobId} to render real-time progress
- No polling HTTP endpoint required
```

**Story 10: Search & Retrieval for Itineraries**
```
As a user,
I want to select itineraries from dropdowns in AIItineraryDisplay.tsx and Search.tsx if their end date is not less than the current date (exclude expired itineraries),
So that I can easily find and use my generated itineraries.

Acceptance Criteria:
- Itineraries are stored in Firestore with normalized fields for fast client queries
- Client performs Firestore queries directly for dropdown selectors (destination, date range, tags)
- Queries exclude itineraries where endDate < today
```

**Story 11: Logging and Monitoring**
```
As a developer,
I want backend services to log requests, errors, and external API calls,
So that I can troubleshoot and monitor the system in production.

Acceptance Criteria:
- All backend functions log relevant events and errors using Google Cloud Functions logging
- Logs include userId, requestId, and error details
- Monitoring and health checks are implemented
```

**Story 12: API Design and Authentication (Minimal Backend)**
```
As a developer,
I want a minimal set of backend endpoints and simple authentication,
So that the system remains easy to maintain and fast.

Acceptance Criteria:
- Only required backend endpoint is for initiating itinerary generation (HTTP or Callable Cloud Function)
- Authentication uses Firebase Authentication context; no custom JWT handling is required
- All post-generation edits and searches are done via direct Firestore reads/writes from the UI
- API versioning remains /v1 for any HTTP-exposed functions
- Consistent error responses from the generation function
```

**Story 13: Firestore Security Rules**
```
As a security-conscious team,
I want robust Firestore Security Rules,
So that only authorized users can read/write itineraries and jobs.

Acceptance Criteria:
- Only the owner or invited participants can read/write an itinerary (role-based)
- Public/link-visible itineraries readable by link token, not writable
- Only the authenticated user can create generation jobs for themselves and read their own job progress
- Server-side generation function can write job progress and final itineraries
- Rules are covered by unit/integration tests
```