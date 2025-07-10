import React, { useRef, useState, useContext } from "react";
import { Menu, MenuItem, Grid, Input, CircularProgress, Alert } from "@mui/material";
import profilePlaceholder from "../../assets/images/imagePH.png";
import useUploadImage from "../../hooks/useUploadImage";
import { UserProfileContext } from "../../Context/UserProfileContext";
import usePostUserProfileToDb from "../../hooks/usePostUserProfileToDb";
import usePostUserProfileToStorage from "../../hooks/usePostUserProfileToStorage";
import { validateImageFile } from "../../utils/validateImageFile";

const IMAGE_SIZE = 120; // px


export const PhotoGrid = () => {
  const { uploadImage } = useUploadImage();
  const fileRef = useRef<HTMLInputElement>(null);
  const { userProfile, updateUserProfile } = useContext(UserProfileContext);
  const { setUserDbData } = usePostUserProfileToDb();
  const { setUserStorageData } = usePostUserProfileToStorage();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Define slots for additional photos
  const slots = ["slot1", "slot2", "slot3", "slot4"];

  function handleUploadPic() {
    fileRef.current?.click();
    setMenuAnchor(null);
  }

  async function handleDeletePic() {
    setError(null);
    if (userProfile && selectedSlot) {
      setLoading(true);
      try {
        const updatedPhotos = { ...(userProfile.photos || {}), [selectedSlot]: "" };
        const updatedUserProfile = { ...userProfile, photos: updatedPhotos };
        updateUserProfile(updatedUserProfile);
        setUserStorageData(updatedUserProfile);
        setUserDbData(updatedUserProfile);
      } catch (error) {
        setError("Error deleting photo.");
        console.error("Error deleting photo:", error);
      } finally {
        setLoading(false);
        setMenuAnchor(null);
      }
    }
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (event.target.files && selectedSlot && userProfile) {
      const file = event.target.files[0];
      const validationError = validateImageFile(file);
      if (validationError) {
        setError(validationError);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      setLoading(true);
      try {
        const url = await uploadImage(file, selectedSlot);
        const updatedPhotos = { ...(userProfile.photos || {}), [selectedSlot]: url };
        const updatedUserProfile = { ...userProfile, photos: updatedPhotos };
        updateUserProfile(updatedUserProfile);
        setUserStorageData(updatedUserProfile);
        setUserDbData(updatedUserProfile);
      } catch (error) {
        setError("Error uploading photo.");
        console.error("Error uploading photo:", error);
      } finally {
        setLoading(false);
        setMenuAnchor(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    }
  };

  const handlePhotoClick = (event: React.MouseEvent<HTMLElement>, slot: string) => {
    if (!loading) {
      setSelectedSlot(slot);
      setMenuAnchor(event.currentTarget);
    }
  };

  return (
    <>
      <Grid container spacing={2} px={1}>
        {slots.map((slot, index) => (
          <Grid item xs={6} key={slot} display="flex" justifyContent="center">
            <img
              src={userProfile?.photos?.[slot] ? userProfile.photos[slot] : profilePlaceholder}
              alt={`Profile Placeholder ${index + 1}`}
              style={{
                width: IMAGE_SIZE,
                height: IMAGE_SIZE,
                objectFit: "cover",
                borderRadius: 8,
                background: "#eee",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }}
              onClick={(event) => handlePhotoClick(event, slot)}
            />
          </Grid>
        ))}
      </Grid>
      {error && <Alert severity="error" sx={{ mt: 2, mb: 1 }}>{error}</Alert>}
      <Input
        type="file"
        inputRef={fileRef}
        onChange={handleFileChange}
        inputProps={{
          accept: "image/*",
          "data-testid": "file-input",
        }}
        style={{ display: "none" }}
      />
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => !loading && setMenuAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        autoFocus={false}
      >
        {loading ? (
          <MenuItem disabled>
            <CircularProgress size={24} />
          </MenuItem>
        ) : [
          <MenuItem key="upload" onClick={handleUploadPic}>Upload Pic</MenuItem>,
          <MenuItem key="delete" onClick={handleDeletePic}>Delete Pic</MenuItem>,
          <MenuItem key="cancel" onClick={() => setMenuAnchor(null)}>Cancel</MenuItem>,
        ]}
      </Menu>
    </>
  );
};
