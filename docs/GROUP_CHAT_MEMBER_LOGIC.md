# Group Chat Member Add/Remove Logic

This document explains how the logic for adding and removing users from a group chat works in the Voyager PWA, including all relevant components, hooks, and utilities.

## Overview

- **Only the user who added another user can remove them from the chat.**
- The UI only shows the remove button for users that the current user added.
- Usernames (not UIDs) are displayed throughout the UI.
- All logic is robust, testable, and covered by unit tests.

---

## Main Components & Files

### 1. `ManageChatMembersModal.tsx`
- Modal for viewing, adding, and removing chat members.
- Receives the full user list, current user ID, and callbacks for add/remove actions.
- **Shows the remove button only for users where `user.addedBy === currentUserId`.**
- Displays avatars and usernames.
- Accessible and responsive.

### 2. `ChatModal.tsx`
- Parent modal for chat interactions.
- Passes the correct `addedBy` info for each user to `ManageChatMembersModal`.
- Handles opening/closing the manage members modal.

### 3. `connectionUtils.ts`
- Contains utility functions for adding and removing users from a chat connection in Firestore.
- **`addUserToConnection`**: Adds a user to the chat and records the `addedBy` field as the current user's UID.
- **`removeUserFromConnection`**: Removes a user from the chat **only if the current user is the one who added them** (checks `addedBy`).
- All Firestore calls are encapsulated for easy mocking/testing.

### 4. `Connection.ts` (Type)
- Defines the user/member object structure, including `uid`, `username`, `avatarUrl`, and `addedBy`.

### 5. Tests
- **`ManageChatMembersModal.test.tsx`**: Tests all UI logic, including permission checks, accessibility, and edge cases.
- **`connectionUtils.test.ts`**: Tests backend logic for add/remove, including permission enforcement.

---

## Add User Flow
1. User clicks "Add Existing Connections" in `ManageChatMembersModal`.
2. Parent component (e.g., `ChatModal`) opens a user picker.
3. On confirmation, `addUserToConnection` is called with the selected user's UID and the current user's UID as `addedBy`.
4. Firestore is updated; the new user appears in the modal with the correct `addedBy`.

## Remove User Flow
1. Remove button is only shown for users where `user.addedBy === currentUserId`.
2. When clicked, `removeUserFromConnection` is called.
3. The utility checks that the current user is the one who added the target user before removing.
4. Firestore is updated; the user is removed from the chat.

---

## Key Permission Logic
- **A user cannot remove themselves.**
- **A user can only remove users they added.**
- **No one else can remove a user they did not add.**

---

## Extensibility
- All logic is encapsulated in utilities and thoroughly tested.
- UI is accessible and robust.
- Easy to extend for future permission models or UI changes.

---


---

## Database Structure & Diagram

### Firestore `connections` Collection

Each group chat is represented by a document in the `connections` collection. The relevant fields for member management are:

```
connections (collection)
  └─ {connectionId} (document)
      ├─ users: [uid, ...]                // Array of user UIDs in the chat
      ├─ addedUsers: [                    // Array of objects tracking who added whom
      │     {
      │       userId: string,             // UID of the user who was added
      │       addedBy: string             // UID of the user who added them
      │     },
      │     ...
      │   ]
      ├─ itineraries: [ ... ]             // (Other chat metadata, not shown)
      └─ ... (other fields)
```

### Diagram

```mermaid
erDiagram
  CONNECTION {
    string id
    string[] users
    AddedUser[] addedUsers
    ...
  }
  AddedUser {
    string userId
    string addedBy
  }
  CONNECTION ||--o{ AddedUser : has
```

**Explanation:**
- `users` is a flat array of all user UIDs in the chat.
- `addedUsers` is an array of objects, each recording which user (`userId`) was added and by whom (`addedBy`).
- This structure allows the app to enforce that only the adder can remove a user, and to display the correct UI.

For further details, see the code and tests in the referenced files.
