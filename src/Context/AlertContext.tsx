import { AlertColor } from '@mui/material';
import React, { createContext, ReactNode, useContext, useState } from 'react';

export type Alerts = {
  alert: {
    open: boolean,
    severity: AlertColor,
    message: string,
  },
  showAlert: (severity: AlertColor, message: string) => void,
  closeAlert: () => void,
}

const defaultAlert: Alerts["alert"] = { open: false, severity: 'info', message: '' };

const AlertContext = createContext<Alerts>({
  alert: defaultAlert,
  showAlert: () => {},
  closeAlert: () => {},
});

const useAlerts = () => useContext(AlertContext);

type AlertProviderProps = {
  children: ReactNode
}

const AlertProvider = ({ children }: AlertProviderProps) => {
  const [alert, setAlert] = useState(defaultAlert);

  const showAlert = (severity: AlertColor, message: string) => {
    setAlert({ open: true, severity, message });
  };

  const closeAlert = () => {
    setAlert({ ...alert, open: false });
  };

  return (
    <AlertContext.Provider value={{ alert, showAlert, closeAlert }}>
      {children}
    </AlertContext.Provider>
  );
};

export { AlertContext, AlertProvider, useAlerts };