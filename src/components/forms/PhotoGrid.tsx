import React, { useRef, useState, useContext } from "react";
import { Menu, MenuItem, Grid, Input, CircularProgress } from "@mui/material";
import profilePlaceholder from "../../assets/images/imagePH.png";
import useUploadImage from "../../hooks/useUploadImage";
import { UserProfileContext } from "../../Context/UserProfileContext";
import usePostUserProfileToDb from "../../hooks/usePostUserProfileToDb";
import usePostUserProfileToStorage from "../../hooks/usePostUserProfileToStorage";

export const PhotoGrid = () => {
  const { uploadImage } = useUploadImage();
  const fileRef = useRef<HTMLInputElement>(null);
  const { userProfile, updateUserProfile } = useContext(UserProfileContext);
  const { setUserDbData } = usePostUserProfileToDb();
  const { setUserStorageData } = usePostUserProfileToStorage();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(
    null
  );
  const [loading, setLoading] = useState(false); // Track loading state

  function handleUploadPic(): void {
    fileRef.current?.click();
    setMenuAnchor(null);
  }

  async function handleDeletePic(): Promise<void> {
    if (userProfile && selectedPhotoIndex !== null) {
      setLoading(true); // Set loading to true
      try {
        const updatedPhotos = [...userProfile.photos];
        updatedPhotos[selectedPhotoIndex] = ""; // Remove the selected photo
        const updatedUserProfile = { ...userProfile, photos: updatedPhotos };
        updateUserProfile(updatedUserProfile);
        setUserStorageData(updatedUserProfile);
        setUserDbData(updatedUserProfile);
      } catch (error) {
        console.error("Error deleting photo:", error);
      } finally {
        setLoading(false); // Set loading to false
        setMenuAnchor(null);
      }
    }
  }

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files && selectedPhotoIndex !== null) {
      setLoading(true); // Set loading to true
      try {
        const file = event.target.files[0];
        const url = await uploadImage(file, selectedPhotoIndex);
        const updatedPhotos = [...userProfile.photos];
        updatedPhotos[selectedPhotoIndex] = url;
        const updatedUserProfile = { ...userProfile, photos: updatedPhotos };
        updateUserProfile(updatedUserProfile);
        setUserStorageData(updatedUserProfile);
        setUserDbData(updatedUserProfile);
      } catch (error) {
        console.error("Error uploading photo:", error);
      } finally {
        setLoading(false); // Set loading to false
        setMenuAnchor(null);
      }
    }
  };

  const handlePhotoClick = (
    event: React.MouseEvent<HTMLElement>,
    index: number
  ) => {
    if (!loading) {
      // Prevent menu interaction while loading
      setSelectedPhotoIndex(index);
      setMenuAnchor(event.currentTarget);
    }
  };

  return (
    <>
      <Grid container spacing={2}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Grid item xs={6} key={index}>
            <img
              src={
                userProfile?.photos &&
                userProfile?.photos.length > index &&
                userProfile?.photos[index] !== "" &&
                userProfile?.photos[index] !== null
                  ? userProfile?.photos[index]
                  : profilePlaceholder
              }
              alt={`Profile Placeholder ${index + 1}`}
              style={{
                maxWidth: "100%",
                height: "auto",
                maxHeight: "150px",
                width: "auto",
                objectFit: "cover",
                cursor: loading ? "not-allowed" : "pointer", // Disable pointer events while loading
                opacity: loading ? 0.5 : 1, // Dim the image while loading
              }}
              onClick={(event) => handlePhotoClick(event, index)}
            />
          </Grid>
        ))}
      </Grid>
      <Input
        type="file"
        inputRef={fileRef}
        onChange={handleFileChange}
        inputProps={{ "data-testid": "file-input" }}
        style={{ display: "none" }}
      />
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => !loading && setMenuAnchor(null)} // Prevent closing while loading
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        autoFocus={false}>
        {loading ? (
          <MenuItem disabled>
            <CircularProgress size={24} />
          </MenuItem>
        ) : (
          [
            <MenuItem key="upload" onClick={handleUploadPic}>
              Upload Pic
            </MenuItem>,
            <MenuItem key="delete" onClick={handleDeletePic}>
              Delete Pic
            </MenuItem>,
            <MenuItem key="cancel" onClick={() => setMenuAnchor(null)}>
              Cancel
            </MenuItem>,
          ]
        )}
      </Menu>
    </>
  );
};
