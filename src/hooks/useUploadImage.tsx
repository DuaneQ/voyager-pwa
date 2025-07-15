import { useState } from "react";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "../environments/firebaseConfig";
import { auth } from "../environments/firebaseConfig";
import DOMPurify from 'dompurify';

const storage = getStorage(app);

const useUploadImage = () => {
  const [uploading, setUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const userId: string | null = typeof auth !== 'undefined' && auth.currentUser ? auth.currentUser.uid : null;
  
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
      // Sanitize filename to prevent path traversal and special characters
      const sanitizedFileName = DOMPurify.sanitize(file.name).replace(/[^a-zA-Z0-9.-]/g, '_');
      const storageRef = ref(
        storage,
        `photos/${id}/${slot}/${sanitizedFileName}`
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
