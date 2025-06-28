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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import BlockIcon from "@mui/icons-material/Block";
import { getFirestore, doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
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
  const userProfile = contextValue?.userProfile || {};
  const updateUserProfile = contextValue?.updateUserProfile || (() => {});
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [confirmBlockOpen, setConfirmBlockOpen] = useState(false);
  const [blockingInProgress, setBlockingInProgress] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">("success");
  const currentUserId = useGetUserId();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getDoc(doc(db, "users", userId))
      .then((snap) => {
        setProfile(snap.exists() ? snap.data() : null);
      })
      .finally(() => setLoading(false));
  }, [open, userId]);

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
      // 1. Update current user's document to block the other user
      const currentUserRef = doc(db, "users", currentUserId);
      await updateDoc(currentUserRef, {
        blocked: arrayUnion(userId)
      });

      // 2. Update other user's document to block current user
      const otherUserRef = doc(db, "users", userId);
      await updateDoc(otherUserRef, {
        blocked: arrayUnion(currentUserId)
      });

      // 3. Update local state (context AND localStorage)
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
              mb: 1
            }}
          >
            <IconButton 
              color="error" 
              onClick={handleOpenBlockConfirmation}
              aria-label="Block user"
              sx={{ 
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: 'rgba(211, 47, 47, 0.04)'
                }
              }}
            >
              <BlockIcon />
              <Typography variant="caption" sx={{ ml: 0.5, fontSize: '0.7rem' }}>
                Block
              </Typography>
            </IconButton>
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
                      value={profile.sexo || ""}
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
        aria-describedby="block-dialog-description"
      >
        <DialogTitle id="block-dialog-title">
          Block this user?
        </DialogTitle>
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
            startIcon={blockingInProgress ? <CircularProgress size={20} /> : <BlockIcon />}
          >
            {blockingInProgress ? "Blocking..." : "Block User"}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Feedback snackbar */}
      <Snackbar 
        open={snackbarOpen} 
        autoHideDuration={6000} 
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity={snackbarSeverity}
          sx={{ width: '100%' }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </>
  );
};
