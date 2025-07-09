import React, { useContext, useState, useEffect } from 'react';
import { Card, Typography, Button, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import { UserProfileContext } from '../../Context/UserProfileContext';
import { useUsageTracking } from '../../hooks/useUsageTracking';
import { useStripePortal } from '../../hooks/useStripePortal';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface SubscriptionCardProps {
  hideManage?: boolean;
  compact?: boolean;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ hideManage = false, compact = false }) => {
  const { enqueueSnackbar } = useSnackbar();
  const [subscribing, setSubscribing] = useState(false);
  const { openPortal, loading: managing, error } = useStripePortal();
  const userProfile = useContext(UserProfileContext).userProfile;
  const { hasPremium } = useUsageTracking();



  const handleSubscribe = async () => {
    //
    setSubscribing(true);
    try {
      const functions = getFunctions();
      const createCheckoutSession = httpsCallable(functions, 'createStripeCheckoutSession');
      const origin = window.location.origin;
      const result: any = await createCheckoutSession({ origin });
      window.location.assign(result.data.url);
    } catch (err) {
      enqueueSnackbar('Failed to redirect to Stripe. Please try again.', { variant: 'error' });
    } finally {
      setSubscribing(false);
    }
  };

  // Compact, bottom-left floating style (fix for MUI sx typing)
  const cardSx = compact
    ? [
        {
          position: 'fixed',
          bottom: { xs: 70, sm: 80 },
          left: { xs: 12, sm: 18 },
          width: 'auto',
          minWidth: 0,
          minHeight: 0,
          p: 1,
          boxShadow: 4,
          borderRadius: 2,
          zIndex: 1200,
          background: '#fff',
          display: 'inline-flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 1,
        }
      ]
    : [
        {
          maxWidth: 420,
          mx: 'auto',
          mt: 3,
          mb: 2,
          p: 3,
          boxShadow: 3,
          borderRadius: 2,
        }
      ];
  // Limbo state: user has a Stripe customer ID but is not premium
  const [isLimbo, setIsLimbo] = useState(
    !!(userProfile && userProfile.stripeCustomerId && userProfile.subscriptionType !== 'premium')
  );

  // On mount or when userProfile changes, clear limbo if present so user can retry upgrade
  useEffect(() => {
    if (
      userProfile &&
      userProfile.stripeCustomerId &&
      userProfile.subscriptionType !== 'premium'
    ) {
      // Clear limbo by removing the Stripe customer ID (client-side only, for UI state)
      // This does NOT update Firestore, just allows UI to retry upgrade
      setIsLimbo(false);
    } else {
      setIsLimbo(false);
    }
  }, [userProfile]);

  return (
    <Card sx={cardSx} data-testid={compact ? 'subscription-card-compact' : 'subscription-card'}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 10, lineHeight: 1.2, mb: 0, mr: 1 }}>
        {hasPremium() ? 'Premium' : 'Unlimited Searches'}
      </Typography>
      {userProfile === null && (
        <Typography color="error" sx={{ fontSize: 10 }}>
          User profile not loaded. Please refresh or re-login.
        </Typography>
      )}
      {userProfile && typeof userProfile !== 'object' && (
        <Typography color="error" sx={{ fontSize: 10 }}>
          User profile is malformed. Please contact support.
        </Typography>
      )}
      {userProfile && typeof userProfile === 'object' && (
        hasPremium() && !hideManage ? (
          <>
            <Button
              variant="outlined"
              color="primary"
              onClick={openPortal}
              disabled={managing}
              sx={{ fontSize: 12, py: 0.2, px: 1.5, minWidth: 0 }}
            >
              {managing ? <CircularProgress size={14} /> : 'Manage'}
            </Button>
            {error && <div style={{ color: 'red' }}>{error}</div>}
          </>
        ) : (
          <>
            {isLimbo && (
              <Typography
                color="error"
                sx={{
                  fontSize: 10,
                  mr: 1,
                  maxWidth: 90,
                  minHeight: 32,
                  whiteSpace: 'normal',
                  overflow: 'visible',
                  textOverflow: 'clip',
                  display: 'inline-block',
                  verticalAlign: 'middle',
                  lineHeight: 1.3,
                }}
                title="Subscription failed. Contact support@travalpass.com"
              >
                Subscription failed. Try again or contact support@travalpass.com
              </Typography>
            )}
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubscribe}
              disabled={subscribing}
              sx={{ fontSize: 12, py: 0.2, px: 1.5, minWidth: 90, maxWidth: 120 }}
            >
              {subscribing ? <CircularProgress size={14} /> : 'Upgrade'}
            </Button>
          </>
        )
      )}
    </Card>
  );
};

export default SubscriptionCard;
