
// Import at top, but do NOT create db or connRef at module scope
import { getFirestore, doc, updateDoc, arrayUnion, arrayRemove, getDoc } from "firebase/firestore";
import { app } from "../environments/firebaseConfig";

/**
 * Adds a user to a connection, tracking who added them.
 * @param connectionId - The connection document ID
 * @param userIdToAdd - The userId to add
 * @param addedByUserId - The userId who is adding
 */
export async function addUserToConnection(connectionId: string, userIdToAdd: string, addedByUserId: string) {
  // All Firestore calls must be inside the function for Jest mocks to work
  const db = getFirestore(app);
  const connRef = doc(db, "connections", connectionId);
  const connSnap = await getDoc(connRef);
  if (!connSnap.exists()) throw new Error("Connection not found");
  const data = connSnap.data();
  if (data.users.includes(userIdToAdd)) throw new Error("User already in chat");
  // Add to users and addedUsers
  await updateDoc(connRef, {
    users: arrayUnion(userIdToAdd),
    addedUsers: arrayUnion({ userId: userIdToAdd, addedBy: addedByUserId })
  });
  return true;
}

/**
 * Removes a user from a connection, only if the requesting user added them.
 * @param connectionId - The connection document ID
 * @param userIdToRemove - The userId to remove
 * @param requestingUserId - The userId requesting removal
 */
export async function removeUserFromConnection(connectionId: string, userIdToRemove: string, requestingUserId: string) {
  // All Firestore calls must be inside the function for Jest mocks to work
  const db = getFirestore(app);
  const connRef = doc(db, "connections", connectionId);
  const connSnap = await getDoc(connRef);
  if (!connSnap.exists()) throw new Error("Connection not found");
  const data = connSnap.data();
  // Find the addedUsers entry
  const addedEntry = (data.addedUsers || []).find((entry: any) => entry.userId === userIdToRemove);
  if (!addedEntry || addedEntry.addedBy !== requestingUserId) throw new Error("You can only remove users you added");
  // Remove from users and addedUsers
  await updateDoc(connRef, {
    users: arrayRemove(userIdToRemove),
    addedUsers: arrayRemove(addedEntry)
  });
  return true;
}
