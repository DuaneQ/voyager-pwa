import React, { useState } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../environments/firebaseConfig';
import { TermsOfServiceModal } from '../modals/TermsOfServiceModal';
import { useTermsAcceptance } from '../../hooks/useTermsAcceptance';
import useGetUserId from '../../hooks/useGetUserId';

interface TermsGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const TermsGuard: React.FC<TermsGuardProps> = ({ 
  children, 
  fallback 
}) => {
  const { hasAcceptedTerms, isLoading, acceptTerms } = useTermsAcceptance();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const userId = useGetUserId();
  const navigate = useNavigate();

  const handleAcceptTerms = async () => {
    setIsAccepting(true);
    try {
      await acceptTerms();
    } catch (error) {
      console.error('Failed to accept terms:', error);
      // You might want to show an error message here
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDeclineTerms = async () => {
    setIsDeclining(true);
    try {
      // Log out the user
      await signOut(auth);
      
      // Redirect to login page
      navigate('/login', { 
        replace: true,
        state: { 
          message: 'You must accept the Terms of Service to use TravalPass.' 
        }
      });
    } catch (error) {
      console.error('Failed to log out user:', error);
      // Fallback: Force redirect even if logout fails
      window.location.href = '/login';
    } finally {
      setIsDeclining(false);
    }
  };

  // Show loading while checking terms status
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
          Checking terms acceptance...
        </Typography>
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
      
      {/* Optional: Show restricted content message */}
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
