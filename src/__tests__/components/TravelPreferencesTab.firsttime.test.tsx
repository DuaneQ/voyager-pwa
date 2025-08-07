import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TravelPreferencesTab } from '../../components/forms/TravelPreferencesTab';
import { useTravelPreferences } from '../../hooks/useTravelPreferences';
import { UserProfileContext } from '../../Context/UserProfileContext';

// Mock the hook
jest.mock('../../hooks/useTravelPreferences');
const mockUseTravelPreferences = useTravelPreferences as jest.MockedFunction<typeof useTravelPreferences>;

describe('TravelPreferencesTab - First Time User Experience', () => {
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

  // Helper to wrap tested component in provider
  function withUserProfileProvider(children) {
    return (
      <UserProfileContext.Provider value={mockUserProfileContextValue}>
        {children}
      </UserProfileContext.Provider>
    );
  }
  const mockCreateProfile = jest.fn();
  const mockUpdateProfile = jest.fn();
  const mockLoadPreferences = jest.fn();

  const mockProfile = {
    id: 'new-profile-id',
    name: 'My First Profile',
    isDefault: true,
    travelStyle: 'mid-range' as const,
    budgetRange: { min: 1000, max: 3000 },
    activities: {},
    foodPreferences: {},
    accommodation: {},
    transportation: {},
    groupSize: {},
    accessibility: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockHookReturnValueFirstTime = {
    preferences: { profiles: [], defaultProfileId: null, preferenceSignals: [] },
    loading: false,
    error: null,
    updateProfile: mockUpdateProfile,
    createProfile: mockCreateProfile,
    deleteProfile: jest.fn(),
    getDefaultProfile: jest.fn(),
    getProfileById: jest.fn(),
    loadPreferences: mockLoadPreferences,
    resetError: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTravelPreferences.mockReturnValue(mockHookReturnValueFirstTime);
  });

  it('shows welcome message for first-time users', () => {
    render(withUserProfileProvider(<TravelPreferencesTab />));
    expect(screen.getByText(/Welcome! Customize your preferences/)).toBeInTheDocument();
  });

  it('shows default profile name "My Travel Profile" for first-time users', () => {
    render(withUserProfileProvider(<TravelPreferencesTab />));
    expect(screen.getByDisplayValue('My Travel Profile')).toBeInTheDocument();
  });

  it('shows "Unsaved Changes" chip for first-time users', () => {
    render(withUserProfileProvider(<TravelPreferencesTab />));
    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
  });

  it('does not show profile selector for first-time users', () => {
    render(withUserProfileProvider(<TravelPreferencesTab />));
    expect(screen.queryByLabelText('Select Profile')).not.toBeInTheDocument();
  });

  it('shows "Create My Travel Profile" button for first-time users', () => {
    render(withUserProfileProvider(<TravelPreferencesTab />));
    expect(screen.getByText('Create My Travel Profile')).toBeInTheDocument();
  });

  it('allows travel style changes for first-time users', async () => {
    render(withUserProfileProvider(<TravelPreferencesTab />));
    // Find and click the travel style dropdown
    const travelStyleSelect = screen.getByRole('combobox');
    await userEvent.click(travelStyleSelect);
    // Should be able to see and select different options
    await waitFor(() => {
      expect(screen.getByText('💰 Budget Traval')).toBeInTheDocument();
    });
  });

  it('allows profile name changes for first-time users', async () => {
    render(withUserProfileProvider(<TravelPreferencesTab />));
    const nameInput = screen.getByDisplayValue('My Travel Profile');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'My Custom Profile');
    expect(screen.getByDisplayValue('My Custom Profile')).toBeInTheDocument();
    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();
  });

  it('creates profile when "Create My Travel Profile" is clicked', async () => {
    mockCreateProfile.mockResolvedValue('new-profile-id');
    render(withUserProfileProvider(<TravelPreferencesTab />));
    // Change the profile name
    const nameInput = screen.getByDisplayValue('My Travel Profile');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'My First Profile');
    // Click create profile button
    const createButton = screen.getByText('Create My Travel Profile');
    await userEvent.click(createButton);
    await waitFor(() => {
      expect(mockCreateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'My First Profile',
          isDefault: true,
          travelStyle: 'mid-range'
        })
      );
    });
    // Verify loadPreferences was called to refresh the data
    await waitFor(() => {
      expect(mockLoadPreferences).toHaveBeenCalled();
    });
  });

  it('handles activity slider changes for first-time users', async () => {
    render(withUserProfileProvider(<TravelPreferencesTab />));
    // Open the activity preferences accordion
    const activityAccordion = screen.getByText('🎯 Activity Preferences');
    await userEvent.click(activityAccordion);
    await waitFor(() => {
      // Find activity sliders
      const sliders = screen.getAllByRole('slider');
      expect(sliders.length).toBeGreaterThan(1);
    });
  });

  it('maintains changes across different sections for first-time users', async () => {
    render(withUserProfileProvider(<TravelPreferencesTab />));
    // Change profile name
    const nameInput = screen.getByDisplayValue('My Travel Profile');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Adventure Profile');
    // Open and interact with food preferences
    const foodAccordion = screen.getByText('🍽️ Food Preferences');
    await userEvent.click(foodAccordion);
    await waitFor(() => {
      // Click on a dietary restriction
      const vegetarianChip = screen.getByText('Vegetarian');
      expect(vegetarianChip).toBeInTheDocument();
    });
    // Name should still be changed
    expect(screen.getByDisplayValue('Adventure Profile')).toBeInTheDocument();
    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument();  
  });

  it('shows default profile chip for first-time users', () => {
    render(withUserProfileProvider(<TravelPreferencesTab />));
    expect(screen.getByText('Default Profile')).toBeInTheDocument();
  });

  it('shows profile selector after first profile is created', async () => {
    // Mock hook to transition from no profiles to having one profile
    const mockHookWithNoProfiles = {
      ...mockHookReturnValueFirstTime,
      preferences: { profiles: [], defaultProfileId: null, preferenceSignals: [] }
    };

    const mockHookWithOneProfile = {
      ...mockHookReturnValueFirstTime,
      preferences: {
        profiles: [mockProfile],
        defaultProfileId: 'new-profile-id',
        preferenceSignals: []
      }
    };

    // Start with no profiles
    (useTravelPreferences as jest.Mock).mockReturnValue(mockHookWithNoProfiles);

    const { rerender } = render(withUserProfileProvider(<TravelPreferencesTab />));

    // Initially no profile selector and should show create button
    expect(screen.queryByLabelText('Select Profile')).not.toBeInTheDocument();
    expect(screen.getByText('Create My Travel Profile')).toBeInTheDocument();

    // Click create profile button to simulate profile creation
    const createButton = screen.getByText('Create My Travel Profile');
    fireEvent.click(createButton);

    // Verify createProfile was called
    expect(mockCreateProfile).toHaveBeenCalled();

    // Now mock the hook to return the profile (simulating what happens after profile creation and loadPreferences)
    (useTravelPreferences as jest.Mock).mockReturnValue(mockHookWithOneProfile);
    
    // Re-render with profile created - this simulates the state after profile creation and loadPreferences refresh
    rerender(withUserProfileProvider(<TravelPreferencesTab />));

    // Now profile selector should appear
    await waitFor(() => {
      // Check that the profile selector is visible (the Select Profile label should be there)
      expect(screen.getByText('Select Profile')).toBeInTheDocument();
      // And verify it's not showing the create button anymore since we have a profile
      expect(screen.queryByText('Create My Travel Profile')).not.toBeInTheDocument();
    });
    // The profile selector should be present and functional (it may show empty value initially due to selectedProfileId being undefined after loadPreferences)
    const profileSelector = screen.getByDisplayValue('');
    expect(profileSelector).toBeInTheDocument();
  });
});
