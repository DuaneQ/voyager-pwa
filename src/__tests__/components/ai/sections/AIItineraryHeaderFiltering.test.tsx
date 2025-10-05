import React from 'react';
import { render, screen } from '@testing-library/react';
import { AIItineraryHeader } from '../../../../../src/components/ai/sections/AIItineraryHeader';

describe('AIItineraryHeader filtering chips', () => {
  const mockItineraryData = {
    destination: 'Test City',
    startDate: '2025-10-01',
    endDate: '2025-10-05',
    description: 'Test description'
  } as any;

  it('shows filtering chips when metadata.filtering is present', () => {
    const metadata = {
      confidence: 0.9,
      aiModel: 'gpt-test',
      processingTime: 2000,
      filtering: {
        mustAvoidFilteredCount: 2,
        mustIncludeMatchesCount: 1,
        specialRequestsUsed: true
      }
    } as any;

    render(
      <AIItineraryHeader
        itineraryData={mockItineraryData}
        metadata={metadata}
        isEditing={false}
        onEditStart={() => {}}
        onSave={async () => {}}
        onCancel={() => {}}
      />
    );

    expect(screen.getByText('Filtered 2 items (must avoid)')).toBeInTheDocument();
    expect(screen.getByText('1 must-include matches')).toBeInTheDocument();
    expect(screen.getByText('Special requests used')).toBeInTheDocument();
  });
});
