import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Alert,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as PendingIcon,
  AccessTime as ClockIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';

export interface AIGenerationStage {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  estimatedDuration?: number; // in seconds
}

export interface AIGenerationProgressProps {
  stages?: AIGenerationStage[]; // Make optional
  currentStage: number;
  totalStages: number;
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number; // in seconds
  onCancel: () => void;
  showCancel?: boolean;
  error?: string | null;
}

export const AIGenerationProgress: React.FC<AIGenerationProgressProps> = ({
  stages,
  currentStage,
  totalStages,
  progress,
  message,
  estimatedTimeRemaining,
  onCancel,
  showCancel = true,
  error
}) => {
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (remainingSeconds === 0) {
      return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getStageIcon = (stage: AIGenerationStage, index: number) => {
    switch (stage.status) {
      case 'completed':
        return <CheckIcon color="success" />;
      case 'active':
        return <ClockIcon color="primary" />;
      case 'error':
        return <CancelIcon color="error" />;
      default:
        return <PendingIcon color="disabled" />;
    }
  };

  const getStageTextColor = (stage: AIGenerationStage) => {
    switch (stage.status) {
      case 'completed':
        return 'success.main';
      case 'active':
        return 'primary.main';
      case 'error':
        return 'error.main';
      default:
        return 'text.secondary';
    }
  };

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      {/* Header */}
      <Box sx={{ mb: 3, textAlign: 'center' }}>
        <Typography variant="h6" sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          🤖 Creating Your Itinerary...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Please wait while we generate your personalized travel experience
        </Typography>
      </Box>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            Generation Failed
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
        </Alert>
      )}

      {/* Progress Bar */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Progress
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {Math.round(progress)}%
          </Typography>
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ 
            height: 8, 
            borderRadius: 4,
            backgroundColor: 'grey.200',
            '& .MuiLinearProgress-bar': {
              borderRadius: 4,
            }
          }}
        />
      </Box>

      {/* Current Status */}
      <Card variant="outlined" sx={{ mb: 3, bgcolor: 'primary.50' }}>
        <CardContent sx={{ py: 2 }}>
          <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 0.5 }}>
            🎯 Current: {message}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Stage {currentStage} of {totalStages}
          </Typography>
          {estimatedTimeRemaining && (
            <Box sx={{ mt: 1 }}>
              <Chip 
                icon={<ClockIcon />}
                label={`${formatTime(estimatedTimeRemaining)} remaining`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Stage List */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
          Generation Steps
        </Typography>
        <List dense>
          {(stages || []).map((stage, index) => (
            <ListItem key={stage.id} sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                {getStageIcon(stage, index)}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: getStageTextColor(stage),
                      fontWeight: stage.status === 'active' ? 'bold' : 'normal'
                    }}
                  >
                    {stage.label}
                  </Typography>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {stage.description}
                  </Typography>
                }
              />
              {stage.status === 'completed' && (
                <Chip label="✓" size="small" color="success" variant="outlined" />
              )}
              {stage.status === 'active' && (
                <Chip label="⏳" size="small" color="primary" variant="outlined" />
              )}
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Time Estimate */}
      {estimatedTimeRemaining && !error && (
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            ⏱ Estimated time: {formatTime(estimatedTimeRemaining)} remaining
          </Typography>
        </Box>
      )}

      {/* Actions */}
      {showCancel && (
        <Box sx={{ textAlign: 'center' }}>
          <Button 
            onClick={onCancel}
            variant="outlined"
            color="secondary"
            sx={{ minWidth: 120 }}
          >
            Cancel Generation
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default AIGenerationProgress;
