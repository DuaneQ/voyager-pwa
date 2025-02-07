import { useContext, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Box,
  Button,
  Card,
  FormControl,
  TextField,
  Typography,
} from "@mui/material";
import { isUserOver18 } from "../utilities/DateChecker";
import { AlertContext } from "../../Context/AlertContext";
import profilePlaceholder from "../../assets/images/imagePH.png";
import { signOut } from "firebase/auth";
import { auth } from "../../environments/environment";
import { EditProfileModal } from "./EditProfileModal";
import useGetUserProfile from "../../hooks/useGetUserProfile";
import { useUserProfile } from "../../Context/UserProfileContext";

export const ProfileForm = () => {
  const [profile, setProfile] = useState({
    username: "",
    bio: "",
    gender: "",
    sexo: "",
    edu: "",
    drinking: "",
    smoking: "",
    dob: "",
  });
  const [showLogin, setShowLogin] = useState(false);
  const { userProfile, setUserProfile } = useGetUserProfile();
  const { userProfileContext, setUserProfileContext } = useUserProfile()

  useEffect(() => {
    if (userProfile) {
      setProfile(userProfile);
    }
  }, [userProfile, setUserProfile]);

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
  const { handleSubmit, formState, setValue } = form;

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
          <Box sx={{ flexDirection: "column" }}>
            <Typography
              ml={2}
              fontSize={{ base: "sm", md: "lg" }}
              color="white"
              sx={{ fontSize: "2rem" }}>
              {profile?.username || ""}
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={() => setShowLogin(true)}
              sx={{ marginTop: 2, background: "white", color: "black" }}>
              Edit Profile
            </Button>
          </Box>
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
              value={profile?.bio || ""}
              name="bio"
              placeholder="Tell us about yourself"
              InputProps={{
                readOnly: true,
              }}
            />
          </FormControl>
          <FormControl required>
            <TextField
              label="*Date of birth"
              type="date"
              id="dob"
              name="dob"
              value={
                profile?.dob
                  ? new Date(profile?.dob).toISOString().split("T")[0]
                  : new Date().toISOString().split("T")[0]
              }
              InputProps={{
                readOnly: true,
              }}
            />
          </FormControl>
          <FormControl>
            <TextField
              id="gender"
              value={profile?.gender || ""}
              required
              fullWidth
              name="gender"
              label="Gender"
              InputProps={{
                readOnly: true,
              }}></TextField>
          </FormControl>
          <FormControl>
            <TextField
              id="sexo"
              value={profile?.sexo || ""}
              required
              fullWidth
              name="sexo"
              label="Sexual Orientation"
              InputProps={{
                readOnly: true,
              }}></TextField>
          </FormControl>
          <FormControl>
            <TextField
              id="edu"
              value={profile?.edu || ""}
              required
              label="Education"
              name="edu"
              InputProps={{
                readOnly: true,
              }}></TextField>
          </FormControl>
          <FormControl>
            <TextField
              id="drinking"
              required
              value={profile?.drinking || ""}
              label="Drinking"
              name="drinking"
              InputProps={{
                readOnly: true,
              }}></TextField>
          </FormControl>
          <FormControl>
            <TextField
              id="smoking"
              required
              value={profile?.smoking || ""}
              label="Smoking"
              name="smoking"
              InputProps={{
                readOnly: true,
              }}></TextField>
          </FormControl>
        </Card>
      </form>
      <EditProfileModal show={showLogin} close={() => setShowLogin(false)} />
    </>
  );
};
