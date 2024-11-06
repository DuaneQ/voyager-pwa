import React, { useContext, useState } from "react";
import { DevTool } from "@hookform/devtools";
import { useForm } from "react-hook-form";
import {
  EDUCATION_OPTIONS,
  FREQUENCY,
  GENDER_OPTIONS,
} from "../shared-strings/constants";
import { Box, Button, MenuItem, TextField } from "@mui/material";
import { isUserOver18 } from "../utilities/DateChecker";
import { AlertContext } from "../../Context/AlertContext";
import profilePlaceholder from "../../assets/images/imagePH.png";
import Chip from "@mui/material/Chip";

export const ProfileForm = () => {
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
    <div className="authFormContainer" style={{ minHeight: "140vh" }}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Box mt={0} display="flex" justifyContent="center">
          <img
            src={profilePlaceholder}
            alt="Profile Placeholder"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Box>
        <Box mt={2}>
          <TextField
            sx={{ paddingTop: 5 }}
            InputLabelProps={{ style: { color: "white" } }}
            id="userBio"
            label="User Bio"
            data-testid="userBio"
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
            value={gender}
            data-testid="gender"
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
            value={drinking}
            data-testid="drinkingHabits"
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
        <Box display="flex" flexWrap="wrap" justifyContent="center" mt={2}>
          <Box m={1}>
            <img
              src={profilePlaceholder}
              alt="Image 1"
              style={{ width: "150px", height: "150px" }}
            />
          </Box>
          <Box m={1}>
            <img
              src={profilePlaceholder}
              alt="Image 2"
              style={{ width: "150px", height: "150px" }}
            />
          </Box>
          <Box m={1}>
            <img
              src={profilePlaceholder}
              alt="Image 3"
              style={{ width: "150px", height: "150px" }}
            />
          </Box>
          <Box m={1}>
            <img
              src={profilePlaceholder}
              alt="Image 4"
              style={{ width: "150px", height: "150px" }}
            />
          </Box>
        </Box>
        <div>
          <Chip label="Basic Chip" sx={{ backgroundColor: "white" }} />
          <Chip
            label="Clickable Chip"
            onClick={() => console.log("Clicked!")}
            sx={{ backgroundColor: "white" }}
          />
          <Chip
            label="Deletable Chip"
            onDelete={() => console.log("Deleted!")}
            sx={{ backgroundColor: "white" }}
          />
        </div>
      </form>
    </div>
  );
};
