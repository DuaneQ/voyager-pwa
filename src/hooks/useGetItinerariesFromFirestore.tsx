import { useState, useCallback } from "react";
import { getFunctions, httpsCallable } from 'firebase/functions';
import { functions as firebaseFunctions } from '../environments/firebaseConfig';
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
      // Call the RPC directly. Do NOT fall back to Firestore — production
      // must rely on the canonical Prisma-backed service.
  // Use the shared Functions instance exported from our firebaseConfig so
  // we don't accidentally create a differently-configured Functions instance
  // which can lead to cross-origin / host mismatches.
  const functions = firebaseFunctions || getFunctions();
  const fn = httpsCallable(functions, 'listItinerariesForUser');
      const res: any = await fn({ userId: userUid });
      if (res?.data?.success && Array.isArray(res.data.data)) {
        return res.data.data as Itinerary[];
      }
      // If RPC didn't return success, surface an error so the caller can
      // handle it (do not silently fall back to Firestore).
      const msg = res?.data?.error || 'Unexpected RPC response';
      throw new Error(msg);
    } catch (err) {
      console.error('listItinerariesForUser RPC error:', err);
      setError((err as any)?.message || 'Failed to fetch itineraries from service');
      // Re-throw so calling components/tests can detect failure if needed
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchItineraries, loading, error };
};

export default useGetItinerariesFromFirestore;
