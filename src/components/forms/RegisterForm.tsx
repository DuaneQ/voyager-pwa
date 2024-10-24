import React, { useContext } from "react";
import { DevTool } from "@hookform/devtools";
import { useForm } from "react-hook-form";
import {
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
import {
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  TextField,
} from "@mui/material";
import { Link } from "react-router-dom";
import { isUserOver18 } from "../utilities/DateChecker";
import { AlertContext } from "../../Context/AlertContext";
import styles from './LoginForm.module.css'; // Adjust the path as necessary

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

  const onSubmit = (data: FormValues) => {
    if (data.password !== data.confirmPassword) {
      showAlert("Error", "Passwords do not match.");
      return;
    } else if (!isUserOver18(data.dob)) {
      console.log("Submitted", data.dob);
      showAlert("Error", "Users must be 18 or older.");
    } else if (formState.isValid) {
      console.log("Submitted", data);
    }
  };

  const form = useForm<FormValues>();
  const { register, control, handleSubmit, formState, setValue } = form;
  const { errors } = formState;

  return (
    <div className={styles.loginFormContainer}>
      <form
        className="registerForm"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <Card>
          <CardContent>
            <Box>
              <TextField
                type="text"
                label="*Username"
                id="username"
                data-testid="username"
                style={{ width: 400 }}
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
              <p className="error" data-testid="emailErr">
                {errors.username?.message}
              </p>
            </Box>
            <Box>
              <TextField
                type="email"
                label="*Email"
                id="email"
                data-testid="email"
                style={{ width: 400 }}
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
              <TextField
                type="password"
                label="*Password"
                id="password"
                data-testid="password"
                style={{ width: 400 }}
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
              <p className="error">{errors.password?.message}</p>
            </Box>
            <Box>
              <TextField
                label="*Confirm Password"
                id="confirmPassword"
                data-testid="confirm"
                style={{ width: 400 }}
                placeholder={PASSWORD_PLACEHOLDER}
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
          </CardContent>
        </Card>
        <Box mt={2}>
          <TextField
            id="userBio"
            label="User Bio"
            data-testid="userBio"
            multiline
            rows={4}
            style={{ width: 400 }}
            placeholder="Tell us about yourself"
            {...register("userBio", {
              maxLength: {
                value: 200,
                message: "Bio should not exceed 200 characters",
              },
            })}
            sx={{
                backgroundColor: 'white',
              }}
          />
          <p className="error">{errors.userBio?.message}</p>
        </Box>

        <Card>
          <CardContent>
            <Box>
              <TextField
                InputLabelProps={{ shrink: true }}
                label="*Date of birth"
                type="date"
                id="dob"
                data-testid="dob"
                style={{ width: 400 }}
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
                style={{ width: 400 }}
                {...register("gender", {
                  required: {
                    value: true,
                    message: "Gender is required",
                  },
                })}
              >
                {GENDER_OPTIONS.map((option) => (
                  <MenuItem value={option}>{option}</MenuItem>
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
                style={{ width: 400 }}
                {...register("education", {
                  required: {
                    value: true,
                    message: "Education level is required",
                  },
                })}
              >
                {EDUCATION_OPTIONS.map((option) => (
                  <MenuItem key={option} value={option}>
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
                style={{ width: 400 }}
                {...register("drinkingHabits", {
                  required: {
                    value: true,
                    message: "Required",
                  },
                })}
              >
                {FREQUENCY.map((option) => (
                  <MenuItem value={option}>{option}</MenuItem>
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
                style={{ width: 400 }}
                {...register("smokingHabits", {
                  required: {
                    value: true,
                    message: "Required",
                  },
                  onChange: (e) => setValue("smokingHabits", e.target.value),
                })}
              >
                {FREQUENCY.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
              <p className="error">{errors.smokingHabits?.message}</p>
            </Box>
          </CardContent>
        </Card>
        <div>
          <p style={{ color: 'white' }}>
            Already have an account? <Link to="/">Sign in</Link>
          </p>
        </div>
        <Button type="submit" data-testid="register-button" variant="contained">
          Register
        </Button>
      </form>
    </div>
  );
};
