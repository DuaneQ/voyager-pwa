import * as React from "react";
import { Button } from "@mui/material";
import { useForm } from "react-hook-form";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../environments/firebaseConfig";
import { AlertContext } from "../../Context/AlertContext";
import { useContext, useEffect } from "react";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CssBaseline from "@mui/material/CssBaseline";
import Link from "@mui/material/Link";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import Box from "@mui/material/Box";

export const Reset = () => {
  type FormValues = {
    email: string;
  };

  const { showAlert } = useContext(AlertContext);
  const navigate = useNavigate();
  const { register, handleSubmit, formState } = useForm<FormValues>();
  const { errors } = formState;

  // Prevent body scrolling when component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  const onSubmit = (data: FormValues) => {
    sendPasswordResetEmail(auth, data.email)
      .then(() => {
        showAlert("Info", "Check your email for the reset link.");
        navigate("/Login");
      })
      .catch((error) => {
        showAlert("Error", error.message);
      });
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
            Reset Password
          </Typography>
          
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
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
                error={!!errors.email}
                id="email"
                type="email"
                placeholder="your@email.com"
                autoComplete="email"
                autoFocus
                fullWidth
                variant="outlined"
                color={errors.email ? "error" : "primary"}
                sx={{
                  "& input": { 
                    fontSize: { xs: "0.9rem", sm: "1.1rem" }, 
                    py: { xs: 1, sm: 1.5 }
                  },
                  "& input::placeholder": { fontSize: { xs: "0.9rem", sm: "1rem" } },
                }}
                {...register("email", {
                  required: {
                    value: true,
                    message: "Email is required",
                  },
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: "Please enter a valid email",
                  },
                })}
              />
              {errors.email && (
                <Typography 
                  variant="caption" 
                  color="error"
                  sx={{ fontSize: { xs: "0.7rem", sm: "0.75rem" }, mt: 0.5 }}>
                  {errors.email.message}
                </Typography>
              )}
            </FormControl>

            <Button 
              type="submit" 
              fullWidth 
              variant="contained"
              sx={{
                fontSize: { xs: "0.9rem", sm: "1.1rem" },
                py: { xs: 1.2, sm: 2 },
                mt: { xs: 0.5, sm: 1 }
              }}>
              Send Reset Link
            </Button>
          </Box>

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
