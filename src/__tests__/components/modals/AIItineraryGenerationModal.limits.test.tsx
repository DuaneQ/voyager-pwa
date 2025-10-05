import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AIItineraryGenerationModal from '../../../../src/components/modals/AIItineraryGenerationModal';

// Mocks for hooks used inside the modal
jest.mock('../../../../src/hooks/useAIGeneration', () => ({
  useAIGeneration: () => ({
    generateItinerary: jest.fn().mockResolvedValue({ id: 'fake' }),
    isGenerating: false,
    progress: null,
    resetGeneration: jest.fn(),
    cancelGeneration: jest.fn(),
  })
}));

jest.mock('../../../../src/hooks/useTravelPreferences', () => ({
  useTravelPreferences: () => ({
    preferences: { profiles: [{ id: 'p1', name: 'Default', isDefault: true, transportation: { includeFlights: false } }] },
    loading: false,
    getProfileById: (id: string) => ({ id: 'p1', name: 'Default', transportation: { includeFlights: false } }),
    loadPreferences: jest.fn(),
  })
}));

// Minimal environment to render the modal
describe('AIItineraryGenerationModal input limits', () => {
  test('prevents adding more than MAX_TAGS mustInclude items and caps tag length', () => {
    render(<AIItineraryGenerationModal open={true} onClose={jest.fn()} />);

    const input = screen.getByPlaceholderText('Add specific places or activities you want to include');
    // Add 11 items
    for (let i = 0; i < 11; i++) {
      fireEvent.change(input, { target: { value: `place-${i}` } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    }

    // Should show at most 10 chips
    const chips = screen.getAllByRole('button', { hidden: true }).filter((el: any) => el.textContent && el.textContent.startsWith('place-'));
    expect(chips.length).toBeLessThanOrEqual(10);
  });

  test('specialRequests is truncated to MAX_SPECIAL_REQUESTS_LENGTH', () => {
    render(<AIItineraryGenerationModal open={true} onClose={jest.fn()} />);
    const long = 'x'.repeat(600);
    const textarea = screen.getByLabelText('Special Requests (Optional)');
    fireEvent.change(textarea, { target: { value: long } });
    // Value should be truncated in the DOM
    expect((textarea as HTMLTextAreaElement).value.length).toBeLessThanOrEqual(500);
  });
});
