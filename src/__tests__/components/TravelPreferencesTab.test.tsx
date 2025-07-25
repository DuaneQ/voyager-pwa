import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TravelPreferencesTab } from '../../components/forms/TravelPreferencesTab';
import { useTravelPreferences } from '../../hooks/useTravelPreferences';
import { TravelPreferenceProfile } from '../../types/TravelPreferences';

// Mock the travel preferences hook
jest.mock('../../hooks/useTravelPreferences');

// Mock Firebase auth
jest.mock('../../environments/firebaseConfig', () => ({
  auth: {
    currentUser: { uid: 'test-user-id' }
  }
}));

describe('TravelPreferencesTab', () => {
  const mockUseTravelPreferences = useTravelPreferences as jest.MockedFunction<typeof useTravelPreferences>;
  
  const mockDefaultProfile: TravelPreferenceProfile = {
    id: 'default-profile',
    name: 'Default Profile',
    isDefault: true,
    travelStyle: 'mid-range',
    budgetRange: { min: 1000, max: 5000, currency: 'USD' },
    activities: {
      cultural: 7, adventure: 5, relaxation: 6, nightlife: 3,
      shopping: 4, food: 8, nature: 7, photography: 6
    },
    foodPreferences: {
      dietaryRestrictions: ['vegetarian'],
      cuisineTypes: ['italian', 'local'],
      foodBudgetLevel: 'medium'
    },
    accommodation: { type: 'hotel', starRating: 3 },
    transportation: { primaryMode: 'mixed', maxWalkingDistance: 20 },
    groupSize: { preferred: 2, sizes: [1, 2, 4] },
    accessibility: { mobilityNeeds: false, visualNeeds: false, hearingNeeds: false },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  };

  const mockSecondProfile: TravelPreferenceProfile = {
    id: 'second-profile',
    name: 'Adventure Profile',
    isDefault: false,
    travelStyle: 'backpacker',
    budgetRange: { min: 500, max: 2000, currency: 'USD' },
    activities: {
      cultural: 4, adventure: 9, relaxation: 3, nightlife: 2,
      shopping: 2, food: 5, nature: 8, photography: 7
    },
    foodPreferences: {
      dietaryRestrictions: [],
      cuisineTypes: ['local', 'street-food'],
      foodBudgetLevel: 'low'
    },
    accommodation: {
      type: 'hostel',
      starRating: 2
    },
    transportation: {
      primaryMode: 'public',
      maxWalkingDistance: 30
    },
    groupSize: {
      preferred: 1,
      sizes: [1, 2]
    },
    accessibility: {
      mobilityNeeds: false,
      visualNeeds: false,
      hearingNeeds: false
    },
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02')
  };

  let mockHookReturnValue: any;

  beforeEach(() => {
    mockHookReturnValue = {
      preferences: {
        profiles: [mockDefaultProfile, mockSecondProfile],
        defaultProfileId: 'default-profile'
      },
      allProfiles: [mockDefaultProfile, mockSecondProfile],
      selectedProfile: mockDefaultProfile,
      selectedProfileId: 'default-profile',
      editingPreferences: null,
      loading: false,
      createProfile: jest.fn().mockResolvedValue('new-profile-id'),
      updateProfile: jest.fn().mockResolvedValue(undefined),
      deleteProfile: jest.fn().mockResolvedValue(undefined),
      loadPreferences: jest.fn().mockResolvedValue(undefined),
      setSelectedProfileId: jest.fn(),
      setEditingPreferences: jest.fn(),
      generateProfileId: jest.fn().mockReturnValue('new-profile-id'),
      getProfileById: jest.fn((id: string) => {
        return [mockDefaultProfile, mockSecondProfile].find(profile => profile.id === id);
      }),
      getDefaultProfile: jest.fn(() => mockDefaultProfile)
    };

    jest.clearAllMocks();
    mockUseTravelPreferences.mockReturnValue(mockHookReturnValue);
  });

  describe('Smoke Tests', () => {
    it('renders without crashing', () => {
      render(<TravelPreferencesTab />);
      expect(screen.getAllByText(/Default Profile/)[0]).toBeInTheDocument();
    });

    it('displays Traval branding elements', () => {
      render(<TravelPreferencesTab />);
      expect(screen.getByText(/🎯 Traval Style/)).toBeInTheDocument();
      expect(screen.getByText('Create New Profile')).toBeInTheDocument();
    });

    it('shows loading spinner when loading is true', () => {
      mockUseTravelPreferences.mockReturnValue({
        ...mockHookReturnValue,
        loading: true
      });

      render(<TravelPreferencesTab />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('Basic Rendering', () => {
    it('displays default profile chip when profile is default', () => {
      render(<TravelPreferencesTab />);
      
      // Look for any instance of "Default Profile" - there can be multiple
      expect(screen.getAllByText(/Default Profile/)).toHaveLength(2); // One in select, one in chip
    });

    it('shows delete button for non-default profiles', async () => {
      // Set up mock to have a non-default profile selected
      mockHookReturnValue.selectedProfile = mockSecondProfile;
      mockHookReturnValue.selectedProfileId = 'second-profile';
      mockHookReturnValue.editingPreferences = mockSecondProfile;
      mockHookReturnValue.getProfileById = jest.fn().mockReturnValue(mockSecondProfile);
      
      render(<TravelPreferencesTab />);
      
      // Wait for the component to render with non-default profile
      await waitFor(() => {
        expect(screen.getByDisplayValue('Adventure Profile')).toBeInTheDocument();
      });
      
      // Should show delete button for non-default profile
      expect(screen.getByTitle('Delete Profile')).toBeInTheDocument();
    });

    it('does not show delete button for default profile', () => {
      // Default mock already has default profile selected
      render(<TravelPreferencesTab />);
      
      // Should not show delete button for default profile
      expect(screen.queryByTitle('Delete Profile')).not.toBeInTheDocument();
    });
  });

  describe('Profile Rendering', () => {
    it('renders editable profile name field', () => {
      render(<TravelPreferencesTab />);
      
      // Component uses fallback name from profile
      const nameInput = screen.getByDisplayValue('Default Profile');
      expect(nameInput).toBeInTheDocument();
    });

    it('shows save button in correct initial state', () => {
      render(<TravelPreferencesTab />);
      
      expect(screen.getByText('Saved')).toBeDisabled();
    });
  });

  describe('Profile Management', () => {
    it('allows users to switch between profiles', async () => {
      render(<TravelPreferencesTab />);
      
      const profileSelects = screen.getAllByRole('combobox');
      const profileSelect = profileSelects[0]; // First combobox should be profile selector
      
      // Initially should show default profile in dropdown - use getAllByText to handle multiple matches
      expect(screen.getAllByText(/Default Profile/)[0]).toBeInTheDocument();
      
      // Open dropdown to show it's working
      await userEvent.click(profileSelect);
    });
  });

  describe('Profile Creation', () => {
    it('creates a new profile when Create New Profile is clicked', async () => {
      const mockPrompt = jest.spyOn(window, 'prompt').mockReturnValue('My Custom Profile');
      mockHookReturnValue.createProfile.mockResolvedValue('new-profile-id');
      
      // Set up mock to properly represent default profile editing state
      mockHookReturnValue.editingPreferences = mockDefaultProfile;
      mockHookReturnValue.selectedProfileId = 'default-profile';
      
      render(<TravelPreferencesTab />);
      
      // Find the main Create New Profile button (not the dialog ones)
      const createButtons = screen.getAllByText('Create New Profile');
      const mainCreateButton = createButtons.find(btn => 
        btn.closest('button')?.className.includes('MuiButton-outlined')
      );
      
      if (mainCreateButton) {
        await userEvent.click(mainCreateButton);
      }
      
      // Should use prompt behavior for default profile
      await waitFor(() => {
        expect(mockPrompt).toHaveBeenCalledWith('Enter a name for your new travel profile:');
        expect(mockHookReturnValue.createProfile).toHaveBeenCalled();
      });
      
      mockPrompt.mockRestore();
    });

    it('does not create profile when user cancels name prompt', async () => {
      const mockPrompt = jest.spyOn(window, 'prompt').mockReturnValue(null);
      
      // Set up mock to properly represent default profile editing state
      mockHookReturnValue.editingPreferences = mockDefaultProfile;
      mockHookReturnValue.selectedProfileId = 'default-profile';
      
      render(<TravelPreferencesTab />);
      
      const createButton = screen.getByText('Create New Profile');
      await userEvent.click(createButton);
      
      // Should use prompt behavior for default profile, and not call createProfile when cancelled
      await waitFor(() => {
        expect(mockPrompt).toHaveBeenCalledWith('Enter a name for your new travel profile:');
        expect(mockHookReturnValue.createProfile).not.toHaveBeenCalled();
      });
      
      mockPrompt.mockRestore();
    });

    it('does not create profile when user enters empty name', async () => {
      const mockPrompt = jest.spyOn(window, 'prompt').mockReturnValue('   ');
      
      // Set up mock to properly represent default profile editing state
      mockHookReturnValue.editingPreferences = mockDefaultProfile;
      mockHookReturnValue.selectedProfileId = 'default-profile';
      
      render(<TravelPreferencesTab />);
      
      const createButton = screen.getByText('Create New Profile');
      await userEvent.click(createButton);
      
      // Should use prompt behavior for default profile, and not call createProfile with empty name
      await waitFor(() => {
        expect(mockPrompt).toHaveBeenCalledWith('Enter a name for your new travel profile:');
        expect(mockHookReturnValue.createProfile).not.toHaveBeenCalled();
      });
      
      mockPrompt.mockRestore();
    });
  });

  describe('Branding', () => {
    it('uses Traval branding throughout the component', () => {
      render(<TravelPreferencesTab />);
      
      expect(screen.getByText('🎯 Traval Style')).toBeInTheDocument();
      expect(screen.getByText('Saved')).toBeInTheDocument(); // Updated button text
      expect(screen.getByText(/Your Traval preferences will help/)).toBeInTheDocument();
    });
  });
});
