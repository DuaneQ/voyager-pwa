import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  TextField,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItemText,
  ListItemButton,
  Divider,
} from '@mui/material';
import {
  Flight as FlightIcon,
  LocationOn as LocationIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { Airport, AirportSearchResult } from '../../types/Airport';
import { AirportServiceFactory } from '../../services';

interface AirportSelectorProps {
  label: string;
  placeholder: string;
  location: string;
  selectedAirportCode?: string;
  onAirportSelect: (airportCode: string, airportName: string) => void;
  onClear?: () => void;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}

export const AirportSelector: React.FC<AirportSelectorProps> = ({
  label,
  placeholder,
  location,
  selectedAirportCode,
  onAirportSelect,
  onClear,
  disabled = false,
  error,
  required = false,
}) => {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  // Initialize airport service
  const [airportService] = useState(() => {
    console.log('[AirportSelector] Initializing AirportService with API key:', process.env.REACT_APP_GOOGLE_PLACES_API_KEY ? 'Present' : 'Missing');
    const service = AirportServiceFactory.createUnifiedAirportService(process.env.REACT_APP_GOOGLE_PLACES_API_KEY || '');
    console.log('[AirportSelector] AirportService created:', service);
    return service;
  });

  // Search for airports when location changes
  const searchAirports = useCallback(async (locationQuery: string) => {
    console.log('[AirportSelector] searchAirports called with:', locationQuery);
    
    if (!locationQuery.trim()) {
      console.log('[AirportSelector] Empty location query, clearing airports');
      setAirports([]);
      return;
    }

    console.log('[AirportSelector] Starting airport search...');
    setLoading(true);
    setSearchError(null);

    try {
      console.log('[AirportSelector] Calling airportService.searchAirportsNearLocation');
      const result: AirportSearchResult = await airportService.searchAirportsNearLocation(
        locationQuery,
        undefined,
        200, // 200km radius
        5 // Up to 5 airports (3 international + 2 domestic, excluding military)
      );
      
      console.log('[AirportSelector] Search result:', result);
      setAirports(result.airports);
      
      // Auto-select if only one airport found
      if (result.airports.length === 1 && !selectedAirportCode) {
        const airport = result.airports[0];
        console.log('[AirportSelector] Auto-selecting single airport:', airport);
        onAirportSelect(airport.iataCode, airport.name);
      }
      // Show dialog if multiple airports found
      else if (result.airports.length > 1 && !selectedAirportCode) {
        console.log('[AirportSelector] Multiple airports found, showing dialog');
        setShowDialog(true);
      }
    } catch (err) {
      console.error('[AirportSelector] Error searching airports:', err);
      setSearchError(err instanceof Error ? err.message : 'Failed to search airports');
      setAirports([]);
    } finally {
      setLoading(false);
    }
  }, [airportService, selectedAirportCode, onAirportSelect]); // Add onAirportSelect back since it's now stable

  // Search for airports when location changes
  useEffect(() => {
    console.log('[AirportSelector] Location changed:', location);
    
    if (location && location.trim()) {
      // Reset state when location changes
      setSearchError(null);
      setShowDialog(false);
      
      const timeoutId = setTimeout(() => {
        console.log('[AirportSelector] Starting search for:', location);
        searchAirports(location);
      }, 500); // Debounce search
      
      return () => clearTimeout(timeoutId);
    } else {
      console.log('[AirportSelector] Clearing airports - no location');
      setAirports([]);
      setSearchError(null);
      setShowDialog(false);
    }
  }, [location, searchAirports]);

  // Reset component state on mount
  useEffect(() => {
    console.log('[AirportSelector] Component mounted/reset');
    setAirports([]);
    setLoading(false);
    setSearchError(null);
    setShowDialog(false);
  }, []);

  // Handle airport selection
  const handleAirportSelect = (airport: Airport) => {
    onAirportSelect(airport.iataCode, airport.name);
    setShowDialog(false);
  };

  // Handle clear selection
  const handleClear = () => {
    onClear?.();
    setAirports([]);
    setSearchError(null);
  };

  // Get display value for the text field
  const getDisplayValue = () => {
    if (selectedAirportCode) {
      const selectedAirport = airports.find(a => a.iataCode === selectedAirportCode);
      if (selectedAirport) {
        return airportService.formatAirportWithDistance(selectedAirport);
      }
      return selectedAirportCode;
    }
    return '';
  };

  return (
    <Box>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
        {label} {required && '*'}
      </Typography>
      
      <TextField
        fullWidth
        placeholder={location ? placeholder : 'Please select a location first'}
        value={getDisplayValue()}
        disabled={disabled || !location}
        error={!!error || !!searchError}
        helperText={error || searchError}
        InputProps={{
          startAdornment: <FlightIcon sx={{ mr: 1, color: 'action.active' }} />,
          endAdornment: loading ? <CircularProgress size={20} /> : null,
        }}
        onClick={() => {
          if (airports.length > 1) {
            setShowDialog(true);
          }
        }}
      />

      {/* Airport status */}
      {location && !loading && (
        <Box sx={{ mt: 1 }}>
          {airports.length === 0 && !searchError && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ErrorIcon fontSize="small" />
              No airports found within 200km of {location}
            </Typography>
          )}
          {airports.length === 1 && (
            <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <FlightIcon fontSize="small" />
              Auto-selected: {airports[0].name} ({airports[0].iataCode})
            </Typography>
          )}
          {airports.length > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" color="info.main">
                {airports.length} airports found - Click to select
              </Typography>
              <Button size="small" onClick={() => setShowDialog(true)}>
                Choose Airport
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* Selected airport display */}
      {selectedAirportCode && (
        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={selectedAirportCode}
            color="primary"
            size="small"
            onDelete={handleClear}
            icon={<FlightIcon />}
          />
        </Box>
      )}

      {/* Airport selection dialog */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationIcon />
          Select Airport for {location}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Multiple airports found within 200km. Choose the one that works best for your travel plans:
          </Typography>
          
          <List>
            {airports.map((airport, index) => (
              <React.Fragment key={airport.iataCode}>
                <ListItemButton onClick={() => handleAirportSelect(airport)}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {airport.name} ({airport.iataCode})
                        </Typography>
                        <Chip 
                          label={airport.isInternational ? 'International' : 'Domestic'} 
                          size="small" 
                          color={airport.isInternational ? 'primary' : 'default'}
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {airport.city}, {airport.country}
                        </Typography>
                        {airport.distance && (
                          <Typography variant="caption" color="text.secondary">
                            {Math.round(airport.distance)}km from {location}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItemButton>
                {index < airports.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
