import React, { useCallback } from 'react';
import { Box, FormControl, Select, MenuItem, Button, Typography } from '@mui/material';
import { Itinerary } from '../../types/Itinerary';

const toolbarSx = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 16px',
  backgroundColor: 'white',
  borderBottom: '1px solid rgba(0,0,0,0.05)',
  gap: '16px',
  flexShrink: 0,
  mt: 10,
};

const selectSx = {
  ".MuiSelect-select": {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};

const menuPaperStyle = {
  maxHeight: 300,
  maxWidth: 300,
  zIndex: 1001,
};

const menuItemBoxSx = {
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  width: '100%',
};

type Props = {
  sortedItineraries: Itinerary[];
  selectedItineraryId: string;
  onSelect: (id: string) => void;
  onOpenModal: () => void;
};

const ItinerarySelector: React.FC<Props> = ({ sortedItineraries, selectedItineraryId, onSelect, onOpenModal }) => {
  const handleChange = useCallback((e: any) => {
    onSelect(e.target.value as string);
  }, [onSelect]);

  return (
    <Box sx={toolbarSx}>
      <FormControl fullWidth sx={{ maxWidth: { xs: 180, sm: 240 } }}>
        <Select
          data-testid="itinerary-select"
          value={selectedItineraryId}
          onChange={handleChange}
          displayEmpty
          size="small"
          sx={selectSx}
          MenuProps={{
            PaperProps: {
              style: menuPaperStyle,
            },
          }}
        >
          <MenuItem value="" disabled>
            Select an itinerary
          </MenuItem>
          {sortedItineraries.map((itinerary) => (
            <MenuItem key={itinerary.id} value={itinerary.id}>
              <Box sx={menuItemBoxSx}>
                {itinerary.destination}{' '}
                <Typography component="span" sx={{ fontSize: '0.8em', color: '#666' }}>
                  ({itinerary.startDate} - {itinerary.endDate})
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button data-testid="add-itinerary-button" variant="contained" onClick={onOpenModal} size="small">
        Add/Edit Itineraries
      </Button>
    </Box>
  );
};

export default React.memo(ItinerarySelector);
