
import profilePlaceholder from "../../assets/images/imagePH.png";
import { Menu, MenuItem, CircularProgress, Input } from "@mui/material";
import { useContext, useRef, useState } from "react";
import useUploadImage from "../../hooks/useUploadImage";
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
  const [loading, setLoading] = useState(false);

  // Upload profile photo (slot: 'profile')
  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    if (event.target.files && userProfile) {
      setLoading(true);
      try {
        const file = event.target.files[0];
        const url = await uploadImage(file, 'profile');
        const updatedPhotos = { ...(userProfile.photos || {}), profile: url };
        const updatedUserProfile = { ...userProfile, photos: updatedPhotos };
        updateUserProfile(updatedUserProfile);
        setUserStorageData(updatedUserProfile);
        setUserDbData(updatedUserProfile);
      } catch (error) {
        console.error("Error uploading profile photo:", error);
      } finally {
        setLoading(false);
        setMenuAnchor(null);
      }
    }
  }

  // Delete profile photo (slot: 'profile')
  async function handleDeletePic() {
    if (userProfile) {
      setLoading(true);
      try {
        const updatedPhotos = { ...(userProfile.photos || {}), profile: "" };
        const updatedUserProfile = { ...userProfile, photos: updatedPhotos };
        updateUserProfile(updatedUserProfile);
        setUserStorageData(updatedUserProfile);
        setUserDbData(updatedUserProfile);
      } catch (error) {
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

  return (
    <>
      <img
        src={userProfile?.photos?.profile ? userProfile.photos.profile : profilePlaceholder}
        alt="Profile Placeholder"
        style={{
          maxWidth: "30%",
          height: "auto",
          maxHeight: "300px",
          marginRight: "10px",
          width: "auto",
          objectFit: "cover",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.5 : 1,
        }}
        onClick={(event) => {
          if (!loading) setMenuAnchor(event.currentTarget);
        }}
      />
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
          <MenuItem key="cancel" onClick={handleCancel}>Cancel</MenuItem>,
        ]}
      </Menu>
    </>
  );
};
