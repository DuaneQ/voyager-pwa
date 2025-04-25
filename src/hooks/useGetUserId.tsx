import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const useGetUserId = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
   
      const unsubscribe = onAuthStateChanged(getAuth(), (user) => {
        if (user) {
          const userCredentials = {
            user: {
              uid: user.uid,
              email: user.email,
              emailVerified: user.emailVerified,
              isAnonymous: user.isAnonymous,
              providerData: user.providerData,
            },
          };

          localStorage.setItem(
            "USER_CREDENTIALS",
            JSON.stringify(userCredentials)
          );
          setUserId(user.uid);
        }
      });

      return () => unsubscribe();
    
  }, [userId]);

  return userId;
};

export default useGetUserId;
