import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShareAIItineraryModal } from '../../components/modals/ShareAIItineraryModal';
import { AIGeneratedItinerary } from '../../hooks/useAIGeneratedItineraries';

// Mock clipboard API
const mockClipboard = {
  writeText: jest.fn()
};
Object.assign(navigator, {
  clipboard: mockClipboard
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    origin: 'https://travalpass.com'
  },
  writable: true
});

describe('ShareAIItineraryModal', () => {
  const mockItinerary: AIGeneratedItinerary = {
    id: 'test-itinerary-123',
    destination: 'Paris, France',
    startDate: '2025-08-15',
    endDate: '2025-08-22',
    status: 'completed',
    createdAt: new Date(),
    updatedAt: new Date(),
    response: {
      success: true,
      data: {
        itinerary: {
          id: 'test-itinerary-123',
          destination: 'Paris, France',
          startDate: '2025-08-15',
          endDate: '2025-08-22',
          description: 'A wonderful AI-generated trip to the City of Light',
          days: []
        },
        metadata: {
          generationId: 'gen-123',
          confidence: 0.95,
          processingTime: 45000,
          aiModel: 'gpt-4o-mini',
          version: '1.0'
        },
        costBreakdown: {
          total: 2500,
          perPerson: 1250,
          byCategory: {
            accommodation: 800,
            food: 600,
            activities: 400,
            transportation: 500,
            misc: 200
          }
        }
      }
    }
  };

  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    itinerary: mockItinerary
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders share modal with itinerary information', () => {
    render(<ShareAIItineraryModal {...defaultProps} />);

    expect(screen.getByText('Share Itinerary')).toBeInTheDocument();
    expect(screen.getByText('Paris, France')).toBeInTheDocument();
    expect(screen.getByText('Aug 15, 2025 - Aug 22, 2025')).toBeInTheDocument();
    expect(screen.getByText('"A wonderful AI-generated trip to the City of Light..."')).toBeInTheDocument();
  });

  it('displays the correct share URL', () => {
    render(<ShareAIItineraryModal {...defaultProps} />);

    const shareUrlInput = screen.getByDisplayValue('https://travalpass.com/share-itinerary/test-itinerary-123');
    expect(shareUrlInput).toBeInTheDocument();
    expect(shareUrlInput).toHaveAttribute('readonly');
  });

  it('copies link to clipboard when copy button is clicked', async () => {
    render(<ShareAIItineraryModal {...defaultProps} />);

    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith('https://travalpass.com/share-itinerary/test-itinerary-123');
    });

    // Check for success message
    await waitFor(() => {
      expect(screen.getByText('Link copied to clipboard!')).toBeInTheDocument();
    });
  });

  it('calls onClose when close button is clicked', () => {
    const mockOnClose = jest.fn();
    render(<ShareAIItineraryModal {...defaultProps} onClose={mockOnClose} />);

    const closeButton = screen.getByLabelText(/close/i);
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('shows info alert about public sharing', () => {
    render(<ShareAIItineraryModal {...defaultProps} />);

    expect(screen.getByText('Anyone with this link can view your itinerary. No login required!')).toBeInTheDocument();
  });

  it('handles missing itinerary data gracefully', () => {
    const itineraryWithoutData = {
      ...mockItinerary,
      response: undefined
    };

    render(<ShareAIItineraryModal {...defaultProps} itinerary={itineraryWithoutData} />);

    expect(screen.getByText('Paris, France')).toBeInTheDocument(); // Falls back to top-level destination
  });

  it('formats dates correctly', () => {
    render(<ShareAIItineraryModal {...defaultProps} />);

    expect(screen.getByText('Aug 15, 2025 - Aug 22, 2025')).toBeInTheDocument();
  });

  it('truncates long descriptions for preview', () => {
    const longDescriptionItinerary = {
      ...mockItinerary,
      response: {
        ...mockItinerary.response!,
        data: {
          ...mockItinerary.response!.data!,
          itinerary: {
            ...mockItinerary.response!.data!.itinerary,
            description: 'This is a very long description that should be truncated when displayed in the share modal preview because it exceeds the character limit that we want to show for the preview text'
          }
        }
      }
    };

    render(<ShareAIItineraryModal {...defaultProps} itinerary={longDescriptionItinerary} />);

    expect(screen.getByText(/"This is a very long description that should be truncated when displayed in the share m\.\.\."/)).toBeInTheDocument();
  });
});