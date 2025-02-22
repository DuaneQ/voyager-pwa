import profilePlaceholder from "../../assets/images/imagePH.png";
import { Menu, MenuItem } from "@mui/material";
import { useContext, useRef } from "react";
import useUploadImage from "../../hooks/useUploadImage";
import { PhotoContext } from "../../Context/PhotoContext";
import React from "react";
import { Input } from "@mui/material";

export const ProfilePhoto = () => {
  const { handleImageUpload } = useUploadImage();
  const fileRef = useRef<HTMLInputElement>(null);
  const { photos } = useContext(PhotoContext);
  const [open, setOpen] = React.useState(false);

  function handleUploadPic(): void {
    fileRef.current?.click();
    console.log("upload pic");
  }

  function handleDeletePic(): void {
    if (photos) {
      const updatedPhotos = [...photos];
      updatedPhotos[0] = "";
      photos(updatedPhotos);
    }
    setOpen(false);
  }

  function handleCancel(): void {
    setOpen(false);
  }

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    try {
      if (event.target.files) {
        handleImageUpload(event, 0);
        setOpen(false);
      }
    } catch (error) {}
  };

  return (
    <>
      <img
        src={
          photos && photos.length > 0 && photos[0] !== ""
            ? photos[0]
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
        onClick={() => {
          setOpen(true);
        }}
      />
      <Input
        type="file"
        inputRef={fileRef}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "center",
        }}>
        <MenuItem onClick={handleUploadPic}>Upload Pic</MenuItem>
        <MenuItem onClick={handleDeletePic}>Delete Pic</MenuItem>
        <MenuItem onClick={handleCancel}>Cancel</MenuItem>
      </Menu>
    </>
  );
};
