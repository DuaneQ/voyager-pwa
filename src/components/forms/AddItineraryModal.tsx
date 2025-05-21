import React, { useState, useContext } from "react";
import {
  Modal,
  Box,
  TextField,
  Button,
  Chip,
  MenuItem,
  Slider,
  FormControl,
  Typography,
} from "@mui/material";
import usePostItineraryToFirestore from "../../hooks/usePostItineraryToFirestore";
import { Itinerary } from "../../types/Itinerary"; // Adjust the path as needed
import { UserProfileContext } from "../../Context/UserProfileContext";
import useGetUserId from "../../hooks/useGetUserId";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import { GENDER_OPTIONS } from "../shared-strings/constants";
import ItineraryCard from "../forms/ItineraryCard";

interface AddItineraryModalProps {
  open: boolean;
  onClose: () => void;
  onItineraryAdded: (destination: string) => void; // Trigger the re-fetch in Search.tsx
  itineraries: Itinerary[]; // Pass itineraries as a prop
}

const AddItineraryModal: React.FC<AddItineraryModalProps> = ({
  open,
  onClose,
  onItineraryAdded,
  itineraries,
}) => {
  const { userProfile } = useContext(UserProfileContext);
  const { postItinerary } = usePostItineraryToFirestore();
  const userId: string | null = useGetUserId();

  const [newItinerary, setNewItinerary] = useState({
    destination: "",
    startDate: "",
    endDate: "",
    description: "",
    activities: [] as string[],
    gender: "",
    startDay: 0,
    endDay: 0,
    lowerRange: 18,
    upperRange: 100,
    likes: [] as string[],
  });
  const [activityInput, setActivityInput] = useState("");
  const [startDateError, setStartDateError] = useState<string | null>(null);
  const [endDateError, setEndDateError] = useState<string | null>(null);

  // Helper function to validate the itinerary
  const validateItinerary = (): string | null => {
    if (!userProfile?.dob || !userProfile?.gender) {
      return "Please complete your profile by setting your date of birth and gender before creating an itinerary.";
    }
    if (!newItinerary.destination) {
      return "Destination is required.";
    }
    if (!newItinerary.startDate) {
      return "Start Date is required.";
    }
    if (!newItinerary.endDate) {
      return "End Date is required.";
    }
    if (!newItinerary.gender) {
      return "Please select a gender preference.";
    }
    if (startDateError || endDateError) {
      return "Please fix the date errors before saving.";
    }
    return null;
  };

  // Helper function to reset the itinerary form
  const resetItineraryForm = () => {
    setNewItinerary({
      destination: "",
      startDate: "",
      endDate: "",
      description: "",
      activities: [],
      gender: "",
      startDay: 0,
      endDay: 0,
      lowerRange: 18,
      upperRange: 100,
      likes: [],
    });
    setActivityInput("");
    setStartDateError(null);
    setEndDateError(null);
  };

  const handleSaveItinerary = async () => {
    const validationError = validateItinerary();
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      const userInfo = {
        username: userProfile?.username || "Anonymous",
        gender: userProfile?.gender || "Not specified",
        dob: userProfile?.dob || "Unknown",
        uid: userId || "Unknown",
      };
      const itineraryWithUserInfo = {
        ...newItinerary,
        userInfo,
      };

      await postItinerary(itineraryWithUserInfo);
      onItineraryAdded(newItinerary.destination); // Pass the destination to the callback
      resetItineraryForm();
      alert("Itinerary successfully created!");
      onClose();
    } catch (error) {
      alert("An error occurred while saving the itinerary. Please try again.");
    }
  };

  const handleAddActivity = () => {
    if (activityInput.trim()) {
      setNewItinerary((prev) => ({
        ...prev,
        activities: [...prev.activities, activityInput.trim()],
      }));
      setActivityInput("");
    }
  };

  const handleDateChange = (type: "startDate" | "endDate", value: string) => {
    const currentDate = new Date().toISOString().split("T")[0];
    if (type === "startDate") {
      if (value < currentDate) {
        setStartDateError("Start Date cannot be earlier than today.");
      } else if (newItinerary.endDate && value > newItinerary.endDate) {
        setStartDateError("Start Date cannot be greater than End Date.");
      } else {
        setStartDateError(null);
      }
      setNewItinerary((prev) => ({
        ...prev,
        startDate: value,
        startDay: new Date(value).getTime(),
      }));
    } else if (type === "endDate") {
      if (newItinerary.startDate && value < newItinerary.startDate) {
        setEndDateError("End Date cannot be less than Start Date.");
      } else {
        setEndDateError(null);
      }
      setNewItinerary((prev) => ({
        ...prev,
        endDate: value,
        endDay: new Date(value).getTime(),
      }));
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 4,
          borderRadius: 2,
          maxHeight: "80vh",
          overflowY: "auto",
        }}>
        <h2>Add New Itinerary</h2>
        <GooglePlacesAutocomplete
          apiKey={process.env.REACT_APP_GOOGLE_PLACES_API_KEY}
          selectProps={{
            value: newItinerary.destination
              ? {
                  label: newItinerary.destination,
                  value: newItinerary.destination,
                }
              : null,
            onChange: (value: any) =>
              setNewItinerary((prev) => ({
                ...prev,
                destination: value.label,
              })),
            placeholder: "Search for a city...",
          }}
          autocompletionRequest={{
            types: ["(cities)"],
          }}
        />
        <TextField
          label="Start Date"
          type="date"
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
          value={newItinerary.startDate}
          onChange={(e) => handleDateChange("startDate", e.target.value)}
          error={!!startDateError}
          helperText={startDateError}
        />
        <TextField
          label="End Date"
          type="date"
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
          value={newItinerary.endDate}
          onChange={(e) => handleDateChange("endDate", e.target.value)}
          error={!!endDateError}
          helperText={endDateError}
        />
        <TextField
          label="Provide a description of your trip"
          multiline
          rows={3}
          fullWidth
          margin="normal"
          value={newItinerary.description}
          onChange={(e) =>
            setNewItinerary((prev) => ({
              ...prev,
              description: e.target.value,
            }))
          }
        />
        <TextField
          label="Add Activity"
          fullWidth
          margin="normal"
          value={activityInput}
          onChange={(e) => setActivityInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAddActivity()}
        />
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
          {newItinerary.activities.map((activity, index) => (
            <Chip
              key={index}
              label={activity}
              onDelete={() =>
                setNewItinerary((prev) => ({
                  ...prev,
                  activities: prev.activities.filter((_, i) => i !== index),
                }))
              }
            />
          ))}
        </Box>
        <FormControl fullWidth margin="normal">
          <TextField
            id="gender"
            value={newItinerary.gender}
            select
            required
            fullWidth
            name="gender"
            label="I am looking for a"
            onChange={(e) =>
              setNewItinerary((prev) => ({
                ...prev,
                gender: e.target.value,
              }))
            }>
            {GENDER_OPTIONS.map((option, index) => (
              <MenuItem key={index} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        </FormControl>
        <Box sx={{ mt: 2 }}>
          <label>Lower Age Range</label>
          <Slider
            value={newItinerary.lowerRange}
            onChange={(e, newValue) =>
              setNewItinerary((prev) => ({
                ...prev,
                lowerRange: newValue as number,
              }))
            }
            valueLabelDisplay="auto"
            min={18}
            max={100}
          />
        </Box>
        <Box sx={{ mt: 2 }}>
          <label>Upper Age Range</label>
          <Slider
            value={newItinerary.upperRange}
            onChange={(e, newValue) =>
              setNewItinerary((prev) => ({
                ...prev,
                upperRange: newValue as number,
              }))
            }
            valueLabelDisplay="auto"
            min={18}
            max={100}
          />
        </Box>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 2 }}
          onClick={handleSaveItinerary}>
          Save Itinerary
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          fullWidth
          sx={{ mt: 2 }}
          onClick={onClose}>
          Cancel
        </Button>
        <Box mt={4}>
          <Typography variant="h6" gutterBottom>
            Your Itineraries
          </Typography>
          {itineraries.length > 0 ? (
            itineraries.map((itinerary) => (
              <ItineraryCard key={itinerary.id} itinerary={itinerary} />
            ))
          ) : (
            <Typography variant="body2" color="textSecondary">
              No itineraries available.
            </Typography>
          )}
        </Box>
      </Box>
    </Modal>
  );
};

export default AddItineraryModal;
