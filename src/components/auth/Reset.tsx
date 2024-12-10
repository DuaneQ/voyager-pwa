import { Button, Input, styled } from "@mui/material";
import { EMAIL_PLACEHOLDER, EMAIL_REQUIRED } from "../shared-strings/constants";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import app from "../../environments/environment";
import { AlertContext } from "../../Context/AlertContext";
import { useContext } from "react";
import MuiCard from "@mui/material/Card";

const Card = styled(MuiCard)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignSelf: "center",
  width: "80%",
  padding: theme.spacing(4),
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

export const Reset = () => {
  type FormValues = {
    email: string;
  };

  const { showAlert } = useContext(AlertContext);
  const navigate = useNavigate();
  const { register, handleSubmit, formState } = useForm<FormValues>();
  const { errors } = formState;

  const onSubmit = (data: FormValues) => {
    const auth = getAuth(app);

    sendPasswordResetEmail(auth, data.email)
      .then(() => {
        showAlert("Info", "Check your email for the reset link.");
      })
      .catch((error) => {
        console.error("Error sending password reset email:", error);
      });
    navigate("/Login");
  };

  return (
    <div className="authFormContainer">
      <Card variant="outlined">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Input
            required
            type="email"
            id="email"
            sx={{ width: "100%", maxWidth: 300, mx: "auto" }}
            placeholder={EMAIL_PLACEHOLDER}
            {...register("email", {
              required: {
                value: true,
                message: EMAIL_REQUIRED,
              },
            })}
          />
          <p className="error" style={{ color: "black" }}>
            {errors.email?.message}
          </p>
          <div>
            <p>
              Already have an account? <Link to="/Login">Sign in</Link>
            </p>
          </div>
          <Button type="submit" fullWidth variant="contained">
            Submit
          </Button>
        </form>
      </Card>
    </div>
  );
};
