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
        return { ...baseStyles, bottom: 70, right: 10 }; // Right of the subscription card
      case 'bottom-left':
        return { ...baseStyles, bottom: 80, left: 16 }; // Above bottom nav
      case 'top-right':
        return { ...baseStyles, top: 80, right: 16 }; // Below header
      case 'top-left':
        return { ...baseStyles, top: 80, left: 16 }; // Below header
      default:
        return { ...baseStyles, bottom: 80, right: 80 }; // Right of the subscription card
    }
  };

  return (
    <>
      <Tooltip 
        title="Send Feedback" 
        placement="top"
        enterDelay={100} // Show tooltip quickly (100ms instead of default 700ms)
        arrow // Add an arrow pointing to the element
        sx={{
          fontSize: '0.875rem',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: '8px 12px'
        }}
      >
        <Fab
          color={color}
          aria-label="feedback"
          onClick={() => setModalOpen(true)}
          sx={{
            ...getPositionStyles(),
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            '&:hover': {
              transform: 'scale(1.05)',
              transition: 'transform 0.2s ease-in-out',
            },
            backgroundColor: '#3d7cf4', // Brighter blue to stand out
            color: '#ffffff'
          }}
          size="small"
        >
          <FeedbackIcon fontSize="small" />
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
