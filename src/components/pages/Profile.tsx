import { ProfileForm } from "../forms/ProfileForm";
import Stack from "@mui/material/Stack";
import { PhotoGrid } from "../forms/PhotoGrid";
import { VideoGrid } from "../forms/VideoGrid";
import Box from "@mui/material/Box";
import React, { useState } from "react";
import { useFCMToken } from "../../hooks/useFCMToken";

export const Profile = React.memo(() => {
  // Use the FCM token hook to handle notifications
  useFCMToken();
  
  const [currentTab, setCurrentTab] = useState(0);

  const handleTabChange = (newTab: number) => {
    setCurrentTab(newTab);
  };

  return (
    <Stack className="authFormContainer">
      <Box mb={2}>
        <ProfileForm currentTab={currentTab} onTabChange={handleTabChange} />
      </Box>
      
      {/* Photos Tab */}
      {currentTab === 1 && (
        <Box>
          <PhotoGrid />
        </Box>
      )}
      
      {/* Videos Tab */}
      {currentTab === 2 && (
        <Box>
          <VideoGrid />
        </Box>
      )}
      
      <Box mt={-10} mb={10}>
        {/* <Chips /> */}
      </Box>
    </Stack>
  );
});
