import { useState, useEffect } from "react";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { app } from "../environments/environment";
import { Itinerary } from "../types/Itinerary";
import { getAuth } from "firebase/auth";

const useGetItinerariesFromFirestore = () => {
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItineraries = async () => {
    setLoading(true);
    setError(null);
    const userCredentials = localStorage.getItem("USER_CREDENTIALS");
    let userUid = userCredentials
      ? JSON.parse(userCredentials).user.uid
      : null;
    if (!userUid) {
      const auth = getAuth();
      userUid = auth.currentUser;
      if (userUid) {
        userUid = userUid.uid;
      } else {
        console.log("No authenticated user found.");
      }
      setError("User not authenticated. Please log in.");
    }
    try {
      const db = getFirestore(app);
      const userItinerariesCollection = collection(
        db,
        `itineraries`
      );

      const snapshot = await getDocs(userItinerariesCollection);
      const fetchedItineraries = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Itinerary[];

      setItineraries(fetchedItineraries);
      return fetchedItineraries;
    } catch (err) {
      console.error("Error fetching itineraries:", err);
      setError("Failed to fetch itineraries. Please try again later.");
      return [];
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    console.log("User UID from auth:");
    fetchItineraries();
  }, []);

  return { itineraries, fetchItineraries, loading, error };
};

export default useGetItinerariesFromFirestore;
