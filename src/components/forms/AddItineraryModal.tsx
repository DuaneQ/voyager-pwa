import React, { useState, useContext, useEffect } from "react";
import {
  Modal,
  Box,
  TextField,
  Button,
  Chip,
  MenuItem,
  Slider,
  FormControl,
} from "@mui/material";
import usePostItineraryToFirestore from "../../hooks/usePostItineraryToFirestore";
import { UserProfileContext } from "../../Context/UserProfileContext";
import useGetUserId from "../../hooks/useGetUserId";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import { GENDER_OPTIONS } from "../shared-strings/constants";

interface AddItineraryModalProps {
  open: boolean;
  onClose: () => void;
  onItineraryAdded: (newItinerary: string) => void;
}

const AddItineraryModal: React.FC<AddItineraryModalProps> = ({
  open,
  onClose,
  onItineraryAdded,
}) => {
  const { userProfile } = useContext(UserProfileContext);

  useEffect(() => {
    console.log("User Profile in AddItineraryModal:", userProfile);
  }, [userProfile]);

  const [newItinerary, setNewItinerary] = useState({
    destination: "",
    startDate: "",
    endDate: "",
    description: "",
    activities: [] as string[],
    gender: "",
    startDay: 0,
    endDay: 0,
    lowerRange: 0,
    upperRange: 100,
    likes: [] as string[],
  });
  const [activityInput, setActivityInput] = useState(""); // Input for adding activities
  const [dateError, setDateError] = useState<string | null>(null); // State for date validation error
  const { postItinerary } = usePostItineraryToFirestore();
  const userId: string | null = useGetUserId();

  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0]; // Format as YYYY-MM-DD
  };

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const startDate = e.target.value;
    const currentDate = getCurrentDate();

    if (startDate < currentDate) {
      setDateError(
        "Start Date cannot be earlier than today or greater than the end date."
      );
    } else if (newItinerary.endDate && startDate > newItinerary.endDate) {
      setDateError("Start Date cannot be greater than End Date.");
    } else {
      setDateError(null);
    }
    const startDay = new Date(startDate).getTime();

    setNewItinerary((prev) => ({ ...prev, startDate, startDay }));
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const endDate = e.target.value;

    if (newItinerary.startDate && endDate < newItinerary.startDate) {
      setDateError("End Date cannot be less than Start Date.");
    } else {
      setDateError(null);
    }
    const endDay = new Date(endDate).getTime();

    setNewItinerary((prev) => ({ ...prev, endDate, endDay }));
    console.log("End Date changed:", endDate, endDay);
  };

  const handleSaveItinerary = async () => {
    if (!newItinerary.destination) {
      alert("Destination is required.");
      return;
    }
    if (!newItinerary.startDate) {
      alert("Start Date is required.");
      return;
    }
    if (!newItinerary.endDate) {
      alert("End Date is required.");
      return;
    }
    if (!newItinerary.gender) {
      alert("Please select a gender preference.");
      return;
    }

    if (dateError) {
      alert("Please fix the date errors before saving.");
      return;
    }
    if (dateError) {
      alert("Please fix the date errors before saving.");
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
        userInfo, // Add userInfo to the itinerary
      };

      console.log("Saving itinerary:", itineraryWithUserInfo);
      await postItinerary(itineraryWithUserInfo); // Save itinerary to Firestore
      onItineraryAdded(newItinerary.destination); // Notify parent component
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
      alert("Itinerary successfully created!");
      onClose();
    } catch (error) {
      console.error("Error saving itinerary:", error);
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

  const handleAgeRangeChange = (event: Event, newValue: number | number[]) => {
    setNewItinerary((prev) => ({
      ...prev,
      ageRange: newValue as [number, number],
    }));
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
        }}>
        <h2>Add New Itinerary</h2>
        <GooglePlacesAutocomplete
          apiKey="AIzaSyC4VMlBMjgmvO_K1-wPOrQP1JKTvV7zmo8"
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
            types: ["(cities)"], // Restrict to cities
          }}
        />
        <TextField
          label="Start Date"
          type="date"
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
          value={newItinerary.startDate}
          onChange={handleStartDateChange}
          error={!!dateError} // Show error state if dateError exists
          helperText={
            dateError &&
            "Start Date cannot be earlier than today or greater than the End Date."
          }
        />
        <TextField
          label="End Date"
          type="date"
          fullWidth
          margin="normal"
          InputLabelProps={{ shrink: true }}
          value={newItinerary.endDate}
          onChange={handleEndDateChange}
          error={!!dateError} // Show error state if dateError exists
          helperText={
            dateError &&
            "End Date cannot be earlier than today or the Start Date."
          }
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
      </Box>
    </Modal>
  );
};

export default AddItineraryModal;
