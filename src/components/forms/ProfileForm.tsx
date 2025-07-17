/**
 * Form component for displaying user profile information.
 *
 * @component
 * @returns {JSX.Element}
 */

import { useContext, useState } from "react";
import {
  Box,
  Card,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Grid,
  Tabs,
  Tab,
} from "@mui/material";
import { signOut } from "firebase/auth";
import { auth } from "../../environments/firebaseConfig";
import { EditProfileModal } from "./EditProfileModal";
import useGetUserProfile from "../../hooks/useGetUserProfile";
import { UserProfileContext } from "../../Context/UserProfileContext";
import { ProfilePhoto } from "./ProfilePhoto";
import { calculateAge } from "../utilities/DateChecker";
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LogoutIcon from '@mui/icons-material/Logout';
import EditIcon from '@mui/icons-material/Edit';

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
  const [showLogin, setShowLogin] = useState(false);
  const { userProfile } = useContext(UserProfileContext);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.clear();
    window.location.href = "/login";
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    if (onTabChange) {
      onTabChange(newValue);
    }
  };

  return (
    <>
      {/* Fixed Header Section - ProfilePhoto and Username */}
      <Box 
        className="profile-header-section"
        sx={{
          maxWidth: '300px',
          margin: '0 auto',
          p: { xs: 1, sm: 2 }
        }}
      >
        <Box 
          display="flex" 
          justifyContent="center"
          alignItems="center"
          sx={{
            px: { xs: 2, sm: 0 },
            gap: { xs: 1, sm: 2 },
            flexDirection: { xs: "column", sm: "row" },
            mt: { xs: 4, sm: 5 }  // Add margin top for spacing from header
          }}>
          <Box sx={{ 
            width: { xs: '120px', sm: '140px' },
            height: { xs: '120px', sm: '140px' }
          }}>
            <ProfilePhoto />
          </Box>
          <Box sx={{ 
            flexDirection: "column",
            alignItems: { xs: "center", sm: "flex-start" },
            display: "flex",
            position: "relative"
          }}>
            <Box display="flex" alignItems="center">
              <Typography
                ml={{ xs: 0, sm: 2 }}
                color="white"
                sx={{
                  fontSize: { xs: "1.5rem", sm: "2rem" },
                  textAlign: { xs: "center", sm: "left" }
                }}>
                {userProfile?.username || ""}
              </Typography>
              <IconButton
                onClick={(e) => setMenuAnchor(e.currentTarget)}
                aria-label="more options"
                sx={{ 
                  color: 'white',
                  ml: 1
                }}>
                <MoreVertIcon />
              </IconButton>
            </Box>
            <Menu
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}>
              <MenuItem onClick={() => {
                setShowLogin(true);
                handleMenuClose();
              }}>
                <ListItemIcon>
                  <EditIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Edit Profile</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <LogoutIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Logout</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Box>
      </Box>

      {/* Scrollable Content Section */}
      <Box sx={{
        maxWidth: '300px',
        margin: '0 auto',
        p: { xs: 1, sm: 2 }
      }}>
        {/* Tabs below username */}
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
      <EditProfileModal show={showLogin} close={() => setShowLogin(false)} />
    </>
  );
};