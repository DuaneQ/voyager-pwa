import { useContext, useEffect, useState } from "react";
import useGetUserId from "./useGetUserId";
import { firebaseConfig } from "../environments/environment";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import 'firebase/firestore';
import { initializeApp } from "firebase/app";
import { UserProfileContext } from "../Context/UserProfileContext";

const useGetUserProfile = () => {
  type profile = {
    email: string;
    username: string;
    userBio: string;
    dob: Date;
    gender: string;
    sexo: string;
    education: string;
    drinkingHabits: string;
    smokingHabits: string;
  };

  const userId: string | null = useGetUserId();
  const [isLoading, setIsLoading] = useState(true);
  const {  updateUserProfile  } = useContext(UserProfileContext);

  useEffect(() => {
    const userProfile = async () => {
      setIsLoading(true);
      try {
        const userRef = localStorage.getItem("PROFILE_INFO");
        if (userRef) {
          const profile: profile = JSON.parse(userRef);
          updateUserProfile(profile);
          console.log("profile", profile);
        } else {
          const app = initializeApp(firebaseConfig);
          const db = getFirestore(app);
          if (userId) {
            const id = JSON.parse(userId);
            const userRef = await getDoc(doc(db, "users", id.user.uid));
            if (userRef.exists()) {
              const profile = userRef.data();
              updateUserProfile(profile);
            }
          }
        }
      } catch (error) {
        console.log("error", error);
      } finally {
        setIsLoading(false);
      }
    };
    userProfile();
  }, [updateUserProfile, userId]);
  return {
    isLoading
  };
};

export default useGetUserProfile;
