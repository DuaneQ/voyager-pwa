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
  Card,
  CardContent,
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
    departure: '',
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
  const [estimatedCost, setEstimatedCost] = useState<number | null>(null);
  const [mustIncludeInput, setMustIncludeInput] = useState('');
  const [mustAvoidInput, setMustAvoidInput] = useState('');

  // Initialize preference profile when available
  useEffect(() => {
    if (preferences && !formData.preferenceProfileId) {
      const defaultProfile = getDefaultProfile();
      if (defaultProfile) {
        setFormData(prev => ({
          ...prev,
          preferenceProfileId: defaultProfile.id
        }));
      }
    }
  }, [preferences, formData.preferenceProfileId, getDefaultProfile]);

  // Simple client-side cost estimation to avoid API rate limiting
  useEffect(() => {
    const calculateLocalEstimate = () => {
      if (formData.destination && formData.startDate && formData.endDate && formData.preferenceProfileId) {
        try {
          const profile = getProfileById(formData.preferenceProfileId);
          if (profile) {
            const duration = Math.ceil(
              (new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24)
            );
            
            // Simple estimation based on profile budget range and duration
            const baseCost = profile.budgetRange?.max || 1000;
            const groupMultiplier = profile.groupSize?.preferred || 1;
            const estimatedCost = Math.min(baseCost, baseCost * 0.8 * duration * groupMultiplier);
            
            setEstimatedCost(Math.round(estimatedCost));
          }
        } catch (err) {
          console.warn('Failed to calculate local estimate:', err);
          setEstimatedCost(null);
        }
      } else {
        setEstimatedCost(null);
      }
    };

    // Only calculate local estimate, no API calls
    calculateLocalEstimate();
  }, [formData.destination, formData.startDate, formData.endDate, formData.preferenceProfileId, getProfileById]);

  // Handle form field changes
  const handleFieldChange = useCallback((field: keyof AIGenerationRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear related errors
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  }, [formErrors]);

  // Validation
  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    // Always validate destination
    if (!formData.destination || !formData.destination.trim()) {
      errors.destination = 'Destination is required';
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
    if (!validateForm()) {
      return;
    }

    // Check if preferences are still loading
    if (preferencesLoading) {
      console.warn('⚠️ Preferences are still loading, cannot generate itinerary');
      return;
    }

    // Additional validation: ensure the selected profile exists
    const selectedProfile = getProfileById(formData.preferenceProfileId);
    if (!selectedProfile) {
      console.error('❌ Selected profile not found:', formData.preferenceProfileId);
      console.error('Available profiles:', preferences?.profiles?.map(p => ({ id: p.id, name: p.name })));
      return;
    }

    console.log('✅ Profile validation passed:', selectedProfile.name);

    try {
      const result = await generateItinerary(formData);
      onGenerated?.(result);
    } catch (err) {
      console.error('Generation failed:', err);
    }
  }, [formData, validateForm, generateItinerary, onGenerated, preferencesLoading, getProfileById, preferences?.profiles]);

  // Handle modal close
  const handleClose = useCallback(() => {
    if (isGenerating) {
      cancelGeneration();
    }
    resetGeneration();
    onClose();
  }, [isGenerating, cancelGeneration, resetGeneration, onClose]);

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
        {/* Generation Progress */}
        {isGenerating && progress && progress.stages && (
          <AIGenerationProgress
            stages={progress.stages}
            currentStage={progress.stage}
            totalStages={progress.totalStages}
            progress={(progress.stage / progress.totalStages) * 100}
            message={progress.message}
            estimatedTimeRemaining={progress.estimatedTimeRemaining}
            onCancel={cancelGeneration}
            showCancel={true}
            error={error}
          />
        )}

        {/* Error Display - Only show if not generating */}
        {error && !isGenerating && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => resetGeneration()}>
            {error}
          </Alert>
        )}

        {/* Form Content - Hide when generating */}
        {!isGenerating && (
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
                apiKey={process.env.REACT_APP_GOOGLE_PLACES_API_KEY}
                selectProps={{
                  value: formData.departure ? { label: formData.departure, value: formData.departure } : null,
                  onChange: (selected: any) => {
                    handleFieldChange('departure', selected?.label || '');
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

          {/* Destination */}
          <Grid item xs={12}>
            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>
                Destination *
              </Typography>
              <GooglePlacesAutocomplete
                apiKey={process.env.REACT_APP_GOOGLE_PLACES_API_KEY}
                selectProps={{
                  value: formData.destination ? { label: formData.destination, value: formData.destination } : null,
                  onChange: (selected: any) => {
                    handleFieldChange('destination', selected?.label || '');
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
              These preferences will help us find the best flight options for your trip
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

          {/* Cost Estimate */}
          {estimatedCost && (
            <Grid item xs={12}>
              <Card variant="outlined" sx={{ bgcolor: 'background.default' }}>
                <CardContent sx={{ py: 2 }}>
                  <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                    Estimated Cost: ${estimatedCost.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {(() => {
                      const profile = getProfileById(formData.preferenceProfileId);
                      const groupSize = profile?.groupSize?.preferred || 1;
                      return `$${Math.round(estimatedCost / groupSize).toLocaleString()} per person`;
                    })()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    * Rough estimate based on your preferences. Detailed cost breakdown will be provided with your AI-generated itinerary.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
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
