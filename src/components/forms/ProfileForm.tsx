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
    p: { xs: 1, sm: 2 }, // Much smaller padding on mobile
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
        mb: { xs: 0.25, sm: 0.5 }, // Smaller margin on mobile
        fontWeight: 500,
        fontSize: { xs: '0.65rem', sm: '0.75rem' } // Smaller text on mobile
      }}>
      {label}{required && ' *'}
    </Typography>
    <Typography
      variant="body1"
      sx={{
        color: 'white',
        fontWeight: 400,
        fontSize: { xs: '0.75rem', sm: '0.875rem' } // Smaller text on mobile
      }}>
      {value || 'Not specified'}
    </Typography>
  </Box>
);

export const ProfileForm = ({ 
  currentTab, 
  onTabChange, 
  headerOnly = false, 
  contentOnly = false 
}: { 
  currentTab?: number; 
  onTabChange?: (newTab: number) => void;
  headerOnly?: boolean;
  contentOnly?: boolean;
}) => {
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
      {/* Header Section: ProfilePhoto + Username + Tabs */}
      {(headerOnly || (!headerOnly && !contentOnly)) && (
        <Box sx={{
          maxWidth: '300px',
          margin: '0 auto',
          p: { xs: 0.5, sm: 2 } // Reduced padding on mobile
        }}>
          <Box 
            display="flex" 
            justifyContent="center"
            alignItems="center"
            sx={{
              px: { xs: 1, sm: 0 },
              gap: { xs: 0.5, sm: 2 }, // Reduced gap on mobile
              flexDirection: { xs: "column", sm: "row" },
              mt: { xs: 1, sm: 5 }  // Much smaller top margin on mobile
            }}>
            <Box sx={{ 
              width: { xs: '80px', sm: '140px' }, // Much smaller on mobile
              height: { xs: '80px', sm: '140px' } // Much smaller on mobile
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
                    fontSize: { xs: "1.1rem", sm: "2rem" }, // Much smaller on mobile
                    textAlign: { xs: "center", sm: "left" }
                  }}>
                  {userProfile?.username || ""}
                </Typography>
                <IconButton
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                  aria-label="more options"
                  sx={{ 
                    color: 'white',
                    ml: 1,
                    p: { xs: 0.5, sm: 1 } // Smaller padding on mobile
                  }}>
                  <MoreVertIcon sx={{ fontSize: { xs: '1.2rem', sm: '1.5rem' } }} />
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

          {/* Tabs below username */}
          {onTabChange && (
            <Box sx={{ 
              borderBottom: 1, 
              borderColor: 'divider', 
              mt: { xs: 1, sm: 2 }, // Smaller margin on mobile
              mb: { xs: 1, sm: 2 }  // Smaller margin on mobile
            }}>
              <Tabs 
                value={currentTab || 0} 
                onChange={handleTabChange} 
                centered
                sx={{
                  '& .MuiTab-root': {
                    color: 'white',
                    fontSize: { xs: '0.8rem', sm: '1rem' }, // Smaller font on mobile
                    minHeight: { xs: '36px', sm: '48px' }, // Smaller height on mobile
                    padding: { xs: '6px 8px', sm: '12px 16px' }, // Smaller padding on mobile
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
        </Box>
      )}

      {/* Content Section: Profile Details Card */}
      {(contentOnly || (!headerOnly && !contentOnly)) && (
        <Box sx={{
          maxWidth: '300px',
          margin: '0 auto',
          p: { xs: 0.5, sm: 2 } // Much smaller padding on mobile
        }}>
          {/* Profile content - only show when Profile tab is active or no tabs */}
          {(!onTabChange || currentTab === 0) && (
          <Card
          elevation={0}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: { xs: 1, sm: 2 }, // Smaller gap on mobile
            p: { xs: 1.5, sm: 3 }, // Much smaller padding on mobile
            maxWidth: '100%',
            margin: { xs: "8px auto", sm: "20px auto" }, // Smaller margin on mobile
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
                mb: { xs: 0.25, sm: 0.5 }, // Smaller margin on mobile
                fontWeight: 500,
                fontSize: { xs: '0.65rem', sm: '0.75rem' } // Smaller text on mobile
              }}>
              Bio
            </Typography>
            <Typography
              variant="body1"
              sx={{
                whiteSpace: 'pre-wrap',
                color: 'white',
                fontWeight: 400,
                fontSize: { xs: '0.75rem', sm: '0.875rem' } // Smaller text on mobile
              }}>
              {userProfile?.bio || "No bio provided"}
            </Typography>
          </Box>
          <Grid container spacing={{ xs: 1, sm: 2 }}> {/* Smaller spacing on mobile */}
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
      )}
      
      <EditProfileModal show={showLogin} close={() => setShowLogin(false)} />
    </>
  );
};