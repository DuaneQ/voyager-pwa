/**
 * E2E Test: Search Flow
 * Cypress test that would catch UI flow bugs
 */

describe('Search Component - Next Itinerary Flow', () => {
  beforeEach(() => {
    // Setup test data and authentication
    cy.setupTestUser();
    cy.createTestItineraries(); // Creates multiple Miami itineraries
  });

  it('should load next itinerary after like/dislike action', () => {
    cy.visit('/search');
    
    // Select an itinerary
    cy.get('[data-testid="itinerary-select"]').click();
    cy.contains('Miami, FL, USA').click();
    
    // Wait for first match
    cy.get('[data-testid="itinerary-card"]').should('be.visible');
    cy.get('[data-testid="itinerary-card"]').within(() => {
      cy.contains('Sofia Rodriguez').should('be.visible'); // First user
    });
    
    // Click Like button
    cy.get('[data-testid="like-button"]').click();
    
    // CRITICAL: Verify next itinerary appears
    cy.get('[data-testid="itinerary-card"]').should('be.visible');
    cy.get('[data-testid="itinerary-card"]').within(() => {
      // Should show different user now
      cy.contains('Sofia Rodriguez').should('not.exist');
      cy.contains('Marcus Thompson').should('be.visible'); // Next user
    });
  });

  it('should work for dislike action too', () => {
    cy.visit('/search');
    
    cy.get('[data-testid="itinerary-select"]').click();
    cy.contains('Miami, FL, USA').click();
    
    cy.get('[data-testid="itinerary-card"]').should('be.visible');
    
    // Click Dislike button
    cy.get('[data-testid="dislike-button"]').click();
    
    // Should show next itinerary
    cy.get('[data-testid="itinerary-card"]').should('be.visible');
  });

  it('should show loading state briefly between itineraries', () => {
    cy.visit('/search');
    
    cy.get('[data-testid="itinerary-select"]').click();
    cy.contains('Miami, FL, USA').click();
    
    cy.get('[data-testid="itinerary-card"]').should('be.visible');
    
    cy.get('[data-testid="like-button"]').click();
    
    // Should show loading state briefly
    cy.contains('Searching for matches').should('be.visible');
    
    // Then next itinerary should appear
    cy.get('[data-testid="itinerary-card"]').should('be.visible');
    cy.contains('Searching for matches').should('not.exist');
  });
});