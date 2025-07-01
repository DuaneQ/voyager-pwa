// Floating feedback button component
import React, { useState } from 'react';
import { Fab, Tooltip } from '@mui/material';
import { Feedback as FeedbackIcon } from '@mui/icons-material';
import { FeedbackModal } from '../modals/FeedbackModal';

interface FeedbackButtonProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  initialType?: 'bug' | 'feature' | 'improvement' | 'general';
  variant?: 'fab' | 'button';
  color?: 'primary' | 'secondary' | 'default';
}

export const FeedbackButton: React.FC<FeedbackButtonProps> = ({
  position = 'bottom-right',
  initialType,
  variant = 'fab',
  color = 'primary',
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      zIndex: 1300, // Higher than bottom navigation
    };

    switch (position) {
      case 'bottom-right':
        return { ...baseStyles, bottom: 80, right: 16 }; // Above bottom nav
      case 'bottom-left':
        return { ...baseStyles, bottom: 80, left: 16 }; // Above bottom nav
      case 'top-right':
        return { ...baseStyles, top: 80, right: 16 }; // Below header
      case 'top-left':
        return { ...baseStyles, top: 80, left: 16 }; // Below header
      default:
        return { ...baseStyles, bottom: 80, right: 16 }; // Above bottom nav
    }
  };

  return (
    <>
      <Tooltip title="Send Feedback" placement="left">
        <Fab
          color={color}
          aria-label="feedback"
          onClick={() => setModalOpen(true)}
          sx={{
            ...getPositionStyles(),
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            '&:hover': {
              transform: 'scale(1.1)',
              transition: 'transform 0.2s ease-in-out',
            }
          }}
          size="medium"
        >
          <FeedbackIcon />
        </Fab>
      </Tooltip>

      <FeedbackModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialType={initialType}
      />
    </>
  );
};
