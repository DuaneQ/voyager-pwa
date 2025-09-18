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
      userUid = typeof auth !== 'undefined' && auth.currentUser ? auth.currentUser.uid : null;
      if (!userUid) {
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

      // Also attempt to fetch AI-generated itineraries saved in `ai_generations`.
      // These documents store the generated itinerary inside response.data.itinerary
      try {
        const aiQuery = query(
          collection(db, `ai_generations`),
          where('userId', '==', userUid)
        );
        const aiSnapshot = await getDocs(aiQuery);
        const aiItineraries = aiSnapshot.docs
          .map((d) => {
            try {
              const data = d.data() as any;
              const resp = data.response || data.response?.data || null;
              const itinerary = resp?.data?.itinerary || resp?.itinerary || data?.itinerary || null;
              if (itinerary) return { id: itinerary.id || d.id, ...itinerary } as Itinerary;
            } catch (e) {
              return null;
            }
            return null;
          })
          .filter(Boolean) as Itinerary[];

        // Merge AI itineraries with normal itineraries, avoiding duplicates by id
        const combined = [...fetchedItineraries];
        for (const aiIt of aiItineraries) {
          if (!combined.find((it) => it.id === aiIt.id)) combined.push(aiIt);
        }

        return combined as Itinerary[];
      } catch (e) {
        // If ai_generations query fails, return the normal itineraries
        return fetchedItineraries;
      }
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
