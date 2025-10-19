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

import useGetUserId from "./useGetUserId";
import { Itinerary } from "../types/Itinerary"; // Import the Itinerary type
import { getFunctions, httpsCallable } from 'firebase/functions';

const usePostItineraryToFirestore = () => {
  const userId: string | null = useGetUserId();

  const postItinerary = async (itinerary: Omit<Itinerary, "id">) => {
    if (!userId) throw new Error("User not authenticated");

    try {
      const functions = getFunctions();
      const fn = httpsCallable(functions, 'createItinerary');
      const res: any = await fn({ itinerary: { ...itinerary, userId } });
      if (res?.data?.success) return res.data.data;

      throw new Error(res?.data?.error || 'Unexpected RPC response');
    } catch (err) {
      // Always surface RPC errors; do not fallback to Firestore. Tests should
      // mock the functions SDK instead of relying on Firestore.
      console.error('createItinerary RPC error:', err);
      throw err;
    }
  };

  return { postItinerary };
};

export default usePostItineraryToFirestore;
