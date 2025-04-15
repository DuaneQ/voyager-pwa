import { useState } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "../environments/environment";
import useGetUserId from "./useGetUserId";

const storage = getStorage(app);

const useUploadImage = () => {
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const userId: string | null = useGetUserId();
  
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
      return url;
      // console.log("Uploaded image URL:", url);
      // // await updatePhotos(url, index);
      // userProfile.photos[index] = url;
      // updateUserProfile(userProfile);
      // console.log("Updated user profile with new photo URL:", userProfile);
      // setUserStorageData(userProfile);
      // setUserDbData(userProfile);
    } catch (err) {
      console.log(err);
    } finally {
      setUploading(false);
    }
  };

  // const handleImageUpload = (
  //   event: React.ChangeEvent<HTMLInputElement>,
  //   index: number
  // ) => {
  //   const file = event.target.files?.[0];
  //   if (file) {
  //     uploadImage(file, index);
  //     console.log("file", file);
  //   }
  // };

  return { uploading, error, uploadImage };
};

export default useUploadImage;
