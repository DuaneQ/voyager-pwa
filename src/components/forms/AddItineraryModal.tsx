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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from "@mui/material";
import usePostItineraryToFirestore from "../../hooks/usePostItineraryToFirestore";
import useUpdateItinerary from "../../hooks/useUpdateItinerary";
import useDeleteItinerary from "../../hooks/useDeleteItinerary";
import { Itinerary } from "../../types/Itinerary";
import { UserProfileContext } from "../../Context/UserProfileContext";
import { auth } from "../../environments/firebaseConfig";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import {
  GENDER_OPTIONS,
  STATUS_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
} from "../shared-strings/constants";
import ItineraryCard from "../forms/ItineraryCard";
import DOMPurify from "dompurify";

interface AddItineraryModalProps {
  open: boolean;
  onClose: () => void;
  onItineraryAdded: (destination: string) => void;
  onRefresh: () => void;
  itineraries: Itinerary[];
}

const AddItineraryModal: React.FC<AddItineraryModalProps> = ({
  open,
  onClose,
  onItineraryAdded,
  onRefresh,
  itineraries,
}) => {
  const { userProfile } = useContext(UserProfileContext);
  const { postItinerary } = usePostItineraryToFirestore();
  const { updateItinerary } = useUpdateItinerary();
  const { deleteItinerary } = useDeleteItinerary();
  const userId: string | null = auth.currentUser?.uid ?? null;

  const [newItinerary, setNewItinerary] = useState({
    destination: "",
    startDate: "",
    endDate: "",
    description: "",
    activities: [] as string[],
    gender: "",
    status: "",
    sexualOrientation: "", // Add this field
    startDay: 0,
    endDay: 0,
    lowerRange: 18,
    upperRange: 100,
    likes: [] as string[],
  });
  const [activityInput, setActivityInput] = useState("");
  const [startDateError, setStartDateError] = useState<string | null>(null);
  const [endDateError, setEndDateError] = useState<string | null>(null);

  // Edit and delete states
  const [editingItinerary, setEditingItinerary] = useState<Itinerary | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itineraryToDelete, setItineraryToDelete] = useState<Itinerary | null>(
    null
  );
  const [deletingItinerary, setDeletingItinerary] = useState(false);

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
    if (!newItinerary.status) {
      return "Please select a status preference.";
    }
    if (!newItinerary.sexualOrientation) {
      return "Please select a sexual orientation preference.";
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
      status: "",
      sexualOrientation: "", // Add this field
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
        email: userProfile?.email || "",
        status: userProfile?.status || "single",
        sexualOrientation: userProfile?.sexualOrientation || "not specified",
        blocked: userProfile?.blocked || [],
      };
      const itineraryData = {
        ...newItinerary,
        description: DOMPurify.sanitize(newItinerary.description),
        activities: newItinerary.activities.map((activity) =>
          DOMPurify.sanitize(activity)
        ),
        userInfo,
      };

      if (editingItinerary) {
        // Update existing itinerary
        await updateItinerary(editingItinerary.id, itineraryData);
        alert("Itinerary successfully updated!");
        setEditingItinerary(null);
        onRefresh(); // Trigger refresh for updated itinerary
      } else {
        // Create new itinerary
        await postItinerary(itineraryData);
        alert("Itinerary successfully created!");
        onItineraryAdded(newItinerary.destination); // Keep semantic meaning for new itineraries
      }
      resetItineraryForm();
      onClose();
    } catch (error) {
      alert(
        `An error occurred while ${
          editingItinerary ? "updating" : "saving"
        } the itinerary. Please try again.`
      );
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
      // Create date at noon UTC to avoid timezone issues
      const dateAtNoon = new Date(value + "T12:00:00.000Z");

      setNewItinerary((prev) => ({
        ...prev,
        startDate: value,
        startDay: dateAtNoon.getTime(),
      }));
    } else if (type === "endDate") {
      if (newItinerary.startDate && value < newItinerary.startDate) {
        setEndDateError("End Date cannot be less than Start Date.");
      } else {
        setEndDateError(null);
      }
      // Create date at noon UTC to avoid timezone issues
      const dateAtNoon = new Date(value + "T12:00:00.000Z");

      setNewItinerary((prev) => ({
        ...prev,
        endDate: value,
        endDay: dateAtNoon.getTime(),
      }));
    }
  };

  const handleEditItinerary = (itinerary: Itinerary) => {
    // Don't allow editing AI-generated itineraries in this modal
    if (
      (itinerary as any).ai_status === "completed" ||
      (itinerary as any).aiGenerated
    ) {
      alert(
        "AI-generated itineraries cannot be edited in this modal. Please use the AI Itinerary Display to edit AI itineraries."
      );
      return;
    }

    setEditingItinerary(itinerary);

    // Ensure dates are in YYYY-MM-DD format for HTML date inputs
    const formatDateForInput = (
      dateValue: string | undefined,
      fieldName: string
    ) => {
      if (!dateValue) {
        return "";
      }

      // If it's already in YYYY-MM-DD format, use it directly
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }

      // If it's a timestamp or other format, convert to YYYY-MM-DD
      const date = new Date(dateValue);

      if (isNaN(date.getTime())) {
        return ""; // Invalid date
      }

      // Format as YYYY-MM-DD for HTML date input
      const formatted = date.toISOString().split("T")[0];

      return formatted;
    };

    const formattedStartDate = formatDateForInput(
      itinerary.startDate,
      "startDate"
    );
    const formattedEndDate = formatDateForInput(itinerary.endDate, "endDate");

    setNewItinerary({
      destination: itinerary.destination,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      description: itinerary.description || "",
      activities: itinerary.activities || [],
      gender: itinerary.gender || "",
      status: itinerary.status || "",
      sexualOrientation: itinerary.sexualOrientation || "",
      startDay: itinerary.startDay || 0,
      endDay: itinerary.endDay || 0,
      lowerRange: itinerary.lowerRange || 18,
      upperRange: itinerary.upperRange || 100,
      likes: itinerary.likes || [],
    });
  };

  const handleDeleteClick = (itinerary: Itinerary) => {
    setItineraryToDelete(itinerary);
    setDeleteDialogOpen(true);
  };

  const handleDeleteItinerary = async () => {
    if (!itineraryToDelete) return;

    setDeletingItinerary(true);
    try {
      await deleteItinerary(itineraryToDelete.id);
      onRefresh(); // Trigger refresh
      alert("Itinerary successfully deleted!");
    } catch (error) {
      alert(
        "An error occurred while deleting the itinerary. Please try again."
      );
    } finally {
      setDeletingItinerary(false);
      setDeleteDialogOpen(false);
      setItineraryToDelete(null);
    }
  };

  const handleCancelEdit = () => {
    setEditingItinerary(null);
    resetItineraryForm();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90vw", sm: 400 },
            maxWidth: { xs: "90vw", sm: 400 },
            minWidth: { xs: "90vw", sm: 400 },
            bgcolor: "background.paper",
            boxShadow: 24,
            p: { xs: 1.5, sm: 4 },
            borderRadius: 2,
            maxHeight: { xs: "75vh", sm: "80vh" },
            overflowY: "auto",
          }}
        >
          <h2>{editingItinerary ? "Edit Itinerary" : "Add New Itinerary"}</h2>
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
              styles: {
                control: (provided: any) => ({
                  ...provided,
                  marginBottom: "16px",
                  borderColor: "#ccc",
                  "&:hover": {
                    borderColor: "#1976d2",
                  },
                }),
                menu: (provided: any) => ({
                  ...provided,
                  backgroundColor: "#ffffff",
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  border: "1px solid #ccc",
                  borderRadius: "4px",
                  zIndex: 9999,
                  position: "absolute",
                }),
                menuList: (provided: any) => ({
                  ...provided,
                  backgroundColor: "#ffffff",
                  maxHeight: "200px",
                  overflowY: "auto",
                }),
                option: (provided: any, state: any) => ({
                  ...provided,
                  backgroundColor: state.isSelected
                    ? "#1976d2"
                    : state.isFocused
                    ? "#f5f5f5"
                    : "#ffffff",
                  color: state.isSelected ? "#ffffff" : "#000000",
                  padding: "12px 16px",
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: state.isSelected ? "#1976d2" : "#f5f5f5",
                  },
                }),
                singleValue: (provided: any) => ({
                  ...provided,
                  color: "#000000",
                }),
                placeholder: (provided: any) => ({
                  ...provided,
                  color: "#999999",
                }),
              },
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
              }
            >
              <MenuItem value="No Preference">No Preference</MenuItem>
              {GENDER_OPTIONS.map((option, index) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <TextField
              id="status"
              value={newItinerary.status}
              select
              required
              fullWidth
              name="status"
              label="I am looking for"
              onChange={(e) =>
                setNewItinerary((prev) => ({
                  ...prev,
                  status: e.target.value,
                }))
              }
            >
              <MenuItem value="No Preference">No Preference</MenuItem>
              {STATUS_OPTIONS.map((option, index) => (
                <MenuItem key={index} value={option.toLowerCase()}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <TextField
              id="sexualOrientation"
              value={newItinerary.sexualOrientation}
              select
              required
              fullWidth
              name="sexualOrientation"
              label="Sexual orientation preference"
              onChange={(e) =>
                setNewItinerary((prev) => ({
                  ...prev,
                  sexualOrientation: e.target.value,
                }))
              }
            >
              <MenuItem value="No Preference">No Preference</MenuItem>
              {SEXUAL_ORIENTATION_OPTIONS.map((option, index) => (
                <MenuItem key={index} value={option.toLowerCase()}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </FormControl>
          <Box sx={{ mt: 1 }}>
            <label>Age Range</label>
            <Slider
              value={[newItinerary.lowerRange, newItinerary.upperRange]}
              onChange={(e, newValue) => {
                const [lower, upper] = newValue as number[];
                setNewItinerary((prev) => ({
                  ...prev,
                  lowerRange: lower,
                  upperRange: upper,
                }));
              }}
              valueLabelDisplay="auto"
              min={18}
              max={100}
              disableSwap
            />
          </Box>
          {/* Age Range Badge */}
          <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              color="primary"
              size="small"
              label={`Age Range: ${newItinerary.lowerRange} - ${newItinerary.upperRange}`}
              sx={{ fontWeight: 400, fontSize: "0.85rem", height: 24 }}
            />
          </Box>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
            onClick={handleSaveItinerary}
          >
            {editingItinerary ? "Update Itinerary" : "Save Itinerary"}
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            fullWidth
            sx={{ mt: 2 }}
            onClick={editingItinerary ? handleCancelEdit : onClose}
          >
            Cancel
          </Button>
          <Box mt={4}>
            <Typography variant="h6" gutterBottom>
              Your Itineraries
            </Typography>
            {itineraries.length > 0 ? (
              itineraries.map((itinerary) => (
                <ItineraryCard
                  key={itinerary.id}
                  itinerary={itinerary}
                  onLike={() => {}}
                  onDislike={() => {}}
                  onEdit={handleEditItinerary}
                  onDelete={handleDeleteClick}
                  showEditDelete={true}
                />
              ))
            ) : (
              <Typography variant="body2" color="textSecondary">
                No itineraries available.
              </Typography>
            )}
          </Box>
        </Box>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteDialogOpen}
          onClose={() => !deletingItinerary && setDeleteDialogOpen(false)}
          aria-labelledby="delete-itinerary-dialog-title"
        >
          <DialogTitle id="delete-itinerary-dialog-title">
            Delete Itinerary?
          </DialogTitle>
          <DialogContent>
            <DialogContentText>
              Are you sure you want to delete this itinerary? This action cannot
              be undone.
              {itineraryToDelete?.destination && (
                <>
                  <br />
                  <strong>"{itineraryToDelete.destination}"</strong>
                </>
              )}
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletingItinerary}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteItinerary}
              color="error"
              variant="contained"
              disabled={deletingItinerary}
            >
              {deletingItinerary ? "Deleting..." : "Delete"}
            </Button>
          </DialogActions>
        </Dialog>
      </>
    </Modal>
  );
};

export default AddItineraryModal;
