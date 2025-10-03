import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIItineraryHeader } from '../../../../components/ai/sections/AIItineraryHeader';

// Mock MUI icons
jest.mock('@mui/icons-material/Edit', () => () => <div data-testid="edit-icon" />);
jest.mock('@mui/icons-material/Save', () => () => <div data-testid="save-icon" />);
jest.mock('@mui/icons-material/Cancel', () => () => <div data-testid="cancel-icon" />);

describe('AIItineraryHeader', () => {
  const mockItineraryData = {
    destination: 'Paris, France',
    startDate: '2025-06-01',
    endDate: '2025-06-07',
    description: 'A wonderful trip to the City of Light'
  };

  const mockMetadata = {
    confidence: 0.95,
    aiModel: 'GPT-4',
    processingTime: 5000
  };

  const defaultProps = {
    itineraryData: mockItineraryData,
    metadata: mockMetadata,
    isEditing: false,
    onEditStart: jest.fn(),
    onSave: jest.fn().mockResolvedValue(undefined),
    onCancel: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Display Mode', () => {
    it('renders itinerary information correctly', () => {
      render(<AIItineraryHeader {...defaultProps} />);
      
      expect(screen.getByText('Paris, France')).toBeInTheDocument();
      expect(screen.getByText(/June.*2025.*June.*2025/)).toBeInTheDocument();
      expect(screen.getByText('A wonderful trip to the City of Light')).toBeInTheDocument();
    });

    it('renders metadata chips', () => {
      render(<AIItineraryHeader {...defaultProps} />);
      
      expect(screen.getByText('Confidence: 95%')).toBeInTheDocument();
      expect(screen.getByText('GPT-4')).toBeInTheDocument();
      expect(screen.getByText('Generated in 5s')).toBeInTheDocument();
    });

    it('shows edit button in display mode', () => {
      render(<AIItineraryHeader {...defaultProps} />);
      
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.queryByText('Save')).not.toBeInTheDocument();
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
    });

    it('calls onEditStart when edit button is clicked', async () => {
      render(<AIItineraryHeader {...defaultProps} />);
      
      await userEvent.click(screen.getByText('Edit'));
      expect(defaultProps.onEditStart).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edit Mode', () => {
    const editProps = { ...defaultProps, isEditing: true };

    it('shows save and cancel buttons in edit mode', () => {
      render(<AIItineraryHeader {...editProps} />);
      
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    });

    it('calls onSave when save button is clicked', async () => {
      render(<AIItineraryHeader {...editProps} />);
      
      await userEvent.click(screen.getByText('Save'));
      expect(defaultProps.onSave).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when cancel button is clicked', async () => {
      render(<AIItineraryHeader {...editProps} />);
      
      await userEvent.click(screen.getByText('Cancel'));
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Date Formatting', () => {
    it('handles null dates gracefully', () => {
      const propsWithNullDates = {
        ...defaultProps,
        itineraryData: {
          ...mockItineraryData,
          startDate: null,
          endDate: null
        }
      };
      
      render(<AIItineraryHeader {...propsWithNullDates} />);
      
      expect(screen.getByText('Date not specified - Date not specified')).toBeInTheDocument();
    });

    it('handles invalid dates gracefully', () => {
      const propsWithInvalidDates = {
        ...defaultProps,
        itineraryData: {
          ...mockItineraryData,
          startDate: 'invalid-date',
          endDate: 'invalid-date'
        }
      };
      
      render(<AIItineraryHeader {...propsWithInvalidDates} />);
      
      // Should not crash and should display some fallback
      expect(screen.getByText('Paris, France')).toBeInTheDocument();
    });

    it('formats dates with time component correctly', () => {
      const propsWithTimeDates = {
        ...defaultProps,
        itineraryData: {
          ...mockItineraryData,
          startDate: '2025-06-01T14:30:00Z',
          endDate: '2025-06-07T16:45:00Z'
        }
      };
      
      render(<AIItineraryHeader {...propsWithTimeDates} />);
      
      expect(screen.getByText(/June.*2025.*June.*2025/)).toBeInTheDocument();
    });
  });

  describe('Metadata Edge Cases', () => {
    it('handles missing metadata gracefully', () => {
      const propsWithoutMetadata = {
        ...defaultProps,
        metadata: undefined
      };
      
      render(<AIItineraryHeader {...propsWithoutMetadata} />);
      
      expect(screen.getByText('Paris, France')).toBeInTheDocument();
      expect(screen.queryByText('Confidence:')).not.toBeInTheDocument();
    });

    it('handles invalid confidence values', () => {
      const propsWithInvalidConfidence = {
        ...defaultProps,
        metadata: {
          ...mockMetadata,
          confidence: NaN
        }
      };
      
      render(<AIItineraryHeader {...propsWithInvalidConfidence} />);
      
      expect(screen.queryByText('Confidence:')).not.toBeInTheDocument();
      expect(screen.getByText('GPT-4')).toBeInTheDocument(); // Other metadata should still show
    });

    it('handles invalid processing time', () => {
      const propsWithInvalidProcessingTime = {
        ...defaultProps,
        metadata: {
          ...mockMetadata,
          processingTime: NaN
        }
      };
      
      render(<AIItineraryHeader {...propsWithInvalidProcessingTime} />);
      
      expect(screen.queryByText('Generated in')).not.toBeInTheDocument();
      expect(screen.getByText('Confidence: 95%')).toBeInTheDocument(); // Other metadata should still show
    });
  });

  describe('Accessibility', () => {
    it('has proper button roles', () => {
      render(<AIItineraryHeader {...defaultProps} />);
      
      const editButton = screen.getByRole('button', { name: /edit/i });
      expect(editButton).toBeInTheDocument();
    });

    it('has proper heading structure', () => {
      render(<AIItineraryHeader {...defaultProps} />);
      
      const heading = screen.getByText('Paris, France');
      expect(heading.tagName).toBe('H5');
    });
  });

  describe('Responsive Behavior', () => {
    it('renders without crashing on different screen sizes', () => {
      // This test ensures the responsive sx props don't cause issues
      render(<AIItineraryHeader {...defaultProps} />);
      
      expect(screen.getByText('Paris, France')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
  });
});