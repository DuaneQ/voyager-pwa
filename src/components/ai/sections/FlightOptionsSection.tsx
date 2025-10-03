import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Button
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { AccessTime, CheckCircle, Delete } from '@mui/icons-material';

interface Flight {
  id?: string;
  airline: string;
  flightNumber: string;
  route: string;
  price?: { amount: number; currency?: string };
  cabin?: string;
  class?: string;
  duration: string;
  departureTime?: string;
  departure?: { date: string; time: string };
  stops?: number;
  tripType?: string;
  return?: {
    airline?: string;
    flightNumber?: string;
    route?: string;
    departure?: { date: string; time: string; iata?: string };
    arrival?: { iata: string };
    duration?: string;
    stops?: number;
  };
}

interface FlightOptionsSectionProps {
  flights: Flight[];
  isEditing: boolean;
  selectedFlights: Set<number>;
  onToggleSelection: (index: number) => void;
  onBatchDelete: () => void;
}

const formatFlightDateTime = (dateString: string, timeString: string) => {
  if (!dateString || !timeString) return 'Time TBD';
  
  try {
    let formattedDate = dateString;
    if (dateString.length === 10 && !dateString.includes('T')) {
      formattedDate = dateString;
    }
    
    let formattedTime = timeString;
    if (timeString.length === 5 && timeString.includes(':')) {
      formattedTime = timeString + ':00';
    } else if (timeString.length === 4 && !timeString.includes(':')) {
      formattedTime = timeString.substring(0, 2) + ':' + timeString.substring(2) + ':00';
    }
    
    const dateTimeString = `${formattedDate}T${formattedTime}`;
    const date = new Date(dateTimeString);
    
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }) + ' • ' + date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.error('Error formatting flight datetime:', error, { dateString, timeString });
    return 'Invalid Date';
  }
};

export const FlightOptionsSection: React.FC<FlightOptionsSectionProps> = ({
  flights,
  isEditing,
  selectedFlights,
  onToggleSelection,
  onBatchDelete
}) => {
  if (!flights || flights.length === 0) {
    return null;
  }

  return (
    <Accordion sx={{ 
      mb: 2,
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      '&:before': { display: 'none' }
    }}>
      <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }} data-testid="flight-options-header">
          <Typography variant="h6" sx={{ color: 'white' }}>✈️ Flight Options</Typography>
          <Chip 
            label={`${flights.length} options`} 
            size="small" 
            color="primary" 
            variant="outlined"
            sx={{ 
              borderColor: 'rgba(255, 255, 255, 0.3)',
              color: 'white'
            }}
          />
          {isEditing && selectedFlights.size > 0 && (
            <Button
              startIcon={<Delete />}
              onClick={onBatchDelete}
              size="small"
              variant="contained"
              color="error"
              sx={{ 
                backgroundColor: '#d32f2f',
                color: 'white',
                fontWeight: 'bold'
              }}
            >
              Delete {selectedFlights.size} Flight{selectedFlights.size > 1 ? 's' : ''}
            </Button>
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {flights.map((flight, index) => (
            <Card key={flight.id || index} variant="outlined" sx={{
              backgroundColor: selectedFlights.has(index) ? 'rgba(244, 67, 54, 0.1)' : 'rgba(255, 255, 255, 0.05)',
              border: selectedFlights.has(index) ? '2px solid #f44336' : '1px solid rgba(255, 255, 255, 0.1)',
              cursor: isEditing ? 'pointer' : 'default'
            }}
            onClick={isEditing ? () => onToggleSelection(index) : undefined}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Typography variant="h6" component="h3" sx={{ color: 'white' }}>
                    {flight.airline} {flight.flightNumber}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    {flight.route}
                  </Typography>
                  {flight.departure?.date && flight.departure?.time && (
                    <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 0.5 }}>
                      Departure: {formatFlightDateTime(flight.departure.date, flight.departure.time)}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="h6" sx={{ color: 'white' }}>
                    ${flight.price?.amount || 'Price TBD'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    {flight.cabin || flight.class}
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                <Chip icon={<AccessTime sx={{ color: 'white' }} />} 
                      label={flight.duration} 
                      size="small" 
                      sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }} />
                <Chip label={flight.departureTime || flight.departure?.time} 
                      size="small" 
                      variant="outlined"
                      sx={{ borderColor: 'rgba(255, 255, 255, 0.3)', color: 'white' }} />
                {flight.stops === 0 ? (
                  <Chip label="Direct" 
                        size="small" 
                        sx={{ backgroundColor: 'rgba(76, 175, 80, 0.3)', color: 'white' }} />
                ) : (
                  <Chip label={flight.stops === undefined ? "undefined stop" : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`} 
                        size="small" 
                        sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }} />
                )}
                {flight.tripType && (
                  <Chip label={flight.tripType} 
                        size="small" 
                        sx={{ backgroundColor: 'rgba(156, 39, 176, 0.3)', color: 'white' }} />
                )}
              </Box>

              {/* Return flight info for round-trip */}
              {flight.return && (
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <Typography variant="subtitle2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 1 }}>
                    Return Flight
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography variant="h6" component="h3" sx={{ color: 'white' }}>
                        {flight.return.airline || flight.airline} {flight.return.flightNumber || flight.flightNumber}
                      </Typography>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        {flight.return.route || `${flight.return.departure?.iata || ''} → ${flight.return.arrival?.iata || ''}`}
                      </Typography>
                      {flight.return.departure?.date && flight.return.departure?.time && (
                        <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.6)', mt: 0.5 }}>
                          Departure: {formatFlightDateTime(flight.return.departure.date, flight.return.departure.time)}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="h6" sx={{ color: 'white' }}>
                        ${flight.price?.amount || 'Price TBD'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                        {flight.cabin || flight.class}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                    <Chip icon={<AccessTime sx={{ color: 'white' }} />} 
                          label={flight.return.duration || 'Duration TBD'} 
                          size="small" 
                          sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }} />
                    <Chip label={flight.return.departure?.time || 'Time TBD'} 
                          size="small" 
                          variant="outlined"
                          sx={{ borderColor: 'rgba(255, 255, 255, 0.3)', color: 'white' }} />
                    {flight.return.stops === 0 ? (
                      <Chip label="Direct" 
                            size="small" 
                            sx={{ backgroundColor: 'rgba(76, 175, 80, 0.3)', color: 'white' }} />
                    ) : flight.return.stops === undefined ? (
                      <Chip label="TBD stops" 
                            size="small" 
                            sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }} />
                    ) : (
                      <Chip label={`${flight.return.stops} stop${flight.return.stops > 1 ? 's' : ''}`} 
                            size="small" 
                            sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: 'white' }} />
                    )}
                  </Box>
                </Box>
              )}

              {/* Selection indicator in edit mode */}
              {isEditing && (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2, p: 1, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    ✈️ Click to select for deletion
                  </Typography>
                  {selectedFlights.has(index) && (
                    <Chip 
                      icon={<CheckCircle sx={{ color: 'white !important' }} />}
                      label="Selected"
                      size="small"
                      sx={{ 
                        backgroundColor: '#f44336',
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
          ))}
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default FlightOptionsSection;