import { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, functions as firebaseFunctions } from '../environments/firebaseConfig';

export interface AIGeneratedItinerary {
  id: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  status?: 'processing' | 'completed' | 'failed';
  createdAt?: string;
  updatedAt?: string;
  response?: any;
}

/**
 * Hook: useAIGeneratedItineraries
 * - Always uses the functions RPC `listItinerariesForUser` to fetch AI itineraries.
 * - Does NOT use Firestore. Tests should mock `firebase/functions`.
 */
export const useAIGeneratedItineraries = () => {
  const [itineraries, setItineraries] = useState<AIGeneratedItinerary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAIItineraries = async () => {
    setLoading(true);
    setError(null);

    const currentUser = auth?.currentUser;
    if (!currentUser) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    try {
  const functions = firebaseFunctions || getFunctions();
  const fn = httpsCallable(functions, 'listItinerariesForUser');
      const res: any = await fn({ userId: currentUser.uid, ai_status: 'completed' });
      if (res?.data?.success && Array.isArray(res.data.data)) {
        setItineraries(res.data.data as AIGeneratedItinerary[]);
        return;
      }
      throw new Error(res?.data?.error || 'Unexpected RPC response');
    } catch (err: any) {
      console.error('listItinerariesForUser RPC error:', err);
      setError('Failed to load AI generated itineraries: ' + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const getItineraryById = async (id: string): Promise<AIGeneratedItinerary | null> => {
    const currentUser = auth?.currentUser;
    if (!currentUser) return null;

    try {
  const functions = firebaseFunctions || getFunctions();
  const fn = httpsCallable(functions, 'listItinerariesForUser');
      const res: any = await fn({ userId: currentUser.uid, ai_status: 'completed' });
      if (res?.data?.success && Array.isArray(res.data.data)) {
        return (res.data.data as AIGeneratedItinerary[]).find((it) => it.id === id) || null;
      }
      return null;
    } catch (err) {
      console.error('Error fetching itinerary by ID via RPC:', err);
      return null;
    }
  };

  useEffect(() => {
    fetchAIItineraries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    itineraries,
    loading,
    error,
    fetchAIItineraries,
    getItineraryById,
    refreshItineraries: fetchAIItineraries,
  };
};

export default useAIGeneratedItineraries;
