import { useContext, useEffect, useState } from "react";
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
      await updatePhotos(url, index);
      
    } catch (err) {
      console.log(err);
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImage(file, index);
    }
  };

  // Update user profile with photos whenever it changes
  useEffect(() => {
    const fetchUserProfile = async () => {
      const userProfile = await JSON.parse(
        localStorage.getItem("PROFILE_INFO") || "{}"
      );
      userProfile.photos = photos;
      console.log("userProfile", userProfile, photos);
      localStorage.setItem("PROFILE_INFO", JSON.stringify(userProfile));
    };

    fetchUserProfile();
  }, [photos]);

  return { uploading, error, handleImageUpload };
};

export default useUploadImage;
