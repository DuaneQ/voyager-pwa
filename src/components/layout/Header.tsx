import React from 'react';
import { AppBar, Toolbar, Typography } from '@mui/material';

const Header: React.FC = () => {
    return (
        <AppBar position="static">
            <AppBar position="static"></AppBar>
            <Toolbar style={{ borderBottom: '2px solid black', backgroundColor: 'white'}}>
                <Typography variant="h6" style={{ color: 'black', flexGrow: 1 }}>
                    Voyager
                </Typography>
            </Toolbar>
        </AppBar>
    );
};

export default Header;