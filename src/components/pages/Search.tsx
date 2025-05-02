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

export const Search = () => {
  useGetUserProfile();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [selectedItinerary, setSelectedItinerary] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const { fetchItineraries } = useGetItinerariesFromFirestore();
  const [loading, setLoading] = useState(false);
  const { matchingItineraries, searchItineraries } =
    useSearchItineraries();

  useEffect(() => {
    fetchItineraries(); // Fetch itineraries on component mount
    const loadItineraries = async () => {
      try {
        const fetchedItineraries = await fetchItineraries();
        if (!fetchedItineraries || fetchedItineraries.length === 0) {
          setLoading(true);
        } else {
          setItineraries(fetchedItineraries);
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading itineraries:", error);
      }
    };

    loadItineraries();
  }, [itineraries]);

  const handleItinerarySelect = (destination: string) => {
    setSelectedItinerary(destination);
    const selected = itineraries.find(
      (itinerary) => itinerary.destination === destination
    );
    if (selected) {
      console.log("Selected itinerary:", selected);
      searchItineraries(selected); // Search for matching itineraries
    }
  };

  return (
    <Box
      className="authFormContainer"
      sx={{
        display: "flex",
        justifyContent: "space-between",
        flexDirection: "column",
        alignItems: "center",
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
        }}>
        <FormControl>
          <Select
            aria-label="Select Itinerary"
            value={selectedItinerary}
            onChange={(e) => handleItinerarySelect(e.target.value)}
            displayEmpty
            style={{
              marginRight: "10px",
              minWidth: "200px",
              maxWidth: "300px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
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
            {itineraries.map((itinerary) => (
              <MenuItem key={itinerary.id} value={itinerary.destination}>
                {itinerary.destination}
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
            textAlign: "center",
            justifyContent: "center",
            backgroundColor: "#f9f9f9",
            borderRadius: "8px",
            padding: "20px",
            flexDirection: "column",
            alignItems: "center",
            maxWidth: "350px",
            margin: "0 auto",
            marginBottom: "400px",
          }}>
          Create an itinerary to find matches for your future trips. Once
          created, select one of your itineraries from the dropdown, and we'll
          match you with others based on destination, dates, and preferences.
          Once matched, you can chat and plan your adventures together.{" "}
        </Typography>
      )}
      {matchingItineraries.length > 0 && (
        <Box
          sx={{
            display: "flex",
            textAlign: "center",
            justifyContent: "center",
            backgroundColor: "#f9f9f9",
            borderRadius: "8px",
            padding: "20px",
            flexDirection: "column",
            alignItems: "center",
            maxWidth: "350px",
            margin: "0 auto",
            marginBottom: "200px",
          }}>
          <ItineraryCard itinerary={matchingItineraries[0]} />
        </Box>
      )}
      <AddItineraryModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onItineraryAdded={(newItinerary) =>
          setItineraries((prev) => [
            ...prev,
            { id: Date.now().toString(), destination: newItinerary },
          ])
        }
      />
    </Box>
  );
};
