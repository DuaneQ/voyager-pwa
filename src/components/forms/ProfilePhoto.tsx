import profilePlaceholder from "../../assets/images/imagePH.png";
import { Menu, MenuItem, CircularProgress } from "@mui/material";
import { useContext, useRef, useState } from "react";
import useUploadImage from "../../hooks/useUploadImage";
import React from "react";
import { Input } from "@mui/material";
import { UserProfileContext } from "../../Context/UserProfileContext";
import usePostUserProfileToDb from "../../hooks/usePostUserProfileToDb";
import usePostUserProfileToStorage from "../../hooks/usePostUserProfileToStorage";

export const ProfilePhoto = () => {
  const { uploadImage } = useUploadImage();
  const fileRef = useRef<HTMLInputElement>(null);
  const { userProfile, updateUserProfile } = useContext(UserProfileContext);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const { setUserDbData } = usePostUserProfileToDb();
  const { setUserStorageData } = usePostUserProfileToStorage();
  const [loading, setLoading] = useState(false); // Track loading state

  function handleUploadPic(): void {
    fileRef.current?.click();
    setMenuAnchor(null);
  }

  async function handleDeletePic(): Promise<void> {
    if (userProfile) {
      setLoading(true); // Set loading to true
      try {
        const updatedPhotos = [...userProfile.photos];
        updatedPhotos[4] = ""; // Remove the photo at index 4
        const updatedUserProfile = { ...userProfile, photos: updatedPhotos }; // Create a new userProfile object
        updateUserProfile(updatedUserProfile); // Update the context
        setUserStorageData(updatedUserProfile); // Update storage
        setUserDbData(updatedUserProfile); // Update database
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
    if (event.target.files) {
      setLoading(true); // Set loading to true
      try {
        const file = event.target.files[0];
        const url = await uploadImage(file, 4); // Upload the file and get the URL
        const updatedPhotos = [...userProfile.photos];
        updatedPhotos[4] = url; // Add the new photo URL at index 4
        const updatedUserProfile = { ...userProfile, photos: updatedPhotos }; // Create a new userProfile object
        updateUserProfile(updatedUserProfile); // Update the context
        await setUserStorageData(updatedUserProfile); // Update storage
        await setUserDbData(updatedUserProfile); // Update database
      } catch (error) {
        console.error("Error uploading photo:", error);
      } finally {
        setLoading(false); // Set loading to false
        setMenuAnchor(null);
      }
    }
  };

  function handleCancel(): void {
    setMenuAnchor(null);
  }

  return (
    <>
      <img
        src={
          userProfile?.photos &&
          userProfile?.photos.length > 0 &&
          userProfile?.photos[4] !== "" &&
          userProfile?.photos[4] !== null
            ? userProfile.photos[4]
            : profilePlaceholder
        }
        alt="Profile Placeholder"
        style={{
          maxWidth: "30%",
          height: "auto",
          maxHeight: "300px",
          width: "auto",
          objectFit: "cover",
          cursor: loading ? "not-allowed" : "pointer", // Disable pointer events while loading
          opacity: loading ? 0.5 : 1, // Dim the image while loading
        }}
        onClick={(event) => {
          if (!loading) setMenuAnchor(event.currentTarget); // Prevent menu interaction while loading
        }}
      />
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
            <MenuItem key="cancel" onClick={handleCancel}>
              Cancel
            </MenuItem>,
          ]
        )}
      </Menu>
    </>
  );
};
