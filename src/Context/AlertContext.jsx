import React, { createContext, useState } from 'react';
import AlertPopup from '../components/utilities/Alerts';

const AlertContext = createContext();

const AlertProvider = ({ children }) => {
  const [alert, setAlert] = useState({ open: false, severity: 'info', message: '' });

  const showAlert = (severity, message) => {
    setAlert({ open: true, severity, message });
  };

  const closeAlert = () => {
    setAlert({ ...alert, open: false });
  };

  return (
    <AlertContext.Provider value={{ alert, showAlert, closeAlert }}>
      {children}
      <AlertPopup {...alert} onClose={closeAlert} />
    </AlertContext.Provider>
  );
};

export { AlertContext, AlertProvider };