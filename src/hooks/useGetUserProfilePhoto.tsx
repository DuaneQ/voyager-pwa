import { useEffect, useState } from "react";
import { app } from "../environments/firebaseConfig";
import { getFirestore, doc, getDoc } from "firebase/firestore";
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
        const db = getFirestore(app);
        const userRef = doc(db, "users", userId);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          const url = data?.photos?.profile;
          if (isMounted && url) setPhotoUrl(url);
          else if (isMounted) setPhotoUrl(DEFAULT_AVATAR);
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
