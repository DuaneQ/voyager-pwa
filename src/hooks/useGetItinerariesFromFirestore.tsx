import { useState, useCallback } from "react";
import {
  getFirestore,
  collection,
  getDocs,
  where,
  query,
} from "firebase/firestore";
import { app } from "../environments/firebaseConfig";
import { Itinerary } from "../types/Itinerary";
import { getAuth } from "firebase/auth";

const useGetItinerariesFromFirestore = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItineraries = useCallback(async () => {
    setLoading(true);
    setError(null);
    const userCredentials = localStorage.getItem("USER_CREDENTIALS");
    let userUid = userCredentials ? JSON.parse(userCredentials).user.uid : null;
    if (!userUid) {
      const auth = getAuth();
      userUid = auth.currentUser;
      if (userUid) {
        userUid = userUid.uid;
      } else {
        console.log("No authenticated user found.");
        setError("User not authenticated. Please log in.");
        setLoading(false);
        return [];
      }
    }
    try {
      const db = getFirestore(app);

      const userItinerariesCollection = query(
        collection(db, `itineraries`),
        where("userInfo.uid", "==", userUid)
      );
      const snapshot = await getDocs(userItinerariesCollection);
      const fetchedItineraries = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Itinerary[];
      console.log("Fetched itineraries:", fetchedItineraries);
      return fetchedItineraries;
    } catch (err) {
      console.error("Error fetching itineraries:", err);
      setError("Failed to fetch itineraries. Please try again later.");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchItineraries, loading, error };
};

export default useGetItinerariesFromFirestore;
