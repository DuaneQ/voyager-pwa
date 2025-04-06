import profilePlaceholder from "../../assets/images/imagePH.png";
import { Menu, MenuItem } from "@mui/material";
import { useContext, useRef, useState, useEffect } from "react";
import useUploadImage from "../../hooks/useUploadImage";
import React from "react";
import { Input } from "@mui/material";
import { UserProfileContext } from "../../Context/UserProfileContext";

export const ProfilePhoto = () => {
  const { handleImageUpload } = useUploadImage();
  const fileRef = useRef<HTMLInputElement>(null);
  const { userProfile } = useContext(UserProfileContext);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  useEffect(() => {
    console.log("ProfilePhoto", userProfile);
  }, [userProfile]);

  function handleUploadPic(): void {
    fileRef.current?.click();
    setMenuAnchor(null);
  }

  function handleDeletePic(): void {
    // if (photos) {
    //   const updatedPhotos = [...photos];
    //   updatedPhotos[0] = "";
    //   photos(updatedPhotos);
    // }
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
        console.log("event", event.target.files);
        handleImageUpload(event, 0);
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
