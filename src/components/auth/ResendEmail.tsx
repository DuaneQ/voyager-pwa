import { Button } from "@mui/material";
import { Link } from "react-router-dom";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "../../environments/firebaseConfig";
import { useContext } from "react";
import { AlertContext } from "../../Context/AlertContext";
import MuiCard from "@mui/material/Card";
import { styled } from "@mui/material/styles";

const Card = styled(MuiCard)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignSelf: "center",
  width: "85%",
  padding: theme.spacing(2),
  gap: theme.spacing(2),
  margin: "auto",
  [theme.breakpoints.up("sm")]: {
    maxWidth: "450px",
  },
  boxShadow:
    "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
  ...theme.applyStyles("dark", {
    boxShadow:
      "hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px",
  }),
}));

export const ResendEmail = () => {

  const { showAlert } = useContext(AlertContext);

  const resendEmailVerification = () => {
    if (auth.currentUser) {
      if (auth.currentUser) {
        sendEmailVerification(auth.currentUser)
          .then(() => {
            showAlert("Success", "Verification email sent.");
          })
          .catch((error) => {
            showAlert("Error", error.message);
          });
      }
    }
  };

  return (
    <div className="authFormContainer">
      <Card variant="outlined">
        <Button
          fullWidth
          onClick={resendEmailVerification}
          variant="contained">
          Resend email verification link
        </Button>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "4 rem" }}>
            Already have an account? <Link to="/Login">Sign in</Link>
          </p>
        </div>
      </Card>
    </div>
  );
};
