import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  IconButton
} from '@mui/material';
import { Edit, Save, Cancel, Share } from '@mui/icons-material';

interface AIItineraryHeaderProps {
  itineraryData: any;
  metadata?: any;
  isEditing: boolean;
  onEditStart: () => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
  onShare?: () => void;
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
  onCancel,
  onShare
}) => {
  // Helper to get a readable label for user-provided terms.
  const extractLabel = (term: any) => {
    if (!term && term !== 0) return '';
    if (typeof term === 'string') return term;
    if (typeof term === 'object') {
      return term.name || term.term || term.value || term.label || JSON.stringify(term);
    }
    return String(term);
  };
  return (
    <Card sx={{ 
      mb: 2,
      transform: { xs: 'translateX(-6%)', sm: 'translateX(-6%)', md: 'translateX(-3%)', lg: 'translateX(-2%)' },
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
          
          {/* Share and Edit Controls */}
          <Box sx={{ 
            display: 'flex', 
            gap: 0.5,
            flexShrink: 0,
            alignSelf: { xs: 'center', sm: 'flex-start' },
            justifyContent: 'center'
          }}>
            {/* Share Button - Always visible */}
            {onShare && (
        <IconButton
          onClick={onShare}
          size="small"
          disableRipple
                sx={{ 
                  color: 'white',
                  backgroundColor: 'rgba(33, 150, 243, 0.2)',
                  border: '1px solid rgba(33, 150, 243, 0.3)',
                  '&:hover': {
                    backgroundColor: 'rgba(33, 150, 243, 0.3)',
                    borderColor: 'rgba(33, 150, 243, 0.5)'
                  }
                }}
                title="Share Itinerary"
              >
                <Share fontSize="small" />
              </IconButton>
            )}
            {!isEditing ? (
              <Button
                startIcon={<Edit />}
                onClick={onEditStart}
                size="small"
                variant="outlined"
                disableRipple
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
                  disableRipple
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
                  disableRipple
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
            {String(itineraryData.description).replace(/\s+/g, ' ').trim()}
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
            {/* Filtering metadata (optional) - shows when server/search returned filtering hints */}
            {metadata.filtering && (typeof metadata.filtering === 'object') && (
              <>
                {/* Only show count summaries when explicit arrays of terms are not available */}
                {(!Array.isArray(metadata.filtering.userMustAvoid) || metadata.filtering.userMustAvoid.length === 0) && metadata.filtering.mustAvoidFilteredCount > 0 && (
                  <Chip
                    label={`Filtered ${metadata.filtering.mustAvoidFilteredCount} items (must avoid)`}
                    size="small"
                    color="warning"
                    sx={{
                      color: 'white',
                      backgroundColor: 'rgba(255, 152, 0, 0.12)',
                      borderColor: 'rgba(255, 152, 0, 0.25)'
                    }}
                  />
                )}
                {(!Array.isArray(metadata.filtering.userMustInclude) || metadata.filtering.userMustInclude.length === 0) && metadata.filtering.mustIncludeMatchesCount > 0 && (
                  <Chip
                    label={`${metadata.filtering.mustIncludeMatchesCount} must-include matches`}
                    size="small"
                    color="success"
                    variant="outlined"
                    sx={{
                      color: 'white',
                      backgroundColor: 'rgba(76, 175, 80, 0.12)',
                      borderColor: 'rgba(76, 175, 80, 0.25)'
                    }}
                  />
                )}
                {metadata.filtering.specialRequestsUsed && (
                  <Chip
                    label={`Special requests used`}
                    size="small"
                    variant="outlined"
                    sx={{ color: 'white', backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.08)' }}
                  />
                )}
                {/* Render explicit user-provided include/avoid terms when present */}
                {Array.isArray(metadata.filtering.userMustInclude) && metadata.filtering.userMustInclude.length > 0 && (
                  <>
                    {metadata.filtering.userMustInclude.slice(0, 3).map((t: any, i: number) => (
                      <Chip
                        key={`must-include-${i}`}
                        label={extractLabel(t)}
                        size="small"
                        sx={{ color: 'white', backgroundColor: 'rgba(76, 175, 80, 0.14)', borderColor: 'rgba(76,175,80,0.18)' }}
                      />
                    ))}
                    {metadata.filtering.userMustInclude.length > 3 && (
                      <Chip label={`+${metadata.filtering.userMustInclude.length - 3} more`} size="small" sx={{ color: 'white', backgroundColor: 'rgba(255,255,255,0.04)' }} />
                    )}
                  </>
                )}
                {Array.isArray(metadata.filtering.userMustAvoid) && metadata.filtering.userMustAvoid.length > 0 && (
                  <>
                    {metadata.filtering.userMustAvoid.slice(0, 3).map((t: any, i: number) => (
                      <Chip
                        key={`must-avoid-${i}`}
                        label={extractLabel(t)}
                        size="small"
                        sx={{ color: 'white', backgroundColor: 'rgba(244, 67, 54, 0.12)', borderColor: 'rgba(244,67,54,0.18)' }}
                      />
                    ))}
                    {metadata.filtering.userMustAvoid.length > 3 && (
                      <Chip label={`+${metadata.filtering.userMustAvoid.length - 3} more`} size="small" sx={{ color: 'white', backgroundColor: 'rgba(255,255,255,0.04)' }} />
                    )}
                  </>
                )}
              </>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AIItineraryHeader;