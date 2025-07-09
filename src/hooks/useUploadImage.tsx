import { useState } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "../environments/firebaseConfig";
import useGetUserId from "./useGetUserId";

const storage = getStorage(app);

const useUploadImage = () => {
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const userId: string | null = useGetUserId();
  
  /**
   * Uploads an image to Firebase Storage for a given slot (profile, slot1, slot2, ...).
   * @param file The image file to upload
   * @param slot The slot key (e.g., 'profile', 'slot1', ...)
   */
  const uploadImage = async (file: File, slot: string) => {
    setUploading(true);
    setError(null);
    try {
      const id = userId ? userId : null;
      const storageRef = ref(
        storage,
        `photos/${id}/${slot}/${file.name}`
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
