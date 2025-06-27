
## Template 2: React Hook Unit Test

```markdown
# React Hook Unit Test Template

## Hook Information
- **Hook:** [Hook Name]
- **File Path:** [Hook Path]
- **Description:** [Brief description of hook functionality]

## Test Setup

"Test Request Template": {
  "prefix": "test-request",
  "body": [
    "# Unit Test Request Template",
    "",
    "## Component to Test",
    "[Filename and component name]",
    "",
    "## Component Dependencies",
    "- External libraries: [List major libraries the component uses]",
    "- Firebase services: [List any Firebase services used]",
    "- React hooks: [List custom & built-in hooks used]",
    "- Context providers: [List any context the component consumes]",
    "",
    "## Key Behaviors to Test",
    "[List 3-5 main behaviors the component should exhibit]",
    "",
    "## Mocking Requirements",
    "[Any specific functions/modules that need mocking]",
    "",
    "## Example Component Usage",
    "[Simple example of how the component is used]"
  ],
  "description": "Request template for unit tests"
}

Unit Test Request Template -> Hooks
Component to Test
useSearchItineraries.tsx - Custom hook for searching itineraries from Firestore based on destination and gender

Component Dependencies
External libraries: React (useState)
Firebase services: getFirestore, collection, query, where, getDocs from firebase/firestore
React hooks: useState
Context providers: None
Key Behaviors to Test
Initial state should have empty matchingItineraries array, loading=false, and error=null
searchItineraries function should set loading=true while fetching data
On successful API call, matchingItineraries should be populated with the fetched data
On API error, error state should be set with appropriate message
Multiple consecutive searches should clear previous results and start fresh
Mocking Requirements
Mock Firebase Firestore (getFirestore, collection, query, where, getDocs)
Mock Firestore query responses with sample itinerary data
Mock Firestore error scenarios


-------------------------------------------------------------------------------
Unit Test Request Template -> Components
Component to Test
ChatModal.tsx - Modal that appears when a connection is selected on the chat page.  Users chat within the chat modal.  The messages should be order from oldest to newest. The Chat modal has the following props:
  open: boolean;
  onClose: () => void;
  connection: Connection;
  messages: Message[];
  userId: string;
  otherUserPhotoURL: string;
  onPullToRefresh: () => Promise<void>;
  hasMoreMessages: boolean;

  Users can execute a pull down to retrieve older messages.

Component Dependencies
External libraries: React (useState)
Firebase services:   getFirestore,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  doc,
  increment, from firebase/firestore
React hooks: useEffect, useState
Context providers: Protected, UserProfileProvider, NewConnectionProvider, AlertProvider, SnackbarProvider
Key Behaviors to Test
Initial state should have no messages if the users have never chatted.  Otherwise if they have chatted the modal should have the last 10 messages.  If a user pulls down in the chat modal it will retrieve 10 more from a previous chat.  When a user sends a message, the other user should be able to see that message in the chat window.

Mocking Requirements
Mock Firebase Firestore (getFirestore,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  doc,)
Mock Firestore error scenarios