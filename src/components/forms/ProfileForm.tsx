/**
 * Form component for displaying user profile information.
 *
 * @component
 * @returns {JSX.Element}
 */

import { useContext } from "react";
import {
  Box,
  Card,
  Typography,
  Grid,
  Tabs,
  Tab,
} from "@mui/material";
import useGetUserProfile from "../../hooks/useGetUserProfile";
import { UserProfileContext } from "../../Context/UserProfileContext";
import { calculateAge } from "../utilities/DateChecker";

const ProfileField = ({ label, value, required }: { label: string, value: string | number | null | undefined, required?: boolean }) => (
  <Box sx={{
    p: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
    }
  }}>
    <Typography
      variant="caption"
      sx={{
        color: 'rgba(255, 255, 255, 0.6)',
        display: 'block',
        mb: 0.5,
        fontWeight: 500,
        fontSize: '0.75rem'
      }}>
      {label}{required && ' *'}
    </Typography>
    <Typography
      variant="body1"
      sx={{
        color: 'white',
        fontWeight: 400,
        fontSize: '0.875rem'
      }}>
      {value || 'Not specified'}
    </Typography>
  </Box>
);

export const ProfileForm = ({ currentTab, onTabChange }: { currentTab?: number; onTabChange?: (newTab: number) => void }) => {
  useGetUserProfile();
  const { userProfile } = useContext(UserProfileContext);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    if (onTabChange) {
      onTabChange(newValue);
    }
  };

  return (
    <Box sx={{
      maxWidth: '300px',
      margin: '0 auto',
      p: { xs: 1, sm: 2 }
    }}>
      {/* Tabs */}
      {onTabChange && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mt: 2, mb: 2 }}>
          <Tabs 
            value={currentTab || 0} 
            onChange={handleTabChange} 
            centered
            sx={{
              '& .MuiTab-root': {
                color: 'white',
                '&.Mui-selected': {
                  color: 'white'
                }
              },
              '& .MuiTabs-indicator': {
                backgroundColor: 'white'
              }
            }}
          >
            <Tab label="Profile" />
            <Tab label="Photos" />
            <Tab label="Videos" />
          </Tabs>
        </Box>
      )}

      {/* Profile content - only show when Profile tab is active or no tabs */}
      {(!onTabChange || currentTab === 0) && (
        <Card
        elevation={0}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          p: 3,
          maxWidth: '100%',
          margin: "20px auto",
          borderRadius: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
        <Box>
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.6)',
              display: 'block',
              mb: 0.5,
              fontWeight: 500,
              fontSize: '0.75rem'
            }}>
            Bio
          </Typography>
          <Typography
            variant="body1"
            sx={{
              whiteSpace: 'pre-wrap',
              color: 'white',
              fontWeight: 400,
              fontSize: '0.875rem'
            }}>
            {userProfile?.bio || "No bio provided"}
          </Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <ProfileField 
              label="Age" 
              value={userProfile?.dob ? calculateAge(userProfile.dob) : null} 
            />
          </Grid>
          <Grid item xs={6}>
            <ProfileField 
              label="Status" 
              value={userProfile?.status} 
              required
            />
          </Grid>
          <Grid item xs={6}>
            <ProfileField 
              label="Gender" 
              value={userProfile?.gender} 
              required
            />
          </Grid>
          <Grid item xs={6}>
            <ProfileField 
              label="Sexual Orientation" 
              value={userProfile?.sexualOrientation} 
              required
            />
          </Grid>
          <Grid item xs={12}>
            <ProfileField 
              label="Education" 
              value={userProfile?.edu} 
              required
            />
          </Grid>
          <Grid item xs={6}>
            <ProfileField 
              label="Drinking" 
              value={userProfile?.drinking} 
              required
            />
          </Grid>
          <Grid item xs={6}>
            <ProfileField 
              label="Smoking" 
              value={userProfile?.smoking} 
              required
            />
          </Grid>
        </Grid>
      </Card>
      )}
    </Box>
  );
};
