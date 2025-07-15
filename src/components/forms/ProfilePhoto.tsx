import profilePlaceholder from "../../assets/images/imagePH.png";
import { Menu, MenuItem, CircularProgress, Input, Alert, Modal, Box, IconButton, Button } from "@mui/material";
import { useContext, useRef, useState } from "react";
import useUploadImage from "../../hooks/useUploadImage";
import { UserProfileContext } from "../../Context/UserProfileContext";
import usePostUserProfileToDb from "../../hooks/usePostUserProfileToDb";
import usePostUserProfileToStorage from "../../hooks/usePostUserProfileToStorage";
import { validateImageFile } from "../../utils/validateImageFile";
import CloseIcon from "@mui/icons-material/Close";


export const ProfilePhoto = () => {
  const { uploadImage } = useUploadImage();
  const fileRef = useRef<HTMLInputElement>(null);
  const { userProfile, updateUserProfile } = useContext(UserProfileContext);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const { setUserDbData } = usePostUserProfileToDb();
  const { setUserStorageData } = usePostUserProfileToStorage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);

  // Upload profile photo (slot: 'profile')
  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    if (event.target.files && userProfile) {
      const file = event.target.files[0];
      const validationError = validateImageFile(file);
      if (validationError) {
        setError(validationError);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      setLoading(true);
      try {
        const url = await uploadImage(file, 'profile');
        const updatedPhotos = { ...(userProfile.photos || {}), profile: url };
        const updatedUserProfile = { ...userProfile, photos: updatedPhotos };
        updateUserProfile(updatedUserProfile);
        setUserStorageData(updatedUserProfile);
        setUserDbData(updatedUserProfile);
      } catch (error) {
        setError("Error uploading profile photo.");
        console.error("Error uploading profile photo:", error);
      } finally {
        setLoading(false);
        setMenuAnchor(null);
      }
    }
  }

  // Delete profile photo (slot: 'profile')
  async function handleDeletePic() {
    setError(null);
    if (userProfile) {
      setLoading(true);
      try {
        const updatedPhotos = { ...(userProfile.photos || {}), profile: "" };
        const updatedUserProfile = { ...userProfile, photos: updatedPhotos };
        updateUserProfile(updatedUserProfile);
        setUserStorageData(updatedUserProfile);
        setUserDbData(updatedUserProfile);
      } catch (error) {
        setError("Error deleting profile photo.");
        console.error("Error deleting profile photo:", error);
      } finally {
        setLoading(false);
        setMenuAnchor(null);
        if (fileRef.current) fileRef.current.value = "";
      }
    }
  }

  function handleUploadPic() {
    fileRef.current?.click();
    setMenuAnchor(null);
  }

  function handleCancel() {
    setMenuAnchor(null);
  }

  const handleEnlargePhoto = (photoUrl: string) => {
    setEnlargedPhoto(photoUrl);
  };

  const handleCloseEnlargedPhoto = () => {
    setEnlargedPhoto(null);
  };

  return (
    <>
      <img
        src={userProfile?.photos?.profile ? userProfile.photos.profile : profilePlaceholder}
        alt="Profile Placeholder"
        loading="lazy"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.5 : 1,
          borderRadius: "8px"
        }}
        onClick={(event) => {
          if (!loading) setMenuAnchor(event.currentTarget);
        }}
      />
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
          <MenuItem key="view" onClick={() => {
            if (userProfile?.photos?.profile) {
              handleEnlargePhoto(userProfile.photos.profile);
            }
          }}>
            View Photo
          </MenuItem>,
          <MenuItem key="cancel" onClick={handleCancel}>Cancel</MenuItem>,
        ]}
      </Menu>
      <Modal
        open={Boolean(enlargedPhoto)}
        onClose={handleCloseEnlargedPhoto}
        aria-labelledby="enlarged-photo-modal"
        aria-describedby="modal-to-view-enlarged-photo"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
          }}
        >
          <IconButton
            onClick={handleCloseEnlargedPhoto}
            sx={{ position: "absolute", top: 8, right: 8 }}
          >
            <CloseIcon />
          </IconButton>
          {enlargedPhoto && (
            <img
              src={enlargedPhoto}
              alt="Enlarged Profile Photo"
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                objectFit: "contain",
              }}
            />
          )}
        </Box>
      </Modal>
    </>
  );
};
