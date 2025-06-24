/**
 * Custom React hook to post a new itinerary to Firestore.
 *
 * @returns {{
 *   postItinerary: (itinerary: Itinerary) => Promise<void>,
 *   loading: boolean,
 *   error: Error | null
 * }}
 *
 * @example
 * const { postItinerary, loading, error } = usePostItineraryToFirestore();
 * await postItinerary(myItinerary);
 */

import { getFirestore, collection, addDoc } from "firebase/firestore";
import { app } from "../environments/firebaseConfig";
import useGetUserId from "./useGetUserId";
import { Itinerary } from "../types/Itinerary"; // Import the Itinerary type

const usePostItineraryToFirestore = () => {
  const userId: string | null = useGetUserId();

  const postItinerary = async (itinerary: Omit<Itinerary, "id">) => {
    if (!userId) throw new Error("User not authenticated");

    const db = getFirestore(app);
    const itinerariesCollection = collection(db, `itineraries`);

    try {
      const docRef = await addDoc(itinerariesCollection, itinerary); // Save the itinerary to Firestore
      return { id: docRef.id, ...itinerary };
    } catch (error) {
      console.error("Error posting itinerary:", error);
      throw error;
    }
  };

  return { postItinerary };
};

export default usePostItineraryToFirestore;
