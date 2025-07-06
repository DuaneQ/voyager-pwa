import * as React from "react";
import { Button } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "../../environments/firebaseConfig";
import { useContext, useEffect } from "react";
import { AlertContext } from "../../Context/AlertContext";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CssBaseline from "@mui/material/CssBaseline";
import Link from "@mui/material/Link";

// Debug: log what the component sees for sendEmailVerification
// eslint-disable-next-line no-console
console.log('sendEmailVerification in component:', sendEmailVerification);

export const ResendEmail = () => {
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

  const resendEmailVerification = () => {
    if (auth.currentUser) {
      sendEmailVerification(auth.currentUser)
        .then(() => {
          showAlert("Success", "Verification email sent.");
        })
        .catch((error) => {
          showAlert("Error", error.message);
        });
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
            maxWidth: "450px",
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
            Resend Email Verification
          </Typography>
          
          <Button
            fullWidth
            onClick={resendEmailVerification}
            variant="contained"
            sx={{
              fontSize: { xs: "0.9rem", sm: "1.1rem" },
              py: { xs: 1.2, sm: 2 },
              mt: { xs: 0.5, sm: 1 }
            }}>
            Resend email verification link
          </Button>
          
          <Typography 
            sx={{ 
              textAlign: "center",
              fontSize: { xs: "0.9rem", sm: "1.1rem" },
              mt: { xs: 1, sm: 2 }
            }}>
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
};
