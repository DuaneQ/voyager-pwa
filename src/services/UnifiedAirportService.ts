// Unified airport service that combines OpenFlights dataset with Google Places API

import { IAirportService, IGooglePlacesService, IDistanceCalculator } from './interfaces/IAirportService';
import { Airport, AirportSearchResult, LocationCoordinates } from '../types/Airport';
import { OpenFlightsAirportService } from './OpenFlightsAirportService';
import { ModernGooglePlacesService } from './ModernGooglePlacesService';
import { ProxiedGooglePlacesService } from './ProxiedGooglePlacesService';
import { DistanceCalculator } from '../utils/DistanceCalculator';

export class UnifiedAirportService implements IAirportService {
  private openFlightsService: OpenFlightsAirportService;
  private googlePlacesService: IGooglePlacesService | null = null;
  private distanceCalculator: IDistanceCalculator;

  constructor(googleApiKey?: string, distanceCalculator?: IDistanceCalculator) {
    this.distanceCalculator = distanceCalculator || new DistanceCalculator();
    this.openFlightsService = new OpenFlightsAirportService(this.distanceCalculator);
    
    if (googleApiKey) {
      this.googlePlacesService = new ModernGooglePlacesService(googleApiKey);
    } else {
      // If no API key provided in client build, use the functions-backed proxy
      try {
        this.googlePlacesService = new ProxiedGooglePlacesService() as any;
      } catch (err) {
        console.warn('ProxiedGooglePlacesService initialization failed, Google Places will be unavailable', err);
        this.googlePlacesService = null;
      }
    }
  }

  /**
   * Search for airports near a given location
   * Uses OpenFlights dataset for comprehensive coverage, with Google Places as fallback for coordinates
   */
  async searchAirportsNearLocation(
    locationName: string, 
    coordinates?: LocationCoordinates,
    maxDistance: number = 200,
    maxResults: number = 5 // 3 international + 2 domestic
  ): Promise<AirportSearchResult> {
    try {
      // First try to get coordinates from Google Places if not provided
      if (!coordinates && this.googlePlacesService) {
        const placeCoordinates = await this.googlePlacesService.getPlaceDetails(locationName);
        if (placeCoordinates) {
          coordinates = placeCoordinates;
        }
      }

      // Use OpenFlights service for comprehensive airport search
      const result = await this.openFlightsService.searchAirportsNearLocation(
        locationName, 
        coordinates, 
        maxDistance,
        maxResults
      );

      // If we found airports, return them
      if (result.airports.length > 0) {
        return result;
      }

      // If no airports found and we have Google Places, try a broader search
      if (this.googlePlacesService) {
        return await this.searchWithGooglePlacesFallback(locationName, coordinates);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error in unified airport search:', error);
      
      // Try Google Places fallback if available
      if (this.googlePlacesService) {
        try {
          return await this.searchWithGooglePlacesFallback(locationName, coordinates);
        } catch (fallbackError) {
          console.error('Google Places fallback also failed:', fallbackError);
          throw new Error(`Airport search failed: ${errorMessage}. Fallback also failed.`);
        }
      }

      throw new Error(`Airport search failed: ${errorMessage}`);
    }
  }

  /**
   * Fallback search using Google Places API when OpenFlights search fails
   * @param locationName - Name of the location to search near
   * @param coordinates - Optional coordinates for the location
   * @returns Promise<AirportSearchResult> - Search results from Google Places
   * @throws Error if Google Places service is not available or search fails
   */
  private async searchWithGooglePlacesFallback(
    locationName: string, 
    coordinates?: LocationCoordinates
  ): Promise<AirportSearchResult> {
    if (!this.googlePlacesService) {
      throw new Error('Google Places service not available');
    }

    const searchCoordinates = coordinates || 
      await this.googlePlacesService.getPlaceDetails(locationName) ||
      { lat: 0, lng: 0 };

    // Search for airports using Google Places
    const googleResults = await this.googlePlacesService.searchAirports(
      `${locationName} airports`, 
      searchCoordinates
    );

    // Convert Google Places results to our Airport format
    const airports: Airport[] = googleResults.map(place => {
      const distance = coordinates ? 
        this.distanceCalculator.calculateDistance(
          coordinates, 
          place.geometry.location
        ) : undefined;

      return {
        iataCode: this.extractIataFromName(place.name) || '',
        name: place.name,
        city: this.extractCityFromAddress(place.formatted_address),
        country: this.extractCountryFromAddress(place.formatted_address),
        coordinates: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        },
        distance,
        isInternational: this.openFlightsService.isInternationalAirport(place.name)
      };
    });

    return {
      airports,
      searchLocation: {
        name: locationName,
        coordinates: searchCoordinates
      }
    };
  }

  /**
   * Get airport details by IATA code using the comprehensive OpenFlights dataset
   * @param iataCode - 3-letter IATA airport code (e.g., 'JFK', 'LAX')
   * @returns Promise<Airport | null> - Airport details or null if not found
   */
  async getAirportByIataCode(iataCode: string): Promise<Airport | null> {
    // Always use OpenFlights for IATA code lookup as it's more comprehensive
    return await this.openFlightsService.getAirportByIataCode(iataCode);
  }

  /**
   * Search for airports directly using a text query (name, city, IATA code)
   * Combines OpenFlights dataset with Google Places for comprehensive results
   * @param query - Search query (airport name, city name, or IATA code)
   * @returns Promise<Airport[]> - Array of matching airports
   * @throws Error if search fails
   */
  async searchAirportsByQuery(query: string): Promise<Airport[]> {
    try {
      // First try OpenFlights service
      const openFlightsResults = await this.openFlightsService.searchAirportsByQuery(query);
      
      // If we have good results from OpenFlights, return them
      if (openFlightsResults.length >= 5) {
        return openFlightsResults;
      }

      // If OpenFlights results are limited and we have Google Places, combine results
      if (this.googlePlacesService) {
        const googleResults = await this.googlePlacesService.searchAirports(query);
        const googleAirports = googleResults.map(place => ({
          iataCode: this.extractIataFromName(place.name) || '',
          name: place.name,
          city: this.extractCityFromAddress(place.formatted_address),
          country: this.extractCountryFromAddress(place.formatted_address),
          coordinates: {
            lat: place.geometry.location.lat,
            lng: place.geometry.location.lng
          },
          isInternational: this.openFlightsService.isInternationalAirport(place.name)
        }));

        // Combine and deduplicate results
        const combinedResults = [...openFlightsResults];
        const existingIata = new Set(openFlightsResults.map(a => a.iataCode).filter(Boolean));
        
        for (const googleAirport of googleAirports) {
          if (!googleAirport.iataCode || !existingIata.has(googleAirport.iataCode)) {
            combinedResults.push(googleAirport);
          }
        }

        return combinedResults.slice(0, 20); // Limit to 20 results
      }

      return openFlightsResults;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred in airport query search';
      console.error('Error in unified airport query search:', error);
      throw new Error(`Airport query search failed: ${errorMessage}`);
    }
  }

  /**
   * Get coordinates for a location using Google Places API
   * @param locationName - Name of the location to get coordinates for
   * @returns Promise<LocationCoordinates | null> - Coordinates or null if not found
   */
  async getCoordinatesForLocation(locationName: string): Promise<LocationCoordinates | null> {
    if (this.googlePlacesService) {
      return await this.googlePlacesService.getPlaceDetails(locationName);
    }
    return null;
  }

  /**
   * Extract IATA code from airport name (looks for pattern like "Airport Name (ABC)")
   * @param name - Airport name string
   * @returns string | null - IATA code if found, null otherwise
   */
  private extractIataFromName(name: string): string | null {
    const iataMatch = name.match(/\(([A-Z]{3})\)/);
    return iataMatch ? iataMatch[1] : null;
  }

  /**
   * Extract city from formatted address (takes first part before comma)
   * @param address - Formatted address string
   * @returns string - City name or 'Unknown' if not found
   */
  private extractCityFromAddress(address: string): string {
    const parts = address.split(',');
    if (parts.length >= 2) {
      return parts[0].trim();
    }
    return address.split(' ')[0] || 'Unknown';
  }

  /**
   * Extract country from formatted address (takes last part after comma)
   * @param address - Formatted address string
   * @returns string - Country name or 'Unknown' if not found
   */
  private extractCountryFromAddress(address: string): string {
    const parts = address.split(',');
    if (parts.length >= 2) {
      return parts[parts.length - 1].trim();
    }
    return 'Unknown';
  }

  /**
   * Utility methods for UI display
   * Format airport information for display in UI components
   * @param airport - Airport object to format
   * @returns string - Formatted airport display string
   */
  formatAirportDisplay(airport: Airport): string {
    return `${airport.name} (${airport.iataCode}) - ${airport.city}, ${airport.country}`;
  }

  /**
   * Format airport information with distance for display
   * @param airport - Airport object to format (should include distance)
   * @returns string - Formatted airport display string with distance
   */
  formatAirportWithDistance(airport: Airport): string {
    const baseFormat = this.formatAirportDisplay(airport);
    return airport.distance 
      ? `${baseFormat} - ${Math.round(airport.distance)}km away`
      : baseFormat;
  }

  /**
   * Validate if a 3-letter IATA code corresponds to a real airport
   * @param iataCode - 3-letter IATA code to validate
   * @returns Promise<boolean> - True if valid airport code, false otherwise
   */
  async validateIataCode(iataCode: string): Promise<boolean> {
    if (!iataCode || iataCode.length !== 3) {
      return false;
    }
    
    const airport = await this.getAirportByIataCode(iataCode.toUpperCase());
    return airport !== null;
  }
}
