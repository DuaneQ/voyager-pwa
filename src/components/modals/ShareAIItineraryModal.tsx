import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  Alert,
  Snackbar,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import { AIGeneratedItinerary } from '../../hooks/useAIGeneratedItineraries';

interface ShareAIItineraryModalProps {
  open: boolean;
  onClose: () => void;
  itinerary: AIGeneratedItinerary;
}

export const ShareAIItineraryModal: React.FC<ShareAIItineraryModalProps> = ({
  open,
  onClose,
  itinerary
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [copySuccess, setCopySuccess] = useState('');

  // Generate shareable URL pointing to Firebase Function (dev environment)
  const shareUrl = `https://us-central1-mundo1-dev.cloudfunctions.net/itineraryShare/share-itinerary/${itinerary.id}`;
  
  // Generate share text
  const destination = itinerary.response?.data?.itinerary?.destination || itinerary.destination;
  const startDate = itinerary.response?.data?.itinerary?.startDate || itinerary.startDate;
  const endDate = itinerary.response?.data?.itinerary?.endDate || itinerary.endDate;
  
  const formatShareDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const shareTitle = `My AI Travel Itinerary: ${destination}`;
  const shareText = `Check out my AI-generated travel itinerary for ${destination} (${formatShareDate(startDate)} - ${formatShareDate(endDate)})! 🌍✈️`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess('Link copied to clipboard!');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess('Link copied to clipboard!');
    }
  };

  const handleNativeShare = async () => {
    if ('share' in navigator && isMobile) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or share failed, fallback to copy
        handleCopyLink();
      }
    } else {
      // Desktop fallback - just copy the link
      handleCopyLink();
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(30, 30, 30, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'white'
          }
        }}
      >
        <DialogTitle sx={{ 
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShareIcon />
            <Typography variant="h6">Share Itinerary</Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'white' }}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 1 }}>
          {/* Itinerary Preview */}
          <Box sx={{ 
            mb: 3, 
            p: 2, 
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 1,
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 'bold' }}>
              {destination}
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              {formatShareDate(startDate)} - {formatShareDate(endDate)}
            </Typography>
            {itinerary.response?.data?.itinerary?.description && (
              <Typography variant="body2" sx={{ mt: 1, color: 'rgba(255, 255, 255, 0.8)', fontStyle: 'italic' }}>
                "{itinerary.response.data.itinerary.description.substring(0, 100)}..."
              </Typography>
            )}
          </Box>

          {/* Share Link */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ color: 'white' }}>
              Share Link
            </Typography>
            <TextField
              fullWidth
              value={shareUrl}
              InputProps={{
                readOnly: true,
                sx: { 
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)'
                  },
                  '& .MuiInputBase-input': {
                    color: 'white',
                    fontSize: '0.875rem',
                    backgroundColor: 'transparent'
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.5)'
                  }
                },
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleCopyLink} size="small" sx={{ color: 'white' }}>
                      <CopyIcon />
                    </IconButton>
                  </InputAdornment>
                )
              }}
              size="small"
            />
          </Box>

          {/* Share Instructions */}
          <Alert 
            severity="info" 
            sx={{ 
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              border: '1px solid rgba(33, 150, 243, 0.3)',
              color: 'white',
              '& .MuiAlert-icon': { color: 'rgba(33, 150, 243, 0.8)' }
            }}
          >
            Anyone with this link can view your itinerary. No login required!
          </Alert>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={onClose} sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={handleNativeShare}
            startIcon={<ShareIcon />}
            sx={{
              backgroundColor: 'rgba(33, 150, 243, 0.8)',
              '&:hover': {
                backgroundColor: 'rgba(33, 150, 243, 1)',
              }
            }}
          >
            {isMobile && 'share' in navigator ? 'Share' : 'Copy Link'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copy Success Snackbar */}
      <Snackbar
        open={!!copySuccess}
        autoHideDuration={3000}
        onClose={() => setCopySuccess('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          severity="success" 
          onClose={() => setCopySuccess('')}
          sx={{ width: '100%' }}
        >
          {copySuccess}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ShareAIItineraryModal;