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

const VIEWED_STORAGE_KEY = "VIEWED_ITINERARIES";

// Store viewed itineraries in localStorage
function saveViewedItinerary(itinerary: Itinerary) {
  const viewed = JSON.parse(localStorage.getItem(VIEWED_STORAGE_KEY) || "[]");
  viewed.push(itinerary);
  localStorage.setItem(VIEWED_STORAGE_KEY, JSON.stringify(viewed));
}

export const Search = React.memo(() => {
  useGetUserProfile();
  const [selectedItineraryId, setSelectedItineraryId] = useState<string>("");
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [showModal, setShowModal] = useState(false);
  const { fetchItineraries } = useGetItinerariesFromFirestore();
  const [loading, setLoading] = useState(false);
  const { matchingItineraries, searchItineraries } = useSearchItineraries();
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const { setHasNewConnection } = useNewConnection();
  const userId = useGetUserId();
  const db = getFirestore(app);

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
  }, [refreshKey]);

  // Handle itinerary selection from dropdown
  const handleItinerarySelect = (id: string) => {
    setSelectedItineraryId(id);
    const selected = itineraries.find((itinerary) => itinerary.id === id);
    if (selected) {
      searchItineraries(selected);
      setCurrentMatchIndex(0);
    }
  };

  // Remove itinerary from view and store as viewed
  const handleDislike = (itinerary: Itinerary) => {
    saveViewedItinerary(itinerary);
    setCurrentMatchIndex((prev) => prev + 1);
  };

  // Like logic with mutual like check and console logs
  const handleLike = async (itinerary: Itinerary) => {
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

    // 4. Create a new connection document with a unique ID
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

  return (
    <Box
      className="authFormContainer"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        width: "100%",
        height: "100%", // let it fill the parent, not force scrolling
        overflow: "hidden", // prevent accidental scrollbars
      }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          backgroundColor: "white",
          zIndex: 1,
          padding: "10px",
          marginTop: { xs: "5px", sm: "10px" },
          gap: { xs: 1, sm: 2 },
        }}>
        <FormControl
          sx={{
            minWidth: { xs: 120, sm: 200 },
            maxWidth: { xs: 180, sm: 300 },
            "& .MuiInputBase-root": {
              fontSize: { xs: "0.95rem", sm: "1rem" },
              height: { xs: 36, sm: 40 },
              padding: { xs: "2px 8px", sm: "8px 14px" },
            },
            "& .MuiSelect-select": {
              padding: { xs: "8px 8px", sm: "10px 14px" },
              fontSize: { xs: "0.95rem", sm: "1rem" },
            },
          }}>
          <Select
            aria-label="Select Itinerary"
            value={selectedItineraryId}
            onChange={(e) => handleItinerarySelect(e.target.value)}
            displayEmpty
            MenuProps={{
              PaperProps: {
                style: {
                  maxWidth: "300px",
                  wordWrap: "break-word",
                },
              },
            }}>
            <MenuItem value="" disabled>
              Select an itinerary
            </MenuItem>
            {sortedItineraries.map((itinerary) => (
              <MenuItem
                key={itinerary.id}
                value={itinerary.id}
                style={{
                  whiteSpace: "normal",
                  wordBreak: "break-word",
                  maxWidth: "350px",
                }}>
                <span>
                  {itinerary.destination}
                  <span style={{ fontSize: "0.8em", color: "#666" }}>
                    {" "}
                    ({itinerary.startDate} - {itinerary.endDate})
                  </span>
                </span>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button variant="contained" onClick={() => setShowModal(true)}>
          Add Itinerary
        </Button>
      </Box>
      {loading && (
        <Typography
          variant="h6"
          sx={{
            display: "flex",
            textAlign: "left",
            backgroundColor: "#f9f9f9",
            borderRadius: "8px",
            padding: { xs: "10px", sm: "20px" },
            flexDirection: "column",
            alignItems: "center",
            maxWidth: { xs: "95vw", sm: "350px" },
            fontSize: { xs: "0.98rem", sm: "1.15rem" },
            margin: "0 auto",
            marginBottom: { xs: "20px", sm: "40px" },
          }}>
          Create an itinerary to find matches for your future trips. Once
          created, select one of your itineraries from the dropdown, and we'll
          match you with others based on destination, dates, and preferences.
          Once matched, you can chat and plan your adventures together.
        </Typography>
      )}

      {matchingItineraries.length > 0 &&
        currentMatchIndex < matchingItineraries.length && (
          <Box
            sx={{
              marginTop: "20px",
              display: "flex",
              textAlign: "center",
              justifyContent: "center",
              backgroundColor: "#f9f9f9",
              borderRadius: "8px",
              padding: "20px",
              flexDirection: "column",
              alignItems: "center",
              maxWidth: "350px",
              marginBottom: "40px", // reduce from 200px
            }}>
            <ItineraryCard
              itinerary={matchingItineraries[currentMatchIndex]}
              onLike={handleLike}
              onDislike={handleDislike}
            />
          </Box>
        )}

      {matchingItineraries.length > 0 &&
        currentMatchIndex >= matchingItineraries.length && (
          <Typography>No more itineraries to view.</Typography>
        )}

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
