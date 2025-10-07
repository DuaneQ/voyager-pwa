import { useState } from "react";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
  QueryConstraint,
} from "firebase/firestore";
import { app } from "../environments/firebaseConfig";
import { Itinerary } from "../types/Itinerary";
import { searchCache } from "../utils/searchCache";

const VIEWED_STORAGE_KEY = "VIEWED_ITINERARIES";

interface SearchParams {
  currentUserItinerary: Itinerary;
  currentUserId: string;
}

const useSearchItineraries = () => {
  const [matchingItineraries, setMatchingItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [currentSearchParams, setCurrentSearchParams] = useState<SearchParams | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);

  // Helper function to calculate age from date of birth
  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Helper function to get viewed itineraries from localStorage
  const getViewedItineraries = (): string[] => {
    try {
      const viewed = localStorage.getItem(VIEWED_STORAGE_KEY);
      return viewed ? JSON.parse(viewed) : [];
    } catch (error) {
      console.error("Error reading viewed itineraries:", error);
      return [];
    }
  };

  // Helper function to check date overlap
  const datesOverlap = (userStart: number, userEnd: number, otherStart: number, otherEnd: number): boolean => {
    return userStart <= otherEnd && userEnd >= otherStart;
  };

  // Generate cache key for search parameters
  const generateCacheKey = (params: SearchParams): string => {
    const { currentUserItinerary } = params;
    return searchCache.generateCacheKey({
      destination: currentUserItinerary.destination,
      userProfile: {
        gender: currentUserItinerary.gender,
        status: currentUserItinerary.userInfo?.status,
        sexualOrientation: currentUserItinerary.sexualOrientation,
      }
    });
  };

  // Apply client-side filters
  const applyClientSideFilters = (results: Itinerary[], params: SearchParams): Itinerary[] => {
    const { currentUserItinerary, currentUserId } = params;
    const userStartDay = new Date(currentUserItinerary.startDate!).getTime();
    const userEndDay = new Date(currentUserItinerary.endDate!).getTime();
    const viewedItineraries = getViewedItineraries();

    return results.filter((itinerary) => {
      // 1. Exclude current user's itineraries
      if (itinerary.userInfo?.uid === currentUserId) {
        return false;
      }

      // 2. Exclude already viewed itineraries
      if (viewedItineraries.includes(itinerary.id)) {
        return false;
      }

      // 3. Check precise date overlap
      if (itinerary.startDay && itinerary.endDay) {
        if (!datesOverlap(userStartDay, userEndDay, itinerary.startDay, itinerary.endDay)) {
          return false;
        }
      }

      // 4. Check age range compatibility
      if (itinerary.userInfo?.dob && currentUserItinerary.lowerRange && currentUserItinerary.upperRange) {
        const otherUserAge = calculateAge(itinerary.userInfo.dob);
        
        if (otherUserAge < currentUserItinerary.lowerRange || otherUserAge > currentUserItinerary.upperRange) {
          return false;
        }
      }

      // 5. Check if current user's age falls within other user's range
      if (currentUserItinerary.userInfo?.dob && itinerary.lowerRange && itinerary.upperRange) {
        const currentUserAge = calculateAge(currentUserItinerary.userInfo.dob);
        
        if (currentUserAge < itinerary.lowerRange || currentUserAge > itinerary.upperRange) {
          return false;
        }
      }
      
      return true;
    });
  };

  // Fetch from Firestore with pagination
  const fetchFromFirestore = async (params: SearchParams, isNewSearch: boolean = true): Promise<Itinerary[]> => {
    const { currentUserItinerary } = params;
    const userStartDay = new Date(currentUserItinerary.startDate!).getTime();

    const PAGE_SIZE = 2;
    // Build query constraints with proper typing, skip filters if 'No Preference' or empty
    const constraints: QueryConstraint[] = [
      where("destination", "==", currentUserItinerary.destination),
      ...(currentUserItinerary.gender && currentUserItinerary.gender !== "No Preference"
        ? [where("userInfo.gender", "==", currentUserItinerary.gender)]
        : []),
      ...(currentUserItinerary?.status && currentUserItinerary?.status !== "No Preference"
        ? [where("userInfo.status", "==", currentUserItinerary?.status)]
        : []),
      ...(currentUserItinerary.sexualOrientation && currentUserItinerary.sexualOrientation !== "No Preference"
        ? [where("userInfo.sexualOrientation", "==", currentUserItinerary.sexualOrientation)]
        : []),
      where("endDay", ">=", userStartDay),
      orderBy("endDay"),
      limit(PAGE_SIZE) // Fetch 2 at a time to reduce Firestore reads/costs
    ];

    // Add pagination cursor for subsequent requests
    if (!isNewSearch && lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const db = getFirestore(app);
    const itinerariesQuery = query(collection(db, "itineraries"), ...constraints);
    const snapshot = await getDocs(itinerariesQuery);

    // Debug: log results from Firestore query (counts + ids)
    try {
      const itinIds = (snapshot?.docs || []).map((d: any) => d.id);
    } catch (e) {
      // defensive
    }
    
    // Update pagination state
    if (snapshot.docs && snapshot.docs.length > 0) {
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
    }
  // If the itineraries collection returned at least a full page, indicate there may be more
  setHasMore((snapshot.docs && snapshot.docs.length >= PAGE_SIZE));

    const regularItineraries: Itinerary[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Itinerary[];

    // Dedupe just in case and preserve order
    const seen = new Set<string>();
    const unique: Itinerary[] = [];
    for (const it of regularItineraries) {
      if (!it || !it.id) continue;
      if (seen.has(it.id)) continue;
      seen.add(it.id);
      unique.push(it);
    }

    return unique;
  };
  // Main search function
  const searchItineraries = async (currentUserItinerary: Itinerary, currentUserId: string) => {    

    // ✅ Reset cache flag at start of new search
    setIsFromCache(false);
    
    const params: SearchParams = { currentUserItinerary, currentUserId };
    setCurrentSearchParams(params);

    const cacheKey = generateCacheKey(params);    
    const cachedResults = searchCache.get(cacheKey);
    
    if (cachedResults) {
      setIsFromCache(true);
      setHasMore(false); // No more to load from cache

      const filteredResults = applyClientSideFilters(cachedResults, params);
      setMatchingItineraries(filteredResults);
      setLoading(false);
      
      // 👈 ADD THESE LINES - Reset pagination for cached results
      setLastDoc(null);  // Reset pagination cursor
      
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      // Reset pagination state for new search
      setLastDoc(null);
      setHasMore(true);

      // Fetch first page from Firestore
      const results = await fetchFromFirestore(params, true);
      // Cache the raw results (before filtering)
      searchCache.set(cacheKey, results);
      
      // Apply filters and set results
      const filteredResults = applyClientSideFilters(results, params);
      setMatchingItineraries(filteredResults);
      
    } catch (err) {
      console.error("Error searching itineraries:", err);
      setError("Failed to search itineraries. Please try again later.");
      setMatchingItineraries([]);
    } finally {
      setLoading(false);
    }
  };

  // Load more results (called when user needs more matches)
  const loadMoreMatches = async () => {
    if (!currentSearchParams || loading || !hasMore) {
      return;
    }

    setLoading(true);

    try {      
      // Fetch next page
      const moreResults = await fetchFromFirestore(currentSearchParams, false);
      
      if (moreResults.length > 0) {
        // Apply filters to new results
        const filteredNewResults = applyClientSideFilters(moreResults, currentSearchParams);
        
        // Append to existing results
        setMatchingItineraries(prev => [...prev, ...filteredNewResults]);
        
        // Update cache with combined results
        const cacheKey = generateCacheKey(currentSearchParams);
        const existingCached = searchCache.get(cacheKey) || [];
        searchCache.set(cacheKey, [...existingCached, ...moreResults]);
      }
      
    } catch (err) {
      console.error("Error loading more matches:", err);
      setError("Failed to load more matches.");
    } finally {
      setLoading(false);
    }
  };

  // Check if we need more matches (call this when user is near the end)
  const checkForMoreMatches = (currentIndex: number, bufferSize: number = 3) => {
    const remainingMatches = matchingItineraries.length - currentIndex - 1;
    
    // 👈 ADD BOUNDS CHECK
    if (remainingMatches < 0 || currentIndex >= matchingItineraries.length) {
      return; // Don't load more if we're already past the end
    }
    
    if (remainingMatches <= bufferSize && hasMore && !loading && !isFromCache) {
      loadMoreMatches();
    }
  };

  // Clear cache (useful for debugging or forced refresh)
  const clearSearchCache = () => {
    searchCache.clear();
  };

  return { 
    matchingItineraries, 
    searchItineraries, 
    loading, 
    error,
    hasMore,
    loadMoreMatches,
    checkForMoreMatches,
    clearSearchCache
  };
};

export default useSearchItineraries;
