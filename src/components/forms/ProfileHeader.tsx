/**
 * Profile header component with photo and username - stays fixed while content scrolls
 */

import { useContext, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { signOut } from "firebase/auth";
import { auth } from "../../environments/firebaseConfig";
import { EditProfileModal } from "./EditProfileModal";
import useGetUserProfile from "../../hooks/useGetUserProfile";
import { UserProfileContext } from "../../Context/UserProfileContext";
import { ProfilePhoto } from "./ProfilePhoto";
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LogoutIcon from '@mui/icons-material/Logout';
import EditIcon from '@mui/icons-material/Edit';

export const ProfileHeader = () => {
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

  return (
    <>
      {/* Error container outside constrained layout */}
      <Box sx={{
        position: 'fixed',
        top: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '400px',
        zIndex: 9999,
        pointerEvents: 'none'
      }}>
        <ProfilePhoto errorOnly />
      </Box>
      
      <Box sx={{
        maxWidth: '300px',
        margin: '0 auto',
        p: { xs: 1, sm: 2 }
      }}>
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
            <ProfilePhoto hideError />
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
      <EditProfileModal show={showLogin} close={() => setShowLogin(false)} />
    </>
  );
};
