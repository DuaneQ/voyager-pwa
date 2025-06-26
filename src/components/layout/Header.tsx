import React from "react";
import { AppBar, Toolbar, Typography } from "@mui/material";

const HEADER_HEIGHT = 56;

const Header: React.FC = () => {
  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        borderBottom: "2px solid black",
        backgroundColor: "white",
        color: "black",
        height: HEADER_HEIGHT,
        justifyContent: "center",
      }}>
      <Toolbar sx={{ minHeight: HEADER_HEIGHT }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Traval
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
