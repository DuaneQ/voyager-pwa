import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Checkbox,
  FormControlLabel,
  Box,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Gavel as LegalIcon,
} from '@mui/icons-material';

interface TermsOfServiceModalProps {
  open: boolean;
  onAccept: () => Promise<void>;
  onDecline: () => void;
  loading?: boolean;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({
  open,
  onAccept,
  onDecline,
  loading = false,
}) => {
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [acknowledgments, setAcknowledgments] = useState({
    readTerms: false,
    understandRisks: false,
    personalSafety: false,
    releaseLIABILITY: false,
    legalAge: false,
    complyLaws: false,
  });

  const handleAcknowledgmentChange = (key: keyof typeof acknowledgments) => {
    setAcknowledgments(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const allAcknowledged = Object.values(acknowledgments).every(Boolean) && hasReadTerms;

  const acknowledgmentItems = [
    {
      key: 'readTerms',
      text: 'I have read and understand the complete Terms of Service',
      required: true,
    },
    {
      key: 'understandRisks',
      text: 'I understand the risks associated with meeting strangers through the platform',
      required: true,
    },
    {
      key: 'personalSafety',
      text: 'I assume full responsibility for my personal safety when meeting other users',
      required: true,
    },
    {
      key: 'releaseLIABILITY',
      text: 'I release TravalPass from liability for interactions with other users',
      required: true,
    },
    {
      key: 'legalAge',
      text: 'I am at least 18 years old and legally capable of entering this agreement',
      required: true,
    },
    {
      key: 'complyLaws',
      text: 'I will comply with all applicable laws and regulations while using the service',
      required: true,
    },
  ];

  return (
    <Dialog
      open={open}
      maxWidth="md"
      fullWidth
      disableEscapeKeyDown
      PaperProps={{
        sx: {
          // Make the modal 10% smaller on extra-small screens (xs)
          // by scaling the Paper. Keep normal scale on small+ screens.
          transform: { xs: 'scale(0.9)', sm: 'scale(1)' },
          transformOrigin: 'top center',
          // Force a narrower width on very small devices so the dialog appears smaller
          width: { xs: '340px', sm: '600px' },
          // Responsive max height: tighter on small devices
          maxHeight: { xs: '80vh', sm: '90vh' },
          // Ensure the dialog doesn't overflow the viewport on xs
          overflow: 'hidden',
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LegalIcon color="primary" />
          <Typography variant="h6" component="span">
            Terms of Service Agreement
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          px: { xs: 2, sm: 3 },
          py: { xs: 1.5, sm: 2 },
          // Scale down typography and inner spacing slightly on xs to make the whole modal feel smaller
          '& .MuiTypography-root': {
            fontSize: { xs: '0.92rem', sm: '1rem' },
          },
          '& .MuiAlert-root': {
            px: { xs: 1.25, sm: 2 },
            py: { xs: 1, sm: 1.5 },
          },
        }}
      >
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            IMPORTANT LEGAL NOTICE
          </Typography>
          <Typography variant="body2">
            This agreement contains important legal terms including limitations of liability. 
            You must read and accept all terms to use TravalPass.
          </Typography>
        </Alert>

        <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1, maxHeight: 300, overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            TravalPass Terms of Service Summary
          </Typography>
          
          <Typography variant="body2" paragraph>
            <strong>Service Description:</strong> TravalPass connects travelers to share itineraries and travel experiences. 
            This involves meeting strangers, which carries inherent risks.
          </Typography>

          <Typography variant="body2" paragraph>
            <strong>Your Responsibilities:</strong>
            • Exercise caution when meeting other users
            • Verify user information independently
            • Take responsibility for your personal safety
            • Comply with local laws while traveling
          </Typography>

          <Typography variant="body2" paragraph>
            <strong>Our Limitations:</strong>
            • We don't conduct background checks on users
            • We're not liable for user interactions or meetings
            • We don't provide travel booking services
            • We may terminate accounts at our discretion
          </Typography>

          <Typography variant="body2" paragraph>
            <strong>Safety Recommendations:</strong>
            • Meet in public places initially
            • Inform others of your travel plans
            • Trust your instincts about other users
            • Obtain appropriate travel insurance
          </Typography>

          <Divider sx={{ my: 2 }} />

          <FormControlLabel
            control={
              <Checkbox
                checked={hasReadTerms}
                onChange={(e) => setHasReadTerms(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="body2">
                I have read the complete Terms of Service document and understand my rights and responsibilities
              </Typography>
            }
          />
        </Box>

        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="error" />
          Required Acknowledgments
        </Typography>

        <List dense>
          {acknowledgmentItems.map((item) => (
            <ListItem key={item.key} sx={{ px: 0 }}>
              <ListItemIcon>
                <Checkbox
                  checked={acknowledgments[item.key as keyof typeof acknowledgments]}
                  onChange={() => handleAcknowledgmentChange(item.key as keyof typeof acknowledgments)}
                  color="primary"
                  size="small"
                />
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography variant="body2" sx={{ fontWeight: item.required ? 'medium' : 'normal' }}>
                    {item.text}
                    {item.required && <span style={{ color: 'red' }}> *</span>}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            By accepting these terms, you acknowledge that TravalPass is a platform that connects users and 
            that all interactions, meetings, and travel arrangements are at your own risk and responsibility.
          </Typography>
        </Alert>
      </DialogContent>

  <DialogActions sx={{ p: { xs: 2, sm: 3 }, gap: { xs: 1, sm: 2 } }}>
        <Button
          onClick={onDecline}
          variant="outlined"
          disabled={loading}
          color="secondary"
          fullWidth
        >
          {loading ? 'Processing...' : 'Decline & Logout'}
        </Button>
        <Button
          onClick={onAccept}
          variant="contained"
          disabled={loading || !allAcknowledged}
          color="primary"
          fullWidth
        >
          {loading ? (
            <>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              Accepting...
            </>
          ) : (
            'I Accept These Terms'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
