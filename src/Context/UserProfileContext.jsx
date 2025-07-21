/**
 * React context provider for user profile data and actions.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Child components.
 * @returns {JSX.Element}
 * @returns {UserProfileContextValue}
 */

import { createContext, useCallback, useState, useEffect } from 'react';
import { auth } from "../environments/firebaseConfig";
import { app } from "../environments/firebaseConfig";
import { doc, getDoc, getFirestore } from "firebase/firestore";

const UserProfileContext = createContext();

const UserProfileProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const updateUserProfile = useCallback((newProfile) => {   
    setUserProfile(newProfile);   
    }, []);

  // Load user profile data directly in the context
  useEffect(() => {
    const loadUserProfile = async () => {
      setIsLoading(true);
      try {
        const userId = auth?.currentUser?.uid;
        const db = getFirestore(app);

        if (userId) {
          // Get the freshest data from Firebase first
          const userRef = await getDoc(doc(db, "users", userId));

          if (userRef.exists()) {
            const profile = userRef.data();
            // Update localStorage with the fresh data
            localStorage.setItem("PROFILE_INFO", JSON.stringify(profile));
            // Update context
            setUserProfile(profile);
          } else {
            // Only fall back to localStorage if Firebase has no data
            const cachedProfile = localStorage.getItem("PROFILE_INFO");
            if (cachedProfile) {
              setUserProfile(JSON.parse(cachedProfile));
            }
          }
        }
      } catch (error) {
        // On error, try localStorage as fallback
        const cachedProfile = localStorage.getItem("PROFILE_INFO");
        if (cachedProfile) {
          setUserProfile(JSON.parse(cachedProfile));
        }
        console.log("error loading profile", error);
      } finally {
        setIsLoading(false);
      }
    };

    // Only load if we have an authenticated user
    if (auth?.currentUser) {
      loadUserProfile();
    } else {
      // Listen for auth state changes
      const unsubscribe = auth.onAuthStateChanged((user) => {
        if (user) {
          loadUserProfile();
        } else {
          setIsLoading(false);
          setUserProfile(null);
        }
      });
      return unsubscribe;
    }
  }, []);

  return (
    <UserProfileContext.Provider value={{ userProfile, setUserProfile, updateUserProfile, isLoading }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export { UserProfileContext, UserProfileProvider }; 