import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  Card,
  Chip,
  FormControlLabel,
  Switch,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Tabs,
  Tab
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import { AutoAwesome as AIIcon } from '@mui/icons-material';
import { TravelPreferenceProfile } from '../../types/TravelPreferences';
import { useTravelPreferences } from '../../hooks/useTravelPreferences';
import { useUsageTracking } from '../../hooks/useUsageTracking';
import { useAIGeneratedItineraries } from '../../hooks/useAIGeneratedItineraries';
import AIItineraryGenerationModal from '../modals/AIItineraryGenerationModal';
import AIItineraryDisplay from '../ai/AIItineraryDisplay';

export const TravelPreferencesTab: React.FC = () => {
  // Use the travel preferences hook
  const {
    preferences,
    loading,
    error,
    updateProfile,
    createProfile,
    deleteProfile,
    getProfileById,
    loadPreferences,
    resetError
  } = useTravelPreferences();

  // Get all available profiles
  const allProfiles = useMemo(() => preferences?.profiles || [], [preferences?.profiles]);
  
  // State for which profile is currently being viewed/edited
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  
  // Local state for the current editing profile (with unsaved changes)
  const [editingPreferences, setEditingPreferences] = useState<TravelPreferenceProfile | null>(null);
  
  // Track if there are unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // State for dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createProfileDialogOpen, setCreateProfileDialogOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Tab state for switching between Travel Profile and AI Itineraries
  const [activeTab, setActiveTab] = useState(0);

  // Premium status and AI itineraries
  const { hasPremium } = useUsageTracking();
  const { 
    itineraries: aiItineraries, 
    loading: aiLoading, 
    error: aiError,
    getItineraryById,
    refreshItineraries
  } = useAIGeneratedItineraries();
  
  // State for AI itinerary selection
  const [selectedAIItineraryId, setSelectedAIItineraryId] = useState<string>('');
  const [selectedAIItinerary, setSelectedAIItinerary] = useState<any>(null);

  // Initialize selected profile when preferences load
  useEffect(() => {
    if (allProfiles.length > 0 && (!selectedProfileId || selectedProfileId === 'temp-default')) {
      const defaultProfileId = preferences?.defaultProfileId || allProfiles[0]?.id;
      setSelectedProfileId(defaultProfileId);
    }
  }, [allProfiles, preferences?.defaultProfileId, selectedProfileId]);

  // Get the current selected profile from the hook
  const selectedProfile = selectedProfileId ? getProfileById?.(selectedProfileId) : null;

  // Update editing preferences when selected profile changes
  useEffect(() => {
    if (selectedProfile) {
      const profileCopy = { ...selectedProfile };
      
      // Ensure accommodation type has a valid default if undefined
      if (!profileCopy.accommodation?.type) {
        profileCopy.accommodation = {
          ...profileCopy.accommodation,
          type: 'hotel'
        };
      }
      
      setEditingPreferences(profileCopy); // Create a copy to avoid direct mutations
      setHasUnsavedChanges(false);
    }
  }, [selectedProfile]);

  // Initialize editing preferences for first-time users (no profiles)
  useEffect(() => {
    if (allProfiles.length === 0 && !editingPreferences) {
      // Create a default profile structure for first-time users
      const defaultProfile: TravelPreferenceProfile = {
        id: 'temp-default',
        name: 'My Travel Profile',
        isDefault: true,
        travelStyle: 'mid-range',
        budgetRange: {
          min: 1000,
          max: 5000,
          currency: 'USD'
        },
        activities: {
          cultural: 5,
          adventure: 5,
          relaxation: 5,
          nightlife: 5,
          shopping: 5,
          food: 5,
          nature: 5,
          photography: 5
        },
        foodPreferences: {
          dietaryRestrictions: [],
          cuisineTypes: [],
          foodBudgetLevel: 'medium'
        },
        accommodation: {
        	  type: 'hotel',
        	  starRating: 3,
        	  minUserRating: 3.5
        },
        transportation: {
          primaryMode: 'mixed',
          maxWalkingDistance: 15
        },
        groupSize: {
          preferred: 2,
          sizes: [1, 2, 4]
        },
        accessibility: {
          mobilityNeeds: false,
          visualNeeds: false,
          hearingNeeds: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
      setEditingPreferences(defaultProfile);
      setSelectedProfileId('temp-default');
      setHasUnsavedChanges(true); // Mark as unsaved since this is a new profile
    }
  }, [allProfiles.length, editingPreferences]);

  // Load preferences on component mount
  useEffect(() => {
    if (loadPreferences) {
      loadPreferences();
    }
  }, [loadPreferences]);

  // Handle AI itinerary selection
  useEffect(() => {
    const fetchSelectedItinerary = async () => {
      if (selectedAIItineraryId && getItineraryById) {
        const itinerary = await getItineraryById(selectedAIItineraryId);
        setSelectedAIItinerary(itinerary);
      } else {
        setSelectedAIItinerary(null);
      }
    };

    fetchSelectedItinerary();
  }, [selectedAIItineraryId, getItineraryById]);

  // Get current preferences with fallback defaults
  const currentPreferences = editingPreferences || {
    id: selectedProfileId || 'default',
    name: 'Default',
    // Consider it default if no profiles exist, or if the selected profile is explicitly default,
    // or if we're using the defaultProfileId
    isDefault: allProfiles.length === 0 || 
               (selectedProfile?.isDefault === true) || 
               (selectedProfileId === preferences?.defaultProfileId),
    travelStyle: 'mid-range',
    budgetRange: {
      min: 1000,
      max: 5000,
      currency: 'USD'
    },
    activities: {
      cultural: 5,
      adventure: 5,
      relaxation: 5,
      nightlife: 5,
      shopping: 5,
      food: 5,
      nature: 5,
      photography: 5
    },
    foodPreferences: {
      dietaryRestrictions: [],
      cuisineTypes: [],
      foodBudgetLevel: 'medium'
    },
    accommodation: {
      type: 'hotel',
      starRating: 3,
      minUserRating: 3.5
    },
    transportation: {
      primaryMode: 'mixed',
  maxWalkingDistance: 15
    },
    groupSize: {
      preferred: 2,
      sizes: [1, 2, 4]
    },
    accessibility: {
      mobilityNeeds: false,
      visualNeeds: false,
      hearingNeeds: false
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Save current profile to Firebase
  const saveCurrentProfile = async () => {
    if (!editingPreferences) {
      console.error('No preferences to save');
      return;
    }
    
    try {
      // If this is a temporary profile (first-time user), create it as a new profile
      if (editingPreferences.id === 'temp-default' && createProfile) {
        const { id, ...profileData } = editingPreferences;
        const newProfileId = await createProfile({
          ...profileData,
          isDefault: true
        });
        
        // Update the editing preferences with the new ID
        setEditingPreferences({
          ...editingPreferences,
          id: newProfileId
        });
        setSelectedProfileId(newProfileId);
        setHasUnsavedChanges(false);
        console.log('First travel profile created successfully with ID:', newProfileId);
        
        // Reload preferences to update the UI and show the profile selector
        if (loadPreferences) {
          await loadPreferences();
        }
      } else if (updateProfile) {
        // Update existing profile
        await updateProfile(editingPreferences.id, editingPreferences);
        setHasUnsavedChanges(false);
        console.log('Travel preferences saved successfully!');
      } else {
        console.error('No updateProfile function available');
      }
    } catch (err) {
      console.error('Failed to save preferences:', err);
    }
  };

  // Update preferences locally and mark as having unsaved changes
  const updateLocalPreferences = (updates: Partial<TravelPreferenceProfile>) => {
    // If no editing preferences exist, create from current preferences
    const basePreferences = editingPreferences || currentPreferences;
    
    const updatedPrefs = {
      ...basePreferences,
      ...updates,
      updatedAt: new Date()
    };
    setEditingPreferences(updatedPrefs);
    setHasUnsavedChanges(true);
  };

  const handleActivityChange = (activity: keyof typeof currentPreferences.activities, value: number) => {
    updateLocalPreferences({
      activities: {
        ...currentPreferences.activities,
        [activity]: value
      }
    });
  };

  const handleBudgetChange = (event: Event, newValue: number | number[]) => {
    const [min, max] = newValue as number[];
    updateLocalPreferences({
      budgetRange: {
        ...currentPreferences.budgetRange,
        min,
        max
      }
    });
  };

  const handleTravelStyleChange = (style: TravelPreferenceProfile['travelStyle']) => {
    updateLocalPreferences({
      travelStyle: style
    });
  };

  const handleDietaryRestrictionToggle = (restriction: string) => {
    updateLocalPreferences({
      foodPreferences: {
        ...currentPreferences.foodPreferences,
        dietaryRestrictions: currentPreferences.foodPreferences.dietaryRestrictions.includes(restriction)
          ? currentPreferences.foodPreferences.dietaryRestrictions.filter(r => r !== restriction)
          : [...currentPreferences.foodPreferences.dietaryRestrictions, restriction]
      }
    });
  };

  const handleCuisineTypeToggle = (cuisine: string) => {
    updateLocalPreferences({
      foodPreferences: {
        ...currentPreferences.foodPreferences,
        cuisineTypes: currentPreferences.foodPreferences.cuisineTypes.includes(cuisine)
          ? currentPreferences.foodPreferences.cuisineTypes.filter(c => c !== cuisine)
          : [...currentPreferences.foodPreferences.cuisineTypes, cuisine]
      }
    });
  };

  // Helper function to update food preferences
  const updateFoodPreferences = (updates: Partial<typeof currentPreferences.foodPreferences>) => {
    updateLocalPreferences({
      foodPreferences: {
        ...currentPreferences.foodPreferences,
        ...updates
      }
    });
  };  // Helper function to update accommodation preferences
  const updateAccommodation = (updates: Partial<typeof currentPreferences.accommodation>) => {
    const defaultAccommodation = {
      type: 'hotel' as const,
      starRating: 3
    };
    
    updateLocalPreferences({
      accommodation: {
        ...defaultAccommodation,
        ...currentPreferences.accommodation,
        ...updates
      }
    });
  };

  // Helper function to update transportation preferences
  const updateTransportation = (updates: Partial<typeof currentPreferences.transportation>) => {
    // If the incoming update sets primaryMode to 'airplane', ensure we also set includeFlights
    const merged = {
      ...currentPreferences.transportation,
      ...updates
    } as any;

    if (merged.primaryMode === 'airplane') {
      merged.includeFlights = true;
    }

    updateLocalPreferences({
      transportation: merged
    });
  };

  // Helper function to update group size preferences
  const updateGroupSize = (updates: Partial<typeof currentPreferences.groupSize>) => {
    updateLocalPreferences({
      groupSize: {
        ...currentPreferences.groupSize,
        ...updates
      }
    });
  };

  // Helper function to update accessibility preferences
  const updateAccessibility = (updates: Partial<typeof currentPreferences.accessibility>) => {
    updateLocalPreferences({
      accessibility: {
        ...currentPreferences.accessibility,
        ...updates
      }
    });
  };

  // Handle profile name input changes
  const handleProfileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateLocalPreferences({ name: e.target.value });
  };

  // Handle profile switching
  const handleProfileSwitch = async (newProfileId: string) => {
    if (newProfileId === selectedProfileId) return;
    
    try {
      // Save current profile if there are unsaved changes
      if (hasUnsavedChanges && editingPreferences && updateProfile) {
        await updateProfile(editingPreferences.id, editingPreferences);
        setHasUnsavedChanges(false);
      }
      
      // Switch to new profile
      setSelectedProfileId(newProfileId);
    } catch (err) {
      console.error('Failed to switch profiles:', err);
    }
  };

  // Handle profile deletion
  const handleDeleteProfile = async () => {
    if (!deleteProfile || currentPreferences.isDefault) return;
    
    try {
      await deleteProfile(currentPreferences.id);
      setDeleteDialogOpen(false);
      
      // Switch to first available profile or default
      const remainingProfiles = allProfiles.filter(p => p.id !== currentPreferences.id);
      if (remainingProfiles.length > 0) {
        setSelectedProfileId(remainingProfiles[0].id);
      }
    } catch (err) {
      console.error('Failed to delete profile:', err);
    }
  };

  // Smart profile creation logic
  const createNewProfile = async () => {
    if (!currentPreferences || !createProfile) {
      console.error('No current preferences to base new profile on or createProfile function not available');
      return;
    }
    
    // If this is the first profile being created (temp-default), just save it
    if (currentPreferences.id === 'temp-default') {
      await saveCurrentProfile();
      return;
    }
    
    // Check if user is on an existing non-default profile
    if (!currentPreferences.isDefault && allProfiles.length > 1) {
      setCreateProfileDialogOpen(true);
      return;
    }
    
    // Original logic for creating additional profiles
    try {
      const profileName = prompt('Enter a name for your new travel profile:');
      
      if (!profileName || profileName.trim() === '') {
        console.log('Profile creation cancelled or empty name provided');
        return;
      }
      
      const { id, createdAt, updatedAt, isDefault, ...profileData } = currentPreferences;
      
      const newProfileId = await createProfile({
        ...profileData,
        name: profileName.trim(),
        isDefault: false
      });
      
      console.log('New Travel profile created with ID:', newProfileId);
      
      // Switch to the newly created profile
      setSelectedProfileId(newProfileId);
    } catch (err) {
      console.error('Failed to create new profile:', err);
    }
  };

  // Handle creating new profile from dialog
  const handleCreateNewFromDialog = async () => {
    const profileName = prompt('Enter a name for your new travel profile:');
    
    if (!profileName || profileName.trim() === '') {
      setCreateProfileDialogOpen(false);
      return;
    }
    
    try {
      const { id, createdAt, updatedAt, isDefault, ...profileData } = currentPreferences;
      
      const newProfileId = await createProfile({
        ...profileData,
        name: profileName.trim(),
        isDefault: false
      });
      
      console.log('New Travel profile created with ID:', newProfileId);
      
      // Switch to the newly created profile
      setSelectedProfileId(newProfileId);
      setCreateProfileDialogOpen(false);
    } catch (err) {
      console.error('Failed to create new profile:', err);
      setCreateProfileDialogOpen(false);
    }
  };

  // Handle overwriting existing profile from dialog
  const handleOverwriteProfile = async () => {
    // Just close dialog - user can continue editing current profile
    setCreateProfileDialogOpen(false);
  };

  const savePreferences = saveCurrentProfile;

  // AI Modal handlers
  const handleOpenAIModal = () => {
    setAiModalOpen(true);
  };

  const handleCloseAIModal = () => {
    setAiModalOpen(false);
  };

  const handleAIGenerated = async (result: any) => {
    console.log('🎯 [DEBUG] handleAIGenerated called with result:', result);
    
    try {
      // Immediately refresh the AI itineraries list to show the new one
      console.log('🔄 [DEBUG] Starting AI itineraries refresh...');
      if (refreshItineraries) {
        console.log('🔄 [DEBUG] refreshItineraries function exists, calling it...');
        await refreshItineraries();
        console.log('✅ [DEBUG] AI itineraries refreshed successfully');
      } else {
        console.warn('⚠️ [DEBUG] refreshItineraries function not available!');
      }

      // Extract the generation ID from the result to auto-select it
      const newItineraryId = result?.id || result?.data?.metadata?.generationId;
      console.log('🎯 [DEBUG] Extracted generation ID:', newItineraryId);
      if (newItineraryId) {
        console.log('🎯 [DEBUG] Auto-selecting new itinerary:', newItineraryId);
        setSelectedAIItineraryId(newItineraryId);
        console.log('🎯 [DEBUG] setSelectedAIItineraryId called');
      } else {
        console.warn('⚠️ [DEBUG] No itinerary ID found in result');
      }

      // Switch to AI Itineraries tab to show the new result
      console.log('📋 [DEBUG] Switching to AI Itineraries tab (index 1)');
      setActiveTab(1);
      console.log('📋 [DEBUG] setActiveTab(1) called');
      
      // Close the AI modal
      console.log('❌ [DEBUG] Closing AI modal');
      setAiModalOpen(false);
      console.log('❌ [DEBUG] setAiModalOpen(false) called');
      
      console.log('🎉 [DEBUG] handleAIGenerated completed successfully');
    } catch (error) {
      console.error('❌ [DEBUG] Error in handleAIGenerated:', error);
      // Still switch to the tab even if there's an error
      setActiveTab(1);
      setAiModalOpen(false);
    }
  };

  const ActivitySlider = ({ 
    label, 
    activity, 
    icon,
    description
  }: { 
    label: string; 
    activity: keyof typeof currentPreferences.activities;
    icon: string;
    description: string;
  }) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="body2" sx={{ color: 'white', mb: 1, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
        {icon} {label}
      </Typography>
      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', mb: 1, display: 'block', fontSize: '0.7rem' }}>
        {description}
      </Typography>
      <Slider
        value={currentPreferences.activities[activity]}
        onChange={(_, value) => handleActivityChange(activity, value as number)}
        min={0}
        max={10}
        step={1}
        marks={[
          { value: 0, label: 'Never' },
          { value: 5, label: 'Sometimes' },
          { value: 10, label: 'Always' }
        ]}
        sx={{
          color: 'white',
          '& .MuiSlider-markLabel': {
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '0.6rem'
          },
          '& .MuiSlider-valueLabel': {
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            color: 'black'
          }
        }}
        valueLabelDisplay="auto"
      />
    </Box>
  );

  return (
    <Box sx={{ width: '100%' }}>
      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error State */}
      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={resetError}
        >
          {error.userMessage}
        </Alert>
      )}

      {/* Main Tabs */}
      <Box sx={{ width: '100%' }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          sx={{
            mb: 2,
            '& .MuiTab-root': {
              color: 'rgba(255, 255, 255, 0.7)',
              fontWeight: 500,
            },
            '& .Mui-selected': {
              color: 'white !important',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#4CAF50',
            },
          }}
        >
          <Tab label="Traval Profile" />
          <Tab label="AI Itineraries" />
        </Tabs>

        {/* Travel Profile Tab Content */}
        {activeTab === 0 && (
          <Box>

      {/* AI Itinerary Generation - Top Priority Section */}
      {!loading && (
        <Card sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <Typography variant="h6" sx={{ color: 'white', mb: 2, fontSize: { xs: '1rem', sm: '1.1rem' } }}>
            🤖 AI Itinerary Generation
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 2 }}>
            Use AI to generate personalized travel itineraries based on your preferences.
            Use the Traval Profile options below to define your Traval preferences.
          </Typography>
          <Button
            variant="contained"
            onClick={handleOpenAIModal}
            startIcon={<AIIcon />}
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(45deg, #1976D2 30%, #00BCD4 90%)',
              },
            }}
          >
            Generate AI Itinerary
          </Button>
        </Card>
      )}

      {/* Profile Header */}
      <Card sx={{
        p: { xs: 1.5, sm: 2 },
        mb: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        {/* Profile Selection Dropdown */}
        {allProfiles.length > 0 && (
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: 200, flex: 1 }}>
              <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Select Profile</InputLabel>
              <Select
                value={selectedProfileId === 'temp-default' ? '' : selectedProfileId || ''}
                onChange={(e) => handleProfileSwitch(e.target.value)}
                sx={{
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '& .MuiSvgIcon-root': {
                    color: 'white',
                  },
                }}
              >
                {allProfiles.map((profile) => (
                  <MenuItem key={profile.id} value={profile.id}>
                    {profile.name} {profile.isDefault && '(Default)'}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {/* Delete Profile Button - Only show for non-default profiles */}
            {!currentPreferences.isDefault && currentPreferences.id !== 'temp-default' && (
              <IconButton
                onClick={() => setDeleteDialogOpen(true)}
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  '&:hover': {
                    color: 'rgba(255, 100, 100, 0.8)',
                    backgroundColor: 'rgba(255, 100, 100, 0.1)'
                  }
                }}
                title="Delete Profile"
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
        )}
        
        {/* Profile Name Input */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
          <Typography variant="h6" sx={{ color: 'white', fontSize: { xs: '1rem', sm: '1.1rem' } }}>
            ✈️
          </Typography>
          <TextField
            value={currentPreferences.name}
            onChange={handleProfileNameChange}
            variant="standard"
            placeholder="Enter Travel profile name"
            sx={{
              flex: 1,
              '& .MuiInputBase-input': {
                color: 'white',
                fontSize: { xs: '1rem', sm: '1.1rem' },
                fontWeight: 600,
                padding: '4px 0',
                backgroundColor: 'transparent',
              },
              '& .MuiInputBase-input::placeholder': {
                color: 'rgba(255, 255, 255, 0.5)',
                opacity: 1,
              },
              '& .MuiInput-underline:before': {
                borderBottomColor: 'rgba(255, 255, 255, 0.3)',
              },
              '& .MuiInput-underline:hover:before': {
                borderBottomColor: 'rgba(255, 255, 255, 0.6)',
              },
              '& .MuiInput-underline:after': {
                borderBottomColor: 'white',
              },
            }}
          />
        </Box>
        {currentPreferences.isDefault && (
          <Chip 
            label="Default Profile" 
            size="small" 
            sx={{ 
              backgroundColor: 'rgba(76, 175, 80, 0.2)', 
              color: '#81C784',
              fontSize: '0.7rem',
              mr: 1
            }} 
          />
        )}
        {hasUnsavedChanges && (
          <Chip 
            label="Unsaved Changes" 
            size="small" 
            sx={{ 
              backgroundColor: 'rgba(255, 152, 0, 0.2)', 
              color: '#FFB74D',
              fontSize: '0.7rem'
            }} 
          />
        )}
      </Card>

      {/* Travel Style Selection */}
      <Card sx={{
        p: { xs: 1.5, sm: 2 },
        mb: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}>
        <Typography variant="h6" sx={{ color: 'white', mb: 2, fontSize: { xs: '1rem', sm: '1.1rem' } }}>
          🎯 Traval Style
        </Typography>
        <FormControl fullWidth>
          <InputLabel id="travel-style-label" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Style</InputLabel>
          <Select
            labelId="travel-style-label"
            id="travel-style-select"
            label="Style"
            value={currentPreferences.travelStyle}
            onChange={(e) => handleTravelStyleChange(e.target.value as TravelPreferenceProfile['travelStyle'])}
            sx={{
              color: 'white',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(255, 255, 255, 0.3)',
              },
              '& .MuiSvgIcon-root': {
                color: 'white',
              },
            }}
          >
            <MenuItem value="budget">💰 Budget Traval</MenuItem>
            <MenuItem value="mid-range">🏨 Mid-Range Traval</MenuItem>
            <MenuItem value="luxury">✨ Luxury Traval</MenuItem>
            <MenuItem value="backpacker">🎒 Backpacker</MenuItem>
          </Select>
        </FormControl>
      </Card>
      {/* Activity Preferences Accordion */}
      <Accordion sx={{
        mb: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        '&:before': { display: 'none' }
      }}>
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
          sx={{ color: 'white' }}
        >
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>
            🎯 Activity Preferences
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <ActivitySlider 
                label="Cultural Sites" 
                activity="cultural" 
                icon="🏛️" 
                description="Museums, historical sites, heritage"
              />
              <ActivitySlider 
                label="Adventure" 
                activity="adventure" 
                icon="🚵" 
                description="Hiking, extreme sports, thrills"
              />
              <ActivitySlider 
                label="Relaxation" 
                activity="relaxation" 
                icon="🧘" 
                description="Spa, beaches, wellness"
              />
              <ActivitySlider 
                label="Nightlife" 
                activity="nightlife" 
                icon="🌃" 
                description="Bars, clubs, entertainment"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <ActivitySlider 
                label="Shopping" 
                activity="shopping" 
                icon="🛍️" 
                description="Markets, malls, boutiques"
              />
              <ActivitySlider 
                label="Food & Dining" 
                activity="food" 
                icon="🍽️" 
                description="Restaurants, food tours, cuisine"
              />
              <ActivitySlider 
                label="Nature" 
                activity="nature" 
                icon="🌲" 
                description="Parks, wildlife, outdoors"
              />
              <ActivitySlider 
                label="Photography" 
                activity="photography" 
                icon="📸" 
                description="Scenic spots, landmarks"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Food Preferences Accordion */}
      <Accordion sx={{
        mb: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        '&:before': { display: 'none' }
      }}>
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
          sx={{ color: 'white' }}
        >
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>
            🍽️ Food Preferences
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
                Dietary Restrictions
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {['Vegetarian', 'Vegan', 'Gluten-Free', 'Halal', 'Kosher', 'Dairy-Free'].map((restriction) => (
                  <Chip
                    key={restriction}
                    label={restriction}
                    clickable
                    onClick={() => handleDietaryRestrictionToggle(restriction.toLowerCase())}
                    sx={{
                      backgroundColor: currentPreferences.foodPreferences.dietaryRestrictions.includes(restriction.toLowerCase())
                        ? 'rgba(76, 175, 80, 0.3)'
                        : 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '0.7rem',
                      '&:hover': {
                        backgroundColor: 'rgba(76, 175, 80, 0.2)'
                      }
                    }}
                  />
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
                Cuisine Types
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {['Italian', 'Asian', 'Mexican', 'French', 'Indian', 'Local', 'Street Food', 'Fine Dining'].map((cuisine) => (
                  <Chip
                    key={cuisine}
                    label={cuisine}
                    clickable
                    onClick={() => handleCuisineTypeToggle(cuisine.toLowerCase())}
                    sx={{
                      backgroundColor: currentPreferences.foodPreferences.cuisineTypes.includes(cuisine.toLowerCase())
                        ? 'rgba(76, 175, 80, 0.3)'
                        : 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '0.7rem',
                      '&:hover': {
                        backgroundColor: 'rgba(76, 175, 80, 0.2)'
                      }
                    }}
                  />
                ))}
              </Box>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
              Food Budget Level
            </Typography>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={currentPreferences.foodPreferences.foodBudgetLevel}
                onChange={(e) => updateFoodPreferences({
                  foodBudgetLevel: e.target.value as 'low' | 'medium' | 'high'
                })}
                sx={{
                  color: 'white',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '& .MuiSvgIcon-root': {
                    color: 'white',
                  },
                }}
              >
                <MenuItem value="low">💸 Budget-Friendly</MenuItem>
                <MenuItem value="medium">🍽️ Moderate</MenuItem>
                <MenuItem value="high">🥂 Premium</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </AccordionDetails>
      </Accordion>
        {/* Transportation Type Selector (styled like Travel Style) */}
        <Card sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}>
          <Typography variant="h6" sx={{ color: 'white',  mb: 2, fontSize: { xs: '1rem', sm: '1.1rem' }, textAlign: 'left' }}>
            🚍 Transport Type
          </Typography>
          <FormControl fullWidth>
            <InputLabel sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>Type</InputLabel>
            <Select
              value={currentPreferences.transportation?.primaryMode || 'mixed'}
              onChange={(e) => updateTransportation({ primaryMode: e.target.value as TravelPreferenceProfile['transportation']['primaryMode'] })}
              sx={{
                color: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '& .MuiSvgIcon-root': {
                  color: 'white',
                },
              }}
            >
              <MenuItem value="walking">🚶 Walking</MenuItem>
              <MenuItem value="rental">🚗 Driving (rental)</MenuItem>
              <MenuItem value="train">🚄 Train</MenuItem>
              <MenuItem value="bus">🚌 Bus</MenuItem>
              <MenuItem value="airplane">✈️ Flights</MenuItem>
              <MenuItem value="public">🚇 Public Transit</MenuItem>
            </Select>
          </FormControl>
        </Card>
      {/* Accommodations Accordion */}
      <Accordion sx={{
        mb: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        '&:before': { display: 'none' }
      }}>
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
          sx={{ color: 'white' }}
        >
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>
            🏨 Accommodations
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              {/* Accommodation type preference removed: Places API cannot reliably enforce subtype filtering. */}
              
              <Typography variant="subtitle2" sx={{ color: 'white', mt: 2, mb: 1 }}>
                Star Rating Preference
              </Typography>
              <Slider
                value={currentPreferences.accommodation?.starRating || 3}
                onChange={(_, value) => updateAccommodation({
                  starRating: value as number
                })}
                min={1}
                max={5}
                step={1}
                marks={[
                  { value: 1, label: '1⭐' },
                  { value: 3, label: '3⭐' },
                  { value: 5, label: '5⭐' }
                ]}
                sx={{
                  color: 'white',
                  '& .MuiSlider-markLabel': {
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.6rem'
                  }
                }}
                valueLabelDisplay="auto"
              />
              <Typography variant="subtitle2" sx={{ color: 'white', mt: 2, mb: 1 }}>
                Minimum user rating
              </Typography>
              <Slider
                value={currentPreferences.accommodation?.minUserRating ?? 3.5}
                onChange={(_, value) => updateAccommodation({
                  minUserRating: value as number
                })}
                min={1}
                max={5}
                step={0.5}
                marks={[
                  { value: 1, label: '1.0' },
                  { value: 3.5, label: '3.5' },
                  { value: 5, label: '5.0' }
                ]}
                sx={{
                  color: 'white',
                  '& .MuiSlider-markLabel': {
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '0.6rem'
                  }
                }}
                valueLabelDisplay="auto"
              />
            </Grid>
            
            {/* Transportation Mode and Include Flights removed — transportation.primaryMode should be managed elsewhere */}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Group Size & Accessibility */}
      <Accordion sx={{
        mb: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        '&:before': { display: 'none' }
      }}>
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon sx={{ color: 'white' }} />}
          sx={{ color: 'white' }}
        >
          <Typography variant="h6" sx={{ fontSize: { xs: '1rem', sm: '1.1rem' } }}>
            👥 Group & Accessibility
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
                Preferred Group Size
              </Typography>
              <TextField
                type="number"
                value={currentPreferences.groupSize.preferred}
                onChange={(e) => updateGroupSize({
                  preferred: parseInt(e.target.value) || 1
                })}
                size="small"
                inputProps={{ min: 1, max: 20 }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    color: 'white',
                    '& fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.3)',
                    },
                    '&:hover fieldset': {
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                    },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
                Accessibility Needs
              </Typography>
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={currentPreferences.accessibility.mobilityNeeds}
                      onChange={(e) => updateAccessibility({
                        mobilityNeeds: e.target.checked
                      })}
                      sx={{ color: 'white' }}
                    />
                  }
                  label="Mobility Assistance"
                  sx={{ color: 'white', fontSize: '0.8rem' }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={currentPreferences.accessibility.visualNeeds}
                      onChange={(e) => updateAccessibility({
                        visualNeeds: e.target.checked
                      })}
                      sx={{ color: 'white' }}
                    />
                  }
                  label="Visual Assistance"
                  sx={{ color: 'white', fontSize: '0.8rem' }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={currentPreferences.accessibility.hearingNeeds}
                      onChange={(e) => updateAccessibility({
                        hearingNeeds: e.target.checked
                      })}
                      sx={{ color: 'white' }}
                    />
                  }
                  label="Hearing Assistance"
                  sx={{ color: 'white', fontSize: '0.8rem' }}
                />
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* AI Learning Alert */}
      <Alert 
        severity="info" 
        sx={{ 
          mb: 2, 
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          color: 'white',
          '& .MuiAlert-icon': {
            color: '#64B5F6'
          }
        }}
      >
        🧠 Your Traval preferences will help our AI create personalized itineraries. The more you use and rate our suggestions, the smarter they become!
      </Alert>

      {/* First-time user guidance */}
      {allProfiles.length === 0 && (
        <Alert 
          severity="success" 
          sx={{ 
            mb: 2, 
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            color: 'white',
            '& .MuiAlert-icon': {
              color: '#81C784'
            }
          }}
        >
          🎉 Welcome! Customize your preferences below and then create your first travel profile to get started with personalized itineraries.
        </Alert>
      )}

      {/* Save and Create Profile Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 3 }}>
        {/* Show different button for first-time users */}
        {allProfiles.length === 0 ? (
          <Button
            variant="contained"
            sx={{
              backgroundColor: 'rgba(33, 150, 243, 0.8)', // Blue for first-time creation
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(33, 150, 243, 1)',
              },
              px: 4,
              py: 1.2,
              fontSize: '1rem'
            }}
            onClick={saveCurrentProfile}
            disabled={!hasUnsavedChanges}
          >
            Create My Travel Profile
          </Button>
        ) : (
          <>
            <Button
              variant="outlined"
              sx={{
                borderColor: 'rgba(255, 255, 255, 0.3)',
                color: 'white',
                '&:hover': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)'
                },
                px: 3
              }}
              onClick={createNewProfile}
            >
              {currentPreferences.id === 'temp-default' ? 'Save Profile' : 'Create New Profile'}
            </Button>
            <Button
              variant="contained"
              sx={{
                backgroundColor: hasUnsavedChanges 
                  ? 'rgba(255, 152, 0, 0.8)' // Orange for unsaved changes
                  : 'rgba(76, 175, 80, 0.8)', // Green for saved
                color: 'white',
                '&:hover': {
                  backgroundColor: hasUnsavedChanges 
                    ? 'rgba(255, 152, 0, 1)' 
                    : 'rgba(76, 175, 80, 1)',
                },
                px: 4,
                py: 1
              }}
              onClick={savePreferences}
              disabled={!hasUnsavedChanges}
            >
              {hasUnsavedChanges ? 'Save Changes' : 'Saved'}
            </Button>
          </>
        )}
      </Box>
          </Box>
        )}

        {/* AI Generated Itineraries Tab Content */}
        {activeTab === 1 && (
          <Box>
            {/* Show loading state */}
            {aiLoading && (
              <Card sx={{
                p: { xs: 2, sm: 3 },
                mb: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'center'
              }}>
                <Typography color="rgba(255, 255, 255, 0.7)">
                  Loading your AI generated itineraries...
                </Typography>
              </Card>
            )}

            {/* Show no itineraries message ONLY when not loading and no itineraries */}
            {!aiLoading && aiItineraries.length === 0 && (
              <Card sx={{
                p: { xs: 2, sm: 3 },
                mb: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'center'
              }}>
                <Typography
                  variant="body1"
                  sx={{
                    color: 'white',
                    fontSize: '0.875rem',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-wrap'
                  }}>
                  🤖 No AI Generated Itineraries Yet
                  
                  Generate your first AI itinerary using the "Traval Profile" tab above! 
                  After choosing a travel profile and generating an itinerary with AI, 
                  you'll be able to select and review them from this tab.
                  
                  Your generated itineraries will appear here until their travel dates expire.
                </Typography>
              </Card>
            )}

            {/* AI Itinerary Selection Dropdown - ALWAYS show when user has itineraries */}
            {!aiLoading && aiItineraries.length > 0 && (
              <Card sx={{
                p: { xs: 1.5, sm: 2 },
                mb: 2,
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}>
                <Typography variant="h6" sx={{ color: 'white', mb: 2, fontSize: { xs: '1rem', sm: '1.1rem' } }}>
                  🤖 Your AI Generated Itineraries ({aiItineraries.length})
                </Typography>
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel sx={{ 
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&.Mui-focused': {
                      color: 'white',
                    },
                    '&.MuiInputLabel-shrunk': {
                      color: 'white',
                    }
                  }}>
                    Select Itinerary
                  </InputLabel>
                  <Select
                    value={selectedAIItineraryId}
                    onChange={(e) => setSelectedAIItineraryId(e.target.value)}
                    displayEmpty
                    sx={{
                      color: 'white',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'white',
                      },
                      '& .MuiSvgIcon-root': {
                        color: 'white',
                      },
                      '& .MuiSelect-select': {
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      },
                    }}
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 300,
                          maxWidth: 400,
                        },
                      },
                    }}
                  >
                    {aiItineraries.map((itinerary) => (
                      <MenuItem key={itinerary.id} value={itinerary.id}>
                        <Box sx={{ width: "100%" }}>
                          <Typography
                            variant="body1"
                            sx={{
                              color: "black",
                              fontWeight: 500,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}>
                            {itinerary.destination || itinerary.response?.data?.itinerary?.destination}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              color: "rgba(0, 0, 0, 0.6)",
                              fontSize: "0.875rem",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}>
                            {itinerary.response?.data?.itinerary?.startDate || itinerary.startDate} - {itinerary.response?.data?.itinerary?.endDate || itinerary.endDate}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {aiError && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {aiError}
                  </Alert>
                )}
              </Card>
            )}

            {/* Display Selected AI Itinerary */}
            {selectedAIItinerary && (
              <AIItineraryDisplay itinerary={selectedAIItinerary} />
            )}
          </Box>
        )}
      </Box>

      {/* Delete Profile Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete Profile</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the profile "{currentPreferences.name}"? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteProfile} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Create Profile Dialog */}
      <Dialog
        open={createProfileDialogOpen}
        onClose={() => setCreateProfileDialogOpen(false)}
      >
        <DialogTitle>Create New Profile</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You're currently editing "{currentPreferences.name}". Would you like to:
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateProfileDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleOverwriteProfile}>
            Continue Editing Current
          </Button>
          <Button onClick={handleCreateNewFromDialog} variant="contained">
            Create New Profile
          </Button>
        </DialogActions>
      </Dialog>

      {/* AI Itinerary Generation Modal */}
      <AIItineraryGenerationModal
        open={aiModalOpen}
        onClose={handleCloseAIModal}
        onGenerated={handleAIGenerated}
      />
    </Box>
  );
};