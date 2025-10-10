import React from 'react';
import { Box, Typography } from '@mui/material';
import ItineraryCard from '../forms/ItineraryCard';
import { Itinerary } from '../../types/Itinerary';

type Props = {
  currentMatch: Itinerary | null;
  searchLoading: boolean;
  itinerariesCount: number;
  selectedItineraryId: string;
  isAtEnd: boolean;
  hasMore: boolean;
  hasSeenExample: boolean;
  matchingLength: number;
  onLike: (it: Itinerary) => void;
  onDislike: (it: Itinerary) => void;
};

const MatchDisplay: React.FC<Props> = ({ currentMatch, searchLoading, itinerariesCount, selectedItineraryId, isAtEnd, hasMore, hasSeenExample, matchingLength, onLike, onDislike }) => {
  if (currentMatch) {
    return (
      <Box data-testid="search-results">
        <ItineraryCard data-testid="itinerary-card" itinerary={currentMatch} onLike={onLike} onDislike={onDislike} />
      </Box>
    );
  }

  const centerSx = { textAlign: 'center', padding: 2 };
  const captionSx = { mt: 1, display: 'block' };

  if (searchLoading && !currentMatch && itinerariesCount > 0 && selectedItineraryId) {
    return (
      <Box sx={centerSx}>
        <Typography>Searching for matches...</Typography>
      </Box>
    );
  }

  if (isAtEnd && !searchLoading && itinerariesCount > 0 && !currentMatch) {
    return (
      <Box sx={centerSx}>
        <Typography>{hasMore ? 'Loading more matches...' : 'No more itineraries to view.'}</Typography>
        {!hasMore && hasSeenExample && (
          <Typography variant="caption" color="text.secondary" sx={captionSx}>
            Create more itineraries or try different dates to find new matches!
          </Typography>
        )}
        {hasMore && (
          <Typography variant="caption" color="text.secondary">Found {matchingLength} matches so far</Typography>
        )}
      </Box>
    );
  }

  return null;
};

export default React.memo(MatchDisplay);
