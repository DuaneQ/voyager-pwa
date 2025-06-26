/**
 * Form component for user login.
 *
 * @component
 * @returns {JSX.Element}
 */

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
import { useContext, useState } from "react";
import { AlertContext } from "../../Context/AlertContext";
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth } from "../../environments/firebaseConfig";
import { GoogleIcon } from "../custom-icons/GoogleIcon";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const Card = styled(MuiCard)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  width: "80%",
  padding: theme.spacing(1),
  gap: theme.spacing(1),
  marginTop: theme.spacing(1),
  marginLeft: "auto",
  marginRight: "auto",
  [theme.breakpoints.up("sm")]: {
    maxWidth: "400px",
    padding: theme.spacing(1),
    gap: theme.spacing(2),
  },
}));

const SignInContainer = styled(Stack)(({ theme }) => ({
  padding: theme.spacing(0.1),
  [theme.breakpoints.up("sm")]: {
    padding: theme.spacing(1),
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
  const [passwordError, setPasswordError] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { showAlert } = useContext(AlertContext);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailError(!emailPattern.test(e.target.value));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordError(e.target.value.length < 6);
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    setIsSubmitting(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const db = getFirestore();

      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        showAlert(
          "Account not found",
          "No account record was found for this user. Please contact support or register for a new account."
        );
        await signOut(auth);
        navigate("/register");
        return;
      } else {
        window.location.href = "/";
      }
    } catch (error) {
      if ((error as { code?: string }).code === "auth/popup-closed-by-user") {
        showAlert("Info", "Google sign-in was canceled.");
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred.";
        showAlert("Error", errorMessage);
      }
    } finally {
      setIsSubmitting(false);
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

    setIsSubmitting(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

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
      showAlert("Error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <CssBaseline enableColorScheme />
      <SignInContainer className="authFormContainer">
        <Card variant="outlined">
          <Typography
            component="h1"
            variant="h5"
            align="left"
            sx={{ width: "100%", fontSize: { xs: "1.5rem", sm: "2rem" } }}>
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
              <FormLabel
                htmlFor="email"
                sx={{ fontSize: { xs: "0.75rem", sm: "1.1rem" } }}>
                Email
              </FormLabel>
              <TextField
                size="small"
                error={emailError}
                onChange={handleEmailChange}
                id="email"
                type="email"
                name="email"
                placeholder="your@email.com"
                autoComplete="email"
                autoFocus
                fullWidth
                variant="outlined"
                color={emailError ? "error" : "primary"}
                sx={{
                  fontSize: { xs: "0.95rem", sm: "1rem" },
                  "& input": { fontSize: { xs: "0.95rem", sm: "1rem" }, py: 1 },
                  "& input::placeholder": { fontSize: "0.95rem" },
                }}
              />
            </FormControl>
            <FormControl required sx={{ textAlign: "left" }}>
              <FormLabel
                htmlFor="password"
                sx={{ fontSize: { xs: "0.75rem", sm: "1.1rem" } }}>
                Password
              </FormLabel>
              <TextField
                size="small"
                error={passwordError}
                onChange={handlePasswordChange}
                name="password"
                placeholder="••••••••••"
                type="password"
                id="password"
                autoComplete="current-password"
                fullWidth
                variant="outlined"
                color={passwordError ? "error" : "primary"}
                sx={{
                  fontSize: { xs: "0.95rem", sm: "1rem" },
                  "& input": { fontSize: { xs: "0.95rem", sm: "1rem" }, py: 1 },
                  "& input::placeholder": { fontSize: "0.95rem" },
                }}
              />
            </FormControl>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              data-testid="email-signin-button"
              disabled={isSubmitting}
              sx={{
                fontSize: { xs: "0.95rem", sm: "1rem" },
                py: { xs: 1, sm: 1.5 },
              }}>
              Sign in
            </Button>
            <Link
              component={RouterLink}
              to="/reset"
              variant="body2"
              sx={{
                alignSelf: "center",
                fontSize: { xs: "0.85rem", sm: "1rem" },
              }}>
              Forgot your password?
            </Link>
            <Link
              component={RouterLink}
              to="/ResendEmail"
              variant="body2"
              sx={{
                alignSelf: "center",
                fontSize: { xs: "0.85rem", sm: "1rem" },
              }}>
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
              disabled={isSubmitting}
              sx={{
                fontSize: { xs: "0.95rem", sm: "1rem" },
                py: { xs: 1, sm: 1.5 },
              }}>
              Sign in with Google
            </Button>
          </Box>
          <Divider>or</Divider>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography
              sx={{
                textAlign: "center",
                fontSize: { xs: "0.95rem", sm: "1rem" },
              }}>
              Don&apos;t have an account?{" "}
              <Link
                component={RouterLink}
                to="/Register"
                variant="body2"
                sx={{
                  alignSelf: "center",
                  fontSize: { xs: "0.95rem", sm: "1rem" },
                }}>
                Sign up
              </Link>
            </Typography>
          </Box>
        </Card>
      </SignInContainer>
    </>
  );
}
