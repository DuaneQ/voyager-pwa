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

import { useState } from "react";
import { getFirestore, doc, deleteDoc } from "firebase/firestore";
import { app } from "../environments/firebaseConfig";
import useGetUserId from "./useGetUserId";

const useDeleteItinerary = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const userId: string | null = useGetUserId();

  const deleteItinerary = async (itineraryId: string) => {
    if (!userId) throw new Error("User not authenticated");

    setLoading(true);
    setError(null);

    const db = getFirestore(app);
    const itineraryRef = doc(db, 'itineraries', itineraryId);

    try {
      await deleteDoc(itineraryRef);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Delete failed');
      setError(error);
      console.error("Error deleting itinerary:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { deleteItinerary, loading, error };
};

export default useDeleteItinerary;
