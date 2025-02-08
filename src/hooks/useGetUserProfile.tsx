import { useContext, useEffect, useState } from "react";
import useGetUserId from "./useGetUserId";
import { app } from "../environments/environment";
import { doc, getDoc, getFirestore } from "firebase/firestore";
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

  const db = getFirestore(app);
  const userId: string | null = useGetUserId();
  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any | null>(null);

  useEffect(() => {
    const userProfile = async () => {
      setIsLoading(true);
      try {
        const userRef = localStorage.getItem("PROFILE_INFO");
        if (userRef) {
          const profile: profile = JSON.parse(userRef);
          setUserProfile(profile);
        } else {
          if (userId) {
            const id = JSON.parse(userId);
            const userRef = await getDoc(doc(db, "users", id.user.uid));
            if (userRef.exists()) {
              const profile = userRef.data();
              setUserProfile(profile);
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
  }, [setUserProfile]);
  return {
    isLoading,
    userProfile, setUserProfile
  };
};

export default useGetUserProfile;
