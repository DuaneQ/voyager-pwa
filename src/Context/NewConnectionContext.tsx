import React, { createContext, useContext, useState } from "react";

type NewConnectionContextType = {
  hasNewConnection: boolean;
  setHasNewConnection: (val: boolean) => void;
};

const NewConnectionContext = createContext<
  NewConnectionContextType | undefined
>(undefined);

export const useNewConnection = () => {
  const ctx = useContext(NewConnectionContext);
  if (!ctx)
    throw new Error(
      "useNewConnection must be used within NewConnectionProvider"
    );
  return ctx;
};

export const NewConnectionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [hasNewConnection, setHasNewConnection] = useState(false);
  return (
    <NewConnectionContext.Provider
      value={{ hasNewConnection, setHasNewConnection }}>
      {children}
    </NewConnectionContext.Provider>
  );
};
