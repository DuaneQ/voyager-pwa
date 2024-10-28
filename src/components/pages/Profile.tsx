import React from "react";
import { BottomNavigation, BottomNavigationAction } from "@mui/material";
import { useNavigate } from "react-router-dom";
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import ChatIcon from '@mui/icons-material/Chat';
import { ProfileForm } from "../forms/ProfileForm";

export const Profile = () => {
  const navigate = useNavigate();

  return (
    <div>
      <ProfileForm />
    </div>
  );
};
