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
      className="authFormContainer"
      sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Fixed Header: ProfilePhoto + Username + Tabs */}
      <Box sx={{ 
        flexShrink: 0,
        backgroundColor: 'inherit'
      }}>
        <ProfileForm 
          currentTab={currentTab} 
          onTabChange={handleTabChange}
          headerOnly={true}
        />
      </Box>
      
      {/* Scrollable Content Area */}
      <Box sx={{ 
        flex: 1,
        overflow: 'auto',
        px: { xs: 1, sm: 2 }
      }}>
        {/* Profile Tab Content */}
        {currentTab === 0 && (
          <Box>
            <ProfileForm 
              currentTab={currentTab} 
              onTabChange={handleTabChange}
              contentOnly={true}
            />
          </Box>
        )}
        
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
      </Box>
    </Box>
  );
});
