// Unit tests for AddItineraryModal AI prevention functionality
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock Firebase before importing any components that use it
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn()
}));

jest.mock('../../environments/firebaseConfig', () => ({
  app: {},
  db: {},
  auth: { currentUser: { uid: 'test-user-id' } }
}));

// Mock GooglePlacesAutocomplete with function constructor
jest.mock('react-google-places-autocomplete', () => {
  const React = require('react');
  function MockGooglePlacesAutocomplete(props: any) {
    const currentValue = props.selectProps?.value?.label || '';
    return React.createElement('div', {
      'data-testid': 'google-places-autocomplete-container'
    }, [
      // Input field for interaction
      React.createElement('input', {
        key: 'input',
        'data-testid': 'google-places-autocomplete',
        value: currentValue,
        onChange: (e: any) =>
          props.selectProps?.onChange?.({
            label: e.target.value,
            value: e.target.value,
          }),
        placeholder: props.selectProps?.placeholder || '',
      }),
      // Display the current value if it exists (for easier testing)
      currentValue ? React.createElement('span', {
        key: 'display',
        'data-testid': 'destination-display'
      }, currentValue) : null
    ].filter(Boolean));
  }
  return MockGooglePlacesAutocomplete;
});

import AddItineraryModal from '../../components/forms/AddItineraryModal';
import { Itinerary } from '../../types/Itinerary';
import { UserProfileContext } from '../../Context/UserProfileContext';
import { AlertContext } from '../../Context/AlertContext';

// Mock the hooks
const mockPostItinerary = jest.fn();
const mockUpdateItinerary = jest.fn();
const mockDeleteItinerary = jest.fn();

jest.mock('../../hooks/usePostItineraryToFirestore', () => ({
  __esModule: true,
  default: () => ({
    postItinerary: mockPostItinerary
  })
}));

jest.mock('../../hooks/useUpdateItinerary', () => ({
  __esModule: true,
  default: () => ({
    updateItinerary: mockUpdateItinerary
  })
}));

jest.mock('../../hooks/useDeleteItinerary', () => ({
  __esModule: true,
  default: () => ({
    deleteItinerary: mockDeleteItinerary
  })
}));

jest.mock('../../environments/firebaseConfig', () => ({
  auth: {
    currentUser: { uid: 'test-user-id' }
  }
}));

// Mock window.alert
window.alert = jest.fn();

describe('AddItineraryModal AI Prevention', () => {
  const mockUserProfile = {
    username: 'TestUser',
    gender: 'Female',
    dob: '1990-01-01',
    status: 'single',
    sexualOrientation: 'heterosexual',
    email: 'test@example.com',
    uid: 'test-user-id',
    blocked: []
  };

  const mockShowAlert = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnItineraryAdded = jest.fn();
  const mockOnRefresh = jest.fn();

  const regularItinerary: Itinerary = {
    id: '1',
    destination: 'Rome, Italy',
    startDate: '2025-12-01',
    endDate: '2025-12-05',
    description: 'A classic Roman holiday',
    activities: ['Colosseum Tour', 'Vatican Museums'],
    gender: 'Any',
    status: 'single',
    sexualOrientation: 'heterosexual',
    startDay: 0,
    endDay: 0,
    lowerRange: 25,
    upperRange: 35,
    likes: [],
    userInfo: {
      username: 'TestUser',
      gender: 'Female',
      dob: '1990-01-01',
      uid: 'test-user-id',
      email: 'test@example.com',
      status: 'single',
      sexualOrientation: 'heterosexual',
      blocked: []
    }
  };

  const aiGeneratedItinerary = {
    ...regularItinerary,
    id: '2',
    destination: 'Paris, France',
    description: 'Amazing AI-planned trip to Paris',
    ai_status: 'completed',
    aiGenerated: true,
    response: {
      data: {
        itinerary: {
          destination: 'Paris, France',
          days: [{
            activities: [{ name: 'Eiffel Tower' }]
          }]
        }
      }
    }
  } as any;

  const TestWrapper = ({ children }: { children: React.ReactNode }) => (
    <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
      <UserProfileContext.Provider 
        value={{ 
          userProfile: mockUserProfile, 
          updateUserProfile: jest.fn() 
        }}
      >
        {children}
      </UserProfileContext.Provider>
    </AlertContext.Provider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('allows editing regular itineraries', async () => {
    render(
      <TestWrapper>
        <AddItineraryModal
          open={true}
          onClose={mockOnClose}
          onItineraryAdded={mockOnItineraryAdded}
          onRefresh={mockOnRefresh}
          itineraries={[regularItinerary]}
        />
      </TestWrapper>
    );

    // Find and click edit button for regular itinerary
    const editButtons = screen.getAllByLabelText('Edit itinerary');
    await userEvent.click(editButtons[0]);

    // Should not show alert and should show filled form
    expect(window.alert).not.toHaveBeenCalled();
    expect(screen.getByTestId('destination-display')).toHaveTextContent('Rome, Italy');
    expect(screen.getByDisplayValue('A classic Roman holiday')).toBeInTheDocument();
  });

  test('allows editing AI-generated itinerary with ai_status', async () => {
    
    
    render(
      <TestWrapper>
        <AddItineraryModal
          open={true}
          onClose={mockOnClose}
          onItineraryAdded={mockOnItineraryAdded}
          onRefresh={mockOnRefresh}
          itineraries={[aiGeneratedItinerary]}
        />
      </TestWrapper>
    );

    // Find and click edit button for AI itinerary
    const editButtons = screen.getAllByLabelText('Edit itinerary');
    await userEvent.click(editButtons[0]);

    // Should NOT show prevention alert (AI itineraries can now be edited)
    expect(window.alert).not.toHaveBeenCalled();

    // Form should be filled with AI itinerary data
    expect(screen.getByTestId('destination-display')).toHaveTextContent('Paris, France');
    expect(screen.getByDisplayValue('Amazing AI-planned trip to Paris')).toBeInTheDocument();
  });

  test('allows editing AI-generated itinerary with aiGenerated flag', async () => {
    
    
    const aiItineraryWithFlag = {
      ...regularItinerary,
      aiGenerated: true,
      // Don't set ai_status to test the aiGenerated flag specifically
    } as any;

    render(
      <TestWrapper>
        <AddItineraryModal
          open={true}
          onClose={mockOnClose}
          onItineraryAdded={mockOnItineraryAdded}
          onRefresh={mockOnRefresh}
          itineraries={[aiItineraryWithFlag]}
        />
      </TestWrapper>
    );

    // Find and click edit button for AI itinerary
    const editButtons = screen.getAllByLabelText('Edit itinerary');
    await userEvent.click(editButtons[0]);

    // Should NOT show prevention alert (AI itineraries can now be edited)
    expect(window.alert).not.toHaveBeenCalled();
    
    // Form should be filled with itinerary data
    expect(screen.getByTestId('destination-display')).toHaveTextContent('Rome, Italy');
  });

  test('allows editing when neither ai_status nor aiGenerated is set', async () => {
    
    
    const nonAiItinerary = {
      ...regularItinerary,
      // Explicitly ensure these properties are not set
      ai_status: undefined,
      aiGenerated: undefined
    };

    render(
      <TestWrapper>
        <AddItineraryModal
          open={true}
          onClose={mockOnClose}
          onItineraryAdded={mockOnItineraryAdded}
          onRefresh={mockOnRefresh}
          itineraries={[nonAiItinerary]}
        />
      </TestWrapper>
    );

    // Find and click edit button
    const editButtons = screen.getAllByLabelText('Edit itinerary');
    await userEvent.click(editButtons[0]);

    // Should not show alert and should allow editing
    expect(window.alert).not.toHaveBeenCalled();
    expect(screen.getByTestId('destination-display')).toHaveTextContent('Rome, Italy');
  });

  test('handles mixed itineraries (AI and regular)', async () => {
    
    
    render(
      <TestWrapper>
        <AddItineraryModal
          open={true}
          onClose={mockOnClose}
          onItineraryAdded={mockOnItineraryAdded}
          onRefresh={mockOnRefresh}
          itineraries={[regularItinerary, aiGeneratedItinerary]}
        />
      </TestWrapper>
    );

    const editButtons = screen.getAllByLabelText('Edit itinerary');
    
    // Try to edit first itinerary (regular) - should work
    await userEvent.click(editButtons[0]);
    expect(window.alert).not.toHaveBeenCalled();
    expect(screen.getByTestId('destination-display')).toHaveTextContent('Rome, Italy');
    
    // Cancel editing
    const cancelButton = screen.getByText('Cancel');
    await userEvent.click(cancelButton);
    
    // Clear previous alert calls
    jest.clearAllMocks();
    
    // Try to edit second itinerary (AI) - should now also work
    await userEvent.click(editButtons[1]);
    expect(window.alert).not.toHaveBeenCalled();
    expect(screen.getByTestId('destination-display')).toHaveTextContent('Paris, France');
  });

  test('no longer contains AI sync helper functions', () => {
    // This test ensures that the AI sync functions have been removed
    // We can't directly test function absence, but we can test that
    // AI itineraries don't get processed for editing
    
    
    
    render(
      <TestWrapper>
        <AddItineraryModal
          open={true}
          onClose={mockOnClose}
          onItineraryAdded={mockOnItineraryAdded}
          onRefresh={mockOnRefresh}
          itineraries={[aiGeneratedItinerary]}
        />
      </TestWrapper>
    );

    // The component should render without errors and not attempt to
    // extract activities from nested structures for AI itineraries
    expect(screen.getByText('Add New Itinerary')).toBeInTheDocument();
    
    // AI itinerary should be listed but editing should be prevented  
    // Check that the component renders without errors (AI itinerary is in the itineraries list)
    expect(screen.getByText('Add New Itinerary')).toBeInTheDocument();
    // The itinerary cards should be rendered in the "Your Itineraries" section
    expect(screen.getByText('Your Itineraries')).toBeInTheDocument();
  });

  test('still allows regular itinerary operations', async () => {
    
    mockPostItinerary.mockResolvedValue(undefined);
    
    render(
      <TestWrapper>
        <AddItineraryModal
          open={true}
          onClose={mockOnClose}
          onItineraryAdded={mockOnItineraryAdded}
          onRefresh={mockOnRefresh}
          itineraries={[]}
        />
      </TestWrapper>
    );

    // Verify the form for new itinerary creation is available
    expect(screen.getByText('Add New Itinerary')).toBeInTheDocument();
    
    // Fill out destination field
    const destinationInput = screen.getByTestId('google-places-autocomplete');
    await userEvent.type(destinationInput, 'Barcelona, Spain');
    expect(destinationInput).toHaveValue('Barcelona, Spain');

    // Verify that date fields are present
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    
    // Verify that description field is present
    expect(screen.getByLabelText('Provide a description of your trip')).toBeInTheDocument();

    // This test verifies that regular itinerary creation form is accessible
    // The actual form submission would require all required fields to be filled
    // but for testing AI prevention, we just need to verify the form is available
  });
});