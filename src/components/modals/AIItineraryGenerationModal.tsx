import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Link as RouterLink } from 'react-router-dom';
import { useAIGeneration } from '../../hooks/useAIGeneration';
import { useUsageTracking } from '../../hooks/useUsageTracking';
import logger from '../../utils/logger';
import { useTravelPreferences } from '../../hooks/useTravelPreferences';
import { AIGenerationRequest, TRIP_TYPES, FLIGHT_CLASSES, STOP_PREFERENCES, POPULAR_AIRLINES } from '../../types/AIGeneration';
import { TravelPreferenceProfile } from '../../types/TravelPreferences';
import { format, addDays, isAfter, isBefore } from 'date-fns';
// ...existing code...
import { AirportSelector } from '../common/AirportSelector';
import ProfileValidationService from '../../services/ProfileValidationService';

// Input limits
const MAX_TAGS = 10; // max items for mustInclude / mustAvoid
const MAX_TAG_LENGTH = 80; // max length of each tag
const MAX_SPECIAL_REQUESTS_LENGTH = 500; // max length for specialRequests

interface AIItineraryGenerationModalProps {
  open: boolean;
  onClose: () => void;
  onGenerated?: (result: any) => void;
  initialDestination?: string;
  initialDates?: {
    startDate: string;
    endDate: string;
  };
  // If provided, prefer this profile id when initializing the form. The modal will
  // still read the full profile from the travel preferences hook (source of truth).
  initialPreferenceProfileId?: string;
  // A fallback profile object to use only if the preferences hook hasn't yet
  // updated to include the saved changes. This is a defensive fallback to
  // avoid race conditions when opening the modal immediately after saving.
  initialPreferenceProfile?: TravelPreferenceProfile | null;
}

export const AIItineraryGenerationModal: React.FC<AIItineraryGenerationModalProps> = ({
  open,
  onClose,
  onGenerated,
  initialDestination = '',
  initialDates,
  initialPreferenceProfileId,
  initialPreferenceProfile,
}) => {
  // Hooks  
  const { 
    generateItinerary, 
    isGenerating, 
    progress, 
    resetGeneration,
    cancelGeneration 
  } = useAIGeneration();
  const { hasReachedAILimit, getRemainingAICreations, trackAICreation, hasPremium } = useUsageTracking();
  
  const { 
    preferences, 
    loading: preferencesLoading, 
    getProfileById
    , loadPreferences
  } = useTravelPreferences();
  // Preference profiles are read from saved preferences only

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
  const [modalKey, setModalKey] = useState(0);
  const [wasOpen, setWasOpen] = useState(false);
  const [mustIncludeInput, setMustIncludeInput] = useState('');
  const [mustAvoidInput, setMustAvoidInput] = useState('');
  const [showSuccessState, setShowSuccessState] = useState(false);

  // Reset form and increment key when modal opens to force Google Places to re-initialize
  useEffect(() => {
    if (open && !wasOpen) {
      // Modal just opened
      (async () => {
        setModalKey(prev => prev + 1);
        setWasOpen(true);

        // If we have a loadPreferences function, ensure we refresh before initializing
        if (typeof loadPreferences === 'function') {
          try {
            await loadPreferences();
          } catch (err) {
            console.warn('[AIItineraryGenerationModal] loadPreferences() on open failed, proceeding with cached preferences');
          }
        }

        // Reset form data only once when modal opens (after attempting to refresh preferences)
  const defaultProfileId = preferences?.profiles?.find(p => p.isDefault)?.id || '';

        // Prefer an explicitly-provided initial profile id (from parent) if available.
        const initProfileId = (initialPreferenceProfileId as string) || defaultProfileId || '';

        setFormData({
          destination: initialDestination,
          destinationAirportCode: '',
          departure: '',
          departureAirportCode: '',
          startDate: initialDates?.startDate || format(addDays(new Date(), 7), 'yyyy-MM-dd'),
          endDate: initialDates?.endDate || format(addDays(new Date(), 14), 'yyyy-MM-dd'),
          tripType: 'leisure',
          preferenceProfileId: initProfileId,
          specialRequests: '',
          mustInclude: [],
          mustAvoid: [],
          flightPreferences: {
            class: 'economy',
            stopPreference: 'any',
            preferredAirlines: [],
          },
        });
      })();
    }
  }, [open, wasOpen, initialDestination, initialDates, preferences, initialPreferenceProfileId]);

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
  // Memoize selected profile (prefer getProfileById when available) and
  // whether the flight section should be shown for that profile.
  const memoizedSelectedProfile = useMemo(() => {
    const p = (typeof getProfileById === 'function'
      ? getProfileById(formData.preferenceProfileId)
      : (preferences?.profiles || []).find(pp => pp.id === formData.preferenceProfileId) || null);
    if (initialPreferenceProfile && formData.preferenceProfileId && initialPreferenceProfile.id === formData.preferenceProfileId) {
      return initialPreferenceProfile;
    }
    return p;
  }, [formData.preferenceProfileId, getProfileById, preferences, initialPreferenceProfile]);

  const memoizedShowFlightSection = useMemo(() => ProfileValidationService.isFlightSectionVisible(memoizedSelectedProfile), [memoizedSelectedProfile]);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    // Always validate destination
    if (!formData.destination || !formData.destination.trim()) {
      errors.destination = 'Destination is required';
    }

    // Delegate flight-related validation to the service using the memoized profile
    Object.assign(errors, ProfileValidationService.validateFlightFields(formData, memoizedSelectedProfile));

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

    // Delegate tag and special request validations
    Object.assign(errors, ProfileValidationService.validateTagsAndSpecialRequests(formData, {
      maxTags: MAX_TAGS,
      maxTagLength: MAX_TAG_LENGTH,
      maxSpecialRequestsLength: MAX_SPECIAL_REQUESTS_LENGTH,
    }));

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [formData, memoizedSelectedProfile]);

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
    // Refresh preferences to ensure we have the latest saved profile values
    if (typeof loadPreferences === 'function') {
      try {
        await loadPreferences();
      } catch (e) {
        // If refresh fails, continue with whatever we have locally but log for diagnosis
        console.warn('[AIItineraryGenerationModal] loadPreferences failed, proceeding with cached preferences', e);
      }
    }

    const selectedProfile = typeof getProfileById === 'function'
      ? getProfileById(formData.preferenceProfileId)
      : (preferences?.profiles || []).find(p => p.id === formData.preferenceProfileId) || null;
    if (!selectedProfile) {
      setFormErrors({ preferenceProfileId: 'Selected profile not found.' });
      return;
    }
    // AI usage limit check (client-side)
    if (hasReachedAILimit && hasReachedAILimit()) {
      // Set a sentinel so the UI can show a linked message to /search
      setFormErrors({ general: 'AI_LIMIT' });
      return;
    }
  
  try {
  // Include the selected preference profile in the generation request
  const requestWithProfile = { ...formData, preferenceProfile: selectedProfile } as any;
  const result = await generateItinerary(requestWithProfile);

      // Show success state in the modal
      setShowSuccessState(true);

      // Call onGenerated to trigger the parent refresh
      onGenerated?.(result);

      // Track AI creation (best-effort client-side increment)
      try {
        await trackAICreation?.();
      } catch (e) {
        // Non-fatal: continue even if tracking fails
        console.warn('[AIItineraryGenerationModal] trackAICreation failed');
      }

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
    // Mark as not-open so next open will reinitialize
    setWasOpen(false);
    // Notify parent that modal should close
    onClose();
  }, [isGenerating, cancelGeneration, resetGeneration, onClose, preferences]);

  // Handle tag input
  const handleTagAdd = useCallback((type: 'mustInclude' | 'mustAvoid', value: string) => {
    const trimmedValue = value.trim();
    const currentArray = formData[type] || [];

    // Basic client-side validation & limits
    if (!trimmedValue) return;
    if (trimmedValue.length > MAX_TAG_LENGTH) {
      setFormErrors(prev => ({ ...prev, [type]: `Each item must be at most ${MAX_TAG_LENGTH} characters.` }));
      return;
    }
    if (currentArray.includes(trimmedValue)) {
      // no-op for duplicates
      if (type === 'mustInclude') setMustIncludeInput('');
      else setMustAvoidInput('');
      return;
    }
    if (currentArray.length >= MAX_TAGS) {
      setFormErrors(prev => ({ ...prev, [type]: `You can add up to ${MAX_TAGS} items.` }));
      return;
    }

    // Clear any previous errors for this field
    setFormErrors(prev => {
      const copy = { ...prev };
      delete copy[type];
      return copy;
    });

    handleFieldChange(type, [...currentArray, trimmedValue]);

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
  // Force modal UI refresh when profile changes
  useEffect(() => {
    setModalKey(prev => prev + 1);
  }, [formData.preferenceProfileId]);
  const availableProfiles = preferences?.profiles || [];

  // Use memoized values for selected profile and whether to show flight section
  const selectedProfile = memoizedSelectedProfile;
  const showFlightSection = memoizedShowFlightSection;

  // Always reset flight fields when toggling between profiles with/without flights
  useEffect(() => {
    if (!showFlightSection) {
      setFormData(prev => ({
        ...prev,
        departureAirportCode: '',
        destinationAirportCode: '',
        flightPreferences: {
          class: 'economy',
          stopPreference: 'any',
          preferredAirlines: [],
        },
      }));
    }
  }, [showFlightSection, formData.preferenceProfileId]);

  // If the selected profile does not support flights, clear any selected airport codes
  // so the AirportSelector doesn't show stale values or trigger the popup.
  useEffect(() => {
    if (!showFlightSection) {
      if (formData.departureAirportCode) {
        handleFieldChange('departureAirportCode', '');
      }
      if (formData.destinationAirportCode) {
        handleFieldChange('destinationAirportCode', '');
      }
    }
  }, [showFlightSection, handleFieldChange, formData.departureAirportCode, formData.destinationAirportCode]); // All dependencies used

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
          formErrors.general === 'AI_LIMIT' ? (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormErrors({})}>
              You have reached your daily AI generation limit of 5. To purchase the Premium package (20 AI Itineraries per day), go to <RouterLink to="/search">Search</RouterLink> and click UPGRADE.
            </Alert>
          ) : (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormErrors({})}>
              {formErrors.general}
            </Alert>
          )
        )}

        {/* Simple Loading State updated to reflect progress stages */}
        {isGenerating && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {(() => {
                if (!progress) return 'Starting generation...';
                switch (progress.stage) {
                  case 'searching':
                    return 'Searching for flights and accommodations...';
                  case 'activities':
                    return 'Searching for activities and restaurants...';
                  case 'ai_generation':
                    return 'Generating itinerary with AI...';
                  case 'done':
                    return 'Finalizing...';
                  default:
                    return 'Working...';
                }
              })()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {progress?.message || 'Please wait while we find the best options for your trip.'}
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
                  },
                }}
                autocompletionRequest={{
                  types: ['(cities)'],
                }}
              />
            </Box>
          </Grid>

          {/* Departure Airport Selector (only when flights enabled for profile) */}
          {showFlightSection && formData.departure && (
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
              {formErrors.departureAirportCode && (
                <FormHelperText error>{formErrors.departureAirportCode}</FormHelperText>
              )}
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

          {/* Destination Airport Selector (only when flights enabled for profile) */}
          {showFlightSection && formData.destination && (
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
              {formErrors.destinationAirportCode && (
                <FormHelperText error>{formErrors.destinationAirportCode}</FormHelperText>
              )}
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

          {/* Flight Preferences - rendered only when selected profile allows flights */}
          {showFlightSection && (
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
          )}

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
              onChange={(e) => {
                const v = e.target.value || '';
                if (v.length > MAX_SPECIAL_REQUESTS_LENGTH) {
                  setFormErrors(prev => ({ ...prev, specialRequests: `Special requests must be at most ${MAX_SPECIAL_REQUESTS_LENGTH} characters.` }));
                  // still store truncated value
                  handleFieldChange('specialRequests', v.slice(0, MAX_SPECIAL_REQUESTS_LENGTH));
                } else {
                  // clear error if present
                  setFormErrors(prev => {
                    const copy = { ...prev };
                    delete copy.specialRequests;
                    return copy;
                  });
                  handleFieldChange('specialRequests', v);
                }
              }}
              placeholder="Any special requirements, accessibility needs, or preferences..."
            />
            {formErrors.specialRequests && (
              <FormHelperText error>{formErrors.specialRequests}</FormHelperText>
            )}
          </Grid>
        </Grid>
        )}
      </DialogContent>

      {/* Determine button label based on progress stage. Do NOT show Generate when showing success. */}
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button 
          onClick={handleClose} 
          disabled={isGenerating}
          variant="outlined"
        >
          {isGenerating ? 'Cancel' : 'Close'}
        </Button>

        {/* Only render the Generate button when not in the success state */}
        {!showSuccessState && (
          <Button 
            onClick={handleGenerate}
            disabled={isGenerating || preferencesLoading}
            variant="contained"
            startIcon={<AIIcon />}
            sx={{ ml: 1 }}
          >
            {(() => {
              if (!isGenerating) return preferencesLoading ? 'Loading Preferences...' : 'Generate Itinerary';
              // when generating, reflect detailed stage
              switch (progress?.stage) {
                case 'searching':
                  return 'Searching…';
                case 'activities':
                  return 'Finding activities…';
                case 'ai_generation':
                  return 'Generating…';
                case 'done':
                  return 'Finalizing…';
                default:
                  return 'Generating...';
              }
            })()}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AIItineraryGenerationModal;
