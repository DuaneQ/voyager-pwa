import { ProfileForm } from "../forms/ProfileForm";
import Stack from "@mui/material/Stack";
import { PhotoGrid } from "../forms/PhotoGrid";
import Box from "@mui/material/Box";
import React from "react";
import { useFCMToken } from "../../hooks/useFCMToken";

export const Profile = React.memo(() => {
  // Use the FCM token hook to handle notifications
  useFCMToken();

  return (
    <div className="profile-scroll-area">
      <Stack className="authFormContainer">
        <Box mb={10}>
          <ProfileForm />
        </Box>
        <Box mt={-10} mb={10}>
          <PhotoGrid />
        </Box>
        <Box mt={-10} mb={10}>
          {/* <Chips /> */}
        </Box>
      </Stack>
    </div>
  );
});
