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
} from "firebase/auth";
import { auth } from "../../environments/environment";
import { FormHelperText, InputLabel, MenuItem, Select } from "@mui/material";
import {
  EDUCATION_OPTIONS,
  FREQUENCY,
  GENDER_OPTIONS,
} from "../shared-strings/constants";
import { isUserOver18 } from "../utilities/DateChecker";
import { isValidDate } from "../utilities/DateValidation";

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
  const [genderError, setGenderError] = useState(false);
  const [eduError, setEduError] = useState(false);
  const [smokingError, setSmokingError] = useState(false);
  const [drinkingError, setDrinkingError] = useState(false);
  const [dobError, setDobError] = useState(false);
  const [formValid, setFormValid] = useState(true);
  const navigate = useNavigate();
  const { showAlert } = useContext(AlertContext);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [input, setInputs] = useState({
    username: "",
    email: "",
    password: "",
    confirm: "",
    bio: "",
    gender: "",
    edu: "",
    drinking: "",
    smoking: "",
    dob: "<string | null>(null)",
  });

  const handleChange = (e: any) => {
    setInputs((prevState) => ({
      ...prevState,
      [e.target.name]: e.target.value,
    }));
  };

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

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (input.password !== input.confirm) {
      showAlert(
        "Error",
        "The passwords you entered do not match. Please make sure both fields have the same password."
      );
    }
    if (formValid) {
      try {
        await createUserWithEmailAndPassword(auth, input.email, input.password)
          .then(async (userCredential) => {
            // Signed in
            const user = userCredential.user;
            console.log(user);
            await sendEmailVerification(userCredential.user);
            localStorage.setItem('userCredential', JSON.stringify(userCredential));
            localStorage.setItem('formData', JSON.stringify(input));

            showAlert(
              "Info",
              "A verification link has been sent to your email for verification."
            );
            // ...
          })
          .then(() => {
            navigate("/Login");
          })
          .catch((error) => {
            const errorMessage = error.message;
            showAlert("Error", errorMessage);
          });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const validateInputs = () => {
    if (!isUserOver18(new Date(input.dob)) || !isValidDate(new Date(input.dob))) {
      setDobError(true);
      setFormValid(false);
    } else if (!input.gender) {
      setGenderError(true);
      setFormValid(false);
    } else if (!input.drinking) {
      setDrinkingError(true);
      setFormValid(false);
    } else if (!input.smoking) {
      setSmokingError(true);
      setFormValid(false);
    } else if (!input.edu) {
      setEduError(true);
      setFormValid(false);
    } else {
      setDobError(false);
      setGenderError(false);
      setSmokingError(false);
      setDrinkingError(false);
      setEduError(false);
      setFormValid(true);
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
            <FormControl sx={{ textAlign: "left" }}>
              <FormLabel htmlFor="email">Username</FormLabel>
              <TextField
                error={usernameError}
                id="username"
                type="text"
                name="username"
                placeholder="Username"
                autoFocus
                value={input.username}
                required
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
              <FormLabel htmlFor="email">Email</FormLabel>
              <TextField
                error={emailError}
                id="email"
                type="email"
                name="email"
                placeholder="your@email.com"
                autoComplete="email"
                autoFocus
                value={input.email}
                required
                fullWidth
                variant="outlined"
                onChange={handleEmailChange}
                color={emailError ? "error" : "primary"}
              />
              {emailError ? (
                <FormHelperText>Please enter a valid email.</FormHelperText>
              ) : null}
            </FormControl>
            <FormControl sx={{ textAlign: "left" }}>
              <FormLabel htmlFor="password">Password</FormLabel>
              <TextField
                error={passwordError}
                name="password"
                placeholder="••••••••••"
                type="password"
                id="password"
                autoComplete="current-password"
                autoFocus
                required
                fullWidth
                value={input.password}
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
            <FormControl sx={{ textAlign: "left" }}>
              <FormLabel htmlFor="password">Confirm Password</FormLabel>
              <TextField
                error={passwordConfError}
                name="confirm"
                placeholder="••••••••••"
                type="text"
                id="confirm"
                autoFocus
                value={input.confirm}
                required
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
            <FormControl>
              <TextField
                id="bio"
                label="User Bio"
                multiline
                rows={4}
                name="bio"
                value={input.bio}
                onChange={handleChange}
                placeholder="Tell us about yourself"
              />
            </FormControl>
            <FormControl required>
              <TextField
                label="Date of birth"
                type="date"
                name="dob"
                required
                id="dob"
                error={dobError}
                value={input.dob}
                onChange={handleChange}
              />
              {dobError ? (
                <FormHelperText>Please enter a valid date. User must be 18 or older.</FormHelperText>
              ) : null}
            </FormControl>
            <FormControl required>
              <InputLabel>Gender</InputLabel>
              <Select
                id="gender"
                value={input.gender}
                autoFocus
                fullWidth
                name="gender"
                label="Gender"
                error={genderError}
                onChange={handleChange}>
                {GENDER_OPTIONS.map((option, index) => (
                  <MenuItem key={index} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
              {genderError ? <FormHelperText>Required</FormHelperText> : null}
            </FormControl>
            <FormControl required>
              <InputLabel>Education</InputLabel>
              <Select
                id="edu"
                value={input.edu}
                name="edu"
                label="Education*"
                error={eduError}
                onChange={handleChange}>
                {EDUCATION_OPTIONS.map((option, index) => (
                  <MenuItem key={index} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
              {eduError ? <FormHelperText>Required</FormHelperText> : null}
            </FormControl>
            <FormControl required>
              <InputLabel>Drinking</InputLabel>
              <Select
                id="drinking"
                value={input.drinking}
                required
                name="drinking"
                label="Drinking"
                error={drinkingError}
                onChange={handleChange}>
                {FREQUENCY.map((option, index) => (
                  <MenuItem key={index} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
              {drinkingError ? <FormHelperText>Required</FormHelperText> : null}
            </FormControl>
            <FormControl required>
              <InputLabel>Smoking</InputLabel>
              <Select
                id="smoking"
                value={input.smoking}
                name="smoking"
                label="Smoking"
                error={smokingError}
                onChange={handleChange}>
                {FREQUENCY.map((option, index) => (
                  <MenuItem key={index} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </Select>
              {smokingError ? <FormHelperText>Required</FormHelperText> : null}
            </FormControl>
            <Button
              type="submit"
              fullWidth
              disabled={isSubmitting}
              variant="contained"
              onClick={validateInputs}>
              Sign up
            </Button>
          </form>
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
