import React, { useEffect } from "react";
import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SearchIcon from "@mui/icons-material/Search";
import { useLocation, useNavigate } from "react-router-dom";
import { styled } from "@mui/material/styles";

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const [value, setValue] = React.useState(0);

  
  const StyledBottomNavigationAction = styled(BottomNavigationAction)(
    ({ theme }) => ({
      "& .MuiBottomNavigationAction-label": {
        fontSize: theme.typography.pxToRem(20),
      },
      "& .MuiSvgIcon-root": {
        fontSize: theme.typography.pxToRem(50),
      },
      "& .MuiBottomNavigationAction-root": {
        maxWidth: "none",
        flexGrow: 1,
    },
      paddingBottom: theme.spacing(5),
    })
  );

  return (
    <BottomNavigation
      showLabels
      value={value}
      onChange={(event, newValue) => {
        setValue(newValue);
      }}
      sx={{ width: "100%", position: "fixed", bottom: 0 }}
    >
      <StyledBottomNavigationAction
        label="Chat"
        value="Chat"
        onClick={() => navigate("/Chat")}
        icon={<ChatIcon />}
      />
      <StyledBottomNavigationAction
        label="Profile"
        value="Profile"
        onClick={() => navigate("/Profile")}
        icon={<AccountCircleIcon />}
      />
      <StyledBottomNavigationAction
        label="Search"
        value="Search"
        onClick={() => navigate("/Search")}
        icon={<SearchIcon />}
      />
    </BottomNavigation>
  );
};

export default BottomNav;
