// Mock Search component for Cypress tests
import React from 'react';

// This file will be used to mock the Search component in Cypress tests
export const Search = () => {
  return (
    <div className="mock-search-page">
      <h2>Mock Search Page for Cypress Tests</h2>
      
      <div style={{ margin: '20px 0' }}>
        <label htmlFor="itinerary-select">Select Itinerary: </label>
        <select 
          id="itinerary-select" 
          data-testid="itinerary-select"
        >
          <option value="test-itinerary">Paris</option>
        </select>
      </div>
      
      <div data-testid="itinerary-card" style={{ border: '1px solid #ccc', padding: '10px', marginTop: '20px' }}>
        <h3>TestUser2</h3>
        <p>Female, 30 years old</p>
        <p data-testid="itinerary-dates">2025-08-01 to 2025-08-15</p>
      </div>
    </div>
  );
};

export default Search;
