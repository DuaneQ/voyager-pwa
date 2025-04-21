import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CssBaseline from "@mui/material/CssBaseline";
import Divider from "@mui/material/Divider";
import FormLabel from "@mui/material/FormLabel";
import FormControl from "@mui/material/FormControl";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import MuiCard from "@mui/material/Card";
import { styled } from "@mui/material/styles";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useContext, useEffect, useState } from "react";
import { AlertContext } from "../../Context/AlertContext";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "../../environments/environment";
import { GoogleIcon } from "../custom-icons/GoogleIcon";

const Card = styled(MuiCard)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignSelf: "center",
  width: "100%",
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

const SignInContainer = styled(Stack)(({ theme }) => ({
  height: "calc((1 - var(--template-frame-height, 0)) * 100dvh)",
  minHeight: "100%",
  padding: theme.spacing(2),
  [theme.breakpoints.up("sm")]: {
    padding: theme.spacing(4),
  },
  "&::before": {
    content: '""',
    display: "block",
    position: "absolute",
    zIndex: -1,
    inset: 0,
    backgroundImage:
      "radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))",
    backgroundRepeat: "no-repeat",
    ...theme.applyStyles("dark", {
      backgroundImage:
        "radial-gradient(at 50% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))",
    }),
  },
}));

export default function SignInForm(props: { disableCustomTheme?: boolean }) {
  const [emailError, setEmailError] = React.useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = React.useState("");
  const [passwordError, setPasswordError] = React.useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = React.useState("");
  const [isSubmitting, setIsSubmitting] = useState(false); // State to track submission
  const navigate = useNavigate();
  const { showAlert } = useContext(AlertContext);

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    setIsSubmitting(true); // Disable buttons
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if the user's email is verified
      if (!user.emailVerified) {
        showAlert(
          "Email not verified",
          "Your email has not been verified. Please check your inbox or spam folder, or click the link below to resend another verification email."
        );
        navigate("/Login");
      } else {
        const userCredentials = {
          user: {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
            isAnonymous: user.isAnonymous,
            providerData: user.providerData,
          },
        };
        localStorage.setItem(
          "USER_CREDENTIALS",
          JSON.stringify(userCredentials)
        );
        window.location.href = "/";
      }
    } catch (error) {
      if ((error as { code?: string }).code === "auth/popup-closed-by-user") {
        // Handle the case where the user closes the popup
        showAlert("Info", "Google sign-in was canceled.");
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred.";
        showAlert("Error", errorMessage);
      }
    } finally {
      setIsSubmitting(false); // Re-enable buttons
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (emailError || passwordError) {
      return;
    }

    const data = new FormData(event.currentTarget);
    const email = data.get("email") as string | null;
    const password = data.get("password") as string | null;

    if (!email || !password) {
      showAlert("Error", "Please enter your email and password.");
      return;
    }

    setIsSubmitting(true); // Disable buttons
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Refresh the user's authentication state
      await user.reload();
      if (!user.emailVerified) {
        showAlert(
          "Email not verified",
          "Your email has not been verified. Please check your inbox or spam folder, or click the link below to resend another verification email."
        );
        navigate("/Login");
      } else {
        const userCredentials = {
          user: {
            uid: user.uid,
            email: user.email,
            emailVerified: user.emailVerified,
            isAnonymous: user.isAnonymous,
            providerData: user.providerData,
          },
        };

        localStorage.setItem(
          "USER_CREDENTIALS",
          JSON.stringify(userCredentials)
        );
        window.location.href = "/";
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "An unknown error occurred.";
      showAlert("Error", errorMessage); // Pass the correct error message
    } finally {
      setIsSubmitting(false); // Re-enable buttons
    }
  };

  return (
    <>
      <CssBaseline enableColorScheme />
      <SignInContainer
        className="authFormContainer"
        direction="column"
        justifyContent="space-between">
        <Card variant="outlined">
          <Typography
            component="h1"
            variant="h4"
            align="left"
            sx={{ width: "100%", fontSize: "clamp(2rem, 10vw, 2.15rem)" }}>
            Sign in
          </Typography>
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              gap: 2,
            }}>
            <FormControl required sx={{ textAlign: "left" }}>
              <FormLabel htmlFor="email">Email</FormLabel>
              <TextField
                error={emailError}
                helperText={emailErrorMessage}
                id="email"
                type="email"
                name="email"
                placeholder="your@email.com"
                autoComplete="email"
                autoFocus
                fullWidth
                variant="outlined"
                color={emailError ? "error" : "primary"}
              />
            </FormControl>
            <FormControl required sx={{ textAlign: "left" }}>
              <FormLabel htmlFor="password">Password</FormLabel>
              <TextField
                error={passwordError}
                helperText={passwordErrorMessage}
                name="password"
                placeholder="••••••••••"
                type="password"
                id="password"
                autoComplete="current-password"
                fullWidth
                variant="outlined"
                color={passwordError ? "error" : "primary"}
              />
            </FormControl>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              data-testid="email-signin-button"
              disabled={isSubmitting} // Disable button while submitting
            >
              Sign in
            </Button>
            <Link
              component={RouterLink}
              to="/reset"
              variant="body2"
              sx={{ alignSelf: "center" }}>
              Forgot your password?
            </Link>
            <Link
              component={RouterLink}
              to="/ResendEmail"
              variant="body2"
              sx={{ alignSelf: "center" }}>
              Resend email verification
            </Link>
          </Box>
          <Divider>or</Divider>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={handleGoogleSignIn}
              startIcon={<GoogleIcon />}
              data-testid="google-signin-button"
              disabled={isSubmitting} // Disable button while submitting
            >
              Sign in with Google
            </Button>
          </Box>
          <Divider>or</Divider>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography sx={{ textAlign: "center" }}>
              Don&apos;t have an account?{" "}
              <Link
                component={RouterLink}
                to="/Register"
                variant="body2"
                sx={{ alignSelf: "center" }}>
                Sign up
              </Link>
            </Typography>
          </Box>
        </Card>
      </SignInContainer>
    </>
  );
}
