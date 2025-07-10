import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { app } from "../environments/firebaseConfig";

const db = getFirestore(app);

/**
 * Returns a deduplicated list of user IDs (and optionally profiles) that the current user is connected to,
 * excluding users already in the current chat and the current user.
 * @param currentUserId - The user performing the add
 * @param currentChatUserIds - Array of user IDs already in the chat
 * @returns Array of { userId, profile? }
 */
export async function getEligibleUsersForChat(currentUserId: string, currentChatUserIds: string[]): Promise<Array<{ userId: string; profile?: any }>> {
  // Query all connections where currentUserId is a member
  const q = query(collection(db, "connections"), where("users", "array-contains", currentUserId));
  const snapshot = await getDocs(q);
  const userIdSet = new Set<string>();
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    (data.users || []).forEach((uid: string) => {
      if (uid !== currentUserId && !currentChatUserIds.includes(uid)) {
        userIdSet.add(uid);
      }
    });
  });
  // Optionally, fetch user profiles here if needed
  return Array.from(userIdSet).map(userId => ({ userId }));
}
