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

  // Prevent body scroll when this component is mounted
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <Box 
      sx={{ 
        backgroundImage: 'url(../assets/images/login-image.jpeg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        height: '100vh', 
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
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
        px: { xs: 1, sm: 2 },
        position: 'relative',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(255,255,255,0.1)',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(255,255,255,0.3)',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: 'rgba(255,255,255,0.5)',
        }
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
