import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TravelPreferencesTab } from '../../components/forms/TravelPreferencesTab';

// Mock the hooks
jest.mock('../../hooks/useTravelPreferences', () => ({
  useTravelPreferences: () => ({
    preferences: {
      profiles: [
        {
          id: 'test-profile',
          name: 'Test Profile',
          activities: {},
          accommodationPreference: 'hotel',
          budgetRange: { min: 1000, max: 5000 },
          interests: [],
          dietaryRestrictions: [],
          travelStyle: 'balanced'
        }
      ]
    },
    loading: false,
    error: null,
    updateProfile: jest.fn(),
    createProfile: jest.fn(),
    deleteProfile: jest.fn(),
    getProfileById: jest.fn().mockReturnValue({
      id: 'test-profile',
      name: 'Test Profile'
    }),
    loadPreferences: jest.fn(),
    resetError: jest.fn()
  })
}));

jest.mock('../../hooks/useItineraries', () => ({
  useItineraries: () => ({
    itineraries: [],
    aiItineraries: [
      {
        id: 'test-ai-itinerary',
        destination: 'Test Destination',
        startDate: '2025-09-01',
        endDate: '2025-09-07'
      }
    ],
    loading: false,
    error: null,
    refreshItineraries: jest.fn().mockResolvedValue(undefined)
  })
}));

// Mock the AI Generation Modal
jest.mock('../../components/modals/AIItineraryGenerationModal', () => {
  return function MockAIItineraryGenerationModal({ onGenerated, open }: any) {
    if (!open) return null;
    
    return (
      <div data-testid="ai-modal">
        <button 
          data-testid="simulate-success"
          onClick={() => {
            // Simulate successful AI generation
            const mockResult = {
              data: {
                itinerary: {
                  id: 'new-ai-itinerary-123'
                },
                metadata: {
                  generationId: 'gen_123456789'
                }
              }
            };
            onGenerated?.(mockResult);
          }}
        >
          Simulate AI Success
        </button>
      </div>
    );
  };
});

describe('AI Generation Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods to capture debug logs
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should call handleAIGenerated and show debug logs', async () => {
    render(<TravelPreferencesTab />);
    
    // Open AI modal
    const generateButton = screen.getByText(/generate ai itinerary/i);
    fireEvent.click(generateButton);
    
    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByTestId('ai-modal')).toBeInTheDocument();
    });
    
    // Simulate successful AI generation
    const simulateButton = screen.getByTestId('simulate-success');
    fireEvent.click(simulateButton);
    
    // Check if debug logs were called
    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] handleAIGenerated called with result:')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] Starting AI itineraries refresh...')
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] Extracted itinerary ID:')
      );
    });
  });

  test('should switch to AI Itineraries tab after successful generation', async () => {
    render(<TravelPreferencesTab />);
    
    // Open AI modal
    const generateButton = screen.getByText(/generate ai itinerary/i);
    fireEvent.click(generateButton);
    
    // Simulate successful AI generation
    const simulateButton = screen.getByTestId('simulate-success');
    fireEvent.click(simulateButton);
    
    // Check if tab switched (look for AI Itineraries content)
    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG] Switching to AI Itineraries tab')
      );
    });
  });
});
