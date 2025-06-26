import React, { useContext, useState } from "react";
import {
  Box,
  Button,
  Card,
  FormControl,
  MenuItem,
  Modal,
  TextField,
} from "@mui/material";
import {
  EDUCATION_OPTIONS,
  FREQUENCY,
  GENDER_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
} from "../shared-strings/constants";
import usePostUserProfileToDb from "../../hooks/usePostUserProfileToDb";
import usePostUserProfileToStorage from "../../hooks/usePostUserProfileToStorage";
import { UserProfileContext } from "../../Context/UserProfileContext";
import { isUserOver18 } from "../utilities/DateChecker";
import { AlertContext } from "../../Context/AlertContext";

export const EditProfileModal = (props: any) => {
  const { setUserDbData } = usePostUserProfileToDb();
  const { setUserStorageData } = usePostUserProfileToStorage();
  const { userProfile, updateUserProfile } = useContext(UserProfileContext);
  const { showAlert } = useContext(AlertContext);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Responsive modal style
  const style = {
    position: "fixed" as const,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: { xs: "70vw", sm: 300 },
    maxWidth: "80vw",
    maxHeight: "80vh",
    bgcolor: "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    p: { xs: 1, sm: 2 },
    overflowY: "auto",
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setIsSubmitting(true);
    if (!isUserOver18(userProfile?.dob)) {
      showAlert("error", "You must be over 18 years old or older.");
      setIsSubmitting(false);
      return;
    }
    try {
      setUserStorageData(userProfile);
      setUserDbData(userProfile);
      updateUserProfile(userProfile);
      props.close();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal open={props.show} onClose={props.close}>
      <Box sx={style}>
        <Card
          variant="outlined"
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            p: 0,
            width: "100%",
            boxShadow: "none",
          }}>
          <form
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            onSubmit={handleSubmit}
            noValidate>
            <Box sx={{ textAlign: "center", mb: 2 }}>
              <h2>Edit Profile</h2>
            </Box>
            <FormControl>
              <TextField
                id="bio"
                label="User Bio"
                multiline
                autoFocus
                rows={4}
                value={userProfile?.bio || ""}
                name="bio"
                onChange={(e) =>
                  updateUserProfile({
                    ...userProfile,
                    bio: e.target.value,
                  })
                }
                placeholder="Tell us about yourself"
              />
            </FormControl>
            <FormControl required>
              <TextField
                label="*Date of birth"
                type="date"
                id="dob"
                name="dob"
                value={userProfile?.dob || ""}
                placeholder="YYYY-MM-DD"
                InputLabelProps={{
                  shrink: true,
                }}
                onChange={(e) => {
                  const newDob = e.target.value;
                  updateUserProfile({
                    ...userProfile,
                    dob: newDob,
                  });
                }}
              />
            </FormControl>
            <FormControl>
              <TextField
                id="gender"
                value={userProfile?.gender || ""}
                select
                required
                fullWidth
                name="gender"
                label="Gender"
                onChange={(e) =>
                  updateUserProfile({
                    ...userProfile,
                    gender: e.target.value,
                  })
                }>
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
                value={userProfile?.sexo}
                required
                select
                fullWidth
                name="sexo"
                label="Sexual Orientation"
                onChange={(e) =>
                  updateUserProfile({
                    ...userProfile,
                    sexo: e.target.value,
                  })
                }>
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
                value={userProfile?.edu}
                select
                required
                label="Education"
                name="edu"
                onChange={(e) =>
                  updateUserProfile({
                    ...userProfile,
                    edu: e.target.value,
                  })
                }>
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
                value={userProfile?.drinking}
                label="Drinking"
                name="drinking"
                onChange={(e) =>
                  updateUserProfile({
                    ...userProfile,
                    drinking: e.target.value,
                  })
                }>
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
                value={userProfile?.smoking}
                label="Smoking"
                name="smoking"
                onChange={(e) =>
                  updateUserProfile({
                    ...userProfile,
                    smoking: e.target.value,
                  })
                }>
                {FREQUENCY.map((option, index) => (
                  <MenuItem key={index} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </FormControl>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                gap: 2,
              }}>
              <Button
                type="button"
                fullWidth
                disabled={isSubmitting}
                variant="contained"
                onClick={props.close}>
                Cancel
              </Button>
              <Button
                type="submit"
                fullWidth
                disabled={isSubmitting}
                variant="contained">
                Save
              </Button>
            </Box>
          </form>
        </Card>
      </Box>
    </Modal>
  );
};
