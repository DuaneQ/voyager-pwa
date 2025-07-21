/**
 * Custom React hook to update an existing itinerary in Firestore.
 *
 * @returns {{
 *   updateItinerary: (itineraryId: string, updates: Partial<Itinerary>) => Promise<void>,
 *   loading: boolean,
 *   error: Error | null
 * }}
 *
 * @example
 * const { updateItinerary, loading, error } = useUpdateItinerary();
 * await updateItinerary('itinerary-id', { destination: 'New York' });
 */

import { getFirestore, doc, updateDoc } from "firebase/firestore";
import { app } from "../environments/firebaseConfig";
import useGetUserId from "./useGetUserId";
import { Itinerary } from "../types/Itinerary";

const useUpdateItinerary = () => {
  const userId: string | null = useGetUserId();

  const updateItinerary = async (itineraryId: string, updates: Partial<Omit<Itinerary, "id">>) => {
    if (!userId) throw new Error("User not authenticated");

    const db = getFirestore(app);
    const itineraryRef = doc(db, 'itineraries', itineraryId);

    try {
      await updateDoc(itineraryRef, updates);
    } catch (error) {
      console.error("Error updating itinerary:", error);
      throw error;
    }
  };

  return { updateItinerary };
};

export default useUpdateItinerary;
