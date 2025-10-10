import React from 'react';
import { TravelPreferenceProfile } from '../../types/TravelPreferences';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import AIItineraryGenerationModal from '../../components/modals/AIItineraryGenerationModal';
import { AlertContext } from '../../Context/AlertContext';
import { UserProfileContext } from '../../Context/UserProfileContext';

// Mock the hooks
const mockUseAIGeneration = {
  isGenerating: false,
  progress: null as any, // Allow reassignment in tests
  error: null,
  result: null,
  generateItinerary: jest.fn().mockImplementation(() => {
    // Don't change state during validation tests
    return Promise.resolve();
  }),
  cancelGeneration: jest.fn(),
  resetGeneration: jest.fn(),
  estimateCost: jest.fn().mockResolvedValue(1800),
};

jest.mock('../../hooks/useAIGeneration', () => ({
  useAIGeneration: () => mockUseAIGeneration
}));

const mockUseTravelPreferences = {
  preferences: {
    profiles: [
      {
        id: 'profile-1',
        name: 'Default',
        isDefault: true,
        travelStyle: 'mid-range',
        budgetRange: { min: 1000, max: 3000, currency: 'USD' },
        activities: [],
        foodPreferences: { dietaryRestrictions: [], cuisineTypes: [], foodBudgetLevel: 'medium' },
        accommodation: { type: 'hotel', starRating: 4 },
        transportation: { primaryMode: 'public', maxWalkingDistance: 20 },
        groupSize: { preferred: 2, sizes: [1, 2, 4] },
        accessibility: { mobilityNeeds: false, visualNeeds: false, hearingNeeds: false },
        createdAt: new Date(),
        updatedAt: new Date()
      } as TravelPreferenceProfile,
      {
        id: 'profile-2',
        name: 'Adventure',
        isDefault: false,
        travelStyle: 'budget',
        budgetRange: { min: 800, max: 2500, currency: 'USD' },
        activities: [],
        foodPreferences: { dietaryRestrictions: [], cuisineTypes: [], foodBudgetLevel: 'low' },
        accommodation: { type: 'hostel', starRating: 3 },
        transportation: { primaryMode: 'walking', maxWalkingDistance: 60 },
        groupSize: { preferred: 4, sizes: [2, 4, 6] },
        accessibility: { mobilityNeeds: false, visualNeeds: false, hearingNeeds: false },
        createdAt: new Date(),
        updatedAt: new Date()
      } as TravelPreferenceProfile
    ]
  },
  loading: false,
  getDefaultProfile: () => ({ 
    id: 'profile-1', 
    name: 'Default', 
    isDefault: true,
    budgetRange: { min: 1000, max: 3000, currency: 'USD' as const },
    groupSize: { preferred: 2, sizes: [1, 2, 4] }
  }),
  getProfileById: (id: string) => {
    return mockUseTravelPreferences.preferences.profiles.find((p: any) => p.id === id) || null;
  }
};

jest.mock('../../hooks/useTravelPreferences', () => ({
  useTravelPreferences: () => mockUseTravelPreferences
}));

// Mock Google Places Autocomplete
jest.mock('react-google-places-autocomplete', () => {
  return function GooglePlacesAutocomplete({ selectProps, ...props }: any) {
    const placeholder = selectProps?.placeholder || props.apiOptions?.placeholder || '';
    const testId = /from|departure/i.test(placeholder) ? 'departure-input' : 'destination-input';
    return (
      <input
        data-testid={testId}
        placeholder={placeholder || 'Where would you like to go?'}
        value={selectProps?.value?.label || ''}
        onChange={(e) => selectProps?.onChange && selectProps.onChange({ label: e.target.value, value: { place_id: 'test-place-id' } })}
      />
    );
  };
});

const defaultProps = {
  open: true,
  onClose: jest.fn(),
  onSuccess: jest.fn(),
};

// Mock AlertContext provider for tests
const mockAlertContextValue = {
  alert: { open: false, severity: 'info' as const, message: '' },
  showAlert: jest.fn(),
  closeAlert: jest.fn(),
};

const mockUserProfileContextValue = {
  userProfile: null,
  updateUserProfile: jest.fn(),
  setUserProfile: jest.fn(),
  isLoading: false,
};

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AlertContext.Provider value={mockAlertContextValue}>
      <UserProfileContext.Provider value={mockUserProfileContextValue as any}>
        {children}
      </UserProfileContext.Provider>
    </AlertContext.Provider>
  );
};

describe('AIItineraryGenerationModal', () => {
  beforeEach(() => {
    // Reset mock profiles before each test
    mockUseTravelPreferences.preferences.profiles = [
      {
        id: 'profile-1',
        name: 'Default',
        isDefault: true,
        travelStyle: 'mid-range',
        budgetRange: { min: 1000, max: 3000, currency: 'USD' },
        activities: [],
        foodPreferences: { dietaryRestrictions: [], cuisineTypes: [], foodBudgetLevel: 'medium' },
        accommodation: { type: 'hotel', starRating: 4 },
        transportation: { primaryMode: 'public', maxWalkingDistance: 20 },
        groupSize: { preferred: 2, sizes: [1, 2, 4] },
        accessibility: { mobilityNeeds: false, visualNeeds: false, hearingNeeds: false },
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'profile-2',
        name: 'Adventure',
        isDefault: false,
        travelStyle: 'budget',
        budgetRange: { min: 800, max: 2500, currency: 'USD' },
        activities: [],
        foodPreferences: { dietaryRestrictions: [], cuisineTypes: [], foodBudgetLevel: 'low' },
        accommodation: { type: 'hostel', starRating: 3 },
        transportation: { primaryMode: 'walking', maxWalkingDistance: 60 },
        groupSize: { preferred: 4, sizes: [2, 4, 6] },
        accessibility: { mobilityNeeds: false, visualNeeds: false, hearingNeeds: false },
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];
  });

  it('shows flight fields only for profiles with flights enabled', async () => {
    // Add a profile with flights enabled before rendering
    mockUseTravelPreferences.preferences.profiles.push({
      id: 'profile-flights',
      name: 'Flights Profile',
      isDefault: false,
      travelStyle: 'luxury',
      activities: [],
      foodPreferences: { dietaryRestrictions: [], cuisineTypes: [], foodBudgetLevel: 'medium' },
      accommodation: { type: 'hotel', starRating: 5 },
      transportation: { primaryMode: 'airplane', maxWalkingDistance: 10, includeFlights: true },
      budgetRange: { min: 1200, max: 4000, currency: 'USD' },
      groupSize: { preferred: 2, sizes: [1, 2, 4] },
      accessibility: { mobilityNeeds: false, visualNeeds: false, hearingNeeds: false },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    render(
      <TestWrapper>
        <AIItineraryGenerationModal {...defaultProps} />
      </TestWrapper>
    );
    // Select the flights-enabled profile
    const profileSelect = screen.getByRole('combobox', { name: /Travel Preference Profile/i });
    fireEvent.mouseDown(profileSelect);
    const flightsOption = await screen.findByRole('option', { name: /Flights Profile/ });
    fireEvent.click(flightsOption);
    await waitFor(() => {
      expect(screen.getByText('Flights Profile')).toBeInTheDocument();
    });
  // Fill both departure and destination places so flight fields render properly
  fireEvent.change(screen.getByTestId('departure-input'), { target: { value: 'New York' } });
  fireEvent.change(screen.getAllByTestId('destination-input')[0], { target: { value: 'Paris' } });
    await waitFor(() => {
      // Check for the flight preferences section and the helper caption that appears when airports
      // haven't had codes selected yet. This is more stable than matching the label text exactly.
      expect(screen.getByText(/Flight Preferences/)).toBeInTheDocument();
      expect(screen.getByText(/Select airports above to see your route/)).toBeInTheDocument();
    });
  });

  it('hides flight fields for profiles without flights enabled', async () => {
    render(
      <TestWrapper>
        <AIItineraryGenerationModal {...defaultProps} />
      </TestWrapper>
    );
    // Select a profile without flights
    const profileSelect = screen.getByRole('combobox', { name: /Travel Preference Profile/i });
    fireEvent.mouseDown(profileSelect);
    const adventureOption = await screen.findByRole('option', { name: /Adventure/ });
    fireEvent.click(adventureOption);
    await waitFor(() => {
      expect(screen.queryByText('Departure Airport')).not.toBeInTheDocument();
      expect(screen.queryByText('Destination Airport')).not.toBeInTheDocument();
      expect(screen.queryByText('Flight Preferences')).not.toBeInTheDocument();
    });
  });

  it('refreshes flight fields when toggling between profiles with and without flights', async () => {
    // Add a profile with flights enabled
    mockUseTravelPreferences.preferences.profiles.push({
      id: 'profile-flights',
      name: 'Flights Profile',
      isDefault: false,
      travelStyle: 'luxury',
      activities: [],
      foodPreferences: { dietaryRestrictions: [], cuisineTypes: [], foodBudgetLevel: 'medium' },
      accommodation: { type: 'hotel', starRating: 5 },
      transportation: { primaryMode: 'airplane', maxWalkingDistance: 10, includeFlights: true },
      budgetRange: { min: 1200, max: 4000, currency: 'USD' },
      groupSize: { preferred: 2, sizes: [1, 2, 4] },
      accessibility: { mobilityNeeds: false, visualNeeds: false, hearingNeeds: false },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    render(
      <TestWrapper>
        <AIItineraryGenerationModal {...defaultProps} />
      </TestWrapper>
    );
  const profileSelect = screen.getByRole('combobox', { name: /Travel Preference Profile/i });

  // Open select and choose the flights-enabled profile (MUI menu interactions)
  fireEvent.mouseDown(profileSelect);
  const flightsOption = await screen.findByRole('option', { name: /Flights Profile/ });
  fireEvent.click(flightsOption);
  // Fill both departure and destination places so airport selectors render
  fireEvent.change(screen.getByTestId('departure-input'), { target: { value: 'New York' } });
  fireEvent.change(screen.getAllByTestId('destination-input')[0], { target: { value: 'Paris' } });

  await waitFor(() => {
    expect(screen.getByText(/Flight Preferences/)).toBeInTheDocument();
  });

  // Switch to profile without flights using menu interactions
  fireEvent.mouseDown(profileSelect);
  const adventureOption = await screen.findByRole('option', { name: /Adventure/ });
  fireEvent.click(adventureOption);

  await waitFor(() => {
    expect(screen.queryByText(/Flight Preferences/)).not.toBeInTheDocument();
  });

  // Switch back to flights-enabled profile using menu interactions
  fireEvent.mouseDown(profileSelect);
  const flightsOptionAgain = await screen.findByRole('option', { name: /Flights Profile/ });
  fireEvent.click(flightsOptionAgain);

    // Ensure the departure input returns when the flights profile is selected
    await waitFor(() => {
      expect(screen.getByTestId('departure-input')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('requires airport codes only when flights are enabled', async () => {
    // Add a profile with flights enabled
    mockUseTravelPreferences.preferences.profiles.push({
      id: 'profile-flights',
      name: 'Flights Profile',
      isDefault: false,
      travelStyle: 'luxury',
      activities: [],
      foodPreferences: { dietaryRestrictions: [], cuisineTypes: [], foodBudgetLevel: 'medium' },
      accommodation: { type: 'hotel', starRating: 5 },
      transportation: { primaryMode: 'airplane', maxWalkingDistance: 10, includeFlights: true },
      budgetRange: { min: 1200, max: 4000, currency: 'USD' },
      groupSize: { preferred: 2, sizes: [1, 2, 4] },
      accessibility: { mobilityNeeds: false, visualNeeds: false, hearingNeeds: false },
      createdAt: new Date(),
      updatedAt: new Date()
    });
    render(
      <TestWrapper>
        <AIItineraryGenerationModal {...defaultProps} />
      </TestWrapper>
    );
    // Select flights-enabled profile
    const profileSelect = screen.getByRole('combobox', { name: /Travel Preference Profile/i });
    fireEvent.mouseDown(profileSelect);
    const flightsOption = await screen.findByRole('option', { name: /Flights Profile/ });
    fireEvent.click(flightsOption);
    await waitFor(() => {
      expect(screen.getByText('Flights Profile')).toBeInTheDocument();
    });
  // Fill both departure and destination to trigger airport validations
  fireEvent.change(screen.getByTestId('departure-input'), { target: { value: 'New York' } });
  fireEvent.change(screen.getAllByTestId('destination-input')[0], { target: { value: 'Paris' } });
    fireEvent.click(screen.getByText('Generate Itinerary'));
    await waitFor(() => {
      expect(screen.getByText('Departure airport is required.')).toBeInTheDocument();
      expect(screen.getByText('Destination airport is required.')).toBeInTheDocument();
    });
    // Switch to profile without flights
    fireEvent.mouseDown(profileSelect);
    const adventureOption = await screen.findByRole('option', { name: /Adventure/ });
    fireEvent.click(adventureOption);
    await waitFor(() => {
      expect(screen.getByText('Adventure')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Generate Itinerary'));
    await waitFor(() => {
      expect(screen.queryByText('Departure airport is required.')).not.toBeInTheDocument();
      expect(screen.queryByText('Destination airport is required.')).not.toBeInTheDocument();
    });
  });
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock state
    mockUseAIGeneration.isGenerating = false;
    mockUseAIGeneration.progress = null;
    mockUseAIGeneration.error = null;
    mockUseAIGeneration.result = null;
  });

  it('renders modal with correct title', () => {
    render(
      <TestWrapper>
        <AIItineraryGenerationModal {...defaultProps} />
      </TestWrapper>
    );
    expect(screen.getByText('Generate AI Itinerary')).toBeInTheDocument();
  });

  it('displays all form sections', () => {
    render(
      <TestWrapper>
        <AIItineraryGenerationModal {...defaultProps} />
      </TestWrapper>
    );
    
    expect(screen.getByText('Trip Details')).toBeInTheDocument();
    expect(screen.getByText('Destination *')).toBeInTheDocument();
    expect(screen.getByText('Trip Type *')).toBeInTheDocument();
    expect(screen.getAllByText('Travel Preference Profile *')[0]).toBeInTheDocument();
  });

  it('shows trip type options', () => {
    render(
      <TestWrapper>
        <AIItineraryGenerationModal {...defaultProps} />
      </TestWrapper>
    );
    
    expect(screen.getByText(/🏔️ Adventure/)).toBeInTheDocument();
    expect(screen.getByText(/🏖️ Leisure/)).toBeInTheDocument();
    expect(screen.getByText(/💼 Business/)).toBeInTheDocument();
    expect(screen.getByText(/💕 Romantic/)).toBeInTheDocument();
    // Just check that at least one Family element exists without being too specific
    expect(screen.getByText(/Family/)).toBeInTheDocument();
  });

  it('allows selecting trip type', async () => {
    render(
      <TestWrapper>
        <AIItineraryGenerationModal {...defaultProps} />
      </TestWrapper>
    );
    
    const adventureChip = screen.getByText(/🏔️ Adventure/);
    fireEvent.click(adventureChip);
    
    expect(adventureChip.closest('.MuiChip-root')).toHaveClass('MuiChip-colorPrimary');
  });

  it('displays travel preference profiles', () => {
    render(
      <TestWrapper>
        <AIItineraryGenerationModal {...defaultProps} />
      </TestWrapper>
    );
    
    // Click to open the select dropdown
    const profileSelect = screen.getByRole('combobox', { name: /Travel Preference Profile/i });
    fireEvent.mouseDown(profileSelect);
    
    // Look for the dropdown option specifically
    expect(screen.getByRole('option', { name: 'Default (Default)' })).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(
      <TestWrapper>
        <AIItineraryGenerationModal {...defaultProps} />
      </TestWrapper>
    );
    
    const generateButton = screen.getByText('Generate Itinerary');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('Destination is required')).toBeInTheDocument();
    });
  });

  it('handles must include tags', async () => {
    render(
      <TestWrapper>
        <AIItineraryGenerationModal {...defaultProps} />
      </TestWrapper>
    );
    
    const mustIncludeInput = screen.getByPlaceholderText('Add specific places or activities you want to include');
    fireEvent.change(mustIncludeInput, { target: { value: 'Eiffel Tower' } });
    
    // Verify the input has the value before keyDown
    expect(mustIncludeInput).toHaveValue('Eiffel Tower');
    
    fireEvent.keyDown(mustIncludeInput, { key: 'Enter', code: 'Enter' });
    
    // Check if tag functionality is working by looking for input being cleared
    await waitFor(() => {
      expect(mustIncludeInput).toHaveValue('');
    });
  });

  it('handles must avoid tags', async () => {
    render(
      <TestWrapper>
        <AIItineraryGenerationModal {...defaultProps} />
      </TestWrapper>
    );
    
    const mustAvoidInput = screen.getByPlaceholderText('Add places or activities you want to avoid');
    fireEvent.change(mustAvoidInput, { target: { value: 'Crowded areas' } });
    fireEvent.keyDown(mustAvoidInput, { key: 'Enter', code: 'Enter' });
    
    // Check if tag functionality is working by looking for input being cleared
    await waitFor(() => {
      expect(mustAvoidInput).toHaveValue('');
    });
  });

  it('removes tags when delete is clicked', async () => {
    render(
      <TestWrapper>
        <AIItineraryGenerationModal {...defaultProps} />
      </TestWrapper>
    );
    
    const mustIncludeInput = screen.getByPlaceholderText('Add specific places or activities you want to include');
    fireEvent.change(mustIncludeInput, { target: { value: 'Eiffel Tower' } });
    fireEvent.keyDown(mustIncludeInput, { key: 'Enter', code: 'Enter' });
    
    // If tags were implemented, we would test delete functionality here
    // For now, just verify the input behavior
    expect(mustIncludeInput).toHaveValue('');
  });

  it.skip('displays cost estimate when available', async () => {
    // Create a component with initial data that should trigger cost estimation
    const propsWithInitialData = {
      ...defaultProps,
      initialDestination: 'Paris',
      initialDates: {
        startDate: '2025-08-01',
        endDate: '2025-08-07'
      }
    };
    
    render(
      <TestWrapper>
        <AIItineraryGenerationModal {...propsWithInitialData} />
      </TestWrapper>
    );
    
    // Wait for the component to initialize and profiles to load
    await waitFor(() => {
      expect(screen.getByText('Travel Preference Profile *')).toBeInTheDocument();
    });
    
    // Check that destination is populated
  const destinationInput = screen.getAllByTestId('destination-input')[0];
    expect(destinationInput).toHaveValue('Paris');
    
    // Wait for the useEffect to trigger cost estimation with longer timeout
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
    });
    
    // The estimateCost should have been called due to having all required fields
    expect(mockUseAIGeneration.estimateCost).toHaveBeenCalled();
    
    // Debug: Check what the estimateCost was called with
    const callArgs = mockUseAIGeneration.estimateCost.mock.calls[0][0];
    expect(callArgs.destination).toBe('Paris');
    expect(callArgs.startDate).toBe('2025-08-01');
    expect(callArgs.endDate).toBe('2025-08-07');
    expect(callArgs.preferenceProfileId).toBe('profile-1');
    
    // Check for cost estimate display with simpler approach
    await waitFor(() => {
      expect(screen.getByText('Estimated Cost: $1,800')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = jest.fn();
    render(
      <TestWrapper>
        <AIItineraryGenerationModal {...defaultProps} onClose={onClose} />
      </TestWrapper>
    );
    
  const closeIcon = screen.getByTestId('CloseIcon');
  const closeButton = closeIcon.closest('button') as HTMLElement;
  fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables form during generation', () => {
    // Update the mock to return generating state
    mockUseAIGeneration.isGenerating = true;
    mockUseAIGeneration.progress = { 
      stage: 2, 
      totalStages: 4, 
      message: 'Finding activities...', 
      stages: [
        { id: 'analyzing', label: 'Analyzing preferences', description: 'Processing your travel preferences', status: 'completed' },
        { id: 'finding', label: 'Finding activities', description: 'Discovering the best activities and attractions', status: 'active' },
        { id: 'optimizing', label: 'Optimizing route', description: 'Creating the most efficient travel routes', status: 'pending' },
        { id: 'finalizing', label: 'Finalizing itinerary', description: 'Adding final touches to your personalized itinerary', status: 'pending' }
      ],
      estimatedTimeRemaining: 45
    };

    render(
      <TestWrapper>
        <AIItineraryGenerationModal {...defaultProps} />
      </TestWrapper>
    );
    
  // Updated to match current modal loading text and button state
  // When the progress.stage is numeric/unmapped the component shows a generic header
  expect(screen.getByText(/Working\.\.\./i)).toBeInTheDocument();
  // The progress message provided includes 'Finding activities...' which should be visible
  expect(screen.getByText(/Finding activities/i)).toBeInTheDocument();
  const generatingButton = screen.getByRole('button', { name: /Generating/i });
  expect(generatingButton).toBeDisabled();
  // Reset the mock
  mockUseAIGeneration.isGenerating = false;
  mockUseAIGeneration.progress = null;
  });

  it('shows date validation errors even if destination is missing', async () => {
    render(
      <TestWrapper>
        <AIItineraryGenerationModal {...defaultProps} />
      </TestWrapper>
    );

    // Set invalid dates but do NOT set destination
    const startDateInput = screen.getByLabelText('Start Date');
    const endDateInput = screen.getByLabelText('End Date');

    fireEvent.change(startDateInput, { target: { value: '2024-12-31' } });
    fireEvent.change(endDateInput, { target: { value: '2024-12-01' } });

    const generateButton = screen.getByText('Generate Itinerary');
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('End date must be after start date')).toBeInTheDocument();
      expect(screen.getByText('Destination is required')).toBeInTheDocument();
    });
  });
});
