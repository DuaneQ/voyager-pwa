import { useContext, useEffect, useState } from "react";
import { auth } from "../environments/firebaseConfig";
import { app } from "../environments/firebaseConfig";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import "firebase/firestore";
import { UserProfileContext } from "../Context/UserProfileContext";

const useGetUserProfile = () => {
  const userId: string | null = typeof auth !== 'undefined' && auth.currentUser ? auth.currentUser.uid : null;
  const [isLoading, setIsLoading] = useState(true);
  const { updateUserProfile } = useContext(UserProfileContext);

  useEffect(() => {
    const userProfile = async () => {
      setIsLoading(true);
      try {
        const db = getFirestore(app);

        if (userId) {
          // Important: Always get the freshest data from Firebase first
          // This ensures any updates (like blocking) are reflected immediately
          const userRef = await getDoc(doc(db, "users", userId));

          if (userRef.exists()) {
            const profile = userRef.data();
            // Update localStorage with the fresh data
            localStorage.setItem("PROFILE_INFO", JSON.stringify(profile));
            // Update context
            updateUserProfile(profile);
          } else {
            // Only fall back to localStorage if Firebase has no data
            const cachedProfile = localStorage.getItem("PROFILE_INFO");
            if (cachedProfile) {
              updateUserProfile(JSON.parse(cachedProfile));
            }
          }
        }
      } catch (error) {
        // On error, try localStorage as fallback
        const cachedProfile = localStorage.getItem("PROFILE_INFO");
        if (cachedProfile) {
          updateUserProfile(JSON.parse(cachedProfile));
        }
        console.log("error", error);
      } finally {
        setIsLoading(false);
      }
    };
    userProfile();
  }, [updateUserProfile, userId]);

  return { isLoading };
};

export default useGetUserProfile;
