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
import Card from "@mui/material/Card";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
import { AlertContext } from "../../Context/AlertContext";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { app, auth } from "../../environments/firebaseConfig";
import { FormHelperText } from "@mui/material";
import { doc, getFirestore, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { GoogleIcon } from "../custom-icons/GoogleIcon";

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
    sexualOrientation: "",
    edu: "",
    drinking: "",
    smoking: "",
    dob: "",
    photos: ["", "", "", "", ""],
  });

  // Prevent body scrolling when component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

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
    setIsSubmitting(true);
    try {
      const result = await signInWithPopup(auth, provider);
      
      const user = result.user;
      
      const userData = {
        username: user.displayName || "",
        email: user.email || "",
        bio: "",
        gender: "",
        sexualOrientation: "",
        edu: "",
        drinking: "",
        smoking: "",
        dob: "",
        photos: ["", "", "", "", ""],
        subscriptionType: 'free',
        subscriptionStartDate: "",
        subscriptionEndDate: "",
        subscriptionCancelled: false,
        stripeCustomerId: null,
        dailyUsage: {
          date: new Date().toISOString().split('T')[0],
          viewCount: 0
        }
      };

      const userCredentials = {
        user: {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          isAnonymous: user.isAnonymous,
          providerData: user.providerData,
        },
      };

      const db = getFirestore(app);
      const docRef = doc(db, "users", user.uid);
      
      // Use merge: true to prevent overwriting existing profile data
      await setDoc(docRef, userData, { merge: true });

      localStorage.setItem("USER_CREDENTIALS", JSON.stringify(userCredentials));
      localStorage.setItem("PROFILE_INFO", JSON.stringify(userData));

      showAlert("Success", "You have successfully signed up with Google!");
      navigate("/profile");
    } catch (error) {
      if (
        error instanceof Error &&
        (error as any).code === "auth/popup-closed-by-user"
      ) {
        showAlert("Info", "Google sign-up was canceled.");
      } else {
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred.";
        showAlert("Error", errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Validation checks
      if (inputs.password !== inputs.confirm) {
        showAlert(
          "Error",
          "The passwords you entered do not match. Please make sure both fields have the same password."
        );
        setIsSubmitting(false);
        return;
      } else if (!inputs.email || !inputs.username || !inputs.password) {
        showAlert("Error", "Please fill out all of the fields.");
        setIsSubmitting(false);
        return;
      }

      // Create the auth user first - Firebase Auth will handle duplicate email detection
      await createUserWithEmailAndPassword(auth, inputs.email, inputs.password)
        .then(async (userCredential) => {
          await sendEmailVerification(userCredential.user);
          const { password, confirm, ...userData } = inputs;

          // Add subscription fields to userData
          const userDataWithSubscription = {
            ...userData,
            subscriptionType: 'free',
            subscriptionStartDate: null,
            subscriptionEndDate: null,
            subscriptionCancelled: false,
            stripeCustomerId: null,
            dailyUsage: {
              date: new Date().toISOString().split('T')[0],
              viewCount: 0
            }
          };


          const userCredentials = {
            user: {
              uid: userCredential.user.uid,
              email: userCredential.user.email,
              emailVerified: userCredential.user.emailVerified,
              isAnonymous: userCredential.user.isAnonymous,
              providerData: userCredential.user.providerData,
            },
          };

          localStorage.setItem(
            "USER_CREDENTIALS",
            JSON.stringify(userCredentials)
          );
          localStorage.setItem("PROFILE_INFO", JSON.stringify(userDataWithSubscription));

          showAlert(
            "Info",
            "A verification link has been sent to your email for verification."
          );

          const db = getFirestore(app);
          const docRef = doc(db, "users", userCredential.user.uid);
          // Use merge: true to prevent overwriting existing data (defensive measure)
          await setDoc(docRef, userDataWithSubscription, { merge: true });
        })
        .then(() => {
          navigate("/Login");
        })
        .catch((error) => {
          const errorMessage = error.message;
          // Provide user-friendly error messages
          if (error.code === 'auth/email-already-in-use') {
            showAlert("Error", "An account already exists for that email. Please sign in instead.");
          } else if (error.code === 'auth/invalid-email') {
            showAlert("Error", "Please enter a valid email address.");
          } else if (error.code === 'auth/weak-password') {
            showAlert("Error", "Password should be at least 6 characters.");
          } else {
            showAlert("Error", errorMessage);
          }
        });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      showAlert("Error", errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <CssBaseline enableColorScheme />
      <Stack
        className="authFormContainer"
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1000,
          minHeight: '100vh',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
          padding: { xs: 0.5, sm: 3 },
        }}
      >
        <Card
          variant="outlined"
          sx={{
            display: "flex",
            flexDirection: "column",
            width: { xs: "99%", sm: "90%" },
            maxWidth: { xs: 340, sm: 420 },
            maxHeight: { xs: "90vh", sm: "90vh" }, // Limit max height to 90% of viewport
            padding: { xs: 0.9, sm: 2.25 }, // Reduced padding by 10%
            gap: { xs: 0.63, sm: 1.8 }, // Reduced gap by 10%
            marginLeft: "auto",
            marginRight: "auto",
            boxShadow: "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
            borderRadius: { xs: 2, sm: 3 },
            overflow: "auto", // Allow scrolling if content exceeds maxHeight
          }}
        >
          <Typography
            component="h1"
            variant="h5"
            align="left"
            sx={{ 
              width: "100%", 
              fontSize: { xs: "1.25rem", sm: "2rem" },
              mb: { xs: 0.5, sm: 1 }
            }}>
            Sign up
          </Typography>
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: { xs: 1, sm: 2 },
            }}>
            <FormControl required sx={{ textAlign: "left" }}>
              <FormLabel
                htmlFor="username"
                sx={{ fontSize: { xs: "0.8rem", sm: "1.1rem" } }}>
                Username
              </FormLabel>
              <TextField
                size="small"
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
                sx={{
                  "& input": { 
                    fontSize: { xs: "0.9rem", sm: "1.1rem" }, 
                    py: { xs: 1, sm: 1.5 }
                  },
                  "& input::placeholder": { fontSize: { xs: "0.9rem", sm: "1rem" } },
                }}
              />
              {usernameError && (
                <FormHelperText error sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}>
                  Username must be greater than 2 characters.
                </FormHelperText>
              )}
            </FormControl>
            
            <FormControl required sx={{ textAlign: "left" }}>
              <FormLabel
                htmlFor="email"
                sx={{ fontSize: { xs: "0.8rem", sm: "1.1rem" } }}>
                Email
              </FormLabel>
              <TextField
                size="small"
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
                sx={{
                  "& input": { 
                    fontSize: { xs: "0.9rem", sm: "1.1rem" }, 
                    py: { xs: 1, sm: 1.5 }
                  },
                  "& input::placeholder": { fontSize: { xs: "0.9rem", sm: "1rem" } },
                }}
              />
              {emailError && (
                <FormHelperText error sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}>
                  Please enter a valid email.
                </FormHelperText>
              )}
            </FormControl>
            
            <FormControl required sx={{ textAlign: "left" }}>
              <FormLabel
                htmlFor="password"
                sx={{ fontSize: { xs: "0.8rem", sm: "1.1rem" } }}>
                Password
              </FormLabel>
              <TextField
                size="small"
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
                sx={{
                  "& input": { 
                    fontSize: { xs: "0.9rem", sm: "1.1rem" }, 
                    py: { xs: 1, sm: 1.5 }
                  },
                  "& input::placeholder": { fontSize: { xs: "0.9rem", sm: "1rem" } },
                }}
              />
              {passwordError && (
                <FormHelperText error sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}>
                  Please enter a password of 10 characters or more.
                </FormHelperText>
              )}
            </FormControl>
            
            <FormControl required sx={{ textAlign: "left" }}>
              <FormLabel
                htmlFor="confirm"
                sx={{ fontSize: { xs: "0.8rem", sm: "1.1rem" } }}>
                Confirm Password
              </FormLabel>
              <TextField
                size="small"
                error={passwordConfError}
                name="confirm"
                placeholder="Confirm your password"
                type="password"
                id="confirm"
                value={inputs.confirm}
                fullWidth
                onChange={handlePasswordConfChange}
                variant="outlined"
                color={passwordConfError ? "error" : "primary"}
                sx={{
                  "& input": { 
                    fontSize: { xs: "0.9rem", sm: "1.1rem" }, 
                    py: { xs: 1, sm: 1.5 }
                  },
                  "& input::placeholder": { fontSize: { xs: "0.9rem", sm: "1rem" } },
                }}
              />
              {passwordConfError && (
                <FormHelperText error sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" } }}>
                  Please enter a password of 10 characters or more.
                </FormHelperText>
              )}
            </FormControl>
            
            <Button
              type="submit"
              fullWidth
              disabled={isSubmitting}
              variant="contained"
              data-testid="email-signup-button"
              sx={{
                fontSize: { xs: "0.9rem", sm: "1.1rem" },
                py: { xs: 1.2, sm: 2 },
                mt: { xs: 0.5, sm: 1 }
              }}>
              {isSubmitting ? 'Creating Account...' : 'Sign up'}
            </Button>
          </Box>
          
          <Divider sx={{ my: { xs: 1.5, sm: 2 } }}>or</Divider>
          
          <Button
            fullWidth
            variant="outlined"
            onClick={handleGoogleSignUp}
            startIcon={<GoogleIcon />}
            disabled={isSubmitting}
            data-testid="google-signup-button"
            sx={{
              fontSize: { xs: "0.9rem", sm: "1.1rem" },
              py: { xs: 1.2, sm: 2 },
            }}>
            Sign up with Google
          </Button>
          
          <Divider sx={{ my: { xs: 1.5, sm: 2 } }}>or</Divider>
          
          <Typography sx={{ textAlign: "center" }}>
            Already have an account?{" "}
            <Link
              component={RouterLink}
              to="/Login"
              variant="body2"
              sx={{ 
                fontSize: { xs: "0.9rem", sm: "1.1rem" },
                fontWeight: 600
              }}>
              Sign in
            </Link>
          </Typography>
        </Card>
      </Stack>
    </>
  );
}
