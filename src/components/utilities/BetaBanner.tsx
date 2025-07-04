// Beta testing banner to remind users they're in beta
import React, { useState } from 'react';
import { 
  Alert, 
  AlertTitle, 
  Button, 
  Collapse, 
  Box,
  IconButton,
  Chip,
  Typography
} from '@mui/material';
import { 
  Close as CloseIcon, 
  BugReport as BugIcon,
  Lightbulb as IdeaIcon 
} from '@mui/icons-material';
import { FeedbackModal } from '../modals/FeedbackModal';

interface BetaBannerProps {
  dismissible?: boolean;
  version?: string;
  onDismiss?: () => void; // Add this prop
}

export const BetaBanner: React.FC<BetaBannerProps> = ({ 
  dismissible = true,
  version = "1.0.0-beta",
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(() => {
    // Check if user has dismissed this version's banner
    const dismissed = localStorage.getItem(`beta-banner-dismissed-${version}`);
    return !dismissed;
  });
  
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'bug' | 'feature' | 'improvement' | 'general'>('general');

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(`beta-banner-dismissed-${version}`, 'true');
    
    // Call the parent's onDismiss callback
    if (onDismiss) {
      onDismiss();
    }
  };

  const openFeedback = (type: typeof feedbackType) => {
    setFeedbackType(type);
    setFeedbackModalOpen(true);
  };

  if (!isVisible) return null;

  return (
    <>
      <Collapse in={isVisible}>
        <Alert 
          severity="info" 
          sx={{ 
            borderRadius: 0,
            backgroundColor: '#e3f2fd',
            borderBottom: '1px solid #90caf9',
            position: 'relative', // Ensure it's not positioned absolutely
            zIndex: 1, // Low z-index since it's in content flow
            '& .MuiAlert-message': {
              width: '100%'
            },
            '& .MuiAlert-icon': {
              fontSize: '.3rem'
            }
          }}
          action={
            dismissible && (
              <IconButton
                aria-label="close"
                color="inherit"
                size="small"
                onClick={handleDismiss}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            )
          }
        >
          <AlertTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            Welcome to TravalPass Beta! 
            <Chip 
              label={version} 
              size="small" 
              color="primary" 
              variant="outlined"
            />
          </AlertTitle>
          
          <Box sx={{ mb: 1, fontSize: '.75rem' }}>
            You're using the beta version of TravalPass. Help us improve by sharing your feedback!
          </Box>
          
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<BugIcon />}
              onClick={() => openFeedback('bug')}
              sx={{ 
                minHeight: 20,
                fontSize: '0.5rem',
                px: 2
              }}
            >
              Report Bug
            </Button>
            
            <Button
              size="small"
              variant="outlined"
              startIcon={<IdeaIcon />}
              onClick={() => openFeedback('feature')}
              sx={{ 
                minHeight: 20,
                fontSize: '0.5rem',
                px: 2
              }}
            >
              Suggest Feature
            </Button>
            
            <Button
              size="small"
              variant="text"
              onClick={() => openFeedback('general')}
              sx={{ 
                minHeight: 32,
                fontSize: '0.75rem',
                px: 2
              }}
            >
              General Feedback
            </Button>
          </Box>
        </Alert>
      </Collapse>

      <FeedbackModal
        open={feedbackModalOpen}
        onClose={() => setFeedbackModalOpen(false)}
        initialType={feedbackType}
      />
    </>
  );
};
