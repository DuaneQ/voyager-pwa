import { createContext, useCallback, useState } from 'react';

const UserProfileContext = createContext();

const UserProfileProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);

  const updateUserProfile = useCallback((newProfile) => {   
    setUserProfile(newProfile);   
    }, []);

  return (
    <UserProfileContext.Provider value={{ userProfile, setUserProfile, updateUserProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export { UserProfileContext, UserProfileProvider }; 