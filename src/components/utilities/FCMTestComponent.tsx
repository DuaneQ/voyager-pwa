// FCM Test Component - Add this temporarily to any page for debugging
import React, { useState } from 'react';
import { Button, Box, Typography, Alert, Paper } from '@mui/material';
import { debugFCMOnDevice } from '../../utils/debugFCM';
import { refreshFCMToken } from '../../utils/fcmUtils';
import useGetUserId from '../../hooks/useGetUserId';

interface FCMTestResult {
  success: boolean;
  message: string;
  details?: any;
}

export const FCMTestComponent: React.FC = () => {
  const [testResult, setTestResult] = useState<FCMTestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const userId = useGetUserId();

  const handleDebugTest = async () => {
    setIsLoading(true);
    try {
      const result = await debugFCMOnDevice();
      setTestResult({
        success: true,
        message: 'Debug completed - check console for details',
        details: result,
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `Debug failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    if (!userId) {
      setTestResult({
        success: false,
        message: 'No user ID - please log in first',
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await refreshFCMToken(userId);
      setTestResult({
        success: result.success,
        message: result.success 
          ? 'Token refreshed successfully' 
          : `Token refresh failed: ${result.error}`,
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestPermission = async () => {
    setIsLoading(true);
    try {
      if (!('Notification' in window)) {
        setTestResult({
          success: false,
          message: 'Notifications not supported in this browser',
        });
        return;
      }

      const permission = await Notification.requestPermission();
      setTestResult({
        success: permission === 'granted',
        message: `Notification permission: ${permission}`,
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: `Permission request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3, m: 2, maxWidth: 500 }}>
      <Typography variant="h6" gutterBottom>
        FCM Testing Tools
      </Typography>
      
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Use these tools to debug FCM issues on real devices
      </Typography>

      <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={handleDebugTest}
          disabled={isLoading}
          fullWidth
        >
          Run FCM Debug Test
        </Button>

        <Button
          variant="outlined"
          onClick={handleRequestPermission}
          disabled={isLoading}
          fullWidth
        >
          Request Notification Permission
        </Button>

        <Button
          variant="outlined"
          onClick={handleRefreshToken}
          disabled={isLoading || !userId}
          fullWidth
        >
          Refresh FCM Token
        </Button>
      </Box>

      {testResult && (
        <Alert 
          severity={testResult.success ? 'success' : 'error'} 
          sx={{ mt: 2 }}
        >
          {testResult.message}
        </Alert>
      )}

      <Typography variant="caption" display="block" sx={{ mt: 2 }}>
        Current User ID: {userId || 'Not logged in'}
      </Typography>
      
      <Typography variant="caption" display="block">
        Permission: {Notification.permission}
      </Typography>
    </Paper>
  );
};
