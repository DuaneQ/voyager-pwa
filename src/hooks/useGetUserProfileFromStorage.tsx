import { useEffect, useState } from "react";

const useGetUserProfileFromStorage = () => {

  const [isLoading, setIsLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any | null>(null);

  useEffect(() => {
    const userProfile = async () => {
      setIsLoading(true);
      try {
        const userRef = localStorage.getItem("USER_CREDENTIALS")
        if (userRef) {
        setUserProfile(userRef);
        }
      } catch (error) {
        console.log("error", error);
      } finally {
        setIsLoading(false);
      }
    };
    userProfile();
  }, [setUserProfile]);
  return { isLoading, userProfile, setUserProfile };
};

export default useGetUserProfileFromStorage;
