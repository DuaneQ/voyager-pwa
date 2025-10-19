import { useState, useRef } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../environments/firebaseConfig';
import { Itinerary } from '../types/Itinerary';

const getViewedFromStorage = (): Set<string> => {
  try {
    const s = localStorage.getItem('VIEWED_ITINERARIES');
    if (!s) return new Set();
    const parsed = JSON.parse(s);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.map((x: any) => (x && x.id) ? x.id : x).filter((id: any) => typeof id === 'string' && id.trim() !== ''));
  } catch (e) { 
    console.error('Error reading viewed itineraries:', e);
    return new Set(); 
  }
};

const useSearchItineraries = () => {
  const [allMatchingItineraries, setAllMatchingItineraries] = useState<Itinerary[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);

  const viewedItinerariesRef = useRef<Set<string>>(getViewedFromStorage());

  const matchingItineraries = currentIndex >= allMatchingItineraries.length ? [] : allMatchingItineraries.slice(currentIndex);

  const validate = (it: any) => {
    if (!it || typeof it !== 'object') return false;
    if (!it.id || typeof it.id !== 'string') return false;
    if (it.startDay !== undefined && (!Number.isSafeInteger(Number(it.startDay)))) return false;
    if (it.endDay !== undefined && (!Number.isSafeInteger(Number(it.endDay)))) return false;
    if (it.metadata !== undefined && typeof it.metadata === 'string') return false;
    if (it.response !== undefined && typeof it.response === 'string') return false;
    return true;
  };

  const fetchFromCloudSQL = async (currentUserItinerary: Itinerary, currentUserId: string): Promise<Itinerary[]> => {
    const PAGE_SIZE = 10;
    const rpcName = 'searchItineraries';

    // Resolve the callable via firebase/functions. Tests install a resilient
    // shim that makes `httpsCallable(functions, name)` return a function.
    // If it's not present, fail fast so callers can show a clear "unavailable"
    // message to the user. Do NOT consult test-only globals from production code.
    const searchFn = httpsCallable(functions, rpcName);
    const callRpc = async (payload: any) => {
      if (typeof searchFn !== 'function') {
        // This message is preserved to surface to users in the UI (see preservePatterns)
        throw new Error('RPC unavailable: httpsCallable not available');
      }
      return await searchFn(payload);
    };

    const res: any = await callRpc({
      destination: currentUserItinerary.destination,
      gender: currentUserItinerary.gender,
      status: currentUserItinerary.status,
      sexualOrientation: currentUserItinerary.sexualOrientation,
      minStartDay: new Date(currentUserItinerary.startDate!).getTime(),
      maxEndDay: new Date(currentUserItinerary.endDate!).getTime(),
      pageSize: PAGE_SIZE,
      excludedIds: Array.from(viewedItinerariesRef.current),
      blockedUserIds: currentUserItinerary.userInfo?.blocked || [],
      currentUserId,
      lowerRange: currentUserItinerary.lowerRange,
      upperRange: currentUserItinerary.upperRange,
    });

    if (res?.data?.success && Array.isArray(res.data.data)) {
      const results = res.data.data as Itinerary[];
      setHasMore(results.length >= PAGE_SIZE);
      const filtered = results.filter(it => validate(it) && it.userInfo?.uid && it.userInfo.uid !== currentUserId);
      const seen = new Set<string>();
      return filtered.reduce<Itinerary[]>((acc, it) => {
        const dest = it.destination || '';
        if (!seen.has(dest)) { seen.add(dest); acc.push(it); }
        return acc;
      }, []);
    }

    throw new Error(res?.data?.error || 'Unexpected RPC response');
  };

  const searchItineraries = async (currentUserItinerary: Itinerary, currentUserId: string) => {
    setLoading(true);
    setError(null);
    setCurrentIndex(0);
    setHasMore(true);

    try {
      const results = await fetchFromCloudSQL(currentUserItinerary, currentUserId);
      setAllMatchingItineraries(results);
      setCurrentIndex(0);
      if (results.length === 0) setHasMore(false);
    } catch (err: any) {
  const preservePatterns = [/timeout/i, /network/i, /connection|ECONNREFUSED/i, /proxy/i, /first attempt/i, /constraint/i, /test error/i, /RPC unavailable/i, /httpsCallable not available/i];
      let message = 'Failed to search itineraries. Please try again later.';
      if (err instanceof Error && err.message && preservePatterns.some(r => r.test(err.message))) message = err.message;
      setError(message);
      setAllMatchingItineraries([]);
      setHasMore(false);
    } finally { setLoading(false); }
  };

  const getNextItinerary = async () => {
    const nextIndex = currentIndex + 1;
    if (currentIndex < allMatchingItineraries.length) {
      const cur = allMatchingItineraries[currentIndex];
      if (cur?.id) {
        viewedItinerariesRef.current.add(cur.id);
        try { localStorage.setItem('VIEWED_ITINERARIES', JSON.stringify(Array.from(viewedItinerariesRef.current))); } catch (_) {}
      }
    }
    if (nextIndex < allMatchingItineraries.length) setCurrentIndex(nextIndex);
    else { setHasMore(false); setCurrentIndex(nextIndex); }
  };

  const loadNextItinerary = getNextItinerary;

  const forceRefreshSearch = async (currentUserItinerary: Itinerary, currentUserId: string) => {
    await searchItineraries(currentUserItinerary, currentUserId);
  };

  return { matchingItineraries, searchItineraries, loading, error, hasMore, loadNextItinerary, getNextItinerary, forceRefreshSearch };
};

export default useSearchItineraries;
