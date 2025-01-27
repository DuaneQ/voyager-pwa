import { getDoc, doc, getFirestore } from "firebase/firestore";
import { useEffect, useState } from "react";
import { app } from "../environments/environment";

const useGetUserProfileFromDb = (userId: string) => {

  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const db = getFirestore(app);

  useEffect(() => {
    const userProfile = async () => {
      setIsLoading(true);
      try {
        const userRef = await getDoc(doc(db, "users", userId));
        if (userRef.exists()) {
        setUserProfile(userRef.data());
        }
      } catch (error) {
        console.log("error", error);
      } finally {
        setIsLoading(false);
      }
    };
    userProfile();
  }, [setUserProfile, userId]);
  return { isLoading, userProfile, setUserProfile };
};

export default useGetUserProfileFromDb;
