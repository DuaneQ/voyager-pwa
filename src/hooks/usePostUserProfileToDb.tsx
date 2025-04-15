import { doc, getFirestore, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { app } from "../environments/environment";

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
        setuserRef(userRef)
        const db = getFirestore(app);
        const docRef = doc(db, "users", userRef.user.uid);
        if (userDbData){
          console.log("Updating user profile in Firestore...useEffect", userDbData);
          await setDoc(docRef, userDbData);
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
