import React, { useContext, useState } from 'react';
import { Card, Typography, Button, CircularProgress } from '@mui/material';
import { useSnackbar } from 'notistack';
import { UserProfileContext } from '../../Context/UserProfileContext';
import { useUsageTracking } from '../../hooks/useUsageTracking';
import { useStripePortal } from '../../hooks/useStripePortal';

const STRIPE_CHECKOUT_URL = 'https://buy.stripe.com/5kQdR983e2Lhcom2HagIo00';

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
    setSubscribing(true);
    try {
      window.location.href = STRIPE_CHECKOUT_URL;
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
  return (
    <Card sx={cardSx} data-testid={compact ? 'subscription-card-compact' : 'subscription-card'}>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: 13, lineHeight: 1.2, mb: 0, mr: 1 }}>
        {hasPremium() ? 'Premium' : 'Unlimited Searches'}
      </Typography>
      {userProfile && hasPremium() ? (
        !hideManage && (
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
        )
      ) : (
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubscribe}
          disabled={subscribing}
          sx={{ fontSize: 12, py: 0.2, px: 1.5, minWidth: 0 }}
        >
          {subscribing ? <CircularProgress size={14} /> : 'Upgrade'}
        </Button>
      )}
    </Card>
  );
};

export default SubscriptionCard;
