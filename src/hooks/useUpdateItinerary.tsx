/**
 * Custom React hook to update an existing itinerary in Firestore.
 *
 * @returns {{
 *   updateItinerary: (itineraryId: string, updates: Partial<Omit<Itinerary, "id">>) => Promise<void>,
 *   loading: boolean,
 *   error: Error | null
 * }}
 *
 * @example
 * const { updateItinerary, loading, error } = useUpdateItinerary();
 * await updateItinerary('itinerary-id', { destination: 'New York' });
 */

import { useState } from "react";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { app } from "../environments/firebaseConfig";
import useGetUserId from "./useGetUserId";
import { Itinerary } from "../types/Itinerary";

const useUpdateItinerary = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const userId: string | null = useGetUserId();

  const updateItinerary = async (itineraryId: string, updates: Partial<Omit<Itinerary, "id">>) => {
    if (!userId) throw new Error("User not authenticated");

    setLoading(true);
    setError(null);

    const db = getFirestore(app);
    const itineraryRef = doc(db, 'itineraries', itineraryId);

    try {
      await updateDoc(itineraryRef, updates);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Update failed');
      setError(error);
      console.error("Error updating itinerary:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { updateItinerary, loading, error };
};

export default useUpdateItinerary;
