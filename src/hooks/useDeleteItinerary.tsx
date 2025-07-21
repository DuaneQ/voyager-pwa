/**
 * Custom React hook to delete an itinerary from Firestore.
 *
 * @returns {{
 *   deleteItinerary: (itineraryId: string) => Promise<void>,
 *   loading: boolean,
 *   error: Error | null
 * }}
 *
 * @example
 * const { deleteItinerary, loading, error } = useDeleteItinerary();
 * await deleteItinerary('itinerary-id');
 */

import { getFirestore, doc, deleteDoc } from "firebase/firestore";
import { app } from "../environments/firebaseConfig";
import useGetUserId from "./useGetUserId";

const useDeleteItinerary = () => {
  const userId: string | null = useGetUserId();

  const deleteItinerary = async (itineraryId: string) => {
    if (!userId) throw new Error("User not authenticated");

    const db = getFirestore(app);
    const itineraryRef = doc(db, 'itineraries', itineraryId);

    try {
      await deleteDoc(itineraryRef);
    } catch (error) {
      console.error("Error deleting itinerary:", error);
      throw error;
    }
  };

  return { deleteItinerary };
};

export default useDeleteItinerary;
