import { useEffect, useState } from "react";

const usePostUserProfileToStorage = () => {

  const [isLoading, setIsLoading] = useState(true);
  const [userRef, setuserRef] = useState<any | null>(null);
  const [userStorageData, setUserStorageData] = useState<any | null>(null);

  useEffect(() => {
    const userProfile = async () => {
      setIsLoading(true);
      try {
        if (userStorageData){
          localStorage.setItem("PROFILE_INFO", JSON.stringify(userStorageData))
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
