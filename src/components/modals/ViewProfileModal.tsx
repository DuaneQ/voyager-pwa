import React, { useEffect, useState, useContext } from "react";
import {
  Modal,
  Box,
  Typography,
  CircularProgress,
  Card,
  FormControl,
  TextField,
  IconButton,
  Grid,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Snackbar,
  Alert,
  MenuItem,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import BlockIcon from "@mui/icons-material/Block";
import FlagIcon from "@mui/icons-material/Flag";
import StarIcon from "@mui/icons-material/Star";
import Rating from "@mui/material/Rating";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { app } from "../../environments/firebaseConfig";
import useGetUserId from "../../hooks/useGetUserId";
import { UserProfileContext } from "../../Context/UserProfileContext";

const db = getFirestore(app);

interface ViewProfileModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

export const ViewProfileModal: React.FC<ViewProfileModalProps> = ({
  open,
  onClose,
  userId,
}) => {
  // Add default empty values when context is not available
  const contextValue = useContext(UserProfileContext);
  const updateUserProfile = contextValue?.updateUserProfile || (() => { });

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [blockingInProgress, setBlockingInProgress] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success"
  );
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reportingInProgress, setReportingInProgress] = useState(false);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [newRating, setNewRating] = useState<number | null>(null);
  const currentUserId = useGetUserId();

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    setLoading(true);

    getDoc(doc(db, "users", userId))
      .then((snap) => {
        if (isMounted) {
          setProfile(snap.exists() ? snap.data() : null);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, userId]);

  useEffect(() => {
    if (profile?.ratings?.ratedBy && currentUserId) {
      const existingRating =
        profile.ratings.ratedBy[currentUserId]?.rating || null;
      setUserRating(existingRating);
      setNewRating(existingRating);
    }
  }, [profile, currentUserId]);

  // Filter out null/empty photos
  const validPhotos: string[] = Array.isArray(profile?.photos)
    ? profile.photos.filter((url: string | null | undefined) => !!url)
    : [];

  // First photo is profile photo, rest are other photos
  const profilePhoto = validPhotos[0] || null;
  const otherPhotos = validPhotos.slice(1, 5);

  // Handle block user confirmation
  const handleOpenBlockConfirmation = () => {
    setConfirmBlockOpen(true);
  };

  const handleCloseBlockConfirmation = () => {
    setConfirmBlockOpen(false);
  };

  // Handle actual blocking action
  const handleBlockUser = async () => {
    if (!currentUserId || !userId) {
      setSnackbarMessage("Unable to block user: You must be logged in");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    setBlockingInProgress(true);

    try {
      // 1. Find the specific connection between these two users
      const connectionsRef = collection(db, "connections");
      const connectionsQuery = query(
        connectionsRef,
        where("users", "array-contains", currentUserId)
      );

      const connectionsSnapshot = await getDocs(connectionsQuery);
      const deletePromises: Promise<void>[] = [];

      connectionsSnapshot.forEach((connDoc) => {
        const connData = connDoc.data();
        // Only delete connections that contain BOTH users
        if (
          connData.users &&
          connData.users.includes(currentUserId) &&
          connData.users.includes(userId)
        ) {
          console.log(`Deleting connection: ${connDoc.id}`);
          deletePromises.push(deleteDoc(doc(db, "connections", connDoc.id)));
        }
      });

      // Wait for all connection deletions to complete
      await Promise.all(deletePromises);

      // 2. Update current user's document to block the other user
      const currentUserRef = doc(db, "users", currentUserId);
      await updateDoc(currentUserRef, {
        blocked: arrayUnion(userId),
      });

      // 3. Update other user's document to block current user
      const otherUserRef = doc(db, "users", userId);
      await updateDoc(otherUserRef, {
        blocked: arrayUnion(currentUserId),
      });

      // 4. Update local state (context AND localStorage)
      // Get the fresh profile data with the updated blocked array
      const updatedUserSnap = await getDoc(currentUserRef);
      if (updatedUserSnap.exists()) {
        const updatedUserData = updatedUserSnap.data();

        // Update context
        updateUserProfile(updatedUserData);

        // Update localStorage
        localStorage.setItem("PROFILE_INFO", JSON.stringify(updatedUserData));
      }

      setSnackbarMessage("User blocked successfully");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);

      // Close dialogs
      setConfirmBlockOpen(false);
      onClose();
    } catch (error) {
      console.error("Error blocking user:", error);
      setSnackbarMessage("Failed to block user: An error occurred");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setBlockingInProgress(false);
    }
  };

  // Handle report user dialog open
  const handleOpenReportDialog = () => {
    setReportReason("");
    setReportDescription("");
    setReportDialogOpen(true);
  };

  // Handle report user dialog close
  const handleCloseReportDialog = () => {
    setReportDialogOpen(false);
  };

  // Handle actual reporting action
  const handleSubmitReport = async () => {
    if (!currentUserId || !userId) {
      setSnackbarMessage("Unable to report user: You must be logged in");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    if (!reportReason) {
      setSnackbarMessage("Please select a reason for your report");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    setReportingInProgress(true);

    try {
      // 1. Create violation record in Firestore
      const violationsRef = collection(db, "violations");
      const violationData = {
        reportedUserId: userId,
        reportedByUserId: currentUserId,
        reason: reportReason,
        description: reportDescription,
        timestamp: serverTimestamp(),
        status: "pending",
        userDetails: {
          reportedUser: profile || {},
        },
      };

      await addDoc(violationsRef, violationData);

      setSnackbarMessage("Report submitted successfully");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      setReportDialogOpen(false);
    } catch (error) {
      console.error("Error reporting user:", error);
      setSnackbarMessage("Failed to submit report: An error occurred");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setReportingInProgress(false);
    }
  };

  // Handle rating dialog open
  const handleOpenRatingDialog = () => {
    setRatingDialogOpen(true);
  };

  // Handle rating dialog close
  const handleCloseRatingDialog = () => {
    setRatingDialogOpen(false);
    // Reset to the current user's rating
    setNewRating(userRating);
  };

  // Handle actual rating submission
  const handleSubmitRating = async () => {
    if (!currentUserId || !userId || newRating === null) {
      setSnackbarMessage("Unable to submit rating: Please try again");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    setSubmittingRating(true);

    try {
      const userRef = doc(db, "users", userId);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        throw new Error("User not found");
      }

      const userData = userSnap.data();
      const currentRatings = userData.ratings || {
        average: 0,
        count: 0,
        ratedBy: {},
      };
      const oldRating = currentRatings.ratedBy[currentUserId]?.rating || 0;

      // Calculate new average rating
      let newAverage = currentRatings.average;
      let newCount = currentRatings.count;

      if (oldRating === 0) {
        // First time rating this user
        newCount += 1;
        newAverage = ((currentRatings.average * (newCount - 1)) + newRating) / newCount;
      } else {
        // Updating previous rating
        newAverage = ((currentRatings.average * newCount) - oldRating + newRating) / newCount;
      }

      // Update the ratings object
      const updatedRatings = {
        average: parseFloat(newAverage.toFixed(2)),
        count: newCount,
        ratedBy: {
          ...currentRatings.ratedBy,
          [currentUserId]: {
            rating: newRating,
            timestamp: Date.now(),
          },
        },
      };

      // Update Firestore
      await updateDoc(userRef, {
        ratings: updatedRatings,
      });

      // Update local state
      setUserRating(newRating);

      setSnackbarMessage("Rating submitted successfully");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);

      // Close dialog
      setRatingDialogOpen(false);
    } catch (error) {
      console.error("Error submitting rating:", error);
      setSnackbarMessage("Failed to submit rating: An error occurred");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setSubmittingRating(false);
    }
  };

  // Utility function to calculate age from date string
  function getAge(dobString?: string): string {
    if (!dobString) return "";
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return "";
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age.toString();
  }

  // Function to format rating display
  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "98vw", sm: 400 },
            maxWidth: { xs: 340, sm: 400 },
            maxHeight: { xs: "85vh", sm: "90vh" },
            bgcolor: "background.paper",
            boxShadow: 24,
            overflowY: "auto",
            p: { xs: 1, sm: 3 },
            borderRadius: 2,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}>
          {/* Top: Block button and close button */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <IconButton
                color="error"
                onClick={handleOpenBlockConfirmation}
                aria-label="Block user"
                sx={{
                  borderRadius: 1,
                  "&:hover": {
                    backgroundColor: "rgba(211, 47, 47, 0.04)",
                  },
                }}>
                <BlockIcon />
                <Typography
                  variant="caption"
                  sx={{ ml: 0.5, fontSize: "0.7rem" }}>
                  Block
                </Typography>
              </IconButton>
              <IconButton
                color="warning"
                onClick={handleOpenReportDialog}
                aria-label="Report user"
                sx={{
                  borderRadius: 1,
                  "&:hover": {
                    backgroundColor: "rgba(237, 108, 2, 0.04)",
                  },
                }}>
                <FlagIcon />
                <Typography
                  variant="caption"
                  sx={{ ml: 0.5, fontSize: "0.7rem" }}>
                  Report
                </Typography>
              </IconButton>
            </Box>
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Profile photo and info */}
          {profilePhoto && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                mb: 2,
                position: "relative",
              }}>
              <img
                src={profilePhoto}
                alt="Profile"
                style={{
                  width: 160,
                  height: 160,
                  objectFit: "cover",
                  borderRadius: 12,
                  border: "2px solid #fff",
                  background: "#eee",
                }}
                onClick={() => setSelectedPhoto(profilePhoto)}
              />
              <Typography variant="h5" sx={{ mt: 2 }}>
                {profile?.username || "User"}
              </Typography>

              {/* Add Rating Display */}
              <Box
                onClick={handleOpenRatingDialog}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mt: 1,
                  cursor: "pointer",
                  padding: "4px 8px",
                  borderRadius: 1,
                  "&:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.04)",
                  },
                }}>
                <Rating
                  name="user-rating-display"
                  value={profile?.ratings?.average || 0}
                  precision={0.5}
                  readOnly
                  sx={{ color: "primary.main", mr: 1 }}
                />
                <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                  {profile?.ratings?.average
                    ? `${formatRating(profile.ratings.average)} (${profile.ratings.count})`
                    : "No ratings yet"}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Rest of component remains the same */}
          {/* ... existing profile display code ... */}
          {!profilePhoto && (
            <Box sx={{ position: "relative", mb: 2 }}>
              <Typography variant="h5" sx={{ mt: 2, textAlign: "center" }}>
                {profile?.username || "User"}
              </Typography>
            </Box>
          )}
          <Box sx={{ flex: 1, overflowY: "auto" }}>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
                <CircularProgress />
              </Box>
            ) : profile ? (
              <>
                <Card
                  variant="outlined"
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    p: 2,
                  }}>
                  <FormControl>
                    <TextField
                      label="Bio"
                      value={profile.bio || ""}
                      InputProps={{ readOnly: true }}
                      multiline
                      rows={2}
                    />
                  </FormControl>
                  <FormControl>
                    <TextField
                      label="Age"
                      value={getAge(profile.dob)}
                      InputProps={{
                        readOnly: true,
                        sx: {
                          fontSize: { xs: "0.92rem", sm: "1rem" },
                          "&::placeholder": {
                            fontSize: { xs: "0.92rem", sm: "1rem" },
                          },
                        },
                      }}
                      InputLabelProps={{
                        sx: { fontSize: { xs: "0.92rem", sm: "1rem" } },
                      }}
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.92rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": {
                          fontSize: { xs: "0.92rem", sm: "1rem" },
                        },
                      }}
                    />
                  </FormControl>
                  <FormControl>
                    <TextField
                      label="Status"
                      value={profile?.status || ""}
                      InputProps={{
                        readOnly: true,
                        sx: {
                          fontSize: { xs: "0.92rem", sm: "1rem" },
                          "&::placeholder": {
                            fontSize: { xs: "0.92rem", sm: "1rem" },
                          },
                        },
                      }}
                      InputLabelProps={{
                        sx: { fontSize: { xs: "0.92rem", sm: "1rem" } },
                      }}
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.92rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": {
                          fontSize: { xs: "0.92rem", sm: "1rem" },
                        },
                      }}
                    />
                  </FormControl>
                  <FormControl>
                    <TextField
                      label="Gender"
                      value={profile.gender || ""}
                      InputProps={{
                        readOnly: true,
                        sx: {
                          fontSize: { xs: "0.92rem", sm: "1rem" },
                          "&::placeholder": {
                            fontSize: { xs: "0.92rem", sm: "1rem" },
                          },
                        },
                      }}
                      InputLabelProps={{
                        sx: { fontSize: { xs: "0.92rem", sm: "1rem" } },
                      }}
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.92rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": {
                          fontSize: { xs: "0.92rem", sm: "1rem" },
                        },
                      }}
                    />
                  </FormControl>
                  <FormControl>
                    <TextField
                      label="Sexual Orientation"
                      value={profile.sexualOrientation || ""}

                      InputProps={{
                        readOnly: true,
                        sx: {
                          fontSize: { xs: "0.92rem", sm: "1rem" },
                          "&::placeholder": {
                            fontSize: { xs: "0.92rem", sm: "1rem" },
                          },
                        },
                      }}
                      InputLabelProps={{
                        sx: { fontSize: { xs: "0.92rem", sm: "1rem" } },
                      }}
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.92rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": {
                          fontSize: { xs: "0.92rem", sm: "1rem" },
                        },
                      }}
                    />
                  </FormControl>
                  <FormControl>
                    <TextField
                      label="Education"
                      value={profile.edu || ""}
                      InputProps={{
                        readOnly: true,
                        sx: {
                          fontSize: { xs: "0.92rem", sm: "1rem" },
                          "&::placeholder": {
                            fontSize: { xs: "0.92rem", sm: "1rem" },
                          },
                        },
                      }}
                      InputLabelProps={{
                        sx: { fontSize: { xs: "0.92rem", sm: "1rem" } },
                      }}
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.92rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": {
                          fontSize: { xs: "0.92rem", sm: "1rem" },
                        },
                      }}
                    />
                  </FormControl>
                  <FormControl>
                    <TextField
                      label="Drinking"
                      value={profile.drinking || ""}
                      InputProps={{
                        readOnly: true,
                        sx: {
                          fontSize: { xs: "0.92rem", sm: "1rem" },
                          "&::placeholder": {
                            fontSize: { xs: "0.92rem", sm: "1rem" },
                          },
                        },
                      }}
                      InputLabelProps={{
                        sx: { fontSize: { xs: "0.92rem", sm: "1rem" } },
                      }}
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.92rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": {
                          fontSize: { xs: "0.92rem", sm: "1rem" },
                        },
                      }}
                    />
                  </FormControl>
                  <FormControl>
                    <TextField
                      label="Smoking"
                      value={profile.smoking || ""}
                      InputProps={{
                        readOnly: true,
                        sx: {
                          fontSize: { xs: "0.92rem", sm: "1rem" },
                          "&::placeholder": {
                            fontSize: { xs: "0.92rem", sm: "1rem" },
                          },
                        },
                      }}
                      InputLabelProps={{
                        sx: { fontSize: { xs: "0.92rem", sm: "1rem" } },
                      }}
                      sx={{
                        "& .MuiInputBase-input": {
                          fontSize: { xs: "0.92rem", sm: "1rem" },
                        },
                        "& .MuiInputLabel-root": {
                          fontSize: { xs: "0.92rem", sm: "1rem" },
                        },
                      }}
                    />
                  </FormControl>
                </Card>
                {/* Bottom: Other photos */}
                {otherPhotos.length > 0 && (
                  <Box sx={{ mt: 3 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ mb: 1, textAlign: "center" }}>
                      More Photos
                    </Typography>
                    <Grid container spacing={2} justifyContent="center">
                      {otherPhotos.map((photoUrl: string, idx: number) => (
                        <Grid item key={idx}>
                          <img
                            src={photoUrl}
                            alt={`Photo ${idx + 2}`}
                            style={{
                              width: 80,
                              height: 80,
                              objectFit: "cover",
                              borderRadius: 8,
                              border: "1px solid #ccc",
                              background: "#eee",
                            }}
                            onClick={() => setSelectedPhoto(photoUrl)}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                )}
              </>
            ) : (
              <Typography>No profile found.</Typography>
            )}
          </Box>
        </Box>
      </Modal>

      {/* Photo modal remains the same */}
      <Modal open={!!selectedPhoto} onClose={() => setSelectedPhoto(null)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            borderRadius: 2,
            p: 1,
            outline: "none",
            maxWidth: "90vw",
            maxHeight: "90vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
          <img
            src={selectedPhoto || ""}
            alt={
              profile?.username
                ? `${profile.username}'s profile`
                : "User profile"
            }
            style={{
              maxWidth: "80vw",
              maxHeight: "80vh",
              borderRadius: 8,
              objectFit: "contain",
            }}
          />
        </Box>
      </Modal>

      {/* Block confirmation dialog */}
      <Dialog
        open={confirmBlockOpen}
        onClose={handleCloseBlockConfirmation}
        aria-labelledby="block-dialog-title"
        aria-describedby="block-dialog-description">
        <DialogTitle id="block-dialog-title">Block this user?</DialogTitle>
        <DialogContent>
          <DialogContentText id="block-dialog-description">
            When you block someone:
          </DialogContentText>
          <ul>
            <li>They won't be able to see your profile or itineraries</li>
            <li>You won't see their profile or itineraries</li>
            <li>Any existing connections will be hidden</li>
            <li>Neither of you will be matched in future searches</li>
          </ul>
          <DialogContentText>
            This action cannot be easily undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseBlockConfirmation} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleBlockUser}
            color="error"
            disabled={blockingInProgress}
            startIcon={
              blockingInProgress ? (
                <CircularProgress size={20} />
              ) : (
                <BlockIcon />
              )
            }>
            {blockingInProgress ? "Blocking..." : "Block User"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Report user dialog */}
      <Dialog
        open={reportDialogOpen}
        onClose={handleCloseReportDialog}
        aria-labelledby="report-dialog-title"
        aria-describedby="report-dialog-description"
        PaperProps={{
          sx: {
            width: { xs: "90%", sm: 500 },
            maxWidth: "90vw",
            p: 1,
          },
        }}>
        <DialogTitle id="report-dialog-title">Report User</DialogTitle>
        <DialogContent sx={{ px: { xs: 2, sm: 3 } }}>
          <DialogContentText id="report-dialog-description" sx={{ mb: 3 }}>
            Please tell us why you are reporting this user. Your report will be
            reviewed by our team.
          </DialogContentText>
          <FormControl fullWidth sx={{ mb: 3 }}>
            <TextField
              select
              label="Reason for Report"
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              required
              SelectProps={{
                native: false,
                MenuProps: {
                  PaperProps: {
                    sx: {
                      maxHeight: 300,
                      "& .MuiMenuItem-root": {
                        py: 1.5,
                        px: 2,
                        whiteSpace: "normal", // Allow text wrapping
                        wordBreak: "break-word",
                      },
                    },
                  },
                },
              }}>
              <MenuItem value="">Select a reason</MenuItem>
              <MenuItem value="inappropriate_behavior">
                Inappropriate Behavior
              </MenuItem>
              <MenuItem value="harassment">Harassment</MenuItem>
              <MenuItem value="fake_profile">Fake Profile</MenuItem>
              <MenuItem value="scam">Scam/Fraud</MenuItem>
              <MenuItem value="offensive_content">Offensive Content</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </TextField>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <TextField
              label="Additional Details"
              multiline
              rows={4}
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              placeholder="Please provide any additional information about the issue"
              sx={{
                "& .MuiInputBase-root": {
                  padding: 1,
                },
              }}
            />
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          <Button onClick={handleCloseReportDialog} color="primary">
            Cancel
          </Button>
          <Button
            onClick={handleSubmitReport}
            color="warning"
            variant="contained"
            disabled={reportingInProgress || !reportReason}
            startIcon={
              reportingInProgress ? (
                <CircularProgress size={20} />
              ) : (
                <FlagIcon />
              )
            }>
            {reportingInProgress ? "Submitting..." : "Submit Report"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rating dialog */}
      <Dialog
        open={ratingDialogOpen}
        onClose={handleCloseRatingDialog}
        aria-labelledby="rating-dialog-title"
        aria-describedby="rating-dialog-description">
        <DialogTitle id="rating-dialog-title">
          Rate {profile?.username || "User"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="rating-dialog-description" sx={{ mb: 2 }}>
            Please select a rating from 1 to 5 stars based on your travel experience with this user.
          </DialogContentText>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              my: 2,
            }}>
            <Rating
              name="user-rating-input"
              value={newRating}
              onChange={(_, value) => setNewRating(value)}
              precision={1}
              size="large"
              data-testid="rating-input"
              sx={{ fontSize: "2.5rem", mb: 2 }}
            />
            {newRating && (
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Typography variant="body1" sx={{ fontWeight: "medium", mr: 1 }}>
                  Your rating:
                </Typography>
                <Typography variant="body1">
                  {newRating === 1
                    ? "Poor"
                    : newRating === 2
                      ? "Fair"
                      : newRating === 3
                        ? "Good"
                        : newRating === 4
                          ? "Very Good"
                          : "Excellent"}
                </Typography>
              </Box>
            )}

            {userRating && userRating !== newRating && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                You previously rated this user {userRating} stars
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRatingDialog}>Cancel</Button>
          <Button
            onClick={handleSubmitRating}
            color="primary"
            variant="contained"
            disabled={submittingRating || newRating === null}
            startIcon={
              submittingRating ? (
                <CircularProgress size={20} />
              ) : (
                <StarIcon />
              )
            }>
            {submittingRating ? "Submitting..." : "Submit Rating"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};
