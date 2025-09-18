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
  const [selectedItineraryId, setSelectedItineraryId] = useState<string>("");
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [showModal, setShowModal] = useState(false);
  const { fetchItineraries } = useGetItinerariesFromFirestore();
  const [isFetching, setIsFetching] = useState(true);

  const {
    matchingItineraries,
    searchItineraries,
    checkForMoreMatches,
    loading: searchLoading,
    hasMore
  } = useSearchItineraries();

  const [refreshKey, setRefreshKey] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const { setHasNewConnection } = useNewConnection();
  const userId = typeof auth !== 'undefined' && auth.currentUser ? auth.currentUser.uid : null;
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

  // Auto-load more matches when user is near the end
  useEffect(() => {
    checkForMoreMatches(currentMatchIndex);
  }, [currentMatchIndex, checkForMoreMatches]);

  // SubscriptionCard is always visible (floating/compact)
  const handleItinerarySelect = (id: string) => {
    setSelectedItineraryId(id);
    const selected = itineraries.find((itinerary) => itinerary.id === id);
    if (selected && userId) {
      setCurrentMatchIndex(0);
      searchItineraries(selected, userId);
    }
  };


  // Dislike handler with usage tracking
  const handleDislike = async (itinerary: Itinerary) => {
    // Do not track or write for example itineraries used as illustrations
    if (itinerary.id && itinerary.id.toString().startsWith('example_')) {
      setCurrentMatchIndex((prev) => prev + 1);
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
    setCurrentMatchIndex((prev) => prev + 1);
  };

  // Like handler with usage tracking and mutual like logic
  const handleLike = async (itinerary: Itinerary) => {
    // If this is an example itinerary (illustrative), skip tracking and writes
    if (itinerary.id && itinerary.id.toString().startsWith('example_')) {
      setCurrentMatchIndex((prev) => prev + 1);
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
      setCurrentMatchIndex((prev) => prev + 1);
      return;
    }

    // 1. Add current user's UID to the liked itinerary's likes array in Firestore
    const itineraryRef = doc(db, "itineraries", itinerary.id);
    await updateDoc(itineraryRef, {
      likes: arrayUnion(userId),
    });

    // 2. Fetch the latest version of the current user's selected itinerary from Firestore
    const myItineraryRef = doc(db, "itineraries", selectedItineraryId);
    const myItinerarySnap = await getDoc(myItineraryRef);
    const myItinerary = myItinerarySnap.data();
    if (!myItinerary) {
      setCurrentMatchIndex((prev) => prev + 1);
      return;
    }

    // 3. Check if the other user's UID is in your itinerary's likes array
    const otherUserUid = itinerary.userInfo?.uid ?? "";
    if (!otherUserUid) {
      setCurrentMatchIndex((prev) => prev + 1);
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
    } else {
      console.log("No mutual like yet.");
    }

    setCurrentMatchIndex((prev) => prev + 1);
  };

  // Sort itineraries by startDate ascending (oldest first)
  const sortedItineraries = [...itineraries].sort(
    (a, b) =>
      new Date(a.startDate ?? "").getTime() -
      new Date(b.startDate ?? "").getTime()
  );

  // Get current match or show appropriate message
  const currentMatch = matchingItineraries[currentMatchIndex];
  const isAtEnd = currentMatchIndex >= matchingItineraries.length;

  // Build example itinerary to mirror selected itinerary when no matches
  const selectedItinerary = itineraries.find((it) => it.id === selectedItineraryId) || null;
  const showExample = !!selectedItinerary && matchingItineraries.length === 0 && !searchLoading;
  const exampleItinerary: Itinerary | null = showExample && selectedItinerary ? {
    id: `example_${selectedItinerary.id}`,
    destination: selectedItinerary.destination || 'Unknown Destination',
    gender: selectedItinerary.gender || selectedItinerary.userInfo?.gender || 'Any',
    sexualOrientation: selectedItinerary.sexualOrientation || selectedItinerary.userInfo?.sexualOrientation || 'Any',
    likes: selectedItinerary.likes || [],
    startDate: selectedItinerary.startDate,
    endDate: selectedItinerary.endDate,
    startDay: selectedItinerary.startDay,
    endDay: selectedItinerary.endDay,
    description: selectedItinerary.description || 'This is an example itinerary showing what a match would look like. No matches were found for your selected itinerary.',
    activities: selectedItinerary.activities || [],
    lowerRange: selectedItinerary.lowerRange,
    upperRange: selectedItinerary.upperRange,
    status: selectedItinerary.status || 'new',
    userInfo: {
      username: selectedItinerary.userInfo?.username || 'Example User',
      gender: selectedItinerary.userInfo?.gender || 'Any',
      dob: selectedItinerary.userInfo?.dob || '',
      uid: selectedItinerary.userInfo?.uid || '',
      email: selectedItinerary.userInfo?.email || '',
      status: selectedItinerary.userInfo?.status || '',
      sexualOrientation: selectedItinerary.userInfo?.sexualOrientation || '',
      blocked: selectedItinerary.userInfo?.blocked || [],
    }
  } : null;

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
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          minHeight: 0,
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
               After completing your profile, you can create an AI-generated itinerary from the Travel Preferences tab on your profile page or manually from the Add/Edit Itinerary page. Once an itinerary is created, select it from the dropdown and we’ll search for travelers with matching destinations, dates, and preferences. If matches are found, their itineraries will appear here. You can like or reject an itinerary, and if both travelers like each other’s, it’s a match—unlocking chat to plan your trip together.”
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

        {/* Show example card when user selected an itinerary but there are no matches */}
        {!currentMatch && showExample && exampleItinerary && (
          <Box data-testid="example-itinerary" sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
            {/* When example is shown, await dislike/like handlers then close the example to avoid clearing selectedItineraryId early */}
            <ItineraryCard
              itinerary={exampleItinerary}
              onLike={async (it) => {
                try {
                  await handleLike(it);
                } finally {
                  setSelectedItineraryId('');
                }
              }}
              onDislike={async (it) => {
                try {
                  await handleDislike(it);
                } finally {
                  setSelectedItineraryId('');
                }
              }}
              isExample
            />
          </Box>
        )}

        {/* Show loading when searching or loading more, but only if user has itineraries */}
        {searchLoading && !currentMatch && itineraries.length > 0 && (
          <Typography sx={{ padding: 2 }}>
            Searching for matches...
          </Typography>
        )}

        {/* Show end message with loading state, only if user has itineraries */}
  {isAtEnd && !searchLoading && itineraries.length > 0 && !showExample && (
          <Box sx={{ textAlign: 'center', padding: 2 }}>
            <Typography>
              {hasMore
                ? "Loading more matches..."
                : "No more itineraries to view."
              }
            </Typography>
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
