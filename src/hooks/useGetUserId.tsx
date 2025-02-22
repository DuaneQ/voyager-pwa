import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const useGetUserId = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem("USER_CREDENTIALS");
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
        if (user) {
          const uid = user.uid;
          localStorage.setItem("USER_CREDENTIALS", uid);
          setUserId(uid);
        }
      });

      return () => unsubscribe();
    }
  }, [userId]);

  return userId;
};

export default useGetUserId;
