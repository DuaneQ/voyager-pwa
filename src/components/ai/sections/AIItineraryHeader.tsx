import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button
} from '@mui/material';
import { Edit, Save, Cancel } from '@mui/icons-material';

interface AIItineraryHeaderProps {
  itineraryData: any;
  metadata?: any;
  isEditing: boolean;
  onEditStart: () => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
}

const formatDate = (dateString: string | null | undefined) => {
  if (!dateString || typeof dateString !== 'string') {
    return 'Date not specified';
  }
  
  const date = dateString.includes('T') 
    ? new Date(dateString)
    : new Date(dateString + 'T12:00:00');
  
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC'
  });
};

export const AIItineraryHeader: React.FC<AIItineraryHeaderProps> = ({
  itineraryData,
  metadata,
  isEditing,
  onEditStart,
  onSave,
  onCancel
}) => {
  return (
    <Card sx={{ 
      mb: 2,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
    }}>
      <CardContent>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'stretch', sm: 'flex-start' },
          gap: { xs: 1, sm: 0 },
          mb: 1 
        }}>
          <Typography variant="h5" gutterBottom sx={{ 
            color: 'white',
            mb: { xs: 1, sm: 0 },
            fontSize: { xs: '1.25rem', sm: '1.5rem' }
          }}>
            {itineraryData.destination}
          </Typography>
          
          {/* Edit Controls */}
          <Box sx={{ 
            display: 'flex', 
            gap: 0.5,
            flexShrink: 0,
            alignSelf: { xs: 'center', sm: 'flex-start' },
            justifyContent: 'center'
          }}>
            {!isEditing ? (
              <Button
                startIcon={<Edit />}
                onClick={onEditStart}
                size="small"
                variant="outlined"
                sx={{ 
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  fontSize: '0.75rem',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'rgba(255, 255, 255, 0.5)'
                  }
                }}
              >
                Edit
              </Button>
            ) : (
              <>
                <Button
                  startIcon={<Save />}
                  onClick={onSave}
                  size="small"
                  variant="contained"
                  color="primary"
                  sx={{ 
                    color: 'white',
                    fontSize: '0.7rem',
                    px: 1,
                    minWidth: 'auto'
                  }}
                >
                  Save
                </Button>
                <Button
                  startIcon={<Cancel />}
                  onClick={onCancel}
                  size="small"
                  variant="outlined"
                  sx={{ 
                    color: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    fontSize: '0.7rem',
                    px: 1,
                    minWidth: 'auto',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderColor: 'rgba(255, 255, 255, 0.5)'
                    }
                  }}
                >
                  Cancel
                </Button>
              </>
            )}
          </Box>
        </Box>

        <Typography color="rgba(255, 255, 255, 0.7)" gutterBottom>
          {formatDate(itineraryData.startDate)} - {formatDate(itineraryData.endDate)}
        </Typography>

        {/* AI-Generated Description */}
        {itineraryData.description && (
          <Typography variant="body1" paragraph sx={{ mt: 2, fontStyle: 'italic', color: 'white' }}>
            "{itineraryData.description}"
          </Typography>
        )}
        
        {/* Metadata */}
        {metadata && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {metadata.confidence !== undefined && metadata.confidence !== null && !isNaN(metadata.confidence) && (
              <Chip 
                label={`Confidence: ${Math.round(metadata.confidence * 100)}%`} 
                size="small" 
                color="primary" 
              />
            )}
            {metadata.aiModel && (
              <Chip 
                label={`${metadata.aiModel}`} 
                size="small" 
                variant="outlined" 
              />
            )}
            {metadata.processingTime !== undefined && metadata.processingTime !== null && !isNaN(metadata.processingTime) && (
              <Chip 
                label={`Generated in ${Math.round(metadata.processingTime / 1000)}s`} 
                size="small" 
                variant="outlined" 
              />
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AIItineraryHeader;