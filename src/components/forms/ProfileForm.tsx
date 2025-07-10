/**
 * Form component for editing or creating a user profile.
 *
 * @component
 * @returns {JSX.Element}
 */

import { useContext, useState } from "react";
import {
  Box,
  Button,
  Card,
  FormControl,
  TextField,
  Typography,
} from "@mui/material";
import { signOut } from "firebase/auth";
import { auth } from "../../environments/firebaseConfig";
import { EditProfileModal } from "./EditProfileModal";
import useGetUserProfile from "../../hooks/useGetUserProfile";
import { UserProfileContext } from "../../Context/UserProfileContext";
import { ProfilePhoto } from "./ProfilePhoto";

export const ProfileForm = () => {
  useGetUserProfile();
  const [showLogin, setShowLogin] = useState(false);
  const { userProfile } = useContext(UserProfileContext);

  return (
    <>
      <form noValidate>
        <Box display="flex" justifyContent="flex-end" p={2}>
          <Button
            variant="contained"
            color="secondary"
            onClick={async () => {
              await signOut(auth);
              localStorage.clear();
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
          <ProfilePhoto />
          <Box sx={{ flexDirection: "column" }}>
            <Typography
              ml={2}
              fontSize={{ base: "sm", md: "lg" }}
              color="white"
              sx={{ fontSize: "2rem" }}>
              {userProfile?.username || ""}
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
              value={userProfile?.bio || ""}
              name="bio"
              placeholder="Tell us about yourself"
              variant="outlined"
              InputProps={{
                readOnly: true,
                disableUnderline: true,
                style: { pointerEvents: 'none', background: '#f5f5f5' },
              }}
              sx={{
                '& .MuiInputBase-input.Mui-disabled': {
                  WebkitTextFillColor: '#222',
                },
                '& .MuiOutlinedInput-root': {
                  background: '#f5f5f5',
                },
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
                userProfile?.dob
                  ? new Date(userProfile?.dob)
                    .toISOString()
                    .split("T")[0]
                  : new Date().toISOString().split("T")[0]
              }
              variant="outlined"
              InputProps={{
                readOnly: true,
                disableUnderline: true,
                style: { pointerEvents: 'none', background: '#f5f5f5' },
              }}
              sx={{
                '& .MuiInputBase-input.Mui-disabled': {
                  WebkitTextFillColor: '#222',
                },
                '& .MuiOutlinedInput-root': {
                  background: '#f5f5f5',
                },
              }}
            />
          </FormControl>
          <FormControl>
            <TextField
              id="status"
              value={userProfile?.status || ""}
              required
              fullWidth
              name="status"
              label="Status"
              variant="outlined"
              InputProps={{
                readOnly: true,
                disableUnderline: true,
                style: { pointerEvents: 'none', background: '#f5f5f5' },
              }}
              sx={{
                '& .MuiInputBase-input.Mui-disabled': {
                  WebkitTextFillColor: '#222',
                },
                '& .MuiOutlinedInput-root': {
                  background: '#f5f5f5',
                },
              }}
            />
          </FormControl>
          <FormControl>
            <TextField
              id="gender"
              value={userProfile?.gender || ""}
              required
              fullWidth
              name="gender"
              label="Gender"
              variant="outlined"
              InputProps={{
                readOnly: true,
                disableUnderline: true,
                style: { pointerEvents: 'none', background: '#f5f5f5' },
              }}
              sx={{
                '& .MuiInputBase-input.Mui-disabled': {
                  WebkitTextFillColor: '#222',
                },
                '& .MuiOutlinedInput-root': {
                  background: '#f5f5f5',
                },
              }}
            />
          </FormControl>
          <FormControl>
            <TextField
              id="sexo"
              value={userProfile?.sexualOrientation || ""}
              required
              fullWidth
              name="sexo"
              label="Sexual Orientation"
              variant="outlined"
              InputProps={{
                readOnly: true,
                disableUnderline: true,
                style: { pointerEvents: 'none', background: '#f5f5f5' },
              }}
              sx={{
                '& .MuiInputBase-input.Mui-disabled': {
                  WebkitTextFillColor: '#222',
                },
                '& .MuiOutlinedInput-root': {
                  background: '#f5f5f5',
                },
              }}
            />
          </FormControl>
          <FormControl>
            <TextField
              id="edu"
              value={userProfile?.edu || ""}
              required
              label="Education"
              name="edu"
              variant="outlined"
              InputProps={{
                readOnly: true,
                disableUnderline: true,
                style: { pointerEvents: 'none', background: '#f5f5f5' },
              }}
              sx={{
                '& .MuiInputBase-input.Mui-disabled': {
                  WebkitTextFillColor: '#222',
                },
                '& .MuiOutlinedInput-root': {
                  background: '#f5f5f5',
                },
              }}
            />
          </FormControl>
          <FormControl>
            <TextField
              id="drinking"
              required
              value={userProfile?.drinking || ""}
              label="Drinking"
              name="drinking"
              variant="outlined"
              InputProps={{
                readOnly: true,
                disableUnderline: true,
                style: { pointerEvents: 'none', background: '#f5f5f5' },
              }}
              sx={{
                '& .MuiInputBase-input.Mui-disabled': {
                  WebkitTextFillColor: '#222',
                },
                '& .MuiOutlinedInput-root': {
                  background: '#f5f5f5',
                },
              }}
            />
          </FormControl>
          <FormControl>
            <TextField
              id="smoking"
              required
              value={userProfile?.smoking || ""}
              label="Smoking"
              name="smoking"
              variant="outlined"
              InputProps={{
                readOnly: true,
                disableUnderline: true,
                style: { pointerEvents: 'none', background: '#f5f5f5' },
              }}
              sx={{
                '& .MuiInputBase-input.Mui-disabled': {
                  WebkitTextFillColor: '#222',
                },
                '& .MuiOutlinedInput-root': {
                  background: '#f5f5f5',
                },
              }}
            />
          </FormControl>
        </Card>
      </form>
      <EditProfileModal show={showLogin} close={() => setShowLogin(false)} />
    </>
  );
};
