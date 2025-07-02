import { ProfileForm } from "../forms/ProfileForm";
import Stack from "@mui/material/Stack";
import { PhotoGrid } from "../forms/PhotoGrid";
import Box from "@mui/material/Box";
import React from "react";
import { useFCMToken } from "../../hooks/useFCMToken";
import { FCMTestComponent } from "../../debug/FCMTestComponent";

export const Profile = React.memo(() => {
  // Use the FCM token hook to handle notifications
  useFCMToken();

  return (
    <>
      <Stack className="authFormContainer">
         <FCMTestComponent />
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
    </>
  );
});
