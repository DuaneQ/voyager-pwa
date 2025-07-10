import React from "react";
import { BottomNavigation, BottomNavigationAction, Badge } from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate, useLocation } from "react-router-dom";
import { styled } from "@mui/material/styles";
import { useNewConnection } from "../../Context/NewConnectionContext";

interface BottomNavProps {
  unreadCount?: number; // or use hasUnread?: boolean
}

const BottomNav: React.FC<BottomNavProps> = ({ unreadCount = 0 }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [value, setValue] = React.useState(location.pathname);
  const { hasNewConnection } = useNewConnection();

  const StyledBottomNavigationAction = styled(BottomNavigationAction)(
    ({ theme }) => ({
      "& .MuiBottomNavigationAction-label": {
        fontSize: theme.typography.pxToRem(15),
      },
      "& .MuiSvgIcon-root": {
        fontSize: theme.typography.pxToRem(30),
      },
      paddingBottom: theme.spacing(),
    })
  );

  React.useEffect(() => {
    setValue(location.pathname);
  }, [location.pathname]);

  return (
    <BottomNavigation
      showLabels
      value={value}
      onChange={(event, newValue) => {
        setValue(newValue);
        navigate(newValue);
      }}
      sx={{ width: "100%", position: "fixed", bottom: 0, bgcolor: "background.paper", // <-- Add this line
    zIndex: 1300, }}>
      <StyledBottomNavigationAction
        label="Trips"
        value="/Search"
        icon={<SearchIcon />}
      />
      <StyledBottomNavigationAction
        label="Chat"
        value="/Chat"
        icon={
          <Badge
            color="secondary"
            variant={hasNewConnection ? "dot" : "standard"}
            badgeContent={unreadCount > 0 ? unreadCount : undefined}
            overlap="circular">
            <ChatIcon />
          </Badge>
        }
      />
      <StyledBottomNavigationAction
        label="Profile"
        value="/"
        icon={<AccountCircleIcon />}
      />
    </BottomNavigation>
  );
};

export default BottomNav;
