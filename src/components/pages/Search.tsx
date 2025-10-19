import { useEffect, useState, useMemo, useCallback } from "react";
import useUpdateItinerary from '../../hooks/useUpdateItinerary';
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
} from "@mui/material";
import SubscriptionCard from '../common/SubscriptionCard';
import AddItineraryModal from "../forms/AddItineraryModal";
import useGetItinerariesFromFirestore from "../../hooks/useGetItinerariesFromFirestore";
import { Itinerary } from "../../types/Itinerary";
import useSearchItineraries from "../../hooks/useSearchItineraries";
import ItinerarySelector from '../search/ItinerarySelector';
import MatchDisplay from '../search/MatchDisplay';
import {
  getFirestore,
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { app } from "../../environments/firebaseConfig";
import { auth } from "../../environments/firebaseConfig";
import { useNewConnection } from "../../Context/NewConnectionContext";
import React from "react";
import { useUsageTracking } from '../../hooks/useUsageTracking';
import { getAnalytics, logEvent } from "firebase/analytics";
import { createExampleItinerary, isExampleItinerary } from '../../utils/exampleItinerary';
import { hasUserSeenExample, markExampleAsSeen } from '../../utils/exampleItineraryStorage';

const VIEWED_STORAGE_KEY = "VIEWED_ITINERARIES";

// Store viewed itineraries in localStorage - store only IDs
// Cache parsed IDs in-memory for the current session to avoid repeated JSON.parse calls
let _viewedIdsCache: Set<string> | null = null;
function saveViewedItinerary(itinerary: Itinerary) {
  try {
    if (!_viewedIdsCache) {
      const raw = localStorage.getItem(VIEWED_STORAGE_KEY) || '[]';
      try {
        const parsed = JSON.parse(raw);
        _viewedIdsCache = new Set((parsed || []).map((item: any) => (typeof item === 'string' ? item : item?.id)).filter(Boolean));
      } catch (e) {
        // If parsing fails, start with an empty set
        _viewedIdsCache = new Set();
      }
    }

    if (!_viewedIdsCache.has(itinerary.id)) {
      _viewedIdsCache.add(itinerary.id);
      localStorage.setItem(VIEWED_STORAGE_KEY, JSON.stringify(Array.from(_viewedIdsCache)));
    }
  } catch (error) {
    console.error('Error saving viewed itinerary:', error);
  }
}

export const Search = React.memo(() => {
  const location = useLocation();
  const navigate = useNavigate();
  const [checkoutStatus, setCheckoutStatus] = useState<null | 'success' | 'cancel'>(null);
  // Detect Stripe checkout result from query param
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const checkout = params.get('checkout');
    if (checkout === 'success' || checkout === 'cancel') {
      setCheckoutStatus(checkout);
      // Remove the query param from the URL after showing the message
      const newParams = new URLSearchParams(location.search);
      newParams.delete('checkout');
      navigate({ search: newParams.toString() }, { replace: true });
    }
  }, [location.search, navigate]);

  // Use a sentinel value to indicate example itinerary dismissed
  const EXAMPLE_DISMISSED = "EXAMPLE_DISMISSED";
  const [selectedItineraryId, setSelectedItineraryId] = useState<string>("");
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [showModal, setShowModal] = useState(false);
  const { fetchItineraries } = useGetItinerariesFromFirestore();
  const { updateItinerary } = useUpdateItinerary();
  const [isFetching, setIsFetching] = useState(true);

  const {
    matchingItineraries,
    searchItineraries,
    getNextItinerary,
    loading: searchLoading,
    hasMore
  } = useSearchItineraries();

  // Debug log: print userId and counts whenever matching itineraries or owned itineraries change
  useEffect(() => {
    try {
      console.info('[Search] user:', 'ownedItineraries:', Array.isArray(itineraries) ? itineraries.length : 0, 'matchingItineraries:', Array.isArray(matchingItineraries) ? matchingItineraries.length : 0);
    } catch (e) {
      console.info('[Search] itineraries updated');
    }
  }, [ itineraries, matchingItineraries]);

  const [refreshKey, setRefreshKey] = useState<number>(0);
  // Removed currentMatchIndex since we show one itinerary at a time
  const { setHasNewConnection } = useNewConnection();
  const userId = typeof auth !== 'undefined' && auth.currentUser ? auth.currentUser.uid : null;
  
  // Track if user has ever seen an example itinerary
  const [hasSeenExample] = useState(() => hasUserSeenExample());
  const db = getFirestore(app);
  const {
    hasReachedLimit,
    trackView,
  } = useUsageTracking();

  // Prevent body scrolling when component mounts (same as auth pages)
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  // Fetch user's itineraries on mount or refresh
  useEffect(() => {
    const loadItineraries = async () => {
      setIsFetching(true);
      try {
        const fetchedItineraries = await fetchItineraries();
        setItineraries(fetchedItineraries || []);
      } catch (error) {
        console.error("Error loading itineraries:", error);
      } finally {
        setIsFetching(false);
      }
    };
    loadItineraries();
  }, [refreshKey, fetchItineraries]);

  // Prevent auto-select if example was dismissed
  useEffect(() => {
    if (selectedItineraryId === EXAMPLE_DISMISSED) {
      // Do nothing, user dismissed example
      return;
    }
  }, [selectedItineraryId]);

  // Map of itinerary id -> itinerary for O(1) lookup and stable reference when `itineraries` doesn't change
  const itineraryById = useMemo(() => {
    const m = new Map<string, Itinerary>();
    for (const it of itineraries) {
      if (it && it.id) m.set(it.id, it);
    }
    return m;
  }, [itineraries]);


  const handleItinerarySelect = useCallback((id: string) => {
    setSelectedItineraryId(id);
    const selected = itineraryById.get(id) || null;
    if (selected && userId) {
      searchItineraries(selected, userId);
    }
  }, [itineraryById, userId, searchItineraries]);


  // Dislike handler with usage tracking
  const handleDislike = useCallback(async (itinerary: Itinerary) => {
    // Prevent actions on example itinerary
    if (isExampleItinerary(itinerary)) {
      setSelectedItineraryId(EXAMPLE_DISMISSED);
      return;
    }

    if (hasReachedLimit()) {
      alert(`Daily limit reached! You've viewed 10 itineraries today. Upgrade to Premium for unlimited views.`);
      return;
    }

    const success = await trackView();
    if (!success) {
      alert('Unable to track usage. Please try again.');
      return;
    }
    saveViewedItinerary(itinerary);
    if (process.env.NODE_ENV === "production") {
      const analytics = getAnalytics();
      logEvent(analytics, "itinerary_disliked", { itinerary_id: itinerary.id });
    }

    // Get next itinerary in real-time
    getNextItinerary();
  }, [hasReachedLimit, trackView, getNextItinerary]);

  // Like handler with usage tracking and mutual like logic
  const handleLike = useCallback(async (itinerary: Itinerary) => {
    // Prevent actions on example itinerary
    if (isExampleItinerary(itinerary)) {
      setSelectedItineraryId(EXAMPLE_DISMISSED);
      return;
    }

    if (hasReachedLimit()) {
      alert(`Daily limit reached! You've viewed 10 itineraries today. Upgrade to Premium for unlimited views.`);
      return;
    }

    const success = await trackView();
    if (!success) {
      alert('Unable to track usage. Please try again.');
      return;
    }
    saveViewedItinerary(itinerary);
    if (process.env.NODE_ENV === "production") {
      const analytics = getAnalytics();
      logEvent(analytics, "itinerary_liked", { itinerary_id: itinerary.id });
    }

    if (!userId) {
      alert("You must be logged in to like an itinerary.");
      getNextItinerary();
      return;
    }

    try {
      // 1. Use hook to update itinerary likes in canonical store (Cloud SQL via RPC)
      const existingLikes: string[] = Array.isArray(itinerary.likes) ? itinerary.likes : [];
      const newLikes = Array.from(new Set([...existingLikes, userId]));

      await updateItinerary(itinerary.id, { likes: newLikes });

      // 2. Fetch the current user's itineraries (RPC-backed) and find the selected one
      const myItineraries = await fetchItineraries();
      const myItinerary = (myItineraries || []).find((it: any) => it.id === selectedItineraryId);
      if (!myItinerary) {
        // If we couldn't find user's itinerary in Cloud SQL, just continue
        getNextItinerary();
        return;
      }

      // 3. Check mutual like (other user's uid present in myItinerary.likes)
      const otherUserUid = itinerary.userInfo?.uid ?? "";
      if (!otherUserUid) {
        getNextItinerary();
        return;
      }

      if (Array.isArray(myItinerary.likes) && myItinerary.likes.includes(otherUserUid)) {
        const myEmail = myItinerary?.userInfo?.email ?? "";
        const otherEmail = itinerary?.userInfo?.email ?? "";

        const _db = getFirestore(app);
        await addDoc(collection(_db, "connections"), {
          users: [userId, otherUserUid],
          emails: [myEmail, otherEmail],
          unreadCounts: {
            [userId]: 0,
            [otherUserUid]: 0,
          },
          itineraryIds: [selectedItineraryId, itinerary.id],
          itineraries: [myItinerary, itinerary],
          createdAt: serverTimestamp(),
        });
      setHasNewConnection(true);
      alert("It's a match! You can now chat with this user.");
      if (process.env.NODE_ENV === "production") {
        const analytics = getAnalytics();
        logEvent(analytics, "itinerary_match", { itinerary_id: itinerary.id, matched_user: otherUserUid });
      }
    }

    } catch (e) {
      console.error('Error handling like action:', e);
    } finally {
      // Get next itinerary after like action
      getNextItinerary();
    }
  }, [hasReachedLimit, trackView, getNextItinerary, db, selectedItineraryId, setHasNewConnection, userId]);

  // Sort itineraries by startDate ascending (oldest first)
  // Use a safe parser that falls back to +Infinity when a date is missing or invalid
  const parseTime = (s?: string | null) => {
    if (!s) return Number.POSITIVE_INFINITY;
    const t = Date.parse(String(s));
    return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
  };
  const sortedItineraries = useMemo(() => {
    return [...itineraries].sort((a, b) => parseTime(a.startDate) - parseTime(b.startDate));
  }, [itineraries]);

  // Memoize selected itinerary lookup
  const selectedItinerary = useMemo(() => {
    return itineraries.find(itin => itin.id === selectedItineraryId) || null;
  }, [itineraries, selectedItineraryId]);

  // Compute match state (realMatch, showExample, currentMatch, isAtEnd) in one memoized object
  const { hasNoMatches, showExample, currentMatch, isAtEnd } = useMemo(() => {
    const realMatch = matchingItineraries[0] || null; // Always show first match since we fetch one at a time
    const hasNoMatches = !!(selectedItineraryId && !searchLoading && matchingItineraries.length === 0 && !hasSeenExample);
    const showExample = hasNoMatches && !!selectedItinerary && !hasSeenExample;
    const currentMatch = realMatch || (showExample ? createExampleItinerary(selectedItinerary?.destination) : null);
    const isAtEnd = !hasMore && matchingItineraries.length === 0;
    return { realMatch, hasNoMatches, showExample, currentMatch, isAtEnd };
  }, [matchingItineraries, selectedItineraryId, searchLoading, hasMore, selectedItinerary, hasSeenExample]);

  // Persist-only: when the example is shown, write the persisted flag so
  // subsequent mounts won't show it. We intentionally do NOT flip the
  // in-memory `hasSeenExample` state synchronously so the example renders
  // at least once before being considered seen.
  useEffect(() => {
    if (showExample && !hasUserSeenExample()) {
      console.debug('SEARCH DEBUG: showExample true — persisting hasSeenExampleItinerary');
      try {
        markExampleAsSeen();
      } catch (e) {
        console.error('SEARCH DEBUG: markExampleAsSeen() failed', e);
      }
    }
  }, [showExample]);

  return (
    <Box
      className="authFormContainer"
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#f5f5f7",
        overflow: "hidden",
      }}>

      {/* Stripe Checkout status message */}
      {checkoutStatus === 'success' && (
        <Box sx={{ position: 'fixed', top: 16, left: 0, right: 0, zIndex: 2000, display: 'flex', justifyContent: 'center' }}>
          <Typography sx={{ background: '#e0ffe0', color: '#1b5e20', px: 3, py: 1, borderRadius: 2, boxShadow: 2, fontWeight: 600 }}>
            Payment successful! Your subscription is now active.
          </Typography>
        </Box>
      )}
      {checkoutStatus === 'cancel' && (
        <Box sx={{ position: 'fixed', top: 16, left: 0, right: 0, zIndex: 2000, display: 'flex', justifyContent: 'center' }}>
          <Typography sx={{ background: '#fff3e0', color: '#bf360c', px: 3, py: 1, borderRadius: 2, boxShadow: 2, fontWeight: 600 }}>
            Payment canceled. No changes were made to your subscription.
          </Typography>
        </Box>
      )}

      {/* Subscription Card - always visible at the bottom */}
      <SubscriptionCard compact />

      {/* Toolbar: itinerary selector and add button */}
      <ItinerarySelector
        sortedItineraries={sortedItineraries}
        selectedItineraryId={selectedItineraryId}
        onSelect={handleItinerarySelect}
        onOpenModal={() => setShowModal(true)}
        isLoading={isFetching}
      />

      {/* Content area */}
      <Box
        sx={{
          flex: 1,
          position: "relative",
          display: "flex",
          alignItems: { xs: "flex-start", sm: "center" },
          justifyContent: "center",
          overflow: "hidden",
          minHeight: 0,
          pt: { xs: 2, sm: 0 }, // Add top padding on mobile
        }}>
        {/* Show onboarding message if user has never created an itinerary */}
        {!isFetching && itineraries.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'center',
              padding: 2,
              maxWidth: 300,
              margin: '0 auto',
              position: 'relative',
              zIndex: 1
            }}>
            <Box
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 2,
                padding: 3,
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                maxWidth: '100%'
              }}>
              <Typography
                variant="body1"
                sx={{
                  color: 'white',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  textAlign: 'left'
                }}>
                After completing your profile, you can manually create an itinerary (by clicking the Add/EDIT Itineraries button) to find matches for 
                your future trips. Once created, select one of your itineraries from the dropdown, 
                and we'll match you with others based on destination, dates, and preferences.
                Once matched, you can chat and plan your adventures together.  You can also use AI to create your itinerarieson the Travel Preference tab.
              </Typography>
            </Box>
          </Box>
        )}

        {/* Match display (card, loading, or end state) */}
        <MatchDisplay
          currentMatch={currentMatch}
          searchLoading={searchLoading}
          itinerariesCount={itineraries.length}
          selectedItineraryId={selectedItineraryId}
          isAtEnd={isAtEnd}
          hasMore={hasMore}
          hasSeenExample={hasSeenExample}
          matchingLength={matchingItineraries.length}
          onLike={handleLike}
          onDislike={handleDislike}
        />
      </Box>

      <AddItineraryModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onItineraryAdded={() => setRefreshKey((prev) => prev + 1)}
        onRefresh={() => setRefreshKey((prev) => prev + 1)}
        itineraries={itineraries}
        isLoading={isFetching}
      />
    </Box>
  );
});

export default Search;
