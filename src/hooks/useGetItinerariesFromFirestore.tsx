import { getFirestore, collection, getDocs } from "firebase/firestore";
import { app } from "../environments/environment";
import useGetUserId from "./useGetUserId";
import { Itinerary } from "../types/Itinerary";

const useGetItinerariesFromFirestore = () => {
  const userId: string | null = useGetUserId();

  const fetchItineraries = async (): Promise<Itinerary[]> => {
    if (!userId) {
      return [];
    }

    const db = getFirestore(app);
    const userItinerariesCollection = collection(
      db,
      `itineraries/${userId}/list`
    );

    try {
      const snapshot = await getDocs(userItinerariesCollection);
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Itinerary[];
    } catch (error) {
      console.error("Error fetching itineraries:", error);
      throw error;
    }
  };

  return { fetchItineraries };
};

export default useGetItinerariesFromFirestore;
