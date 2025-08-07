import { AirportService } from '../../services/AirportService';
import { GooglePlacesService } from '../../services/GooglePlacesService';
import { DistanceCalculator } from '../../utils/DistanceCalculator';

// Mock GooglePlacesService
jest.mock('../../services/GooglePlacesService');
const MockedGooglePlacesService = GooglePlacesService as jest.MockedClass<typeof GooglePlacesService>;

// Mock DistanceCalculator
jest.mock('../../utils/DistanceCalculator');
const MockedDistanceCalculator = DistanceCalculator as jest.MockedClass<typeof DistanceCalculator>;

describe('AirportService', () => {
  let airportService: AirportService;
  let mockGooglePlacesService: jest.Mocked<GooglePlacesService>;
  let mockDistanceCalculator: jest.Mocked<DistanceCalculator>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockGooglePlacesService = new MockedGooglePlacesService('fake-api-key') as jest.Mocked<GooglePlacesService>;
    mockDistanceCalculator = new MockedDistanceCalculator() as jest.Mocked<DistanceCalculator>;

    // Mock DistanceCalculator constructor to return our mock
    MockedDistanceCalculator.mockImplementation(() => mockDistanceCalculator);

    // Create AirportService instance
    airportService = new AirportService(mockGooglePlacesService);
  });

  describe('searchAirportsNearLocation', () => {
    it('should search airports near a location and return results with distances', async () => {
      // Arrange
      const locationName = 'New York';
      const mockCoordinates = { lat: 40.7128, lng: -74.0060 };
      const mockAirportPlaces = [
        {
          name: 'John F. Kennedy International Airport (JFK)',
          formatted_address: 'Queens, NY 11430, USA',
          geometry: { location: { lat: 40.6413, lng: -73.7781 } },
          types: ['airport', 'establishment']
        },
        {
          name: 'LaGuardia Airport (LGA)',
          formatted_address: 'East Elmhurst, NY 11371, USA',
          geometry: { location: { lat: 40.7769, lng: -73.8740 } },
          types: ['airport', 'establishment']
        }
      ];

      mockGooglePlacesService.getPlaceDetails.mockResolvedValue(mockCoordinates);
      mockGooglePlacesService.searchAirports.mockResolvedValue(mockAirportPlaces);
      mockDistanceCalculator.calculateDistance.mockReturnValueOnce(25).mockReturnValueOnce(15);

      // Act
      const result = await airportService.searchAirportsNearLocation(locationName);

      // Assert
      expect(mockGooglePlacesService.getPlaceDetails).toHaveBeenCalledWith(locationName);
      expect(mockGooglePlacesService.searchAirports).toHaveBeenCalledWith(
        `airports near ${locationName}`,
        mockCoordinates
      );
      expect(result.airports).toHaveLength(2);
      expect(result.airports[0].iataCode).toBe('LGA'); // Closer airport should be first
      expect(result.airports[0].distance).toBe(15);
      expect(result.airports[1].iataCode).toBe('JFK');
      expect(result.airports[1].distance).toBe(25);
      expect(result.searchLocation.name).toBe(locationName);
      expect(result.searchLocation.coordinates).toEqual(mockCoordinates);
    });

    it('should handle locations without coordinates', async () => {
      // Arrange
      const locationName = 'Unknown Location';
      mockGooglePlacesService.getPlaceDetails.mockResolvedValue(null);

      // Act & Assert
      await expect(airportService.searchAirportsNearLocation(locationName))
        .rejects.toThrow('Failed to find airports near Unknown Location: Could not get coordinates for location');
    });

    it('should filter airports by maximum distance', async () => {
      // Arrange
      const locationName = 'Boston';
      const mockCoordinates = { lat: 42.3601, lng: -71.0589 };
      const mockAirportPlaces = [
        {
          name: 'Logan International Airport (BOS)',
          formatted_address: 'Boston, MA, USA',
          geometry: { location: { lat: 42.3656, lng: -71.0096 } },
          types: ['airport']
        },
        {
          name: 'T.F. Green Airport (PVD)',
          formatted_address: 'Providence, RI, USA',
          geometry: { location: { lat: 41.7240, lng: -71.4128 } },
          types: ['airport']
        }
      ];

      mockGooglePlacesService.getPlaceDetails.mockResolvedValue(mockCoordinates);
      mockGooglePlacesService.searchAirports.mockResolvedValue(mockAirportPlaces);
      mockDistanceCalculator.calculateDistance.mockReturnValueOnce(5).mockReturnValueOnce(250); // Second airport too far

      // Act
      const result = await airportService.searchAirportsNearLocation(locationName, undefined, 200);

      // Assert
      expect(result.airports).toHaveLength(1);
      expect(result.airports[0].iataCode).toBe('BOS');
    });
  });

  describe('getAirportByIataCode', () => {
    it('should find airport by IATA code', async () => {
      // Arrange
      const iataCode = 'JFK';
      const mockAirportPlace = {
        name: 'John F. Kennedy International Airport (JFK)',
        formatted_address: 'Queens, NY 11430, USA',
        geometry: { location: { lat: 40.6413, lng: -73.7781 } },
        types: ['airport']
      };

      mockGooglePlacesService.searchAirports.mockResolvedValue([mockAirportPlace]);

      // Act
      const result = await airportService.getAirportByIataCode(iataCode);

      // Assert
      expect(mockGooglePlacesService.searchAirports).toHaveBeenCalledWith('JFK airport');
      expect(result).not.toBeNull();
      expect(result?.iataCode).toBe('JFK');
      expect(result?.name).toBe('John F. Kennedy International Airport (JFK)');
    });

    it('should return null if airport not found', async () => {
      // Arrange
      const iataCode = 'XXX';
      mockGooglePlacesService.searchAirports.mockResolvedValue([]);

      // Act
      const result = await airportService.getAirportByIataCode(iataCode);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('searchAirportsByQuery', () => {
    it('should search airports by query string', async () => {
      // Arrange
      const query = 'airports in London';
      const mockAirportPlaces = [
        {
          name: 'Heathrow Airport (LHR)',
          formatted_address: 'London, UK',
          geometry: { location: { lat: 51.4700, lng: -0.4543 } },
          types: ['airport']
        }
      ];

      mockGooglePlacesService.searchAirports.mockResolvedValue(mockAirportPlaces);

      // Act
      const result = await airportService.searchAirportsByQuery(query);

      // Assert
      expect(mockGooglePlacesService.searchAirports).toHaveBeenCalledWith(query);
      expect(result).toHaveLength(1);
      expect(result[0].iataCode).toBe('LHR');
    });
  });

  describe('validateIataCode', () => {
    it('should validate valid IATA codes', async () => {
      // Arrange
      const validCode = 'LAX';
      const mockAirport = {
        name: 'Los Angeles International Airport (LAX)',
        formatted_address: 'Los Angeles, CA, USA',
        geometry: { location: { lat: 33.9425, lng: -118.4081 } },
        types: ['airport']
      };
      mockGooglePlacesService.searchAirports.mockResolvedValue([mockAirport]);

      // Act
      const result = await airportService.validateIataCode(validCode);

      // Assert
      expect(result).toBe(true);
    });

    it('should reject invalid IATA codes', async () => {
      // Arrange
      const invalidCode = 'XY'; // Too short

      // Act
      const result = await airportService.validateIataCode(invalidCode);

      // Assert
      expect(result).toBe(false);
    });

    it('should reject non-existent IATA codes', async () => {
      // Arrange
      const nonExistentCode = 'ZZZ';
      mockGooglePlacesService.searchAirports.mockResolvedValue([]);

      // Act
      const result = await airportService.validateIataCode(nonExistentCode);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('utility methods', () => {
    it('should format airport display correctly', () => {
      // Arrange
      const airport = {
        iataCode: 'LAX',
        name: 'Los Angeles International Airport',
        city: 'Los Angeles',
        country: 'USA',
        coordinates: { lat: 33.9425, lng: -118.4081 },
        isInternational: true
      };

      // Act
      const result = airportService.formatAirportDisplay(airport);

      // Assert
      expect(result).toBe('Los Angeles International Airport (LAX) - Los Angeles, USA');
    });

    it('should format airport with distance correctly', () => {
      // Arrange
      const airport = {
        iataCode: 'LAX',
        name: 'Los Angeles International Airport',
        city: 'Los Angeles',
        country: 'USA',
        coordinates: { lat: 33.9425, lng: -118.4081 },
        distance: 25.7,
        isInternational: true
      };

      // Act
      const result = airportService.formatAirportWithDistance(airport);

      // Assert
      expect(result).toBe('Los Angeles International Airport (LAX) - Los Angeles, USA - 26km away');
    });
  });
});
