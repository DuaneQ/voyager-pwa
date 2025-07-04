import { useState, useEffect } from "react";
import {
  Select,
  MenuItem,
  Button,
  Box,
  Typography,
  FormControl,
} from "@mui/material";
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
import useGetUserId from "../../hooks/useGetUserId";
import { useNewConnection } from "../../Context/NewConnectionContext";
import React from "react";
import { BetaBanner } from '../utilities/BetaBanner';
import { useUsageTracking } from '../../hooks/useUsageTracking';


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
  useGetUserProfile();
  const [selectedItineraryId, setSelectedItineraryId] = useState<string>("");
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [showModal, setShowModal] = useState(false);
  const { fetchItineraries } = useGetItinerariesFromFirestore();
  const [loading, setLoading] = useState(false);

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
  const userId = useGetUserId();
  const db = getFirestore(app);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const {
    hasReachedLimit,
    getRemainingViews,
    trackView,
    isLoading: usageLoading
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

  // Update the banner dismissed handler
  const handleBannerDismiss = () => {
    setBannerDismissed(true);
  };

  // Check if banner is dismissed
  useEffect(() => {
    const version = "1.0.0-beta"; // Should match your app version
    const dismissed = localStorage.getItem(`beta-banner-dismissed-${version}`);
    setBannerDismissed(!!dismissed);
  }, []);

  // Fetch user's itineraries on mount or refresh
  useEffect(() => {
    const loadItineraries = async () => {
      try {
        const fetchedItineraries = await fetchItineraries();
        if (!fetchedItineraries || fetchedItineraries.length === 0) {
          setLoading(true);
        } else {
          setLoading(false);
          setItineraries(fetchedItineraries);
        }
      } catch (error) {
        console.error("Error loading itineraries:", error);
      }
    };
    loadItineraries();
  }, [fetchItineraries, refreshKey]);

  // Auto-load more matches when user is near the end
  useEffect(() => {
    checkForMoreMatches(currentMatchIndex);
  }, [currentMatchIndex, checkForMoreMatches]);

  // Handle itinerary selection from dropdown
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
    if (hasReachedLimit()) {
      alert(`Daily limit reached! You've viewed ${10} itineraries today. Upgrade to Premium for unlimited views.`);
      return;
    }
    const success = await trackView();
    if (!success) {
      alert('Unable to track usage. Please try again.');
      return;
    }
    saveViewedItinerary(itinerary);
    setCurrentMatchIndex((prev) => prev + 1);
  };

  // Like handler with usage tracking and mutual like logic
  const handleLike = async (itinerary: Itinerary) => {
    if (hasReachedLimit()) {
      alert(`Daily limit reached! You've viewed ${10} itineraries today. Upgrade to Premium for unlimited views.`);
      return;
    }
    const success = await trackView();
    if (!success) {
      alert('Unable to track usage. Please try again.');
      return;
    }
    saveViewedItinerary(itinerary);

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
      console.log("Other user's UID not found on itinerary.");
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
      {!bannerDismissed && (
        <Box
          sx={{
            backgroundColor: "transparent",
            padding: 2,
            borderBottom: "1px solid rgba(0,0,0,0.1)",
            flexShrink: 0,
          }}>
          <Typography variant="h6" textAlign="center" gutterBottom={false} sx={{ color: 'transparent' }}>
            Traval
          </Typography>
        </Box>
      )}


      {/* Beta Banner - Position it at the very top */}
      {!bannerDismissed && (
        <Box sx={{ position: 'relative', zIndex: 1000 }}>
          <BetaBanner
            version="1.0.0-beta"
            onDismiss={handleBannerDismiss}
          />
        </Box>
      )}

      {/* Header - adjust marginTop to be smaller */}
      <Box
        sx={{
          mt: bannerDismissed ? 0 : -5,
          }}
        />
      {/* Header */}
      <Box
        sx={{
          backgroundColor: "transparent",
          padding: 2,
          borderBottom: "1px solid rgba(0,0,0,0.1)",
          flexShrink: 0,
          marginTop: bannerDismissed ? 0 : "220px",
        }}>
        <Typography variant="h6" textAlign="center" gutterBottom={false} sx={{ color: 'transparent' }}>
          Traval
        </Typography>
      </Box>

      {/* Select and Button area - FIXED WIDTH */}
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
        }}>
        <Box
          sx={{
            width: { xs: 180, sm: 240 },
            flexShrink: 0,
          }}>
          <FormControl fullWidth>
            <Select
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
        </Box>
        <Button
          variant="contained"
          onClick={() => setShowModal(true)}
          size="small">
          Add Itinerary
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
        {loading && (
          <Typography
            variant="body1"
            sx={{
              backgroundColor: "#f9f9f9",
              borderRadius: 2,
              padding: 3,
              maxWidth: 350,
              textAlign: "left",
            }}>
            Create an itinerary to find matches for your future trips. Once
            created, select one of your itineraries from the dropdown, and we'll
            match you with others based on destination, dates, and preferences.
            Once matched, you can chat and plan your adventures together.
          </Typography>
        )}

        {/* Show current match */}
        {currentMatch && (
          <ItineraryCard
            itinerary={currentMatch}
            onLike={handleLike}
            onDislike={handleDislike}
          />
        )}

        {/* Show loading when searching or loading more */}
        {searchLoading && !currentMatch && (
          <Typography sx={{ padding: 2 }}>
            Searching for matches...
          </Typography>
        )}

        {/* Show end message with loading state */}
        {isAtEnd && !searchLoading && (
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
        itineraries={itineraries}
      />
    </Box>
  );
});

export default Search;
