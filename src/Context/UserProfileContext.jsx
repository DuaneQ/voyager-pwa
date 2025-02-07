import React, { createContext, useState, useContext } from 'react';

const UserProfileContext = createContext(null);


export const UserProfileProvider = ({ children }) => {
  const [userProfileContext, setUserProfileContext] = useState(null);

  return (
    <UserProfileContext.Provider value={{ userProfile: userProfileContext, setUserProfile: setUserProfileContext }}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};
