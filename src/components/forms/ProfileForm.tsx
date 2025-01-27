import { useContext, useState } from "react";
import { useForm } from "react-hook-form";
import {
  EDUCATION_OPTIONS,
  FREQUENCY,
  GENDER_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
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
} from "@mui/material";
import { isUserOver18 } from "../utilities/DateChecker";
import { AlertContext } from "../../Context/AlertContext";
import profilePlaceholder from "../../assets/images/imagePH.png";
import { signOut } from "firebase/auth";
import { auth } from "../../environments/environment";
import useGetUserProfileFromDb from "../../hooks/useGetUserProfileFromDb";

export const ProfileForm = () => {

  const {userProfile, isLoading} = useGetUserProfileFromDb("OvSlkcGCwyU1GmDTXkPoWgiHdAS2");
  console.log("userProfile", userProfile, isLoading);
  type FormValues = {
    email: string;
    password: string;
    username: string;
    userBio: string;
    dob: Date;
    gender: string;
    sexo: string;
    education: string;
    drinkingHabits: string;
    smokingHabits: string;
    confirmPassword: string;
  };

  const [inputs, setInputs] = useState({
    bio: "",
    gender: "",
    sexo: "",
    edu: "",
    drinking: "",
    smoking: "",
    dob: "<string | null>(null)",
  });

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

  return (
    <>
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
            margin: "20px auto 20px auto",
          }}>
          <FormControl>
            <TextField
              id="bio"
              label="User Bio"
              multiline
              autoFocus
              rows={4}
              value={inputs.bio}
              name="bio"
              onChange={(e) => setInputs({...inputs, bio: e.target.value})}
              placeholder="Tell us about yourself"
            />
          </FormControl>
          <FormControl required>
            <TextField
              label="*Date of birth"
              type="date"
              id="dob"
              name="dob"
              value={inputs.dob}
              onChange={(e) => setInputs({...inputs, dob: e.target.value})}
            />
          </FormControl>
          <FormControl>
            <TextField
              id="gender"
              value={inputs.gender}
              select
              required
              fullWidth
              name="gender"
              label="Gender"
              onChange={(e) => setInputs({...inputs, gender: e.target.value})}>
              {GENDER_OPTIONS.map((option, index) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </FormControl>
          <FormControl>
            <TextField
              id="sexo"
              value={inputs.sexo}
              required
              select
              fullWidth
              name="sexo"
              label="Sexual Orientation"
              onChange={(e) => setInputs({...inputs, sexo: e.target.value})}>
              {SEXUAL_ORIENTATION_OPTIONS.map((option, index) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </FormControl>
          <FormControl>
            <TextField
              id="edu"
              value={inputs.edu}
              select
              required
              label="Education"
              name="edu"
              onChange={(e) => setInputs({...inputs, edu: e.target.value})}>
              {EDUCATION_OPTIONS.map((option, index) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </FormControl>
          <FormControl>
            <TextField
              id="drinking"
              select
              required
              value={inputs.drinking}
              label="Drinking"
              name="drinking"
              onChange={(e) => setInputs({...inputs, drinking: e.target.value})}>
              {FREQUENCY.map((option, index) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </FormControl>
          <FormControl>
            <TextField
              id="smoking"
              select
              required
              value={inputs.smoking}
              label="Smoking"
              name="smoking"
              onChange={(e) => setInputs({...inputs, smoking: e.target.value})}>
              {FREQUENCY.map((option, index) => (
                <MenuItem key={index} value={option}>
                  {option}
                </MenuItem>
              ))}
            </TextField>
          </FormControl>
          <Box>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ marginBottom: 1, width: 300 }}>
            Save
          </Button>
        </Box>
        </Card>
      </form>
    </>
  );
};
