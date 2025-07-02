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
  STATUS_OPTIONS,
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

  const [formData, setFormData] = useState({
    bio: userProfile?.bio || "",
    dob: userProfile?.dob || "",
    gender: userProfile?.gender || "",
    sexo: userProfile?.sexo || "",
    edu: userProfile?.edu || "",
    drinking: userProfile?.drinking || "",
    smoking: userProfile?.smoking || "",
    status: userProfile?.status || "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    updateUserProfile({ ...userProfile, [name]: value });
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
                value={formData.bio}
                name="bio"
                onChange={handleChange}
                placeholder="Tell us about yourself"
              />
            </FormControl>
            <FormControl required>
              <TextField
                label="*Date of birth"
                type="date"
                id="dob"
                name="dob"
                value={formData.dob}
                placeholder="YYYY-MM-DD"
                InputLabelProps={{
                  shrink: true,
                }}
                onChange={handleChange}
              />
            </FormControl>
            <FormControl>
              <TextField
                id="gender"
                value={formData.gender}
                select
                required
                fullWidth
                name="gender"
                label="Gender"
                onChange={handleChange}>
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
                value={formData.sexo}
                required
                select
                fullWidth
                name="sexo"
                label="Sexual Orientation"
                onChange={handleChange}>
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
                value={formData.edu}
                select
                required
                label="Education"
                name="edu"
                onChange={handleChange}>
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
                value={formData.drinking}
                label="Drinking"
                name="drinking"
                onChange={handleChange}>
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
                value={formData.smoking}
                label="Smoking"
                name="smoking"
                onChange={handleChange}>
                {FREQUENCY.map((option, index) => (
                  <MenuItem key={index} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
            </FormControl>
            <FormControl>
              <TextField
                id="status"
                value={formData.status}
                select
                required
                fullWidth
                name="status"
                label="Status"
                onChange={handleChange}>
                {STATUS_OPTIONS.map((option, index) => (
                  <MenuItem key={index} value={option.toLowerCase()}>
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
