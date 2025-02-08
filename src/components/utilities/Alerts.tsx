import React from "react";
import Alert from "@mui/material/Alert";
import Snackbar from "@mui/material/Snackbar";
import { styled } from "@mui/material/styles";
import { common } from "@mui/material/colors";

interface AlertPopupProps {
  open: boolean;
  severity: "error" | "warning" | "info" | "success";
  message: string;
  onClose: () => void;
}

const StyledAlert = styled(Alert)(({ theme }) => ({
  "& .MuiAlert-message": {
    fontSize: "1rem",
  },
  position: "relative",
  top: "-40px",
  backgroundColor: common.white,
}));

const AlertPopup: React.FC<AlertPopupProps> = ({
  open,
  severity,
  message,
  onClose,
}) => {
  return (
    <Snackbar open={open} autoHideDuration={6000} onClose={onClose}>
      <StyledAlert severity={severity} onClose={onClose}>
        {message}
      </StyledAlert>
    </Snackbar>
  );
};

export default AlertPopup;
