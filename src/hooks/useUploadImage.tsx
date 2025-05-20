import { useState } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "../environments/firebaseConfig";
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
      const id = userId ? userId : null;
      const storageRef = ref(
        storage,
        `photos/${id}/profilePic/${file.name}`
      );
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      return url;
    } catch (err) {
      console.log(err);
    } finally {
      setUploading(false);
    }
  };

  return { uploading, error, uploadImage };
};

export default useUploadImage;
