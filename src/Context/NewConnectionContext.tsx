/**
 * React context provider for managing new connection state.
 *
 * @param {object} props
 * @param {React.ReactNode} props.children - Child components.
 * @returns {JSX.Element}
 * Custom hook to access the NewConnection context.
 *
 * @returns {NewConnectionContextValue}
 */

import React, { createContext, useContext, useState, ReactNode } from "react";

// Define the context type
interface NewConnectionContextType {
  hasNewConnection: boolean;
  setHasNewConnection: (value: boolean) => void;
}

// Create the context
export const NewConnectionContext = createContext<
  NewConnectionContextType | undefined
>(undefined);

// Custom hook to use the context
export const useNewConnection = (): NewConnectionContextType => {
  const context = useContext(NewConnectionContext);
  if (context === undefined) {
    throw new Error(
      "useNewConnection must be used within a NewConnectionProvider"
    );
  }
  return context;
};

// Provider component
interface NewConnectionProviderProps {
  children: ReactNode;
}

export const NewConnectionProvider: React.FC<NewConnectionProviderProps> = ({
  children,
}) => {
  const [hasNewConnection, setHasNewConnection] = useState<boolean>(false);

  const value: NewConnectionContextType = {
    hasNewConnection,
    setHasNewConnection,
  };

  return (
    <NewConnectionContext.Provider value={value}>
      {children}
    </NewConnectionContext.Provider>
  );
};
