import React from 'react';
import { AppBar, Toolbar, Typography } from '@mui/material';

const Header: React.FC = () => {
    return (
        <AppBar position="static">
            <Toolbar style={{ borderBottom: '2px solid black'}}>
                <Typography variant="h6" style={{ flexGrow: 1 }}>
                    Voyager
                </Typography>
            </Toolbar>
        </AppBar>
    );
};

export default Header;