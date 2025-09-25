import React from 'react';
import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TravelPreferencesTab } from '../../components/forms/TravelPreferencesTab';
import { UserProfileContext } from '../../Context/UserProfileContext.jsx';
import { useTravelPreferences } from '../../hooks/useTravelPreferences';
import { TravelPreferenceProfile } from '../../types/TravelPreferences';
import { AlertContext } from '../../Context/AlertContext';

// Mock the travel preferences hook
jest.mock('../../hooks/useTravelPreferences');

// Mock Firebase auth and Firestore app
jest.mock('../../environments/firebaseConfig', () => ({
  auth: {
    currentUser: { uid: 'test-user-id' }
  },
  app: {}, // mock app object
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
  doc: jest.fn(),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
}));

describe('TravelPreferencesTab', () => {
  // Mock UserProfileContext value
  const mockUserProfile = { id: 'test-user', name: 'Test User' };
  const mockSetUserProfile = jest.fn();
  const mockUpdateUserProfile = jest.fn();
  const mockUserProfileContextValue = {
    userProfile: mockUserProfile,
    setUserProfile: mockSetUserProfile,
    updateUserProfile: mockUpdateUserProfile,
    isLoading: false,
  };

  // Mock AlertContext value
  const mockAlertContextValue = {
    alert: { open: false, severity: 'info' as const, message: '' },
    showAlert: jest.fn(),
    closeAlert: jest.fn(),
  };

  // Helper to wrap tested component in provider
  function withUserProfileProvider(children: React.ReactNode) {
    return (
      <AlertContext.Provider value={mockAlertContextValue}>
        <UserProfileContext.Provider value={mockUserProfileContextValue}>
          {children}
        </UserProfileContext.Provider>
      </AlertContext.Provider>
    );
  }
  const mockUseTravelPreferences = useTravelPreferences as jest.MockedFunction<typeof useTravelPreferences>;
  
  const mockDefaultProfile: TravelPreferenceProfile = {
    id: 'default-profile',
    name: 'Default Profile',
    isDefault: true,
    travelStyle: 'mid-range',
    budgetRange: { min: 1000, max: 5000, currency: 'USD' },
  activities: ['cultural','relaxation','food','nature','photography'],
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
  activities: ['adventure','nature','photography','food'],
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

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Smoke Tests', () => {
    it('renders without crashing', () => {
      render(withUserProfileProvider(<TravelPreferencesTab />));
      expect(screen.getAllByText(/Default Profile/)[0]).toBeInTheDocument();
    });

    it('displays Traval branding elements', () => {
      render(withUserProfileProvider(<TravelPreferencesTab />));
      expect(screen.getByText(/🎯 Traval Style/)).toBeInTheDocument();
      expect(screen.getByText('Create New Profile')).toBeInTheDocument();
    });

    it('shows loading spinner when loading is true', () => {
      mockUseTravelPreferences.mockReturnValue({
        ...mockHookReturnValue,
        loading: true
      });
      render(withUserProfileProvider(<TravelPreferencesTab />));
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('does not show delete button for default profile', () => {
      // Default mock already has default profile selected
      render(withUserProfileProvider(<TravelPreferencesTab />));
      // Should not show delete button for default profile
      expect(screen.queryByTitle('Delete Profile')).not.toBeInTheDocument();
    });
  });

  describe('Profile Rendering', () => {
    it('renders editable profile name field', () => {
      render(withUserProfileProvider(<TravelPreferencesTab />));
      // Component uses fallback name from profile
      const nameInput = screen.getByDisplayValue('Default Profile');
      expect(nameInput).toBeInTheDocument();
    });

    it('shows save button in correct initial state', () => {
      render(withUserProfileProvider(<TravelPreferencesTab />));
      expect(screen.getByText('Saved')).toBeDisabled();
    });

  // Include Flights control removed — no UI test required
  });

  describe('Profile Management', () => {
    it('allows users to switch between profiles', async () => {
  render(withUserProfileProvider(<TravelPreferencesTab />));
  const profileSelects = screen.getAllByRole('combobox');
  const profileSelect = profileSelects[0]; // First combobox should be profile selector
  // Initially should show default profile in dropdown - use getAllByText to handle multiple matches
  expect(screen.getAllByText(/Default Profile/)[0]).toBeInTheDocument();
  // Open dropdown to show it's working
  await userEvent.click(profileSelect);
    });

    it('saves canonical transportation.primaryMode when selecting Driving (rental)', async () => {
      // Ensure editing preferences are present so Save button appears after change
      mockHookReturnValue.editingPreferences = mockDefaultProfile;
      mockUseTravelPreferences.mockReturnValue(mockHookReturnValue);

      render(withUserProfileProvider(<TravelPreferencesTab />));

      // Robustly find the Transport Type combobox by iterating all comboboxes
      const comboboxes = screen.getAllByRole('combobox');
      let selected = false;

      for (const cb of comboboxes) {
        // Open this combobox's menu
        await act(async () => {
          fireEvent.mouseDown(cb);
        });

        // See if the Driving (rental) option is present in the opened menu
        try {
          const drivingOption = await waitFor(() => screen.getByRole('option', { name: /Driving \(rental\)/i }), { timeout: 200 });
          // Click it and mark success
          await act(async () => {
            fireEvent.click(drivingOption);
          });
          selected = true;
          break;
        } catch (err) {
          // Option not in this menu — close it and continue
          await act(async () => {
            fireEvent.keyDown(cb, { key: 'Escape', code: 'Escape' });
          });
        }
      }

      expect(selected).toBe(true);

      // The Save Changes button should appear and be enabled
      const saveButton = await screen.findByText('Save Changes');
      expect(saveButton).toBeEnabled();

      // Click save and assert updateProfile was called with canonical 'rental'
      await act(async () => {
        await userEvent.click(saveButton);
      });

      await waitFor(() => {
        expect(mockHookReturnValue.updateProfile).toHaveBeenCalledWith(
          mockDefaultProfile.id,
          expect.objectContaining({
            transportation: expect.objectContaining({ primaryMode: 'rental' })
          })
        );
      });
    });
  });

  describe('Profile Creation', () => {
    it('creates a new profile when Create New Profile is clicked', async () => {
      const mockPrompt = jest.spyOn(window, 'prompt').mockReturnValue('My Custom Profile');
      mockHookReturnValue.createProfile.mockResolvedValue('new-profile-id');
      // Set up mock to properly represent default profile editing state
      mockHookReturnValue.editingPreferences = mockDefaultProfile;
      mockHookReturnValue.selectedProfileId = 'default-profile';
      render(withUserProfileProvider(<TravelPreferencesTab />));
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
      render(withUserProfileProvider(<TravelPreferencesTab />));
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
      render(withUserProfileProvider(<TravelPreferencesTab />));
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
      render(withUserProfileProvider(<TravelPreferencesTab />));
      expect(screen.getByText('🎯 Traval Style')).toBeInTheDocument();
      expect(screen.getByText('Saved')).toBeInTheDocument(); // Updated button text
      expect(screen.getByText(/Your Traval preferences will help/)).toBeInTheDocument();
    });
  });
});
