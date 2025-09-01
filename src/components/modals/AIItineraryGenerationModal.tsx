import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  MenuItem,
  Chip,
  Alert,
  IconButton,
  Grid,
  FormHelperText,
} from '@mui/material';
import {
  Close as CloseIcon,
  AutoAwesome as AIIcon,
  TravelExplore as TravelIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import GooglePlacesAutocomplete from 'react-google-places-autocomplete';
import { useAIGeneration } from '../../hooks/useAIGeneration';
import { useTravelPreferences } from '../../hooks/useTravelPreferences';
import { AIGenerationRequest, TRIP_TYPES, FLIGHT_CLASSES, STOP_PREFERENCES, POPULAR_AIRLINES } from '../../types/AIGeneration';
import { format, addDays, isAfter, isBefore } from 'date-fns';
import AIGenerationProgress from '../common/AIGenerationProgress';
import { AirportSelector } from '../common/AirportSelector';

interface AIItineraryGenerationModalProps {
  open: boolean;
  onClose: () => void;
  onGenerated?: (result: any) => void;
  initialDestination?: string;
  initialDates?: {
    startDate: string;
    endDate: string;
  };
}

export const AIItineraryGenerationModal: React.FC<AIItineraryGenerationModalProps> = ({
  open,
  onClose,
  onGenerated,
  initialDestination = '',
  initialDates,
}) => {
  // Hooks  
  const { 
    generateItinerary, 
    isGenerating, 
    progress, 
    error, 
    resetGeneration,
    cancelGeneration 
  } = useAIGeneration();
  
  const { 
    preferences, 
    loading: preferencesLoading, 
    getDefaultProfile,
    getProfileById
  } = useTravelPreferences();

  // Form state
  const [formData, setFormData] = useState<AIGenerationRequest>({
    destination: initialDestination,
    destinationAirportCode: '',
    departure: '',
    departureAirportCode: '',
    startDate: initialDates?.startDate || format(addDays(new Date(), 7), 'yyyy-MM-dd'),
    endDate: initialDates?.endDate || format(addDays(new Date(), 14), 'yyyy-MM-dd'),
    tripType: 'leisure',
    preferenceProfileId: '',
    specialRequests: '',
    mustInclude: [],
    mustAvoid: [],
    flightPreferences: {
      class: 'economy',
      stopPreference: 'any',
      preferredAirlines: [],
    },
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [mustIncludeInput, setMustIncludeInput] = useState('');
  const [mustAvoidInput, setMustAvoidInput] = useState('');
  const [showSuccessState, setShowSuccessState] = useState(false);
  const [modalKey, setModalKey] = useState(0); // Key to force re-render of Google Places components

  // Track if modal was previously closed to detect new opens
  const [wasOpen, setWasOpen] = useState(false);

  // Reset form and increment key when modal opens to force Google Places to re-initialize
  useEffect(() => {
    if (open && !wasOpen) {
      // Modal just opened
      setModalKey(prev => prev + 1);
      setWasOpen(true);
      
      // Reset form data only once when modal opens
      const defaultProfileId = preferences?.profiles?.find(p => p.isDefault)?.id || '';
      
      setFormData({
        destination: initialDestination,
        destinationAirportCode: '',
        departure: '',
        departureAirportCode: '',
        startDate: initialDates?.startDate || format(addDays(new Date(), 7), 'yyyy-MM-dd'),
        endDate: initialDates?.endDate || format(addDays(new Date(), 14), 'yyyy-MM-dd'),
        tripType: 'leisure',
        preferenceProfileId: defaultProfileId,
        specialRequests: '',
        mustInclude: [],
        mustAvoid: [],
        flightPreferences: {
          class: 'economy',
          stopPreference: 'any',
          preferredAirlines: [],
        },
      });
      
      setFormErrors({});
      setMustIncludeInput('');
      setMustAvoidInput('');
      setShowSuccessState(false);
    } else if (!open && wasOpen) {
      // Modal just closed
      setWasOpen(false);
    }
  }, [open, wasOpen, initialDestination, initialDates, preferences]);

    // Handle form field changes
  const handleFieldChange = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Stable airport selection callbacks
  const handleDepartureAirportSelect = useCallback((code: string, name: string) => {
    handleFieldChange('departureAirportCode', code);
  }, [handleFieldChange]);

  const handleDestinationAirportSelect = useCallback((code: string, name: string) => {
    handleFieldChange('destinationAirportCode', code);
  }, [handleFieldChange]);

  const handleDepartureAirportClear = useCallback(() => {
    handleFieldChange('departureAirportCode', '');
  }, [handleFieldChange]);

  const handleDestinationAirportClear = useCallback(() => {
    handleFieldChange('destinationAirportCode', '');
  }, [handleFieldChange]);

  // Validation
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    // Always validate destination
    if (!formData.destination || !formData.destination.trim()) {
      errors.destination = 'Destination is required';
    }

    // Validate departure airport code if departure location is provided
    if (formData.departure && !formData.departureAirportCode) {
      errors.departure = 'Please select a departure airport for flight pricing';
    }

    // Validate destination airport code if destination is provided
    if (formData.destination && !formData.destinationAirportCode) {
      errors.destination = errors.destination || 'Please select a destination airport for flight pricing';
    }

    // Always validate start date
    if (!formData.startDate) {
      errors.startDate = 'Start date is required';
    }

    // Always validate end date
    if (!formData.endDate) {
      errors.endDate = 'End date is required';
    }

    // Validate date logic even if destination is missing
    if (formData.startDate && formData.endDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (isBefore(startDate, today)) {
        errors.startDate = 'Start date cannot be in the past';
      }

      if (!isAfter(endDate, startDate)) {
        errors.endDate = 'End date must be after start date';
      }

      // Check for reasonable trip length (max 30 days)
      const tripDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (tripDays > 30) {
        errors.endDate = 'Trip cannot be longer than 30 days';
      }
    }

    // Always validate profile selection
    if (!formData.preferenceProfileId) {
      errors.preferenceProfileId = 'Please select a travel preference profile';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData]);

  // Handle generation
  const handleGenerate = useCallback(async () => {
    setFormErrors({});
    if (!validateForm()) {
      return;
    }
    if (preferencesLoading) {
      setFormErrors({ general: 'Preferences are still loading, please wait.' });
      return;
    }
    const selectedProfile = getProfileById(formData.preferenceProfileId);
    if (!selectedProfile) {
      setFormErrors({ preferenceProfileId: 'Selected profile not found.' });
      return;
    }
    try {
      const result = await generateItinerary(formData);

      console.log('🎉 [MODAL] Generation successful, result:', result);

      // Show success state in the modal
      setShowSuccessState(true);

      // Call onGenerated to trigger the parent refresh
      onGenerated?.(result);

      // Close modal after showing success
      setTimeout(() => {
        onClose();
      }, 3000);
    } catch (err: any) {
      let message = err?.message || 'Failed to generate itinerary';
      if (err?.code === 'permission-denied' && message.includes('Premium subscription')) {
        message = 'You need a premium subscription to use AI itinerary generation.';
      }
      setFormErrors({ general: message });
    }
  }, [formData, validateForm, generateItinerary, onGenerated, preferencesLoading, getProfileById]);

  // Handle modal close
  const handleClose = useCallback(() => {
    if (isGenerating) {
      cancelGeneration();
    }
    resetGeneration();
    setShowSuccessState(false);
    
    // Reset form data to clear Google Places inputs
    setFormData({
      destination: '',
      destinationAirportCode: '',
      departure: '',
      departureAirportCode: '',
      startDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      endDate: format(addDays(new Date(), 14), 'yyyy-MM-dd'),
      tripType: 'leisure',
      preferenceProfileId: preferences?.profiles?.find(p => p.isDefault)?.id || '',
      specialRequests: '',
      mustInclude: [],
      mustAvoid: [],
      flightPreferences: {
        class: 'economy',
        stopPreference: 'any',
        preferredAirlines: [],
      },
    });
    
    // Reset tag inputs
    setMustIncludeInput('');
    setMustAvoidInput('');
    
    // Clear any form errors
    setFormErrors({});
    
    onClose();
  }, [isGenerating, cancelGeneration, resetGeneration, onClose, preferences]);

  // Handle tag input
  const handleTagAdd = useCallback((type: 'mustInclude' | 'mustAvoid', value: string) => {
    const trimmedValue = value.trim();
    const currentArray = formData[type] || [];
    if (trimmedValue && !currentArray.includes(trimmedValue)) {
      handleFieldChange(type, [...currentArray, trimmedValue]);
    }
    
    if (type === 'mustInclude') {
      setMustIncludeInput('');
    } else {
      setMustAvoidInput('');
    }
  }, [formData, handleFieldChange]);

  const handleTagRemove = useCallback((type: 'mustInclude' | 'mustAvoid', tagToRemove: string) => {
    const currentArray = formData[type] || [];
    handleFieldChange(type, currentArray.filter(tag => tag !== tagToRemove));
  }, [formData, handleFieldChange]);

  // Get available preference profiles
  const availableProfiles = preferences?.profiles || [];

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md" 
      fullWidth
      disableEscapeKeyDown={isGenerating}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <AIIcon color="primary" />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Generate AI Itinerary
        </Typography>
        <IconButton 
          onClick={handleClose} 
          disabled={isGenerating}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {/* Error Alert - always show if error exists */}
        {formErrors.general && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormErrors({})}>
            {formErrors.general}
          </Alert>
        )}

        {/* Simple Loading State */}
        {isGenerating && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Searching for flights...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Please wait while we find the best flight options for your trip.
            </Typography>
          </Box>
        )}

        {/* Success State Display */}
        {showSuccessState && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h2" sx={{ mb: 3, fontSize: '4rem' }}>
              🎉
            </Typography>
            <Typography variant="h4" sx={{ mb: 2, color: 'success.main', fontWeight: 'bold' }}>
              Success!
            </Typography>
            <Typography variant="h6" sx={{ mb: 3, color: 'text.primary' }}>
              Your AI itinerary has been generated successfully!
            </Typography>
            <Alert severity="success" sx={{ maxWidth: 500, mx: 'auto', mb: 3 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                ✅ Generation Complete
              </Typography>
              <Typography variant="body2">
                • Itinerary saved to your account<br/>
                • Check the "AI Itineraries" tab to view<br/>
                • Modal will close automatically
              </Typography>
            </Alert>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
              Closing modal in a moment...
            </Typography>
          </Box>
        )}

        {/* Form Content - Hide when generating or showing success */}
        {!isGenerating && !showSuccessState && (
          <Grid container spacing={3}>
          {/* Trip Details Section */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <TravelIcon />
              Trip Details
            </Typography>
          </Grid>

          {/* Departure Location */}
          <Grid item xs={12}>
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                Flying From
              </Typography>
              <GooglePlacesAutocomplete
                key={`departure-${modalKey}`}
                apiKey={process.env.REACT_APP_GOOGLE_PLACES_API_KEY}
                selectProps={{
                  value: formData.departure ? { label: formData.departure, value: formData.departure } : null,
                  onChange: (selected: any) => {
                    handleFieldChange('departure', selected?.label || '');
                    // Clear airport code when location changes
                    if (formData.departureAirportCode) {
                      handleFieldChange('departureAirportCode', '');
                    }
                  },
                  placeholder: 'Where are you flying from? (for flight pricing)',
                  isClearable: true,
                  styles: {
                    control: (provided: any) => ({
                      ...provided,
                      minHeight: '56px',
                      fontSize: '16px',
                      borderColor: '#ccc',
                      '&:hover': {
                        borderColor: '#1976d2',
                      },
                    }),
                    menu: (provided: any) => ({
                      ...provided,
                      backgroundColor: '#ffffff',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      zIndex: 9999,
                      position: 'absolute',
                    }),
                    menuList: (provided: any) => ({
                      ...provided,
                      backgroundColor: '#ffffff',
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }),
                    option: (provided: any, state: any) => ({
                      ...provided,
                      backgroundColor: state.isSelected 
                        ? '#1976d2' 
                        : state.isFocused 
                        ? '#f5f5f5' 
                        : '#ffffff',
                      color: state.isSelected ? '#ffffff' : '#000000',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: state.isSelected ? '#1976d2' : '#f5f5f5',
                      },
                    }),
                    singleValue: (provided: any) => ({
                      ...provided,
                      color: '#000000',
                    }),
                    placeholder: (provided: any) => ({
                      ...provided,
                      color: '#999999',
                    }),
                  },
                }}
                autocompletionRequest={{
                  types: ['(cities)'],
                }}
              />
            </Box>
          </Grid>

          {/* Departure Airport Selector */}
          {formData.departure && (
            <Grid item xs={12}>
              <AirportSelector
                key={`departure-airport-${modalKey}`}
                label="Departure Airport"
                placeholder="Select your departure airport"
                location={formData.departure}
                selectedAirportCode={formData.departureAirportCode}
                onAirportSelect={handleDepartureAirportSelect}
                onClear={handleDepartureAirportClear}
              />
            </Grid>
          )}

          {/* Destination */}
          <Grid item xs={12}>
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                Destination *
              </Typography>
              <GooglePlacesAutocomplete
                key={`destination-${modalKey}`}
                apiKey={process.env.REACT_APP_GOOGLE_PLACES_API_KEY}
                selectProps={{
                  value: formData.destination ? { label: formData.destination, value: formData.destination } : null,
                  onChange: (selected: any) => {
                    handleFieldChange('destination', selected?.label || '');
                    // Clear airport code when location changes
                    if (formData.destinationAirportCode) {
                      handleFieldChange('destinationAirportCode', '');
                    }
                  },
                  placeholder: 'Where would you like to go?',
                  isClearable: true,
                  styles: {
                    control: (provided: any) => ({
                      ...provided,
                      minHeight: '56px',
                      fontSize: '16px',
                      borderColor: '#ccc',
                      '&:hover': {
                        borderColor: '#1976d2',
                      },
                    }),
                    menu: (provided: any) => ({
                      ...provided,
                      backgroundColor: '#ffffff',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      zIndex: 9999,
                      position: 'absolute',
                    }),
                    menuList: (provided: any) => ({
                      ...provided,
                      backgroundColor: '#ffffff',
                      maxHeight: '200px',
                      overflowY: 'auto',
                    }),
                    option: (provided: any, state: any) => ({
                      ...provided,
                      backgroundColor: state.isSelected 
                        ? '#1976d2' 
                        : state.isFocused 
                        ? '#f5f5f5' 
                        : '#ffffff',
                      color: state.isSelected ? '#ffffff' : '#000000',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: state.isSelected ? '#1976d2' : '#f5f5f5',
                      },
                    }),
                    singleValue: (provided: any) => ({
                      ...provided,
                      color: '#000000',
                    }),
                    placeholder: (provided: any) => ({
                      ...provided,
                      color: '#999999',
                    }),
                  },
                }}
                autocompletionRequest={{
                  types: ['(cities)'],
                }}
              />
              {formErrors.destination && (
                <FormHelperText error>{formErrors.destination}</FormHelperText>
              )}
            </Box>
          </Grid>

          {/* Destination Airport Selector */}
          {formData.destination && (
            <Grid item xs={12}>
              <AirportSelector
                key={`destination-airport-${modalKey}`}
                label="Destination Airport"
                placeholder="Select your destination airport"
                location={formData.destination}
                selectedAirportCode={formData.destinationAirportCode}
                onAirportSelect={handleDestinationAirportSelect}
                onClear={handleDestinationAirportClear}
              />
            </Grid>
          )}

          {/* Dates */}
          <Grid item xs={6}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={(e) => handleFieldChange('startDate', e.target.value)}
              error={!!formErrors.startDate}
              helperText={formErrors.startDate}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: <CalendarIcon sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
          </Grid>

          <Grid item xs={6}>
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={formData.endDate}
              onChange={(e) => handleFieldChange('endDate', e.target.value)}
              error={!!formErrors.endDate}
              helperText={formErrors.endDate}
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: <CalendarIcon sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
          </Grid>

          {/* Trip Type */}
          <Grid item xs={12}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
              Trip Type *
            </Typography>
            <Grid container spacing={1}>
              {TRIP_TYPES.map((type) => (
                <Grid item key={type.value}>
                  <Chip
                    label={`${type.icon} ${type.label}`}
                    onClick={() => handleFieldChange('tripType', type.value)}
                    color={formData.tripType === type.value ? 'primary' : 'default'}
                    variant={formData.tripType === type.value ? 'filled' : 'outlined'}
                    sx={{ height: 40 }}
                  />
                </Grid>
              ))}
            </Grid>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              {TRIP_TYPES.find(t => t.value === formData.tripType)?.description}
            </Typography>
          </Grid>

          {/* Flight Preferences */}
          <Grid item xs={12}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              ✈️ Flight Preferences
            </Typography>
            
            {/* Flight Class */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                  Class
                </Typography>
                <TextField
                  fullWidth
                  select
                  size="small"
                  value={formData.flightPreferences?.class || 'economy'}
                  onChange={(e) => handleFieldChange('flightPreferences', {
                    ...formData.flightPreferences,
                    class: e.target.value
                  })}
                >
                  {FLIGHT_CLASSES.map((flightClass) => (
                    <MenuItem key={flightClass.value} value={flightClass.value}>
                      {flightClass.icon} {flightClass.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Stop Preference */}
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                  Stops
                </Typography>
                <TextField
                  fullWidth
                  select
                  size="small"
                  value={formData.flightPreferences?.stopPreference || 'any'}
                  onChange={(e) => handleFieldChange('flightPreferences', {
                    ...formData.flightPreferences,
                    stopPreference: e.target.value
                  })}
                >
                  {STOP_PREFERENCES.map((stopPref) => (
                    <MenuItem key={stopPref.value} value={stopPref.value}>
                      {stopPref.icon} {stopPref.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>

              {/* Preferred Airlines */}
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                  Preferred Airlines
                </Typography>
                <TextField
                  fullWidth
                  select
                  size="small"
                  SelectProps={{
                    multiple: true,
                    value: formData.flightPreferences?.preferredAirlines || [],
                    onChange: (e) => handleFieldChange('flightPreferences', {
                      ...formData.flightPreferences,
                      preferredAirlines: typeof e.target.value === 'string' ? [e.target.value] : e.target.value
                    }),
                    renderValue: (selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {(selected as string[]).map((value) => (
                          <Chip key={value} label={value} size="small" />
                        ))}
                      </Box>
                    ),
                  }}
                >
                  {POPULAR_AIRLINES.map((airline) => (
                    <MenuItem key={airline} value={airline}>
                      {airline}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
            <Typography variant="caption" color="text.secondary">
              Flight preferences will be applied when searching for flights between your selected airports. 
              {formData.departureAirportCode && formData.destinationAirportCode 
                ? ` Route: ${formData.departureAirportCode} → ${formData.destinationAirportCode}`
                : ' Select airports above to see your route.'
              }
            </Typography>
          </Grid>

          {/* Travel Preferences */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              select
              required
              label="Travel Preference Profile *"
              value={formData.preferenceProfileId}
              onChange={(e) => handleFieldChange('preferenceProfileId', e.target.value)}
              error={!!formErrors.preferenceProfileId}
              helperText={formErrors.preferenceProfileId}
              disabled={preferencesLoading}
            >
              {availableProfiles.map((profile) => (
                <MenuItem key={profile.id} value={profile.id}>
                  {profile.name} {profile.isDefault && '(Default)'}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Must Include */}
          <Grid item xs={12}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
              Must Include (Optional)
            </Typography>
            <TextField
              fullWidth
              placeholder="Add specific places or activities you want to include"
              value={mustIncludeInput}
              onChange={(e) => setMustIncludeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleTagAdd('mustInclude', mustIncludeInput);
                }
              }}
              InputProps={{
                endAdornment: mustIncludeInput.trim() && (
                  <Button 
                    size="small" 
                    onClick={() => handleTagAdd('mustInclude', mustIncludeInput)}
                  >
                    Add
                  </Button>
                )
              }}
            />
            {(formData.mustInclude?.length || 0) > 0 && (
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(formData.mustInclude || []).map((item) => (
                  <Chip
                    key={item}
                    label={item}
                    onDelete={() => handleTagRemove('mustInclude', item)}
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                ))}
              </Box>
            )}
          </Grid>

          {/* Must Avoid */}
          <Grid item xs={12}>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
              Must Avoid (Optional)
            </Typography>
            <TextField
              fullWidth
              placeholder="Add places or activities you want to avoid"
              value={mustAvoidInput}
              onChange={(e) => setMustAvoidInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleTagAdd('mustAvoid', mustAvoidInput);
                }
              }}
              InputProps={{
                endAdornment: mustAvoidInput.trim() && (
                  <Button 
                    size="small" 
                    onClick={() => handleTagAdd('mustAvoid', mustAvoidInput)}
                  >
                    Add
                  </Button>
                )
              }}
            />
            {(formData.mustAvoid?.length || 0) > 0 && (
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {(formData.mustAvoid || []).map((item) => (
                  <Chip
                    key={item}
                    label={item}
                    onDelete={() => handleTagRemove('mustAvoid', item)}
                    size="small"
                    color="error"
                    variant="outlined"
                  />
                ))}
              </Box>
            )}
          </Grid>

          {/* Special Requests */}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Special Requests (Optional)"
              multiline
              rows={3}
              value={formData.specialRequests}
              onChange={(e) => handleFieldChange('specialRequests', e.target.value)}
              placeholder="Any special requirements, accessibility needs, or preferences..."
            />
          </Grid>
        </Grid>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button 
          onClick={handleClose} 
          disabled={isGenerating}
          variant="outlined"
        >
          {isGenerating ? 'Cancel' : 'Close'}
        </Button>
        <Button 
          onClick={handleGenerate}
          disabled={isGenerating || preferencesLoading}
          variant="contained"
          startIcon={<AIIcon />}
          sx={{ ml: 1 }}
        >
          {isGenerating ? 'Generating...' : preferencesLoading ? 'Loading Preferences...' : 'Generate Itinerary'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AIItineraryGenerationModal;
