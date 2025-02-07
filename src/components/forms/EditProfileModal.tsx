import {
  Box,
  Button,
  Card,
  FormControl,
  MenuItem,
  Modal,
  TextField,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import {
  EDUCATION_OPTIONS,
  FREQUENCY,
  GENDER_OPTIONS,
  SEXUAL_ORIENTATION_OPTIONS,
} from "../shared-strings/constants";
import usePostUserProfileToDb from "../../hooks/usePostUserProfileToDb";
import useGetUserProfile from "../../hooks/useGetUserProfile";
import usePostUserProfileToStorage from "../../hooks/usePostUserProfileToStorage";

export const EditProfileModal = (props: any) => {
  const { userRef, setUserDbData } = usePostUserProfileToDb();
  const { userStorageData, setUserStorageData } = usePostUserProfileToStorage();
  const { userProfile, setUserProfile } = useGetUserProfile();

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

  useEffect(() => {
    if (userProfile) {
      setProfile(userProfile);
    }
  }, [userProfile, setUserProfile]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: 400,
    bgcolor: "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    p: 4,
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      setUserStorageData(profile);
      setUserDbData(profile);
      props.close();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal open={props.show} onClose={props.close}>
        <Box sx={style}>
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
            <form
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
              onSubmit={handleSubmit}
              noValidate>
              <FormControl>
                <TextField
                  id="bio"
                  label="User Bio"
                  multiline
                  autoFocus
                  rows={4}
                  value={profile?.bio || ""}
                  name="bio"
                  onChange={(e) =>
                    setProfile({ ...profile, bio: e.target.value })
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
                  value={profile?.dob || ""}
                  onChange={(e) =>
                    setProfile({ ...profile, dob: e.target.value })
                  }
                />
              </FormControl>
              <FormControl>
                <TextField
                  id="gender"
                  value={profile?.gender || ""}
                  select
                  required
                  fullWidth
                  name="gender"
                  label="Gender"
                  onChange={(e) =>
                    setProfile({
                      ...profile,
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
                  value={profile?.sexo}
                  required
                  select
                  fullWidth
                  name="sexo"
                  label="Sexual Orientation"
                  onChange={(e) =>
                    setProfile({ ...profile, sexo: e.target.value })
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
                  value={profile?.edu}
                  select
                  required
                  label="Education"
                  name="edu"
                  onChange={(e) =>
                    setProfile({ ...profile, edu: e.target.value })
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
                  value={profile?.drinking}
                  label="Drinking"
                  name="drinking"
                  onChange={(e) =>
                    setProfile({
                      ...profile,
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
                  value={profile?.smoking}
                  label="Smoking"
                  name="smoking"
                  onChange={(e) =>
                    setProfile({
                      ...profile,
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
    </>
  );
};
