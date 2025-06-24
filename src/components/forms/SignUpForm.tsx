/**
 * Form component for user registration.
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
  createUserWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { app, auth } from "../../environments/firebaseConfig";
import { FormHelperText } from "@mui/material";
import { doc, getFirestore, setDoc } from "firebase/firestore";
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
  padding: theme.spacing(2),
  [theme.breakpoints.up("sm")]: {
    padding: theme.spacing(3),
  },
  "&::before": {
    content: '""',
    display: "block",

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

export default function SignUpForm(props: { disableCustomTheme?: boolean }) {
  const [emailError, setEmailError] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState(false);
  const [passwordConfError, setPasswordConfError] = React.useState(false);
  const [usernameError, setUsernameError] = React.useState(false);
  const navigate = useNavigate();
  const { showAlert } = useContext(AlertContext);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [inputs, setInputs] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
    bio: "",
    gender: "",
    sexo: "",
    edu: "",
    drinking: "",
    smoking: "",
    dob: "",
    photos: ["", "", "", "", ""],
  });

  const handleNameChange = (e: any) => {
    setInputs((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
    if (!e.target.validity.valid || e.target.value.length < 2) {
      setUsernameError(true);
    } else {
      setUsernameError(false);
    }
  };

  const handleEmailChange = (e: any) => {
    setInputs((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (e.target.validity.valid && emailPattern.test(e.target.value)) {
      setEmailError(false);
    } else {
      setEmailError(true);
    }
  };

  const handlePasswordChange = (e: any) => {
    setInputs((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
    if (!e.target.validity.valid || e.target.value.length < 10) {
      setPasswordError(true);
    } else {
      setPasswordError(false);
    }
  };

  const handlePasswordConfChange = (e: any) => {
    setInputs((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
    if (!e.target.validity.valid || e.target.value.length < 10) {
      setPasswordConfError(true);
    } else {
      setPasswordConfError(false);
    }
  };

  const handleGoogleSignUp = async () => {
    const provider = new GoogleAuthProvider();
    setIsSubmitting(true); // Disable the button
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Extract user data
      const userData = {
        username: user.displayName || "",
        email: user.email || "",
        bio: "",
        gender: "",
        sexo: "",
        edu: "",
        drinking: "",
        smoking: "",
        dob: "",
        photos: ["", "", "", "", ""],
      };

      // Format USER_CREDENTIALS to match email/password sign-up
      const userCredentials = {
        user: {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          isAnonymous: user.isAnonymous,
          providerData: user.providerData,
        },
      };

      // Save user data to Firestore
      const db = getFirestore(app);
      const docRef = doc(db, "users", user.uid);
      await setDoc(docRef, userData);

      // Save user credentials and profile info to localStorage
      localStorage.setItem("USER_CREDENTIALS", JSON.stringify(userCredentials));
      localStorage.setItem("PROFILE_INFO", JSON.stringify(userData));

      // Show success alert and navigate to the next page
      showAlert("Success", "You have successfully signed up with Google!");
      navigate("/");
    } catch (error) {
      if (
        error instanceof Error &&
        (error as any).code === "auth/popup-closed-by-user"
      ) {
        // Handle the case where the user closes the popup
        showAlert("Info", "Google sign-up was canceled.");
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred.";
        showAlert("Error", errorMessage);
      }
    } finally {
      setIsSubmitting(false); // Re-enable the button
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true); // Disable the button
    try {
      if (inputs.password !== inputs.confirm) {
        showAlert(
          "Error",
          "The passwords you entered do not match. Please make sure both fields have the same password."
        );
        return;
      } else if (!inputs.email || !inputs.username || !inputs.password) {
        showAlert("Error", "Please fill out all of the fields.");
        return;
      }

      await createUserWithEmailAndPassword(auth, inputs.email, inputs.password)
        .then(async (userCredential) => {
          await sendEmailVerification(userCredential.user);
          const { password, confirm, ...userData } = inputs;

          // Format USER_CREDENTIALS
          const userCredentials = {
            user: {
              uid: userCredential.user.uid,
              email: userCredential.user.email,
              emailVerified: userCredential.user.emailVerified,
              isAnonymous: userCredential.user.isAnonymous,
              providerData: userCredential.user.providerData,
            },
          };

          // Save user credentials and profile info to localStorage
          localStorage.setItem(
            "USER_CREDENTIALS",
            JSON.stringify(userCredentials)
          );
          localStorage.setItem("PROFILE_INFO", JSON.stringify(userData));

          showAlert(
            "Info",
            "A verification link has been sent to your email for verification."
          );

          const db = getFirestore(app);
          const docRef = doc(db, "users", userCredential.user.uid);
          await setDoc(docRef, userData);
        })
        .then(() => {
          navigate("/Login");
        })
        .catch((error) => {
          const errorMessage = error.message;
          showAlert("Error", errorMessage);
        });
    } finally {
      setIsSubmitting(false); // Re-enable the button
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
            Sign up
          </Typography>
          <form
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            onSubmit={handleSubmit}
            noValidate>
            <FormControl required sx={{ textAlign: "left" }}>
              <FormLabel htmlFor="username">Username</FormLabel>
              <TextField
                error={usernameError}
                id="username"
                type="text"
                name="username"
                placeholder="Username"
                autoFocus
                value={inputs.username}
                fullWidth
                variant="outlined"
                onChange={handleNameChange}
                color={usernameError ? "error" : "primary"}
              />
              {usernameError ? (
                <FormHelperText>
                  Username must be greater than 2 characters.
                </FormHelperText>
              ) : null}
            </FormControl>
            <FormControl required sx={{ textAlign: "left" }}>
              <FormLabel htmlFor="email">Email</FormLabel>
              <TextField
                error={emailError}
                id="email"
                type="email"
                name="email"
                placeholder="your@email.com"
                autoComplete="email"
                value={inputs.email}
                fullWidth
                variant="outlined"
                onChange={handleEmailChange}
                color={emailError ? "error" : "primary"}
              />
              {emailError ? (
                <FormHelperText>Please enter a valid email.</FormHelperText>
              ) : null}
            </FormControl>
            <FormControl required sx={{ textAlign: "left" }}>
              <FormLabel htmlFor="password">Password</FormLabel>
              <TextField
                error={passwordError}
                name="password"
                placeholder="Enter your password"
                type="password"
                id="password"
                autoComplete="current-password"
                fullWidth
                value={inputs.password}
                onChange={handlePasswordChange}
                variant="outlined"
                color={passwordError ? "error" : "primary"}
              />
              {passwordError ? (
                <FormHelperText>
                  Please enter a password of 10 characters or more.
                </FormHelperText>
              ) : null}
            </FormControl>
            <FormControl required sx={{ textAlign: "left" }}>
              <FormLabel htmlFor="confirm">Confirm Password</FormLabel>
              <TextField
                error={passwordConfError}
                name="confirm"
                placeholder="Confirm your password"
                type="text"
                id="confirm"
                value={inputs.confirm}
                fullWidth
                onChange={handlePasswordConfChange}
                variant="outlined"
                color={passwordConfError ? "error" : "primary"}
              />
              {passwordConfError ? (
                <FormHelperText>
                  Please enter a password of 10 characters or more.
                </FormHelperText>
              ) : null}
            </FormControl>
            <Button
              type="submit"
              fullWidth
              disabled={isSubmitting}
              variant="contained"
              data-testid="email-signup-button">
              Sign up
            </Button>
          </form>
          <Divider>or</Divider>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={handleGoogleSignUp}
              startIcon={<GoogleIcon />}
              disabled={isSubmitting}
              data-testid="google-signup-button">
              Sign up with Google
            </Button>
          </Box>
          <Divider>or</Divider>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography sx={{ textAlign: "center" }}>
              Already have an account?{" "}
              <Link
                component={RouterLink}
                to="/Login"
                variant="body2"
                sx={{ alignSelf: "center" }}>
                Sign in
              </Link>
            </Typography>
          </Box>
        </Card>
      </SignInContainer>
    </>
  );
}
