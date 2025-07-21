import React, { useState } from 'react';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../environments/firebaseConfig';
import { TermsOfServiceModal } from '../modals/TermsOfServiceModal';
import { useSimpleTermsAcceptance } from '../../hooks/useSimpleTermsAcceptance';

interface SimpleTermsGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const SimpleTermsGuard: React.FC<SimpleTermsGuardProps> = ({ 
  children, 
  fallback 
}) => {
  const { hasAcceptedTerms, isLoading, error, acceptTerms, isAccepting } = useSimpleTermsAcceptance();
  const [isDeclining, setIsDeclining] = useState(false);
  const userId = auth.currentUser?.uid || null;
  const navigate = useNavigate();

  const handleAcceptTerms = async () => {
    try {
      await acceptTerms();
      // Success! The hook updates the context automatically
    } catch (error) {
      console.error('Failed to accept terms:', error);
      // Error handling is already done in the hook
    }
  };

  const handleDeclineTerms = async () => {
    setIsDeclining(true);
    try {
      await signOut(auth);
      navigate('/login', { 
        replace: true,
        state: { 
          message: 'You must accept the Terms of Service to use TravalPass.' 
        }
      });
    } catch (error) {
      console.error('Failed to log out user:', error);
      window.location.href = '/login';
    } finally {
      setIsDeclining(false);
    }
  };

  // Show loading while user profile is being fetched
  if (isLoading) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
        flexDirection="column"
        gap={2}
      >
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Loading your profile...
        </Typography>
      </Box>
    );
  }
  
  // If there's an error loading profile, show error
  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="200px"
        flexDirection="column"
        gap={2}
      >
        <Typography variant="body1" color="error">
          Error loading profile
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {error.message}
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => window.location.reload()}
          size="small"
        >
          Refresh Page
        </Button>
        <Button 
          variant="text" 
          color="inherit" 
          size="small"
          onClick={() => signOut(auth).then(() => navigate('/login'))}
        >
          Sign Out
        </Button>
      </Box>
    );
  }

  // If user is not logged in, don't show terms modal
  if (!userId) {
    return <>{children}</>;
  }

  // If terms are accepted, render children
  if (hasAcceptedTerms) {
    return <>{children}</>;
  }

  // Show terms modal if not accepted
  return (
    <>
      <TermsOfServiceModal
        open={true}
        onAccept={handleAcceptTerms}
        onDecline={handleDeclineTerms}
        loading={isAccepting || isDeclining}
      />
      
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
        flexDirection="column"
        gap={2}
        sx={{ p: 3 }}
      >
        <Typography variant="h6" align="center" color="text.secondary">
          Terms of Service Required
        </Typography>
        <Typography variant="body1" align="center" color="text.secondary">
          Please accept our Terms of Service to continue using TravalPass.
        </Typography>
      </Box>
    </>
  );
};
