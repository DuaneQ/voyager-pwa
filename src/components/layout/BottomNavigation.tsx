import React from "react";
import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate, useLocation } from "react-router-dom";
import { styled } from "@mui/material/styles";

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Get the current route
  const [value, setValue] = React.useState(location.pathname); // Initialize with the current route

  const StyledBottomNavigationAction = styled(BottomNavigationAction)(
    ({ theme }) => ({
      "& .MuiBottomNavigationAction-label": {
        fontSize: theme.typography.pxToRem(15),
      },
      "& .MuiSvgIcon-root": {
        fontSize: theme.typography.pxToRem(30),
      },
      paddingBottom: theme.spacing(0),
    })
  );

  React.useEffect(() => {
    // Update the value when the route changes
    setValue(location.pathname);
  }, [location.pathname]);

  return (
    <BottomNavigation
      showLabels
      value={value}
      onChange={(event, newValue) => {
        setValue(newValue);
        navigate(newValue); // Navigate to the selected route
      }}
      sx={{ width: "100%", position: "fixed", bottom: 0 }}>
      <StyledBottomNavigationAction
        label="Chat"
        value="/Chat"
        icon={<ChatIcon />}
      />
      <StyledBottomNavigationAction
        label="Profile"
        value="/"
        icon={<AccountCircleIcon />}
      />
      <StyledBottomNavigationAction
        label="Search"
        value="/Search"
        icon={<SearchIcon />}
      />
    </BottomNavigation>
  );
};

export default BottomNav;
