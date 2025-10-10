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
import { 
  applyClientSideFilters as applyFilters,
  SearchParams as FilterParams
} from '../utils/clientSideFilters';

const VIEWED_STORAGE_KEY = "VIEWED_ITINERARIES";

interface LocalSearchParams {
  currentUserItinerary: Itinerary;
  currentUserId: string;
}

const useSearchItineraries = () => {
  const [allMatchingItineraries, setAllMatchingItineraries] = useState<Itinerary[]>([]); // Store all results
  const [currentIndex, setCurrentIndex] = useState<number>(0); // Track current position
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [currentSearchParams, setCurrentSearchParams] = useState<LocalSearchParams | null>(null);
  
  // Computed property for UI - current itinerary to show
  // Show empty array when we've reached the end and there are no more results
  const matchingItineraries = allMatchingItineraries.length > 0 && currentIndex < allMatchingItineraries.length 
    ? [allMatchingItineraries[currentIndex]] 
    : [];

  // Use imported filtering functions
  const applyClientSideFilters = applyFilters;

  // Fetch from Firestore one itinerary at a time
  const fetchFromFirestore = async (params: LocalSearchParams, isNewSearch: boolean = true): Promise<Itinerary[]> => {
    const { currentUserItinerary } = params;
    const userStartDay = new Date(currentUserItinerary.startDate!).getTime();

    console.log('🔥 REALTIME FIRESTORE: Building query constraints for batch fetch');
    console.log('🔥 REALTIME FIRESTORE: User start day timestamp:', userStartDay, '=', new Date(userStartDay).toISOString());

    // Fetch all matching itineraries at once for simplicity
    const PAGE_SIZE = 50; // Get more results to account for filtering
    
    // Build query constraints with proper typing, skip filters if 'No Preference' or empty
    // NOTE: Cannot use where("userInfo.uid", "!=", currentUserId) with other inequalities due to Firestore limitations
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
      orderBy("__name__"), // Add document ID as secondary sort to handle duplicate endDay values
      limit(PAGE_SIZE)
    ];

    console.log('🔥 FIRESTORE: Query constraints applied:');
    console.log('  - destination ==', currentUserItinerary.destination);
    if (currentUserItinerary.gender && currentUserItinerary.gender !== "No Preference") {
      console.log('  - userInfo.gender ==', currentUserItinerary.gender);
    } else {
      console.log('  - userInfo.gender: NO FILTER (No Preference or empty)');
    }
    if (currentUserItinerary?.status && currentUserItinerary?.status !== "No Preference") {
      console.log('  - userInfo.status ==', currentUserItinerary?.status);
    } else {
      console.log('  - userInfo.status: NO FILTER (No Preference or empty)');
    }
    if (currentUserItinerary.sexualOrientation && currentUserItinerary.sexualOrientation !== "No Preference") {
      console.log('  - userInfo.sexualOrientation ==', currentUserItinerary.sexualOrientation);
    } else {
      console.log('  - userInfo.sexualOrientation: NO FILTER (No Preference or empty)');
    }
    console.log('  - endDay >=', userStartDay, '(' + new Date(userStartDay).toISOString() + ')');
    console.log('  - orderBy: endDay, __name__');
    console.log('  - limit:', PAGE_SIZE);

    // Add pagination cursor for subsequent requests
    if (!isNewSearch && lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    const db = getFirestore(app);
    const itinerariesQuery = query(collection(db, "itineraries"), ...constraints);
    
    console.log('🔥 FIRESTORE DEBUG: Executing Firestore query...');
    const snapshot = await getDocs(itinerariesQuery);

    console.log('🔥 FIRESTORE DEBUG: Firestore query completed');
    console.log('🔥 FIRESTORE DEBUG: Raw results from Firestore:', snapshot.docs.length, 'documents');
    
    // Debug: log results from Firestore query (counts + ids)
    try {
      const itinIds = (snapshot?.docs || []).map((d: any) => d.id);
      console.log('🔥 FIRESTORE DEBUG: Document IDs returned:', itinIds);
      
      // Log detailed info about each document
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`🔥 FIRESTORE DEBUG: Document ${index + 1}/${snapshot.docs.length}:`, {
          id: doc.id,
          destination: data.destination,
          endDay: data.endDay ? new Date(data.endDay).toISOString() : 'No endDay',
          userInfo: data.userInfo ? {
            uid: data.userInfo.uid,
            username: data.userInfo.username,
            gender: data.userInfo.gender,
            status: data.userInfo.status,
            sexualOrientation: data.userInfo.sexualOrientation
          } : 'No userInfo'
        });
      });
    } catch (e) {
      console.error('🔥 FIRESTORE DEBUG: Error logging document details:', e);
    }
    
    // Update pagination state for next search
    if (snapshot.docs && snapshot.docs.length > 0) {
      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      // Always assume more results available if we got any results
      // We'll determine if there are actually more when we try to fetch
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } else {
      setLastDoc(null);
      setHasMore(false); // No more results available
    }

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
  // Main search function - Simple batch approach
  const searchItineraries = async (currentUserItinerary: Itinerary, currentUserId: string) => {    

    console.log('🔍 SIMPLE SEARCH: Starting search for user:', currentUserId);
    console.log('🔍 SIMPLE SEARCH: User itinerary filters:', {
      destination: currentUserItinerary.destination,
      gender: currentUserItinerary.gender,
      status: currentUserItinerary.status,
      sexualOrientation: currentUserItinerary.sexualOrientation,
      dates: `${currentUserItinerary.startDate} to ${currentUserItinerary.endDate}`
    });
    
    setLoading(true);
    setError(null);
    setCurrentIndex(0); // Reset to first result
    
    const params: LocalSearchParams = { currentUserItinerary, currentUserId };
    setCurrentSearchParams(params);

    try {
      // Reset pagination state
      setLastDoc(null);
      setHasMore(true);

      // Fetch a batch of results and store them all
      console.log('🔍 SIMPLE SEARCH: Fetching initial batch...');
      
      const batchResults = await fetchFromFirestore(params, true);
      console.log('🔍 SIMPLE SEARCH: Firestore returned:', batchResults.length, 'results');
      
      // Apply filters to get valid results
      const filteredResults = applyClientSideFilters(batchResults, params);
      console.log('🔍 SIMPLE SEARCH: After filtering:', filteredResults.length, 'valid results');
      
      console.log('🔍 SIMPLE SEARCH: Valid results:', filteredResults.map(r => ({
        id: r.id,
        username: r.userInfo?.username
      })));
      
      // Store all results and show first one
      setAllMatchingItineraries(filteredResults);
      setCurrentIndex(0);
      
  // NOTE: Do not override hasMore here. fetchFromFirestore already sets hasMore
  // based on Firestore results (false when no documents). Overriding to `true`
  // incorrectly prevents UI from showing the example itinerary when there
  // are no server-side results.
      
    } catch (err) {
      console.error("Error searching itineraries:", err);
      setError("Failed to search itineraries. Please try again later.");
      setAllMatchingItineraries([]);
    } finally {
      setLoading(false);
    }
  };

  // Simple function to get next itinerary from stored results
  const getNextItinerary = async () => {
    console.log('🔄 GET NEXT: User requested next itinerary');
    console.log('🔄 GET NEXT: Current state - index:', currentIndex, 'total:', allMatchingItineraries.length);
    
    const nextIndex = currentIndex + 1;
    
    // If we have more results in our current batch, just move to next
    if (nextIndex < allMatchingItineraries.length) {
      console.log('🔄 GET NEXT: Moving to next result in current batch');
      setCurrentIndex(nextIndex);
      return;
    }
    
    // If we've reached the end of current batch, fetch more if possible
    if (hasMore && !loading && currentSearchParams) {
      console.log('🔄 GET NEXT: Fetching next batch...');
      setLoading(true);
      
      try {
        // Retry mechanism: Keep fetching until we find valid results or exhaust all results
        let allNewResults: Itinerary[] = [];
        let validNewResults: Itinerary[] = [];
        let retryCount = 0;
        const MAX_RETRIES = 3;
        
        while (validNewResults.length === 0 && retryCount < MAX_RETRIES && hasMore) {
          console.log(`🔄 GET NEXT: Retry ${retryCount + 1}/${MAX_RETRIES}`);
          
          const batchResults = await fetchFromFirestore(currentSearchParams, false);
          console.log('🔄 GET NEXT: Got', batchResults.length, 'raw results');
          
          if (batchResults.length === 0) {
            console.log('🔄 GET NEXT: No more results from Firestore');
            setHasMore(false);
            break;
          }
          
          allNewResults = [...allNewResults, ...batchResults];
          
          // Filter all results we've gathered so far
          validNewResults = applyClientSideFilters(allNewResults, currentSearchParams);
          console.log('🔄 GET NEXT: Filtered to', validNewResults.length, 'valid results from', allNewResults.length, 'total');
          
          retryCount++;
        }
        
        if (validNewResults.length > 0) {
          // Add new results to existing array
          setAllMatchingItineraries(prev => [...prev, ...validNewResults]);
          setCurrentIndex(nextIndex); // Move to first new result
          console.log('🔄 GET NEXT: ✅ Added', validNewResults.length, 'new valid results');
        } else {
          console.log('🔄 GET NEXT: ❌ No valid results found after', retryCount, 'attempts');
          setHasMore(false);
          // Increment currentIndex so matchingItineraries will be empty
          setCurrentIndex(nextIndex);
        }
        
      } catch (err) {
        console.error("Error fetching next batch:", err);
        setError("Failed to load more itineraries.");
      } finally {
        setLoading(false);
      }
    } else {
      console.log('🔄 GET NEXT: No more results available - hasMore:', hasMore, 'loading:', loading);
      setHasMore(false);
      // Increment currentIndex so matchingItineraries will be empty
      setCurrentIndex(nextIndex);
    }
  };

  // Keep loadNextItinerary for backward compatibility
  const loadNextItinerary = getNextItinerary;

  // Clear cache (no-op since we removed caching)
  const clearSearchCache = () => {
    console.log('Cache clearing disabled - using simple batch approach');
  };

  // Force a fresh search
  const forceRefreshSearch = async (currentUserItinerary: Itinerary, currentUserId: string) => {
    await searchItineraries(currentUserItinerary, currentUserId);
  };

  return { 
    matchingItineraries, // This is now computed from allMatchingItineraries[currentIndex]
    searchItineraries, 
    loading, 
    error,
    hasMore,
    loadNextItinerary,
    getNextItinerary,
    clearSearchCache,
    forceRefreshSearch
  };
};

export default useSearchItineraries;
