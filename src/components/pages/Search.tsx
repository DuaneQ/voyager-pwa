import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import React from "react";
import { useNavigate } from "react-router-dom";
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import ChatIcon from '@mui/icons-material/Chat';

export const Search = () => {
  const navigate = useNavigate();

  return (
    <div>
      <p>Search</p>
    </div>
  );
};
