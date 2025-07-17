import { ProfileForm } from "../forms/ProfileForm";
import { ProfileHeader } from "../forms/ProfileHeader";
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
    <Box 
      sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      <Stack className="authFormContainer">
        {/* Fixed header with profile photo and username */}
        <Box 
          sx={{ 
            flexShrink: 0,  // Prevent this from shrinking
            zIndex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <ProfileHeader />
        </Box>

        {/* Scrollable content area */}
        <Box 
          sx={{ 
            flex: 1, 
            overflow: 'auto', 
            height: '100%' 
          }}
        >
          {/* Profile Tab Content (includes tabs and profile details) */}
          {currentTab === 0 && (
            <ProfileForm currentTab={currentTab} onTabChange={handleTabChange} />
          )}
          
          {/* Photos Tab */}
          {currentTab === 1 && (
            <Box>
              <ProfileForm currentTab={currentTab} onTabChange={handleTabChange} />
              <Box sx={{ mt: -2 }}>
                <PhotoGrid />
              </Box>
            </Box>
          )}
          
          {/* Videos Tab */}
          {currentTab === 2 && (
            <Box>
              <ProfileForm currentTab={currentTab} onTabChange={handleTabChange} />
              <Box sx={{ mt: -2 }}>
                <VideoGrid />
              </Box>
            </Box>
          )}
        </Box>
        
        <Box mt={-10} mb={10}>
          {/* <Chips /> */}
        </Box>
      </Stack>
    </Box>
  );
});
