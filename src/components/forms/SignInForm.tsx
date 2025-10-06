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
import Card from "@mui/material/Card";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useContext, useState, useEffect } from "react";
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

export default function SignInForm(props: { disableCustomTheme?: boolean }) {
  const [emailError, setEmailError] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { showAlert } = useContext(AlertContext);

  // Prevent body scrolling when component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

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
          padding: { xs: 1, sm: 4 },
        }}
      >
        <Card 
          variant="outlined"
          sx={{
            display: "flex",
            flexDirection: "column",
            width: { xs: "95%", sm: "90%" },
            maxWidth: "500px",
            padding: { xs: 1.5, sm: 3 },
            gap: { xs: 1.5, sm: 2 },
            marginLeft: "auto",
            marginRight: "auto",
            boxShadow: "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px"
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
            Sign in
          </Typography>

          {/* App Features Section */}
          <Box sx={{ 
            mb: { xs: 1, sm: 2 },
            p: { xs: 1, sm: 1.5 },
            bgcolor: 'rgba(25, 118, 210, 0.04)',
            borderRadius: 1.5,
            border: '1px solid rgba(25, 118, 210, 0.12)'
          }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontSize: { xs: "0.9rem", sm: "1.1rem" },
                fontWeight: 600,
                color: 'primary.main',
                mb: { xs: 0.8, sm: 1 },
                textAlign: 'center'
              }}
            >
              Welcome to TravalPass
            </Typography>
            <Stack spacing={{ xs: 0.5, sm: 0.8 }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                py: 0.2
              }}>
                <Box sx={{ 
                  color: 'primary.main',
                  fontSize: { xs: '1rem', sm: '1.2rem' },
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: { xs: '18px', sm: '20px' }
                }}>
                  ✈️
                </Box>
                <Typography sx={{ 
                  fontSize: { xs: '0.8rem', sm: '0.95rem' },
                  fontWeight: 500,
                  color: 'text.primary',
                  lineHeight: 1.3
                }}>
                  AI generated itineraries
                </Typography>
              </Box>
              
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                py: 0.2
              }}>
                <Box sx={{ 
                  color: 'primary.main',
                  fontSize: { xs: '1rem', sm: '1.2rem' },
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: { xs: '18px', sm: '20px' }
                }}>
                  ✈️
                </Box>
                <Typography sx={{ 
                  fontSize: { xs: '0.8rem', sm: '0.95rem' },
                  fontWeight: 500,
                  color: 'text.primary',
                  lineHeight: 1.3
                }}>
                  Safely match with other travelers
                </Typography>
              </Box>
              
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 1,
                py: 0.2
              }}>
                <Box sx={{ 
                  color: 'primary.main',
                  fontSize: { xs: '1rem', sm: '1.2rem' },
                  display: 'flex',
                  alignItems: 'center',
                  minWidth: { xs: '18px', sm: '20px' }
                }}>
                  ✈️
                </Box>
                <Typography sx={{ 
                  fontSize: { xs: '0.8rem', sm: '0.95rem' },
                  fontWeight: 500,
                  color: 'text.primary',
                  lineHeight: 1.3
                }}>
                  Your own personal travel agent
                </Typography>
              </Box>
            </Stack>
          </Box>
          <Box
            component="form"
            onSubmit={handleSubmit}
            noValidate
            sx={{
              display: "flex",
              flexDirection: "column",
              width: "100%",
              gap: { xs: 1.5, sm: 2 },
            }}>
            <FormControl required sx={{ textAlign: "left" }}>
              <FormLabel
                htmlFor="email"
                sx={{ fontSize: { xs: "0.8rem", sm: "1.1rem" } }}>
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
                  "& input": { 
                    fontSize: { xs: "0.9rem", sm: "1.1rem" }, 
                    py: { xs: 1, sm: 1.5 }
                  },
                  "& input::placeholder": { fontSize: { xs: "0.9rem", sm: "1rem" } },
                }}
              />
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
                  "& input": { 
                    fontSize: { xs: "0.9rem", sm: "1.1rem" }, 
                    py: { xs: 1, sm: 1.5 }
                  },
                  "& input::placeholder": { fontSize: { xs: "0.9rem", sm: "1rem" } },
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
                fontSize: { xs: "0.9rem", sm: "1.1rem" },
                py: { xs: 1.2, sm: 2 },
                mt: { xs: 0.5, sm: 1 }
              }}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </Button>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              flexWrap: 'wrap', 
              gap: { xs: 0.5, sm: 1 }
            }}>
              <Link
                component={RouterLink}
                to="/reset"
                variant="body2"
                sx={{ fontSize: { xs: "0.75rem", sm: "1rem" } }}>
                Forgot your password?
              </Link>
              <Link
                component={RouterLink}
                to="/ResendEmail"
                variant="body2"
                sx={{ fontSize: { xs: "0.75rem", sm: "1rem" } }}>
                Resend email verification
              </Link>
            </Box>
          </Box>
          <Divider sx={{ my: { xs: 1.5, sm: 2 } }}>or</Divider>
          <Button
            fullWidth
            variant="outlined"
            onClick={handleGoogleSignIn}
            startIcon={<GoogleIcon />}
            data-testid="google-signin-button"
            disabled={isSubmitting}
            sx={{
              fontSize: { xs: "0.9rem", sm: "1.1rem" },
              py: { xs: 1.2, sm: 2 },
            }}>
            Sign in with Google
          </Button>
          <Divider sx={{ my: { xs: 1.5, sm: 2 } }}>or</Divider>
          <Typography
            sx={{
              textAlign: "center",
              fontSize: { xs: "0.9rem", sm: "1.1rem" },
            }}>
            Don&apos;t have an account?{" "}
            <Link
              component={RouterLink}
              to="/Register"
              variant="body2"
              sx={{
                fontSize: { xs: "0.9rem", sm: "1.1rem" },
                fontWeight: 600
              }}>
              Sign up
            </Link>
          </Typography>
        </Card>
      </Stack>
    </>
  );
}
