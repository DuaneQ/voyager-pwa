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
    <Box 
      sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundImage: 'url("./assets/images/login-image.jpeg")',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Fixed header with profile photo and tabs */}
      <Box 
        sx={{ 
          flexShrink: 0, // Prevent shrinking
          zIndex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.8)', // Add overlay for readability
          backdropFilter: 'blur(10px)'
        }}
      >
        <Box mb={2} sx={{ pt: 2 }}>
          <ProfileForm currentTab={currentTab} onTabChange={handleTabChange} />
        </Box>
      </Box>
      
      {/* Scrollable content area for tabs */}
      <Box 
        sx={{ 
          flex: 1,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Photos Tab */}
        {currentTab === 1 && (
          <Box 
            className="profile-scroll-area"
            sx={{ 
              flex: 1,
              overflow: 'auto',
              p: 2
            }}
          >
            <PhotoGrid />
          </Box>
        )}
        
        {/* Videos Tab */}
        {currentTab === 2 && (
          <Box 
            className="profile-scroll-area"
            sx={{ 
              flex: 1,
              overflow: 'auto',
              p: 2
            }}
          >
            <VideoGrid />
          </Box>
        )}
      </Box>
    </Box>
  );
});
