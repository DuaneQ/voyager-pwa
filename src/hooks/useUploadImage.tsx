import { useContext, useState } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "../environments/environment";
import useGetUserId from "./useGetUserId";
import { PhotoContext } from "../Context/PhotoContext";
import React from "react";

const storage = getStorage(app);

const useUploadImage = () => {
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const userId: string | null = useGetUserId();
  const { updatePhotos, photos } = useContext(PhotoContext);

  const uploadImage = async (file: File, index: number) => {
    setUploading(true);
    setError(null);
    try {
      const id = userId ? JSON.parse(userId) : null;
      const storageRef = ref(
        storage,
        `photos/${id.user.uid}/profilePic/${file.name}`
      );
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      updatePhotos(url, index);
      const userProfile = JSON.parse(localStorage.getItem('PROFILE_INFO') || '{}');
      userProfile.photos = photos;
      console.log("userProfile", userProfile, photos);

      localStorage.setItem('PROFILE_INFO', JSON.stringify(userProfile));
    } catch (err) {
      console.log(err);
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = event.target.files?.[0];
    console.log("file", file);
    if (file) {
      uploadImage(file, index);
    }
  };

  return { uploading, error, handleImageUpload };
};

export default useUploadImage;
