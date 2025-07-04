import { RotatingLines } from "react-loader-spinner";
import React, { createContext, useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";
export const Context = createContext();

export function UserAuthContextProvider({ children }) {
  const auth = getAuth();
  const [user, setUser] = useState();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribe;
    unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setLoading(false);
      if (currentUser && currentUser.emailVerified) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [auth, navigate]);

  const values = {
    user: user,
    setUser: setUser
  }

  return <Context.Provider value={values}>
    {loading && <RotatingLines strokeColor="grey" strokeWidth="5" animationDuration="0.75" width="96" visible={true} />}
    {!loading && children}
  </Context.Provider>
}