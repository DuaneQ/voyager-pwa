/**
 * Custom React hook to update an existing itinerary in Firestore.
 *
 * @returns {{
 *   updateItinerary: (itineraryId: string, updates: Partial<Omit<Itinerary, "id">>) => Promise<void>,
 *   loading: boolean,
 *   error: Error | null
 * }}
 *
 * @example
 * const { updateItinerary, loading, error } = useUpdateItinerary();
 * await updateItinerary('itinerary-id', { destination: 'New York' });
 */

import { useState } from "react";
import { getFunctions, httpsCallable } from 'firebase/functions';
import useGetUserId from "./useGetUserId";
import { Itinerary } from "../types/Itinerary";

const useUpdateItinerary = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const userId: string | null = useGetUserId();

  const updateItinerary = async (itineraryId: string, updates: Partial<Omit<Itinerary, "id">>) => {
    if (!userId) throw new Error("User not authenticated");

    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions();
      const fn = httpsCallable(functions, 'updateItinerary');
      const res: any = await fn({ itineraryId, updates });
      if (res?.data?.success) {
        setLoading(false);
        return res.data.data;
      }
      throw new Error(res?.data?.error || 'Unexpected RPC response');
    } catch (err) {
      // Always surface RPC errors; tests should mock the functions SDK.
      const error = err instanceof Error ? err : new Error('RPC update failed');
      setError(error);
      setLoading(false);
      console.error('updateItinerary RPC error:', error);
      throw error;
    }
  };

  return { updateItinerary, loading, error };
};

export default useUpdateItinerary;
