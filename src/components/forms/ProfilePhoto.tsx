import profilePlaceholder from "../../assets/images/imagePH.png";
import { Menu, MenuItem } from "@mui/material";
import { useContext, useRef, useState, useEffect } from "react";
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

  function handleUploadPic(): void {
    fileRef.current?.click();
    setMenuAnchor(null);
  }

  function handleDeletePic(): void {
    console.log("handleDeletePic called", userProfile);
    if (userProfile) {
      const updatedPhotos = [...userProfile.photos];
      updatedPhotos[0] = ""; // Remove the first photo
      userProfile.photos = updatedPhotos;
      updateUserProfile(userProfile);
      setUserStorageData(userProfile);
      setUserDbData(userProfile);
    }
    setMenuAnchor(null);
  }

  function handleCancel(): void {
    setMenuAnchor(null);
  }

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    try {
      if (event.target.files) {
        const file = event.target.files?.[0];
        const url = await uploadImage(file, 0);
        console.log("file in component", url);
        userProfile.photos[0] = url;
        updateUserProfile(userProfile);
        setUserStorageData(userProfile);
        setUserDbData(userProfile);
        setMenuAnchor(null);
      }
    } catch (error) {}
  };

  return (
    <>
      <img
        src={
          userProfile?.photos &&
          userProfile.photos.length > 0 &&
          userProfile.photos[0] !== ""
            ? userProfile.photos[0]
            : profilePlaceholder
        }
        alt="Profile Placeholder"
        style={{
          maxWidth: "30%",
          height: "auto",
          maxHeight: "300px",
          width: "auto",
          objectFit: "cover",
        }}
        onClick={(event) => {
          setMenuAnchor(event.currentTarget);
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
        onClose={handleCancel}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        autoFocus={false}>
        <MenuItem onClick={handleUploadPic}>Upload Pic</MenuItem>
        <MenuItem onClick={handleDeletePic}>Delete Pic</MenuItem>
        <MenuItem onClick={handleCancel}>Cancel</MenuItem>
      </Menu>
    </>
  );
};
