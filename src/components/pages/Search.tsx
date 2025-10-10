import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Select,
  MenuItem,
  Button,
  Box,
  Typography,
  FormControl,
} from "@mui/material";
import SubscriptionCard from '../common/SubscriptionCard';
import AddItineraryModal from "../forms/AddItineraryModal";
import useGetItinerariesFromFirestore from "../../hooks/useGetItinerariesFromFirestore";
import { Itinerary } from "../../types/Itinerary";
import useGetUserProfile from "../../hooks/useGetUserProfile";
import useSearchItineraries from "../../hooks/useSearchItineraries";
import ItineraryCard from "../forms/ItineraryCard";
import {
  getFirestore,
  doc,
  updateDoc,
  arrayUnion,
  addDoc,
  collection,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { app } from "../../environments/firebaseConfig";
import { auth } from "../../environments/firebaseConfig";
import { useNewConnection } from "../../Context/NewConnectionContext";
import React from "react";
import { useUsageTracking } from '../../hooks/useUsageTracking';
import { getAnalytics, logEvent } from "firebase/analytics";
import { createExampleItinerary, isExampleItinerary } from '../../utils/exampleItinerary';
import { hasUserSeenExample, markExampleAsSeen } from '../../utils/exampleItineraryStorage';
import { isDebugMode, debugScenarios } from '../../utils/searchDebugUtils';


const VIEWED_STORAGE_KEY = "VIEWED_ITINERARIES";

// Store viewed itineraries in localStorage - store only IDs
function saveViewedItinerary(itinerary: Itinerary) {
  try {
    const viewed = JSON.parse(localStorage.getItem(VIEWED_STORAGE_KEY) || "[]");
    const viewedIds = viewed.map((item: any) =>
      typeof item === 'string' ? item : item.id
    ).filter(Boolean);

    if (!viewedIds.includes(itinerary.id)) {
      viewedIds.push(itinerary.id);
      localStorage.setItem(VIEWED_STORAGE_KEY, JSON.stringify(viewedIds));
    }
  } catch (error) {
    console.error("Error saving viewed itinerary:", error);
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
  useGetUserProfile();
  // Use a sentinel value to indicate example itinerary dismissed
  const EXAMPLE_DISMISSED = "EXAMPLE_DISMISSED";
  const [selectedItineraryId, setSelectedItineraryId] = useState<string>("");
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [showModal, setShowModal] = useState(false);
  const { fetchItineraries } = useGetItinerariesFromFirestore();
  const [isFetching, setIsFetching] = useState(true);

  const {
    matchingItineraries,
    searchItineraries,
    getNextItinerary,
    loading: searchLoading,
    hasMore
  } = useSearchItineraries();

  const [refreshKey, setRefreshKey] = useState(0);
  // Removed currentMatchIndex since we show one itinerary at a time
  const { setHasNewConnection } = useNewConnection();
  const userId = typeof auth !== 'undefined' && auth.currentUser ? auth.currentUser.uid : null;
  
  // Track if user has ever seen an example itinerary
  const [hasSeenExample, setHasSeenExample] = useState(() => hasUserSeenExample());
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

  // Auto-select first itinerary when itineraries load
  useEffect(() => {
    // Only auto-select if not dismissed example
    if (
      itineraries.length > 0 &&
      !selectedItineraryId &&
      userId
    ) {
      const firstItinerary = itineraries[0];
      setSelectedItineraryId(firstItinerary.id);
      console.debug('SEARCH DEBUG: auto-selecting first itinerary', { firstId: firstItinerary.id });
      searchItineraries(firstItinerary, userId);
    }
  }, [itineraries, selectedItineraryId, userId, searchItineraries]);

  // Prevent auto-select if example was dismissed
  useEffect(() => {
    if (selectedItineraryId === EXAMPLE_DISMISSED) {
      // Do nothing, user dismissed example
      return;
    }
  }, [selectedItineraryId]);

  const handleItinerarySelect = (id: string) => {
    setSelectedItineraryId(id);
    const selected = itineraries.find((itinerary) => itinerary.id === id);
    console.debug('SEARCH DEBUG: user selected itinerary', { id });
    if (selected && userId) {
      searchItineraries(selected, userId);
    }
  };


  // Dislike handler with usage tracking
  const handleDislike = async (itinerary: Itinerary) => {
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
    try {
      if (process.env.NODE_ENV === "production") {
        const analytics = getAnalytics();
        logEvent(analytics, "itinerary_disliked", { itinerary_id: itinerary.id });
      }
    } catch (e) {}
    
    // Get next itinerary in real-time
    getNextItinerary();
  };

  // Like handler with usage tracking and mutual like logic
  const handleLike = async (itinerary: Itinerary) => {
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
    try {
      if (process.env.NODE_ENV === "production") {
        const analytics = getAnalytics();
        logEvent(analytics, "itinerary_liked", { itinerary_id: itinerary.id });
      }
    } catch (e) {}

    if (!userId) {
      alert("You must be logged in to like an itinerary.");
      getNextItinerary();
      return;
    }

    // 1. Add current user's UID to the liked itinerary's likes array in Firestore
    const itineraryRef = doc(db, "itineraries", itinerary.id);
    try {
      await updateDoc(itineraryRef, {
        likes: arrayUnion(userId),
      });
    } catch (error) {
      console.error('Failed to like itinerary:', error);
      alert('Failed to like itinerary. Please try again.');
      getNextItinerary();
      return;
    }

    // 2. Fetch the latest version of the current user's selected itinerary from Firestore
    const myItineraryRef = doc(db, "itineraries", selectedItineraryId);
    const myItinerarySnap = await getDoc(myItineraryRef);
    const myItinerary = myItinerarySnap.data();
    if (!myItinerary) {
      getNextItinerary();
      return;
    }

    // 3. Check if the other user's UID is in your itinerary's likes array
    const otherUserUid = itinerary.userInfo?.uid ?? "";
    if (!otherUserUid) {
      getNextItinerary();
      return;
    }

    // 4. Create a new connection document with a unique ID if mutual like
    if ((myItinerary.likes || []).includes(otherUserUid)) {
      const myEmail = myItinerary?.userInfo?.email ?? "";
      const otherEmail = itinerary?.userInfo?.email ?? "";

      await addDoc(collection(db, "connections"), {
        users: [userId, otherUserUid],
        emails: [myEmail, otherEmail],
        unreadCounts: {
          [userId]: 0,
          [otherUserUid]: 0,
        },
        itineraryIds: [myItineraryRef.id, itinerary.id],
        itineraries: [myItinerary, itinerary],
        createdAt: serverTimestamp(),
      });
      setHasNewConnection(true);
      alert("It's a match! You can now chat with this user.");
      try {
        if (process.env.NODE_ENV === "production") {
          const analytics = getAnalytics();
          logEvent(analytics, "itinerary_match", { itinerary_id: itinerary.id, matched_user: otherUserUid });
        }
      } catch (e) {}
    }

    // Get next itinerary after like action
    getNextItinerary();
  };

  // Sort itineraries by startDate ascending (oldest first)
  // Use a safe parser that falls back to +Infinity when a date is missing or invalid
  const parseTime = (s?: string | null) => {
    if (!s) return Number.POSITIVE_INFINITY;
    const t = Date.parse(String(s));
    return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
  };

  const sortedItineraries = [...itineraries].sort((a, b) => parseTime(a.startDate) - parseTime(b.startDate));

  // Get current match or show example when no matches found (real-time approach)
  const realMatch = matchingItineraries[0]; // Always show first match since we fetch one at a time
  const selectedItinerary = itineraries.find(itin => itin.id === selectedItineraryId);
  // Only show example when a search has completed with zero results.
  // Read the persisted flag directly from localStorage so we don't get out
  // of sync between an in-memory state and the persisted value.
  const persistedHasSeenExample = hasUserSeenExample();
  const hasNoMatches = selectedItineraryId && !searchLoading && matchingItineraries.length === 0 && !persistedHasSeenExample;

  // Show example itinerary only if user has never seen one before (persisted)
  const showExample = hasNoMatches && selectedItinerary && !persistedHasSeenExample;
  const currentMatch = realMatch || (showExample ? createExampleItinerary(selectedItinerary.destination) : null);
  const isAtEnd = !hasMore && matchingItineraries.length === 0;

  // Diagnostic logging for search state — helps trace why example may not show
  useEffect(() => {
    try {
      console.debug('SEARCH DEBUG: state snapshot', {
        selectedItineraryId,
        selectedItineraryId_present: !!selectedItinerary,
        matchingItinerariesLength: matchingItineraries.length,
        searchLoading,
        hasMore,
        hasSeenExample,
        hasNoMatches,
        showExample,
        currentMatchId: currentMatch ? currentMatch.id : null,
      });
    } catch (e) {
      console.error('SEARCH DEBUG: failed to log state', e);
    }
  }, [selectedItineraryId, matchingItineraries.length, searchLoading, hasMore, hasSeenExample, hasNoMatches, showExample, currentMatch]);

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

      {/* Debug Panel - only show in debug mode */}
      {isDebugMode() && (
        <Box sx={{ 
          position: 'fixed', 
          top: 10, 
          right: 10, 
          background: 'rgba(255, 0, 0, 0.9)', 
          color: 'white', 
          p: 2, 
          borderRadius: 1, 
          zIndex: 9999,
          fontSize: '12px',
          maxWidth: 300
        }}>
          <Typography variant="h6" sx={{ fontSize: '14px', mb: 1 }}>🧪 DEBUG MODE</Typography>
          <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
            Console: window.searchDebug.scenarios
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button 
              size="small" 
              variant="contained" 
              onClick={() => {
                localStorage.removeItem('hasSeenExampleItinerary');
                window.location.reload();
              }}
              sx={{ fontSize: '10px', p: 0.5 }}
            >
              Reset Example
            </Button>
            <Button 
              size="small" 
              variant="contained"
              onClick={() => {
                localStorage.removeItem('searchDebugMode');
                window.location.reload();
              }}
              sx={{ fontSize: '10px', p: 0.5 }}
            >
              Disable Debug
            </Button>
          </Box>
          <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.8 }}>
            Matches: {matchingItineraries.length} | HasMore: {hasMore ? 'Yes' : 'No'} | Example Seen: {hasSeenExample ? 'Yes' : 'No'}
          </Typography>
        </Box>
      )}

      {/* Select and Button area - simplified, removed unnecessary Box wrappers */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 16px",
          backgroundColor: "white",
          borderBottom: "1px solid rgba(0,0,0,0.05)",
          gap: "16px",
          flexShrink: 0,
          mt: 10,
        }}>
        <FormControl fullWidth sx={{ maxWidth: { xs: 180, sm: 240 } }}>
          <Select
            data-testid="itinerary-select"
            value={selectedItineraryId}
            onChange={(e) => handleItinerarySelect(e.target.value)}
            displayEmpty
            size="small"
            sx={{
              ".MuiSelect-select": {
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              },
            }}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 300,
                  maxWidth: 300,
                  zIndex: 1001,
                },
              },
            }}>
            <MenuItem value="" disabled>
              Select an itinerary
            </MenuItem>
            {sortedItineraries.map((itinerary) => (
              <MenuItem key={itinerary.id} value={itinerary.id}>
                <Box
                  sx={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    width: "100%",
                  }}>
                  {itinerary.destination}{" "}
                  <Typography
                    component="span"
                    sx={{
                      fontSize: "0.8em",
                      color: "#666",
                    }}>
                    ({itinerary.startDate} - {itinerary.endDate})
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          data-testid="add-itinerary-button"
          variant="contained"
          onClick={() => setShowModal(true)}
          size="small">
          Add/Edit Itineraries
        </Button>
      </Box>

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
              alignItems: 'center',
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
                maxWidth: '100%',
                mt: -30
              }}>
              <Typography
                variant="body1"
                sx={{
                  color: 'white',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap'
                }}>
                After completing your profile, you canreate an itinerary to find matches for 
                your future trips. Once created, select one of your itineraries from the dropdown, 
                and we'll match you with others based on destination, dates, and preferences.
                Once matched, you can chat and plan your adventures together.
              </Typography>
            </Box>
          </Box>
        )}

        {/* Show current match */}
        {currentMatch && (
          <Box data-testid="search-results">
            <ItineraryCard
              data-testid="itinerary-card"
              itinerary={currentMatch}
              onLike={handleLike}
              onDislike={handleDislike}
            />
          </Box>
        )}

        {/* Show loading when searching or loading more, but only if user has itineraries and an itinerary is selected */}
        {searchLoading && !currentMatch && itineraries.length > 0 && selectedItineraryId && (
          <Box sx={{ textAlign: 'center', padding: 2 }}>
            <Typography>
              Searching for matches...
            </Typography>
          </Box>
        )}

        {/* Show end message with loading state, only if user has itineraries and no current match showing */}
        {isAtEnd && !searchLoading && itineraries.length > 0 && !currentMatch && (
          <Box sx={{ textAlign: 'center', padding: 2 }}>
            <Typography>
              {hasMore
                ? "Loading more matches..."
                : "No more itineraries to view."
              }
            </Typography>
            {!hasMore && hasSeenExample && selectedItinerary && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Create more itineraries or try different dates to find new matches!
              </Typography>
            )}
            {hasMore && (
              <Typography variant="caption" color="text.secondary">
                Found {matchingItineraries.length} matches so far
              </Typography>
            )}
          </Box>
        )}
      </Box>

      <AddItineraryModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onItineraryAdded={() => setRefreshKey((prev) => prev + 1)}
        onRefresh={() => setRefreshKey((prev) => prev + 1)}
        itineraries={itineraries}
      />
    </Box>
  );
});

export default Search;
