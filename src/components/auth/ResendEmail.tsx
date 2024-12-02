import { Button } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, sendEmailVerification } from "firebase/auth";
import app from "../../environments/environment";
import { useContext } from "react";
import { AlertContext } from "../../Context/AlertContext";

export const ResendEmail = () => {

  const navigate = useNavigate();
  const { showAlert } = useContext(AlertContext);

  const resendEmailVerification = () => {
    const auth = getAuth(app);
    console.log("from storage", auth.currentUser);
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
      <div>
        <div>
          <p style={{ color: "white" }}>
            Already have an account? <Link to="/Login">Sign in</Link>
          </p>
        </div>
        <Button
          fullWidth
          onClick={resendEmailVerification}
          variant="contained">
          Resend email verification link
        </Button>
      </div>
    </div>
  );
};
