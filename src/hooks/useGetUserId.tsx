import { useState, useEffect } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const useGetUserId = () => {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
      // Guard against environments (like unit tests) where Firebase
      // has not been initialized. getAuth() will throw in that case.
      let unsubscribe: any = () => {};
      try {
        const auth = getAuth();
        unsubscribe = onAuthStateChanged(auth, (user) => {
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

            try {
              localStorage.setItem(
                "USER_CREDENTIALS",
                JSON.stringify(userCredentials)
              );
            } catch (e) {
              // ignore localStorage errors in test envs
            }
            setUserId(user.uid);
          } else {
            setUserId(null);
          }
        });
      } catch (e) {
        // Firebase not initialized (common in unit tests). Do nothing.
        unsubscribe = () => {};
      }

      return () => {
        try {
          if (typeof unsubscribe === 'function') {
            unsubscribe();
          }
        } catch (e) {
          // swallow errors from mocks during tests
        }
      };
  }, []);

  return userId;
};

export default useGetUserId;
