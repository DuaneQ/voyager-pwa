// Feedback form component for beta testing
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  Rating,
  FormControlLabel,
  Checkbox,
  LinearProgress,
} from '@mui/material';
import { Close as CloseIcon, Send as SendIcon } from '@mui/icons-material';
import { collection, addDoc, getFirestore } from 'firebase/firestore';
import { app } from '../../environments/firebaseConfig';
import { auth } from '../../environments/firebaseConfig';
import DOMPurify from 'dompurify';

interface FeedbackData {
  type: 'bug' | 'feature' | 'improvement' | 'general' | '';
  severity: 'low' | 'medium' | 'high' | 'critical' | '';
  rating: number;
  title: string;
  description: string;
  stepsToReproduce: string;
  expectedBehavior: string;
  actualBehavior: string;
  includeContactInfo: boolean;
  contactEmail: string;
}

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
  initialType?: FeedbackData['type'];
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  open,
  onClose,
  initialType = '',
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const userId = typeof auth !== 'undefined' && auth.currentUser ? auth.currentUser.uid : null;
  
  const [formData, setFormData] = useState<FeedbackData>({
    type: initialType,
    severity: '',
    rating: 0,
    title: '',
    description: '',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: '',
    includeContactInfo: false,
    contactEmail: '',
  });

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
      // Reset form after a delay to avoid visual glitch
      setTimeout(() => {
        setFormData({
          type: '',
          severity: '',
          rating: 0,
          title: '',
          description: '',
          stepsToReproduce: '',
          expectedBehavior: '',
          actualBehavior: '',
          includeContactInfo: false,
          contactEmail: '',
        });
        setSubmitSuccess(false);
        setSubmitError(null);
      }, 300);
    }
  };

  const getDeviceInfo = () => ({
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    screenResolution: typeof window !== 'undefined' && window.screen 
      ? `${window.screen.width}x${window.screen.height}` 
      : 'unknown',
    viewportSize: `${window.innerWidth}x${window.innerHeight}`,
    url: window.location.href,
    timestamp: new Date().toISOString(),
    online: navigator.onLine,
  });

  const handleSubmit = async () => {
    if (!formData.type || !formData.title || !formData.description) {
      setSubmitError('Please fill in all required fields');
      return;
    }

    if (formData.includeContactInfo && !formData.contactEmail) {
      setSubmitError('Please provide your email address for follow-up');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const db = getFirestore(app);
      // Build feedbackDoc with no undefined values
      const feedbackDoc: Record<string, any> = {
        userId: userId || 'anonymous',
        userEmail: formData.includeContactInfo ? DOMPurify.sanitize(formData.contactEmail) : null,
        type: formData.type,
        severity: formData.severity || null,
        rating: typeof formData.rating === 'number' && formData.rating > 0 ? formData.rating : null,
        title: DOMPurify.sanitize(formData.title),
        description: DOMPurify.sanitize(formData.description),
        stepsToReproduce: formData.stepsToReproduce ? DOMPurify.sanitize(formData.stepsToReproduce) : null,
        expectedBehavior: formData.expectedBehavior ? DOMPurify.sanitize(formData.expectedBehavior) : null,
        actualBehavior: formData.actualBehavior ? DOMPurify.sanitize(formData.actualBehavior) : null,
        deviceInfo: getDeviceInfo(),
        status: 'new',
        priority: formData.severity === 'critical' ? 'urgent' : 
                 formData.severity === 'high' ? 'high' : 'normal',
        createdAt: new Date(),
        source: 'beta-app',
        version: process.env.REACT_APP_VERSION || '1.0.0-beta',
      };
      // Remove any undefined fields (shouldn't be any, but for safety)
      Object.keys(feedbackDoc).forEach(
        (k) => feedbackDoc[k] === undefined && delete feedbackDoc[k]
      );
      // --- END PATCH ---
      await addDoc(collection(db, 'feedback'), feedbackDoc);
      setSubmitSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error submitting feedback:', error);
      setSubmitError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBugReport = formData.type === 'bug';

  if (submitSuccess) {
    return (
      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="sm" 
        fullWidth
        fullScreen={window.innerWidth < 600}
      >
        <DialogContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="success.main" gutterBottom>
            Feedback Submitted Successfully! 🎉
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Thank you for helping us improve TravalPass. We'll review your feedback and may reach out if you provided contact information.
          </Typography>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
      fullWidth
      fullScreen={window.innerWidth < 600} // Full screen on mobile
      sx={{
        '& .MuiDialog-paper': {
          margin: window.innerWidth < 600 ? 0 : 2,
          maxHeight: window.innerWidth < 600 ? '100vh' : 'calc(100vh - 64px)',
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Share Your Feedback
        <Button onClick={handleClose} size="small" disabled={isSubmitting}>
          <CloseIcon />
        </Button>
      </DialogTitle>

      {isSubmitting && <LinearProgress />}

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
          {/* Feedback Type */}
          <FormControl required fullWidth>
            <InputLabel>Feedback Type</InputLabel>
            <Select
              value={formData.type}
              label="Feedback Type"
              onChange={(e) => setFormData({ ...formData, type: e.target.value as FeedbackData['type'] })}
            >
              <MenuItem value="bug">🐛 Bug Report</MenuItem>
              <MenuItem value="feature">💡 Feature Request</MenuItem>
              <MenuItem value="improvement">⚡ Improvement Suggestion</MenuItem>
              <MenuItem value="general">💭 General Feedback</MenuItem>
            </Select>
          </FormControl>

          {/* Severity (for bugs) */}
          {isBugReport && (
            <FormControl fullWidth>
              <InputLabel>Severity</InputLabel>
              <Select
                value={formData.severity}
                label="Severity"
                onChange={(e) => setFormData({ ...formData, severity: e.target.value as FeedbackData['severity'] })}
              >
                <MenuItem value="low">Low - Minor issue</MenuItem>
                <MenuItem value="medium">Medium - Affects functionality</MenuItem>
                <MenuItem value="high">High - Major issue</MenuItem>
                <MenuItem value="critical">Critical - App unusable</MenuItem>
              </Select>
            </FormControl>
          )}

          {/* Rating */}
          {!isBugReport && (
            <Box>
              <Typography variant="body2" gutterBottom>
                Overall Experience Rating
              </Typography>
              <Rating
                value={formData.rating}
                onChange={(_, value) => setFormData({ ...formData, rating: value || 0 })}
                size="large"
              />
            </Box>
          )}

          {/* Title */}
          <TextField
            required
            fullWidth
            label="Title"
            placeholder="Brief summary of your feedback"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          {/* Description */}
          <TextField
            required
            fullWidth
            multiline
            rows={4}
            label="Description"
            placeholder="Provide detailed information about your feedback"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />

          {/* Bug-specific fields */}
          {isBugReport && (
            <>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Steps to Reproduce"
                placeholder="1. Go to...\n2. Click on...\n3. See error..."
                value={formData.stepsToReproduce}
                onChange={(e) => setFormData({ ...formData, stepsToReproduce: e.target.value })}
              />
              
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Expected Behavior"
                placeholder="What should have happened?"
                value={formData.expectedBehavior}
                onChange={(e) => setFormData({ ...formData, expectedBehavior: e.target.value })}
              />
              
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Actual Behavior"
                placeholder="What actually happened?"
                value={formData.actualBehavior}
                onChange={(e) => setFormData({ ...formData, actualBehavior: e.target.value })}
              />
            </>
          )}

          {/* Contact Information */}
          <Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.includeContactInfo}
                  onChange={(e) => setFormData({ ...formData, includeContactInfo: e.target.checked })}
                />
              }
              label="I'd like to be contacted about this feedback"
            />
            
            {formData.includeContactInfo && (
              <TextField
                fullWidth
                type="email"
                label="Your Email"
                placeholder="your.email@example.com"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                sx={{ mt: 2 }}
              />
            )}
          </Box>

          {/* Technical Info Notice */}
          <Alert severity="info" sx={{ fontSize: '0.8rem' }}>
            <Typography variant="caption">
              <strong>Technical Information:</strong> Device and browser information will be included automatically to help us debug issues.
            </Typography>
          </Alert>

          {submitError && (
            <Alert severity="error">
              {submitError}
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={isSubmitting || !formData.type || !formData.title || !formData.description}
          startIcon={<SendIcon />}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
