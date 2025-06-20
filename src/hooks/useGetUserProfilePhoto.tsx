import { useEffect, useState } from "react";
import { getStorage, ref, listAll, getDownloadURL } from "firebase/storage";
import { app } from "../environments/firebaseConfig";

const storage = getStorage(app);
const DEFAULT_AVATAR = "/default-profile.png";

export function useGetUserProfilePhoto(userId?: string | null) {
  const [photoUrl, setPhotoUrl] = useState<string>(DEFAULT_AVATAR);

  useEffect(() => {
    let isMounted = true;
    if (!userId) {
      setPhotoUrl(DEFAULT_AVATAR);
      return;
    }
    const fetchPhoto = async () => {
      try {
        // List all files in the user's profilePic folder
        const folderRef = ref(storage, `photos/${userId}/profilePic`);
        const listResult = await listAll(folderRef);
        if (listResult.items.length > 0) {
          // Use the first file found (or you could sort/filter as needed)
          const url = await getDownloadURL(listResult.items[0]);
          if (isMounted) setPhotoUrl(url);
        } else {
          if (isMounted) setPhotoUrl(DEFAULT_AVATAR);
        }
      } catch {
        if (isMounted) setPhotoUrl(DEFAULT_AVATAR);
      }
    };
    fetchPhoto();
    return () => {
      isMounted = false;
    };
  }, [userId]);

  return photoUrl;
}
