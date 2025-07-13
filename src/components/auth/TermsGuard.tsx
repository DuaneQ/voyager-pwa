import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../environments/firebaseConfig';
import { TermsOfServiceModal } from '../modals/TermsOfServiceModal';
import { useTermsAcceptance } from '../../hooks/useTermsAcceptance';

interface TermsGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const TermsGuard: React.FC<TermsGuardProps> = ({ 
  children, 
  fallback 
}) => {
  const { hasAcceptedTerms, isLoading, error: hookError, acceptTerms, checkTermsStatus } = useTermsAcceptance();
  const [isAccepting, setIsAccepting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [componentError, setComponentError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const isMounted = useRef(true);
  const userId = auth.currentUser?.uid || null;
  const navigate = useNavigate();
  
  // Combine errors from hook and component
  const error = hookError || componentError;
  
  // Track if component is mounted to prevent state updates after unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // If there's an error and loading is stuck, offer a retry option
  const handleRetry = () => {
    if (isMounted.current) {
      setComponentError(null); // Clear component errors
      setRetryCount(prev => prev + 1);
      checkTermsStatus().catch(err => {
        if (isMounted.current) {
          setComponentError(err as Error);
        }
      });
    }
  };

  const handleAcceptTerms = async () => {
    setIsAccepting(true);
    setComponentError(null);
    
    try {
      // Double check that we have a current user before proceeding
      if (!auth.currentUser) {
        throw new Error('No logged-in user found. Please sign in again.');
      }
      
      await acceptTerms();
      // The hook will set its internal error state if acceptTerms fails
    } catch (error) {
      console.error('Failed to accept terms:', error);
      // Only set component error if it's not already handled by the hook
      if (!hookError) {
        setComponentError(error as Error);
      }
      
      // If the error is related to auth, redirect to login
      if ((error as Error).message.includes('User must be logged in') ||
          (error as Error).message.includes('User document not found')) {
        // Give the user a moment to see the error before redirecting
        setTimeout(() => {
          if (isMounted.current) {
            signOut(auth).then(() => navigate('/login', { 
              replace: true,
              state: { message: 'Please sign in again to continue.' }
            }));
          }
        }, 3000);
      }
    } finally {
      if (isMounted.current) {
        setIsAccepting(false);
      }
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
        
        {/* Add a timeout message if loading takes too long */}
        {retryCount > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            Taking longer than expected. Retry #{retryCount}...
          </Typography>
        )}
      </Box>
    );
  }
  
  // If there's an error, show error message with retry option
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
          Error checking terms acceptance
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {error.message}
        </Typography>
        <Button 
          variant="contained" 
          onClick={handleRetry}
          size="small"
        >
          Try Again
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
