import React, { useEffect, useState } from "react";
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
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "../../environments/firebaseConfig";
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
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

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
          {/* Top: Large profile photo, only if available */}
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
              <IconButton
                sx={{
                  ml: "auto",
                  position: "absolute",
                  top: 8,
                  right: 8,
                }}
                onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Box>
          )}
          {!profilePhoto && (
            <Box sx={{ position: "relative", mb: 2 }}>
              <Typography variant="h5" sx={{ mt: 2, textAlign: "center" }}>
                {profile?.username || "User"}
              </Typography>
              <IconButton
                sx={{
                  ml: "auto",
                  position: "absolute",
                  top: 8,
                  right: 8,
                }}
                onClick={onClose}>
                <CloseIcon />
              </IconButton>
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
                      multiline
                      rows={2}
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
    </>
  );
};
