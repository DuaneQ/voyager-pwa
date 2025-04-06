import { useContext, useEffect, useState } from "react";
import { UserProfileContext } from "../Context/UserProfileContext";

const usePostUserProfileToStorage = () => {

  const [isLoading, setIsLoading] = useState(true);
  const [userRef, setuserRef] = useState<any | null>(null);
  const [userStorageData, setUserStorageData] = useState<any | null>(null);

  useEffect(() => {
    const userProfile = async () => {
      setIsLoading(true);
      try {
        console.log("Fetching user profile from localStorage...");
        if (userStorageData){
          localStorage.setItem("PROFILE_INFO", JSON.stringify(userStorageData))
          console.log("User profile already in localStorage:", userStorageData); 
        }
      } catch (error) {
        console.log("error", error);
      } finally {
        setIsLoading(false);
      }
    };
    userProfile();
  }, [userStorageData]);
  return { isLoading, userRef, setuserRef, userStorageData, setUserStorageData };
};

export default usePostUserProfileToStorage;
