import React, { useContext, useState } from "react";
import { useForm } from "react-hook-form";
import {
  CONFIRM_PASSWORD_PLACEHOLDER,
  EDUCATION_OPTIONS,
  EMAIL_INVALID,
  EMAIL_PLACEHOLDER,
  EMAIL_REQUIRED,
  FREQUENCY,
  GENDER_OPTIONS,
  PASSWORD_PLACEHOLDER,
  PASSWORD_REQUIRED,
  PASSWORD_VALIDATION,
  USERNAME_INVALID,
  USERNAME_PLACEHOLDER,
  USERNAME_REQUIRED,
} from "../shared-strings/constants";
import { Box, Button, Input, MenuItem, TextField } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { isUserOver18 } from "../utilities/DateChecker";
import { AlertContext } from "../../Context/AlertContext";
import { auth } from "../../environments/environment";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { DevTool } from "@hookform/devtools";

export const RegisterForm = () => {
  type FormValues = {
    email: string;
    password: string;
    username: string;
    userBio: string;
    dob: Date;
    gender: string;
    education: string;
    drinkingHabits: string;
    smokingHabits: string;
    confirmPassword: string;
  };
  
  const { showAlert } = useContext(AlertContext);
  const [smoking, setSmoking] = useState("");
  const [drinking, setDrinking] = useState("");
  const [edu, setEdu] = useState("");
  const [gender, setGender] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { register, handleSubmit, formState, control } = useForm<FormValues>();
  const { errors } = formState;

  const onSubmit = async (data: FormValues) => {
    console.log("onSubmit called: ", data);
    setIsSubmitting(true);
    try {
      if (data.password !== data.confirmPassword) {
        showAlert("Error", "Passwords do not match.");
        return;
      } else if (!isUserOver18(data.dob)) {
        console.log("Submitted", data.dob);
        showAlert("Error", "Users must be 18 or older.");
        return
      } else {
        console.log("Submitted", data);
        await createUserWithEmailAndPassword(auth, data.email, data.password)
        .then((userCredential) => {
            // Signed in
            const user = userCredential.user;
                       //console.log(user);
            navigate("/Login");
            // ...
        })
        .catch((error) => {
            const errorMessage = error.message;
            showAlert("Error", errorMessage);
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="authFormContainer">
      <form
        className="registerForm"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        data-testid="reg-form">
        <Box>
          <Input
            type="text"
            id="username"
            data-testid="username"
            sx={{ width: "100%", maxWidth: 300, mx: "auto" }}
            placeholder={USERNAME_PLACEHOLDER}
            {...register("username", {
              required: {
                value: true,
                message: USERNAME_REQUIRED,
              },
              minLength: {
                value: 4,
                message: USERNAME_INVALID,
              },
            })}
          />
          <p className="error" data-testid="usernameErr">
            {errors.username?.message}
          </p>
        </Box>
        <Box>
          <Input
            type="email"
            id="email"
            data-testid="email"
            sx={{ width: "100%", maxWidth: 300, mx: "auto" }}
            placeholder={EMAIL_PLACEHOLDER}
            {...register("email", {
              pattern: {
                value:
                  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/,
                message: EMAIL_INVALID,
              },
              required: {
                value: true,
                message: EMAIL_REQUIRED,
              },
            })}
          />
            <p className="error" data-testid="emailErr">
              {errors.email?.message}
            </p>
        </Box>
        <Box>
          <Input
            type="password"
            id="password"
            data-testid="password"
            sx={{ width: "100%", maxWidth: 300, mx: "auto" }}
            placeholder={PASSWORD_PLACEHOLDER}
            {...register("password", {
              required: {
                value: true,
                message: PASSWORD_REQUIRED,
              },
              minLength: {
                value: 10,
                message: PASSWORD_VALIDATION,
              },
            })}
          />
          <p className="error" data-testid="passwordErr">{errors.password?.message}</p>
        </Box>
        <Box>
          <Input
            id="confirmPassword"
            data-testid="confirm"
            sx={{ width: "100%", maxWidth: 300, mx: "auto" }}
            placeholder={CONFIRM_PASSWORD_PLACEHOLDER}
            {...register("confirmPassword", {
              required: {
                value: true,
                message: PASSWORD_REQUIRED,
              },
              minLength: {
                value: 10,
                message: PASSWORD_VALIDATION,
              },
            })}
          />
          <p className="error">{errors.password?.message}</p>
        </Box>
        <Box mt={2}>
          <TextField
            sx={{ paddingTop: 5 }}
            InputLabelProps={{ style: { color: "white" } }}
            id="userBio"
            data-testid="userBio"
            label="User Bio"
            multiline
            rows={4}
            placeholder="Tell us about yourself"
            {...register("userBio", {
              maxLength: {
                value: 200,
                message: "Bio should not exceed 200 characters",
              },
            })}
          />
          <p className="error">{errors.userBio?.message}</p>
        </Box>
        <Box>
          <TextField
            InputLabelProps={{ shrink: true }}
            label="*Date of birth"
            type="date"
            id="dob"
            data-testid="dob"
            sx={{
              width: "100%",
              maxWidth: 300,
              mx: "auto",
              backgroundColor: "white",
            }}
            {...register("dob", {
              required: {
                value: true,
                message: "Date of birth is required",
              },
            })}
          />
          <p className="error">{errors.dob?.message}</p>
        </Box>
        <Box>
          <TextField
            select
            label="*Gender"
            id="gender"
            data-testid="gender"
            value={gender}
            sx={{
              width: "100%",
              maxWidth: 300,
              mx: "auto",
              backgroundColor: "white",
            }}
            {...register("gender", {
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                setGender(e.target.value);
              },
              required: {
                value: true,
                message: "Gender is required",
              },
            })}>
            {GENDER_OPTIONS.map((option, index) => (
              <MenuItem key={index} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <p className="error">{errors.gender?.message}</p>
        </Box>
        <Box>
          <TextField
            select
            label="*Education Level"
            id="education"
            data-testid="education"
            value={edu}
            sx={{
              width: "100%",
              maxWidth: 300,
              mx: "auto",
              backgroundColor: "white",
            }}
            {...register("education", {
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                setEdu(e.target.value);
              },
              required: {
                value: true,
                message: "Education level is required",
              },
            })}>
            {EDUCATION_OPTIONS.map((option, index) => (
              <MenuItem key={index} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <p className="error">{errors.education?.message}</p>
        </Box>
        <Box>
          <TextField
            select
            label="*Drinking Frequency"
            id="drinkingHabits"
            data-testid="drinkingHabits"
            value={drinking}
            sx={{
              width: "100%",
              maxWidth: 300,
              mx: "auto",
              backgroundColor: "white",
            }}
            {...register("drinkingHabits", {
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                setDrinking(e.target.value);
              },
              required: {
                value: true,
                message: "Required",
              },
            })}>
            {FREQUENCY.map((option, index) => (
              <MenuItem key={index} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <p className="error">{errors.drinkingHabits?.message}</p>
        </Box>
        <Box>
          <TextField
            select
            label="*Smoking Frequency"
            id="smokingHabits"
            data-testid="smokingHabits"
            value={smoking}
            sx={{
              width: "100%",
              maxWidth: 300,
              mx: "auto",
              backgroundColor: "white",
            }}
            {...register("smokingHabits", {
              required: {
                value: true,
                message: "Required",
              },
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                setSmoking(e.target.value);
              },
            })}>
            {FREQUENCY.map((option, index) => (
              <MenuItem key={index} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <p className="error">{errors.smokingHabits?.message}</p>
        </Box>
        <div>
          <p style={{ color: "white" }}>
            Already have an account? <Link to="/Login">Sign in</Link>
          </p>
        </div>
        <Button 
        type="submit" 
        data-testid="register-button" 
        variant="contained"
        disabled={isSubmitting}
        >
          Register
        </Button>
      </form>
      <DevTool control={control} />
    </div>
  );
};
