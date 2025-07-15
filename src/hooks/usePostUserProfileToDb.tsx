import { doc, getFirestore, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { app } from "../environments/firebaseConfig";

const usePostUserProfileToDb = () => {

  const [isLoading, setIsLoading] = useState(true);
  const [userRef, setuserRef] = useState<any | null>(null);
  const [userDbData, setUserDbData] = useState<any | null>(null);

  useEffect(() => {
    const userProfile = async () => {
      setIsLoading(true);
      try {
        const userCredentials = localStorage.getItem("USER_CREDENTIALS");
        const userRef = userCredentials ? JSON.parse(userCredentials) : null;
        setuserRef(userRef);
        
        // Check if userRef and userRef.user exist before accessing uid
        if (userRef && userRef.user && userRef.user.uid) {
          const db = getFirestore(app);
          const docRef = doc(db, "users", userRef.user.uid);
          if (userDbData) {
            await setDoc(docRef, userDbData);
          }
        } else {
          console.warn("User credentials not found or invalid in localStorage");
        }
      } catch (error) {
        console.log("error", error);
      } finally {
        setIsLoading(false);
      }
    };
    userProfile();
  }, [userDbData]);
  return { isLoading, userRef, setuserRef, userDbData, setUserDbData };
};

export default usePostUserProfileToDb;
