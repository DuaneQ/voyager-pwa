import { useState } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { app } from "../environments/environment";
import { Itinerary } from "../types/Itinerary";

const useSearchItineraries = () => {
  const [matchingItineraries, setMatchingItineraries] = useState<Itinerary[]>(
    []
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const searchItineraries = async (itinerary: Itinerary) => {
    setLoading(true);
    setError(null);

    try {
      const db = getFirestore(app);
      const itinerariesCollection = query(
        collection(db, `itineraries`),
        where("destination", "==", itinerary.destination)
      );

      console.log("query", itinerariesCollection);
      const snapshot = await getDocs(itinerariesCollection);
      const fetchedItineraries = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Itinerary[];
      console.log("Fetched itineraries:", fetchedItineraries);
      setMatchingItineraries(fetchedItineraries);
    } catch (err) {
      console.error("Error searching itineraries:", err);
      setError("Failed to search itineraries. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return { matchingItineraries, searchItineraries, loading, error };
};

export default useSearchItineraries;
