import { getFirestore, collection, addDoc } from "firebase/firestore";
import { app } from "../environments/environment";
import useGetUserId from "./useGetUserId";
import { Itinerary } from "../types/Itinerary"; // Import the Itinerary type

const usePostItineraryToFirestore = () => {
  const userId: string | null = useGetUserId();

  const postItinerary = async (itinerary: Omit<Itinerary, "id">) => {
    if (!userId) throw new Error("User not authenticated");

    const db = getFirestore(app);
    const itinerariesCollection = collection(db, `itineraries/${userId}/list`);

    try {
      await addDoc(itinerariesCollection, itinerary); // Save the itinerary to Firestore
    } catch (error) {
      console.error("Error posting itinerary:", error);
      throw error;
    }
  };

  return { postItinerary };
};

export default usePostItineraryToFirestore;
