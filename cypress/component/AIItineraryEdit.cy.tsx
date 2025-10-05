/// <reference types="cypress" />

import React from 'react';
import AIItineraryDisplay from '../../src/components/ai/AIItineraryDisplay';
import { UserProfileContext } from '../../src/Context/UserProfileContext';
import { AlertContext } from '../../src/Context/AlertContext';

// Simple Test Provider to supply contexts used by components
function TestProvider({ children }: { children: React.ReactNode }) {
  const mockUserProfile = {
    username: 'Test User',
    email: 'test@example.com',
    uid: 'testUserId'
  };
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const updateUserProfile = (p: any) => {};
  const mockShowAlert = cy.stub();

  return (
    <AlertContext.Provider value={{ showAlert: mockShowAlert as any }}>
      <UserProfileContext.Provider value={{ userProfile: mockUserProfile as any, updateUserProfile }}>
        {children}
      </UserProfileContext.Provider>
    </AlertContext.Provider>
  );
}

// Minimal itinerary fixture with one activity and one meal
const mockItinerary = {
  id: 'it-1',
  response: {
    data: {
      itinerary: {
        destination: 'Test City',
        startDate: '2025-12-01',
        endDate: '2025-12-03',
        description: 'Test itinerary',
        days: [
          {
            day: 1,
            date: '2025-12-01',
            activities: [
              {
                name: 'Visit Museum',
                description: 'A great museum',
                timing: { startTime: '10:00', endTime: '12:00' },
                location: 'Central Museum',
                website: 'https://museum.example',
                bookingUrl: 'https://museum.example/book'
              }
            ],
            meals: [
              {
                name: 'Lunch',
                restaurant: {
                  name: 'Cafe Test',
                  website: 'https://cafe.example',
                  phone: '555-1234',
                  bookingUrl: 'https://cafe.example/reserve'
                },
                cost: { amount: 20, currency: 'USD' }
              }
            ]
          }
        ]
      },
      recommendations: {}
    }
  }
};

describe('<AIItineraryDisplay /> (component) - edit interaction', () => {
  beforeEach(() => {
    // Ensure hooks that may be imported by child components do not run real code
    // Provide a minimal stub for useAIGeneratedItineraries
    cy.stub(require('../../src/hooks/useAIGeneratedItineraries'), 'useAIGeneratedItineraries').returns({ itineraries: [], refreshItineraries: cy.stub().resolves() } as any);

    // Prevent react-google-places-autocomplete from throwing in tests (if imported elsewhere)
    // No-op: avoid requiring optional mocks here to prevent webpack resolution errors
  });

  it('allows editing activity website and meal restaurant fields without selecting the card', () => {
    cy.mount(
      <TestProvider>
        <AIItineraryDisplay itinerary={mockItinerary as any} />
      </TestProvider>
    );

    // Enter edit mode
    cy.contains('Edit').click();

    // Activity website input should be editable (first Website input)
    cy.get('input[placeholder="Website"]').eq(0)
      .should('exist')
      .clear()
      .type('https://new-museum.example')
      .should('have.value', 'https://new-museum.example');

    // Meal restaurant name editable
    cy.get('input[placeholder="Restaurant name"]').should('exist').clear().type('New Cafe Name').should('have.value', 'New Cafe Name');

    // Meal website editable (second Website input)
    cy.get('input[placeholder="Website"]').eq(1)
      .should('exist')
      .clear()
      .type('https://new-cafe.example')
      .should('have.value', 'https://new-cafe.example');

    // Ensure focusing and typing did not select the card (no "Selected" chip present)
    cy.contains('Selected').should('not.exist');
  });
});
