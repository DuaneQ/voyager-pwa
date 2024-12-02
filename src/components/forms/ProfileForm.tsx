import React, { useContext, useState } from "react";
import { DevTool } from "@hookform/devtools";
import { useForm } from "react-hook-form";
import {
  EDUCATION_OPTIONS,
  FREQUENCY,
  GENDER_OPTIONS,
} from "../shared-strings/constants";
import {
  Box,
  Button,
  Card,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { isUserOver18 } from "../utilities/DateChecker";
import { AlertContext } from "../../Context/AlertContext";
import profilePlaceholder from "../../assets/images/imagePH.png";
import Chip from "@mui/material/Chip";
import { signOut } from "firebase/auth";
import { auth } from "../../environments/environment";

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [smoking, setSmoking] = useState("");
  const [drinking, setDrinking] = useState("");
  const [edu, setEdu] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("<string | null>(null)");
  const [bio, setBio] = useState("");

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
        <Box display="flex" justifyContent="flex-end" p={2}>
          <Button
            variant="contained"
            color="secondary"
            onClick={async () => {
              await signOut(auth);
              window.location.href = "/login";
            }}
            sx={{
              borderRadius: "50%",
              width: 80,
              height: 80,
            }}>
            <span role="img" aria-label="logout">
              Logout
            </span>
          </Button>
        </Box>
        <Box mt={0} display="flex" justifyContent="center">
          <img
            src={profilePlaceholder}
            alt="Profile Placeholder"
            style={{ maxWidth: "100%", height: "auto" }}
          />
        </Box>

        <Card
          variant="outlined"
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            p: 2,
            maxWidth: 300,
            margin: "20px auto 0 auto",
          }}>
          <FormControl>
            <TextField
              id="userBio"
              label="User Bio"
              multiline
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself"
            />
          </FormControl>
          <FormControl required>
            <TextField
              label="*Date of birth"
              type="date"
              id="dob"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
            />
          </FormControl>
          <FormControl>
            <InputLabel id="gender-label">Gender</InputLabel>
            <Select
              labelId="gender-label"
              id="gender-select"
              value={gender}
              required
              autoFocus
              fullWidth
              name="gender-select"
              label="Gender *"
              onChange={(e) => setGender(e.target.value)}>
              {GENDER_OPTIONS.map((option, index) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl required>
            <InputLabel id="edu-label">Education</InputLabel>
            <Select
              labelId="edu-label"
              id="edu-select"
              value={edu}
              label="Education*"
              onChange={(e) => setEdu(e.target.value)}>
              {EDUCATION_OPTIONS.map((option, index) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl required>
            <InputLabel id="drinking-label">Drinking</InputLabel>
            <Select
              labelId="drinking-label"
              id="drinking-select"
              value={drinking}
              label="Drinking *"
              onChange={(e) => setDrinking(e.target.value)}>
              {FREQUENCY.map((option, index) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl required>
            <InputLabel id="smoking-label">Smoking</InputLabel>
            <Select
              labelId="smoking-label"
              id="drinking-select"
              value={smoking}
              label="Smoking *"
              onChange={(e) => setSmoking(e.target.value)}>
              {FREQUENCY.map((option, index) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Card>
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

        <Box mt={2}>
          <Button
            type="submit"
            fullWidth
            data-testid="save-button"
            variant="contained"
            sx={{ marginBottom: 10, width: 300 }}>
            Save
          </Button>
        </Box>
      </form>
    </div>
  );
};
