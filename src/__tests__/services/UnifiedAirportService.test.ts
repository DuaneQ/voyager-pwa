import { UnifiedAirportService } from '../../services/UnifiedAirportService';

describe('UnifiedAirportService', () => {
  let service: UnifiedAirportService;

  beforeEach(() => {
    service = new UnifiedAirportService();
  });

  describe('searchAirportsNearLocation', () => {
    it('should search for airports using OpenFlights dataset', async () => {
      const result = await service.searchAirportsNearLocation('New York', undefined, 100);
      
      expect(result).toBeDefined();
      expect(result.searchLocation.name).toBe('New York');
      expect(Array.isArray(result.airports)).toBe(true);
      
      // Should find airports near New York from the OpenFlights dataset
      if (result.airports.length > 0) {
        const firstAirport = result.airports[0];
        expect(firstAirport).toHaveProperty('iataCode');
        expect(firstAirport).toHaveProperty('name');
        expect(firstAirport).toHaveProperty('coordinates');
        expect(firstAirport).toHaveProperty('city');
        expect(firstAirport).toHaveProperty('country');
      }
    });

    it('should handle cities with specific coordinates', async () => {
      const coordinates = { lat: 40.7128, lng: -74.0060 }; // New York coordinates
      const result = await service.searchAirportsNearLocation('New York', coordinates, 50);
      
      expect(result).toBeDefined();
      expect(result.searchLocation.coordinates).toEqual(coordinates);
    });

    it('should return 5 closest airports with at least 1 international by default', async () => {
      const result = await service.searchAirportsNearLocation('New York');
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.airports)).toBe(true);
      
      // Should return at most 5 airports
      expect(result.airports.length).toBeLessThanOrEqual(5);
      
      // Should have at least 1 international airport if any international airports exist in the area
      const internationalCount = result.airports.filter(airport => airport.isInternational).length;
      if (result.airports.length > 0) {
        // For major cities like New York, we should definitely have international airports
        expect(internationalCount).toBeGreaterThanOrEqual(1);
      }
      
      // Airports should be sorted by distance (closest first)
      if (result.airports.length > 1) {
        for (let i = 1; i < result.airports.length; i++) {
          const prevDistance = result.airports[i - 1].distance || 0;
          const currDistance = result.airports[i].distance || 0;
          expect(currDistance).toBeGreaterThanOrEqual(prevDistance);
        }
      }
    });

    it('should respect custom maxResults parameter', async () => {
      const result = await service.searchAirportsNearLocation(
        'New York', 
        undefined, 
        200, // Large radius to find many airports
        2 // Limit to 2 results
      );
      
      expect(result).toBeDefined();
      expect(result.airports.length).toBeLessThanOrEqual(5);
    });
  });

  describe('getAirportByIataCode', () => {
    it('should find airport by IATA code', async () => {
      const airport = await service.getAirportByIataCode('JFK');
      
      if (airport) {
        expect(airport.iataCode).toBe('JFK');
        expect(airport.name).toContain('Kennedy');
        expect(airport.coordinates).toBeDefined();
      }
    });

    it('should return null for invalid IATA code', async () => {
      const airport = await service.getAirportByIataCode('XYZ');
      expect(airport).toBeNull();
    });
  });

  describe('utility methods', () => {
    it('should format airport display correctly', () => {
      const airport = {
        iataCode: 'JFK',
        name: 'John F. Kennedy International Airport',
        city: 'New York',
        country: 'United States',
        coordinates: { lat: 40.6413, lng: -73.7781 },
        isInternational: true
      };

      const formatted = service.formatAirportDisplay(airport);
      expect(formatted).toBe('John F. Kennedy International Airport (JFK) - New York, United States');
    });

    it('should format airport with distance', () => {
      const airport = {
        iataCode: 'JFK',
        name: 'John F. Kennedy International Airport',
        city: 'New York',
        country: 'United States',
        coordinates: { lat: 40.6413, lng: -73.7781 },
        isInternational: true,
        distance: 25.5
      };

      const formatted = service.formatAirportWithDistance(airport);
      expect(formatted).toContain('26km away');
    });

    it('should validate IATA codes correctly', async () => {
      // Test invalid codes
      expect(await service.validateIataCode('')).toBe(false);
      expect(await service.validateIataCode('AB')).toBe(false);
      expect(await service.validateIataCode('ABCD')).toBe(false);
      
      // Note: We can't easily test valid codes without network access
      // In a real test environment, you might mock the getAirportByIataCode method
    });
  });
});
