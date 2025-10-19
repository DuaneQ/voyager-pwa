/**
 * Custom React hook to delete an itinerary from Firestore.
 *
 * @returns {{
 *   deleteItinerary: (itineraryId: string) => Promise<void>,
 *   loading: boolean,
 *   error: Error | null
 * }}
 *
 * @example
 * const { deleteItinerary, loading, error } = useDeleteItinerary();
 * await deleteItinerary('itinerary-id');
 */

import { useState } from "react";
import { getFunctions, httpsCallable } from 'firebase/functions';
import useGetUserId from "./useGetUserId";

const useDeleteItinerary = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const userId: string | null = useGetUserId();

  const deleteItinerary = async (itineraryId: string) => {
    if (!userId) throw new Error("User not authenticated");

    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions();
      const fn = httpsCallable(functions, 'deleteItinerary');
      const res: any = await fn({ itineraryId });
      if (res?.data?.success) {
        setLoading(false);
        return;
      }
      throw new Error(res?.data?.error || 'Unexpected RPC response');
    } catch (err) {
      // Always surface RPC errors; tests should mock the functions SDK.
      const error = err instanceof Error ? err : new Error('RPC delete failed');
      setError(error);
      setLoading(false);
      console.error('deleteItinerary RPC error:', error);
      throw error;
    }
  };

  return { deleteItinerary, loading, error };
};

export default useDeleteItinerary;
