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

    // Build query constraints with proper typing
    const constraints: QueryConstraint[] = [
      where("destination", "==", currentUserItinerary.destination),
      where("userInfo.gender", "==", currentUserItinerary.gender),
      where("userInfo.status", "==", currentUserItinerary.userInfo?.status),
      where("userInfo.sexualOrientation", "==", currentUserItinerary.sexualOrientation),
      where("endDay", ">=", userStartDay),
      orderBy("endDay"),
      limit(20) // Fetch 20 at a time
    ];

    // Add pagination cursor for subsequent requests
    if (!isNewSearch && lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const db = getFirestore(app);
    const itinerariesQuery = query(collection(db, "itineraries"), ...constraints);
    
    console.log('🔍 Fetching from Firestore:', isNewSearch ? 'New search' : 'Load more');
    const snapshot = await getDocs(itinerariesQuery);
    
    // Update pagination state
    if (snapshot.docs.length > 0) {
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === 20); // Has more if we got a full page
    } else {
      setHasMore(false);
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Itinerary[];
  };

  // Main search function
  const searchItineraries = async (currentUserItinerary: Itinerary, currentUserId: string) => {
    console.log('🔍 Starting search for:', currentUserItinerary.destination);
    
    // ✅ Reset cache flag at start of new search
    setIsFromCache(false);
    
    const params: SearchParams = { currentUserItinerary, currentUserId };
    setCurrentSearchParams(params);

    const cacheKey = generateCacheKey(params);
    console.log('🔑 Cache key:', cacheKey);
    
    const cachedResults = searchCache.get(cacheKey);
    console.log('💾 Cache check result:', cachedResults ? `Found ${cachedResults.length} items` : 'Cache empty');
    
    if (cachedResults) {
      setIsFromCache(true);
      setHasMore(false); // No more to load from cache

      console.log('🎯 Cache hit! Serving from cache - SHOULD NOT CONTINUE');
      const filteredResults = applyClientSideFilters(cachedResults, params);
      setMatchingItineraries(filteredResults);
      setLoading(false);
      
      // 👈 ADD THESE LINES - Reset pagination for cached results
      setLastDoc(null);  // Reset pagination cursor
      
      return;
    }
    
    console.log('📡 Cache miss. Fetching from Firestore - THIS SHOULD ONLY HAPPEN ON FIRST SEARCH');
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
      console.log('📄 Loading more matches...');
      
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
      console.log(`🔄 Auto-loading more matches. Remaining: ${remainingMatches}`);
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
