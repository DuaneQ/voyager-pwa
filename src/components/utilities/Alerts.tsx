import React from "react";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { styled } from "@mui/material/styles";
import { useAlerts } from "../../Context/AlertContext";

const StyledAlert = styled(Alert)(({ theme }) => ({
  "& .MuiAlert-message": {
    fontSize: "2rem",
  },
  position: "relative",
  top: "-90px",
}));

const AlertPopup: React.FC = () => {

  const {alert, closeAlert} = useAlerts();

  return (
    <Snackbar open={alert.open} autoHideDuration={6000} onClose={closeAlert}>
      <StyledAlert severity={alert.severity} onClose={closeAlert}>
        {alert.message}
      </StyledAlert>
    </Snackbar>
  );
};

export default AlertPopup;
