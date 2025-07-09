import { getFirestore, doc, deleteDoc } from "firebase/firestore";
import { app } from "../environments/firebaseConfig";

export function useRemoveConnection() {
  const db = getFirestore(app);

  const removeConnection = async (connectionId: string) => {
    try {
      await deleteDoc(doc(db, "connections", connectionId));
      return { success: true };
    } catch (error) {
      console.error("Failed to remove connection:", error);
      return { success: false, error };
    }
  };

  return removeConnection;
}
