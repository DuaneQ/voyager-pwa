import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AIItineraryDisplay from '../../components/ai/AIItineraryDisplay';
import { doc, setDoc } from 'firebase/firestore';

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  ...jest.requireActual('firebase/firestore'),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ _seconds: 1234567890 })),
}));

// Mock hooks
jest.mock('../../hooks/useAIGeneratedItineraries', () => ({
  useAIGeneratedItineraries: () => ({
    itineraries: [],
    loading: false,
    error: null,
    refreshItineraries: jest.fn(),
  }),
}));

jest.mock('../../hooks/useUpdateItinerary', () => ({
  __esModule: true,
  default: () => ({
    updateItinerary: jest.fn(),
  }),
}));

describe('AIItineraryDisplay - Share Functionality', () => {
  const mockItinerary = {
    id: 'test-itin-123',
    destination: 'Paris, France',
    startDate: '2025-08-01',
    endDate: '2025-08-08',
    status: 'completed',
    createdAt: new Date('2025-07-01'),
    response: {
      success: true,
      data: {
        itinerary: {
          destination: 'Paris, France',
          startDate: '2025-08-01',
          endDate: '2025-08-08',
          description: 'A wonderful trip to Paris',
          days: [],
        },
        recommendations: {
          accommodations: [
            {
              name: 'Hotel Plaza',
              price: { amount: 200, currency: 'USD' },
              bookingUrl: 'https://booking.com/hotel-plaza',
              rating: 4.5,
            },
          ],
          activities: [
            {
              name: 'Eiffel Tower',
              price: { amount: 25, currency: 'EUR' },
              bookingUrl: 'https://tiqets.com/eiffel',
            },
          ],
          restaurants: [
            {
              name: 'Le Bistro',
              priceLevel: 2,
              cuisine: ['French'],
            },
          ],
        },
        metadata: {
          filtering: {
            userMustInclude: ['museums', 'art'],
            userMustAvoid: ['clubs'],
          },
          generationId: 'gen-123',
          confidence: 0.95,
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (setDoc as jest.Mock).mockResolvedValue(undefined);
  });

  it('writes full itinerary structure to Firestore when share button clicked', async () => {
    render(<AIItineraryDisplay itinerary={mockItinerary as any} />);

    // Find and click the share button
    const shareButtons = screen.getAllByTestId('ShareIcon');
    const shareButton = shareButtons[0].closest('button');
    
    if (!shareButton) {
      throw new Error('Share button not found');
    }

    fireEvent.click(shareButton);

    // Wait for the Firestore write to complete
    await waitFor(() => {
      expect(setDoc).toHaveBeenCalled();
    });

    // Verify setDoc was called with the correct arguments
    const setDocCalls = (setDoc as jest.Mock).mock.calls;
    expect(setDocCalls.length).toBeGreaterThan(0);

    const [docRef, payload, options] = setDocCalls[0];

    // Verify payload structure
    expect(payload).toHaveProperty('response');
    expect(payload.response).toHaveProperty('data');
    expect(payload.response.data).toHaveProperty('recommendations');
    expect(payload.response.data).toHaveProperty('metadata');

    // Verify recommendations are preserved
    expect(payload.response.data.recommendations).toHaveProperty('accommodations');
    expect(payload.response.data.recommendations.accommodations).toHaveLength(1);
    expect(payload.response.data.recommendations.accommodations[0]).toMatchObject({
      name: 'Hotel Plaza',
      price: { amount: 200, currency: 'USD' },
      bookingUrl: 'https://booking.com/hotel-plaza',
    });

    // Verify activities are preserved
    expect(payload.response.data.recommendations).toHaveProperty('activities');
    expect(payload.response.data.recommendations.activities[0]).toMatchObject({
      name: 'Eiffel Tower',
      price: { amount: 25, currency: 'EUR' },
    });

    // Verify restaurants are preserved
    expect(payload.response.data.recommendations).toHaveProperty('restaurants');
    expect(payload.response.data.recommendations.restaurants[0]).toMatchObject({
      name: 'Le Bistro',
      priceLevel: 2,
    });

    // Verify metadata is preserved
    expect(payload.response.data.metadata).toHaveProperty('filtering');
    expect(payload.response.data.metadata.filtering).toMatchObject({
      userMustInclude: ['museums', 'art'],
      userMustAvoid: ['clubs'],
    });

    // Verify merge: false is used
    expect(options).toEqual({ merge: false });
  });

  it('preserves nested response object even when other fields are spread', async () => {
    render(<AIItineraryDisplay itinerary={mockItinerary as any} />);

    const shareButtons = screen.getAllByTestId('ShareIcon');
    const shareButton = shareButtons[0].closest('button');
    
    if (shareButton) {
      fireEvent.click(shareButton);
    }

    await waitFor(() => {
      expect(setDoc).toHaveBeenCalled();
    });

    const [, payload] = (setDoc as jest.Mock).mock.calls[0];

    // The response object should be explicitly set, not just spread
    expect(payload.response).toBeDefined();
    expect(payload.response).toEqual(mockItinerary.response);
  });
});
