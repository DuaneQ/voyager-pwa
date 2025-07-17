import React, { useState } from 'react';
import {
  Modal,
  Box,
  Typography,
  IconButton,
  Button,
  TextField,
  Grid,
  Alert,
  Snackbar,
  Divider,
  Tooltip
} from '@mui/material';
import {
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Share as ShareIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { Video } from '../../types/Video';
import { shareVideoWithBranding } from '../../utils/videoSharing';

interface ShareVideoModalProps {
  open: boolean;
  onClose: () => void;
  video: Video;
}

interface SocialPlatform {
  name: string;
  icon: string;
  color: string;
  getShareUrl: (url: string, title: string, description: string) => string;
}

const socialPlatforms: SocialPlatform[] = [
  {
    name: 'X (Twitter)',
    icon: '𝕏',
    color: '#000000',
    getShareUrl: (url, title) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(`${title} 🎥`)}&url=${encodeURIComponent(url)}&hashtags=travel,TravalPass`
  },
  {
    name: 'Facebook',
    icon: '📘',
    color: '#1877F2',
    getShareUrl: (url, title, description) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(`${title} - ${description}`)}`
  },
  {
    name: 'LinkedIn',
    icon: '💼',
    color: '#0A66C2',
    getShareUrl: (url, title, description) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(description)}`
  },
  {
    name: 'WhatsApp',
    icon: '💬',
    color: '#25D366',
    getShareUrl: (url, title) => `https://wa.me/?text=${encodeURIComponent(`${title} 🎥 ${url}`)}`
  },
  {
    name: 'Telegram',
    icon: '✈️',
    color: '#0088cc',
    getShareUrl: (url, title) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
  },
  {
    name: 'Reddit',
    icon: '🔴',
    color: '#FF4500',
    getShareUrl: (url, title) => `https://reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`
  }
];

const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '76%', sm: '400px' },
  maxHeight: '72vh',
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  p: 0,
  overflow: 'auto',
  display: 'flex',
  flexDirection: 'column'
};

export const ShareVideoModal: React.FC<ShareVideoModalProps> = ({
  open,
  onClose,
  video
}) => {
  const [copySuccess, setCopySuccess] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const videoUrl = `${window.location.origin}/video/${video.id}`;
  const title = video.title || 'Amazing Travel Video';
  const description = video.description || 'Watch this amazing travel video on TravalPass.com';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(videoUrl);
      setCopySuccess('Link copied to clipboard!');
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = videoUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess('Link copied to clipboard!');
    }
  };

  const handleSocialShare = (platform: SocialPlatform) => {
    const shareUrl = platform.getShareUrl(videoUrl, title, description);
    window.open(shareUrl, '_blank', 'width=600,height=400');
  };

  const handleNativeShare = async () => {
    setIsSharing(true);
    try {
      await shareVideoWithBranding(video, videoUrl);
    } catch (error) {
      console.error('Native share failed:', error);
      // Fallback to copy link
      await handleCopyLink();
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyVideoDetails = async () => {
    const shareText = `🎥 ${title}

${description}

📱 Watch on TravalPass: ${videoUrl}

#travel #TravalPass`;

    try {
      await navigator.clipboard.writeText(shareText);
      setCopySuccess('Video details copied to clipboard!');
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose}>
        <Box sx={modalStyle}>
          {/* Header */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            flexShrink: 0
          }}>
            <Typography variant="h6" component="h2">
              Share Video
            </Typography>
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          </Box>

          {/* Scrollable Content */}
          <Box sx={{ 
            p: 3, 
            overflow: 'auto',
            flex: 1
          }}>
            {/* Video Preview */}
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <img 
                src={video.thumbnailUrl} 
                alt={title}
                style={{
                  width: '100%',
                  maxWidth: '160px',
                  height: '96px',
                  objectFit: 'cover',
                  borderRadius: '8px'
                }}
              />
              <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 'bold' }}>
                {title}
              </Typography>
              {description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {description.substring(0, 100)}{description.length > 100 ? '...' : ''}
                </Typography>
              )}
            </Box>

            {/* Quick Actions */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<LinkIcon />}
                    onClick={handleCopyLink}
                    size="small"
                  >
                    Copy Link
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<ShareIcon />}
                    onClick={handleNativeShare}
                    disabled={isSharing}
                    size="small"
                  >
                    {isSharing ? 'Sharing...' : 'Native Share'}
                  </Button>
                </Grid>
              </Grid>
            </Box>

            {/* Link Field */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Video Link
              </Typography>
              <TextField
                fullWidth
                size="small"
                value={videoUrl}
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <Tooltip title="Copy Link">
                      <IconButton onClick={handleCopyLink} size="small">
                        <CopyIcon />
                      </IconButton>
                    </Tooltip>
                  )
                }}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Social Platforms */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Share on Social Media
              </Typography>
              <Grid container spacing={1}>
                {socialPlatforms.map((platform) => (
                  <Grid item xs={6} sm={4} key={platform.name}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      onClick={() => handleSocialShare(platform)}
                      sx={{
                        borderColor: platform.color,
                        color: platform.color,
                        '&:hover': {
                          borderColor: platform.color,
                          backgroundColor: `${platform.color}10`
                        }
                      }}
                    >
                      <span style={{ marginRight: '8px' }}>{platform.icon}</span>
                      {platform.name}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Copy Full Details */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Copy Video Details
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<CopyIcon />}
                onClick={handleCopyVideoDetails}
                size="small"
              >
                Copy Title, Description & Link
              </Button>
            </Box>

            {/* Pro Tip */}
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary">
                💡 <strong>Pro Tip:</strong> For TikTok and Instagram, copy the link and paste it in your story or bio. 
                The thumbnail will automatically appear when shared!
              </Typography>
            </Box>
          </Box>
        </Box>
      </Modal>

      {/* Success Snackbar */}
      <Snackbar
        open={!!copySuccess}
        autoHideDuration={3000}
        onClose={() => setCopySuccess('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setCopySuccess('')} 
          severity="success" 
          sx={{ width: '100%' }}
        >
          {copySuccess}
        </Alert>
      </Snackbar>
    </>
  );
};
