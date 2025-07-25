import React, { useEffect, useState, useContext, useCallback } from "react";
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
  Tabs,
  Tab,
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
  orderBy,
  limit,
} from "firebase/firestore";
import { app } from "../../environments/firebaseConfig";
import { auth } from "../../environments/firebaseConfig";
import { UserProfileContext } from "../../Context/UserProfileContext";
import RatingsCommentsList from "../common/RatingsCommentsList";
import { Video } from "../../types/Video";
import DOMPurify from 'dompurify';

const db = getFirestore(app);

interface ViewProfileModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
}

// TabPanel component for Material-UI tabs
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0 }}>
          {children}
        </Box>
      )}
    </div>
  );
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
  const [newComment, setNewComment] = useState<string>("");
  const [canRate, setCanRate] = useState<boolean>(false);
  const [checkingConnection, setCheckingConnection] = useState<boolean>(false);

  // Tab state
  const [currentTab, setCurrentTab] = useState(0);
  
  // Videos state
  const [userVideos, setUserVideos] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [enlargedVideo, setEnlargedVideo] = useState<Video | null>(null);
  const [hasAttemptedVideoLoad, setHasAttemptedVideoLoad] = useState(false);

  const currentUserId = typeof auth !== 'undefined' && auth.currentUser ? auth.currentUser.uid : null;
  // Check if the current user has a connection with the viewed user
  useEffect(() => {
    if (!open || !currentUserId || !userId) {
      setCanRate(false);
      return;
    }
    // Prevent rating self
    if (currentUserId === userId) {
      setCanRate(false);
      return;
    }
    setCheckingConnection(true);
    const checkConnection = async () => {
      try {
        const connectionsRef = collection(db, "connections");
        const q = query(
          connectionsRef,
          where("users", "array-contains", currentUserId)
        );
        const snapshot = await getDocs(q);
        let found = false;
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (Array.isArray(data.users) && data.users.includes(userId)) {
            found = true;
          }
        });
        setCanRate(found);
      } catch (e) {
        setCanRate(false);
      } finally {
        setCheckingConnection(false);
      }
    };
    checkConnection();
  }, [open, currentUserId, userId]);

  useEffect(() => {
    if (!open) {
      // Clear videos when modal is closed
      setUserVideos([]);
      setCurrentTab(0); // Reset to first tab
      setHasAttemptedVideoLoad(false); // Reset video load attempt flag
      return;
    }

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
      // Clear videos when modal is closed
      setUserVideos([]);
      setLoadingVideos(false);
      setVideosError(null);
      setHasAttemptedVideoLoad(false);
    };
  }, [open, userId]);

  // Function to load user's videos
  const loadUserVideos = useCallback(async () => {
    if (!userId) return;
    
    setLoadingVideos(true);
    setVideosError(null);
    setHasAttemptedVideoLoad(true);
    try {
      const videosQuery = query(
        collection(db, 'videos'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(20) // Load recent videos
      );
      
      const videosSnapshot = await getDocs(videosQuery);
      const videos: Video[] = [];
      
      videosSnapshot.forEach((doc) => {
        videos.push({
          id: doc.id,
          ...doc.data()
        } as Video);
      });
      
      setUserVideos(videos);
    } catch (error) {
      console.error('Error loading user videos:', error);
      setVideosError('Failed to load videos');
      setUserVideos([]);
    } finally {
      setLoadingVideos(false);
    }
  }, [userId]);

  // Load videos only when Videos tab is selected
  useEffect(() => {
    if (currentTab === 2 && userId && !loadingVideos && userVideos.length === 0 && !videosError && !hasAttemptedVideoLoad) {
      loadUserVideos();
    }
  }, [currentTab, userId, loadingVideos, userVideos.length, videosError, hasAttemptedVideoLoad, loadUserVideos]);

  useEffect(() => {
    if (profile?.ratings?.ratedBy && currentUserId) {
      const existingRating = profile.ratings.ratedBy[currentUserId]?.rating || null;
      const existingComment = profile.ratings.ratedBy[currentUserId]?.comment || "";
      setUserRating(existingRating);
      setNewRating(existingRating);
      setNewComment(existingComment);
    }
  }, [profile, currentUserId]);

  // Filter out null/empty photos
  // Use new slot-based photo object
  const photos = profile?.photos || {};
  const profilePhoto = photos.profile || null;

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

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
        description: DOMPurify.sanitize(reportDescription),
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
    if (canRate) {
      setRatingDialogOpen(true);
    }
  };

  // Handle rating dialog close
  const handleCloseRatingDialog = () => {
    setRatingDialogOpen(false);
    // Reset to the current user's rating and comment
    setNewRating(userRating);
    setNewComment(
      currentUserId && profile?.ratings?.ratedBy && profile.ratings.ratedBy[currentUserId]
        ? profile.ratings.ratedBy[currentUserId].comment || ""
        : ""
    );
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
            comment: DOMPurify.sanitize(newComment),
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

      setSnackbarMessage("Rating and comment submitted successfully");
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
            height: { xs: "90vh", sm: "85vh" },
            maxHeight: { xs: "90vh", sm: "85vh" },
            bgcolor: "background.paper",
            boxShadow: 24,
            overflowY: "hidden",
            p: { xs: 1, sm: 2 },
            borderRadius: 2,
            display: "flex",
            flexDirection: "column",
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

          {/* Profile photo, username, and rating (always show rating) */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              mb: 1.5,
              position: "relative",
            }}>
            {profilePhoto ? (
              <img
                src={profilePhoto}
                alt={profile?.username ? `${profile.username}` : "User"}
                loading="lazy"
                style={{
                  width: 80,
                  height: 80,
                  objectFit: "cover",
                  borderRadius: 8,
                  border: "2px solid #fff",
                  background: "#eee",
                }}
                onClick={() => setSelectedPhoto(profilePhoto)}
              />
            ) : null}
            <Typography variant="h6" sx={{ mt: 1, textAlign: "center", fontSize: "1.1rem" }}>
              {profile?.username || "User"}
            </Typography>
            {/* Rating Display (always visible) */}
            <Box
              onClick={handleOpenRatingDialog}
              sx={{
                display: "flex",
                alignItems: "center",
                mt: 0.5,
                cursor: canRate ? "pointer" : "not-allowed",
                padding: "2px 6px",
                borderRadius: 1,
                "&:hover": canRate ? {
                  backgroundColor: "rgba(0, 0, 0, 0.04)",
                } : {},
                opacity: checkingConnection ? 0.5 : 1,
              }}
              title={canRate ? "Rate this user" : "You can only rate users you have connected with."}
              data-testid="rating-display"
            >
              <Rating
                name="user-rating-display"
                value={profile?.ratings?.average || 0}
                precision={0.5}
                readOnly
                size="small"
                sx={{ color: "primary.main", mr: 0.5 }}
              />
              {profile?.ratings?.average ? (
                <>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: "medium", fontSize: "0.85rem" }}
                    data-testid="rating-average"
                  >
                    {formatRating(profile.ratings.average)}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: "medium", ml: 0.5, fontSize: "0.85rem" }}
                    data-testid="rating-count"
                  >
                    ({profile.ratings.count})
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" sx={{ fontWeight: "medium", fontSize: "0.85rem" }}>
                  No ratings yet
                </Typography>
              )}
              {!canRate && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1, fontSize: "0.75rem" }}>
                  (Connect to rate)
                </Typography>
              )}
            </Box>
          </Box>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}>
            <Tabs value={currentTab} onChange={handleTabChange} centered>
              <Tab label="Profile" />
              <Tab label="Photos" />
              <Tab label="Videos" />
            </Tabs>
          </Box>

          <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
                <CircularProgress />
              </Box>
            ) : profile ? (
              <>
                {/* Profile Tab */}
                <TabPanel value={currentTab} index={0}>
                  <Card
                    variant="outlined"
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.5,
                      p: 2,
                    }}>
                    <FormControl>
                      <TextField
                        label="Bio"
                        value={profile.bio || ""}
                        InputProps={{
                          readOnly: true,
                          style: { pointerEvents: 'none', background: '#f5f5f5' },
                        }}
                        multiline
                        rows={2}
                        variant="outlined"
                        sx={{
                          '& .MuiInputBase-input.Mui-disabled': {
                            WebkitTextFillColor: '#222',
                          },
                          '& .MuiOutlinedInput-root': {
                            background: '#f5f5f5',
                          },
                        }}
                      />
                    </FormControl>
                    <FormControl>
                      <TextField
                        label="Age"
                        value={getAge(profile.dob)}
                        InputProps={{
                          readOnly: true,
                          style: { pointerEvents: 'none', background: '#f5f5f5' },
                        }}
                        variant="outlined"
                        sx={{
                          '& .MuiInputBase-input.Mui-disabled': {
                            WebkitTextFillColor: '#222',
                          },
                          '& .MuiOutlinedInput-root': {
                            background: '#f5f5f5',
                          },
                          '& .MuiInputBase-input': {
                            fontSize: { xs: '0.92rem', sm: '1rem' },
                          },
                          '& .MuiInputLabel-root': {
                            fontSize: { xs: '0.92rem', sm: '1rem' },
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
                          style: { pointerEvents: 'none', background: '#f5f5f5' },
                        }}
                        variant="outlined"
                        sx={{
                          '& .MuiInputBase-input.Mui-disabled': {
                          WebkitTextFillColor: '#222',
                        },
                        '& .MuiOutlinedInput-root': {
                          background: '#f5f5f5',
                        },
                        '& .MuiInputBase-input': {
                          fontSize: { xs: '0.92rem', sm: '1rem' },
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: { xs: '0.92rem', sm: '1rem' },
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
                        style: { pointerEvents: 'none', background: '#f5f5f5' },
                      }}
                      variant="outlined"
                      sx={{
                        '& .MuiInputBase-input.Mui-disabled': {
                          WebkitTextFillColor: '#222',
                        },
                        '& .MuiOutlinedInput-root': {
                          background: '#f5f5f5',
                        },
                        '& .MuiInputBase-input': {
                          fontSize: { xs: '0.92rem', sm: '1rem' },
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: { xs: '0.92rem', sm: '1rem' },
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
                        style: { pointerEvents: 'none', background: '#f5f5f5' },
                      }}
                      variant="outlined"
                      sx={{
                        '& .MuiInputBase-input.Mui-disabled': {
                          WebkitTextFillColor: '#222',
                        },
                        '& .MuiOutlinedInput-root': {
                          background: '#f5f5f5',
                        },
                        '& .MuiInputBase-input': {
                          fontSize: { xs: '0.92rem', sm: '1rem' },
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: { xs: '0.92rem', sm: '1rem' },
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
                        style: { pointerEvents: 'none', background: '#f5f5f5' },
                      }}
                      variant="outlined"
                      sx={{
                        '& .MuiInputBase-input.Mui-disabled': {
                          WebkitTextFillColor: '#222',
                        },
                        '& .MuiOutlinedInput-root': {
                          background: '#f5f5f5',
                        },
                        '& .MuiInputBase-input': {
                          fontSize: { xs: '0.92rem', sm: '1rem' },
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: { xs: '0.92rem', sm: '1rem' },
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
                        style: { pointerEvents: 'none', background: '#f5f5f5' },
                      }}
                      variant="outlined"
                      sx={{
                        '& .MuiInputBase-input.Mui-disabled': {
                          WebkitTextFillColor: '#222',
                        },
                        '& .MuiOutlinedInput-root': {
                          background: '#f5f5f5',
                        },
                        '& .MuiInputBase-input': {
                          fontSize: { xs: '0.92rem', sm: '1rem' },
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: { xs: '0.92rem', sm: '1rem' },
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
                        style: { pointerEvents: 'none', background: '#f5f5f5' },
                      }}
                      variant="outlined"
                      sx={{
                        '& .MuiInputBase-input.Mui-disabled': {
                          WebkitTextFillColor: '#222',
                        },
                        '& .MuiOutlinedInput-root': {
                          background: '#f5f5f5',
                        },
                        '& .MuiInputBase-input': {
                          fontSize: { xs: '0.92rem', sm: '1rem' },
                        },
                        '& .MuiInputLabel-root': {
                          fontSize: { xs: '0.92rem', sm: '1rem' },
                        },
                      }}
                    />
                  </FormControl>
                </Card>
                </TabPanel>

                {/* Photos Tab */}
                <TabPanel value={currentTab} index={1}>
                  <Box sx={{ py: 1 }}>
                    {(() => {
                      const photos = profile?.photos || {};
                      const allPhotos = [
                        photos.profile,
                        photos.slot1,
                        photos.slot2,
                        photos.slot3,
                        photos.slot4
                      ].filter(Boolean);
                      
                      return allPhotos.length > 0 ? (
                        <Grid container spacing={2}>
                          {allPhotos.map((photoUrl: string, idx: number) => (
                            <Grid item xs={6} sm={4} md={3} key={idx}>
                              <Box
                                sx={{
                                  position: 'relative',
                                  aspectRatio: '1',
                                  backgroundColor: '#f5f5f5',
                                  borderRadius: 2,
                                  overflow: 'hidden',
                                  cursor: 'pointer',
                                  '&:hover': {
                                    opacity: 0.8,
                                  },
                                }}
                                onClick={() => setSelectedPhoto(photoUrl)}
                              >                              <img
                                src={photoUrl}
                                alt={`User photo ${idx + 1}`}
                                style={{
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                }}
                              />
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      ) : (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                          <Typography variant="h6" color="text.secondary">
                            No photos available
                          </Typography>
                        </Box>
                      );
                    })()}
                  </Box>
                </TabPanel>

                {/* Videos Tab */}
                <TabPanel value={currentTab} index={2} data-testid="videos-tab-panel">
                  <Box sx={{ py: 1 }}>
                    {loadingVideos ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }} data-testid="videos-loading">
                        <CircularProgress />
                      </Box>
                    ) : videosError ? (
                      <Box sx={{ textAlign: 'center', py: 4 }} data-testid="videos-error">
                        <Typography variant="h6" color="error">
                          {videosError}
                        </Typography>
                      </Box>
                    ) : userVideos.length > 0 ? (
                      <Grid container spacing={2}>
                        {userVideos.map((video) => (
                          <Grid item xs={6} sm={4} md={3} key={video.id}>
                            <Box
                              data-testid={`user-video-${video.id}`}
                              sx={{
                                position: 'relative',
                                aspectRatio: '9/16',
                                backgroundColor: '#000',
                                borderRadius: 2,
                                overflow: 'hidden',
                                cursor: 'pointer',
                                '&:hover': {
                                  opacity: 0.8,
                                },
                              }}
                              onClick={() => {
                                setEnlargedVideo(video);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  setEnlargedVideo(video);
                                }
                              }}
                              onTouchEnd={(e) => {
                                // Handle touch interactions for mobile
                                e.preventDefault();
                                setEnlargedVideo(video);
                              }}
                              tabIndex={0}
                              role="button"
                              aria-label={`Play video: ${video.title || video.description || 'Untitled video'}`}
                            >
                              {/* Fallback thumbnail image for mobile */}
                              <img
                                src={video.thumbnailUrl}
                                alt={video.title || 'Video thumbnail'}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  zIndex: 1,
                                }}
                                onError={(e) => {
                                  // Hide image if thumbnail fails to load
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <video
                                src={video.videoUrl}
                                poster={video.thumbnailUrl}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  width: '100%',
                                  height: '100%',
                                  objectFit: 'cover',
                                  zIndex: 2,
                                  '--poster-url': `url(${video.thumbnailUrl})`,
                                } as React.CSSProperties}
                                muted
                                preload="metadata"
                                onLoadedMetadata={(e) => {
                                  // Ensure thumbnail shows on mobile
                                  const video = e.target as HTMLVideoElement;
                                  video.currentTime = 0.1;
                                }}
                                onError={() => {
                                  // Video failed to load, rely on fallback image
                                }}
                              />
                              {/* Play icon overlay */}
                              <Box
                                data-testid="play-icon"
                                sx={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%)',
                                  zIndex: 3,
                                  color: 'white',
                                  fontSize: '2rem',
                                  opacity: 0.8,
                                  pointerEvents: 'none',
                                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                                }}
                              >
                                ▶
                              </Box>
                              <Box
                                sx={{
                                  position: 'absolute',
                                  bottom: 8,
                                  left: 8,
                                  right: 8,
                                  color: 'white',
                                  fontSize: '0.75rem',
                                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                                }}
                              >
                                {video.title && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      display: '-webkit-box',
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: 'vertical',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    {video.title}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Box sx={{ textAlign: 'center', py: 4 }} data-testid="no-videos-message">
                        <Typography variant="h6" color="text.secondary">
                          No videos shared yet
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </TabPanel>
              </>
            ) : (
              <Typography>No profile found.</Typography>
            )}
          </Box>
          {/* Ratings and Comments List */}
          <RatingsCommentsList profile={profile} currentUserId={currentUserId || ""} />
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
            alt={profile?.username ? `${profile.username}` : "User"}
            style={{
              maxWidth: "80vw",
              maxHeight: "80vh",
              borderRadius: 8,
              objectFit: "contain",
            }}
          />
        </Box>
      </Modal>

      {/* Video modal */}
      <Modal open={!!enlargedVideo} onClose={() => setEnlargedVideo(null)} data-testid="enlarged-video-modal">
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "#000",
            boxShadow: 24,
            borderRadius: 2,
            outline: "none",
            maxWidth: "90vw",
            maxHeight: "90vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <IconButton
            onClick={() => setEnlargedVideo(null)}
            data-testid="close-enlarged-video"
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              color: "white",
              bgcolor: "rgba(0,0,0,0.5)",
              "&:hover": {
                bgcolor: "rgba(0,0,0,0.7)",
              },
              zIndex: 1,
            }}
          >
            <CloseIcon />
          </IconButton>
          {enlargedVideo && (
            <video
              src={enlargedVideo.videoUrl}
              controls
              autoPlay
              data-testid="enlarged-video-player"
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                borderRadius: 8,
              }}
            />
          )}
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

      {/* Rating dialog (with comment) */}
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
            Please select a rating from 1 to 5 stars based on your travel experience with this user. You can also leave a comment (visible to others).
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
            <TextField
              label="Comment (optional)"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              multiline
              minRows={2}
              maxRows={4}
              fullWidth
              sx={{ mb: 2, mt: 1 }}
              inputProps={{ maxLength: 300 }}
              placeholder="Share your experience..."
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
