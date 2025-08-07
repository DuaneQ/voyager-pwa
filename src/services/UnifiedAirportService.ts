// Unified airport service that combines OpenFlights dataset with Google Places API

import { IAirportService, IGooglePlacesService, IDistanceCalculator } from './interfaces/IAirportService';
import { Airport, AirportSearchResult, LocationCoordinates } from '../types/Airport';
import { OpenFlightsAirportService } from './OpenFlightsAirportService';
import { ModernGooglePlacesService } from './ModernGooglePlacesService';
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
    }
  }

  /**
   * Search for airports near a given location
   * Uses OpenFlights dataset for comprehensive coverage, with Google Places as fallback for coordinates
   */
  async searchAirportsNearLocation(
    locationName: string, 
    coordinates?: LocationCoordinates,
    maxDistance: number = 200
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
        maxDistance
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
      console.error('Error in unified airport search:', error);
      
      // Try Google Places fallback if available
      if (this.googlePlacesService) {
        try {
          return await this.searchWithGooglePlacesFallback(locationName, coordinates);
        } catch (fallbackError) {
          console.error('Google Places fallback also failed:', fallbackError);
        }
      }

      // Return empty result if all methods fail
      return {
        airports: [],
        searchLocation: {
          name: locationName,
          coordinates: coordinates || { lat: 0, lng: 0 }
        }
      };
    }
  }

  /**
   * Fallback search using Google Places API
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
        isInternational: this.isInternationalAirport(place.name)
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
   * Get airport details by IATA code
   */
  async getAirportByIataCode(iataCode: string): Promise<Airport | null> {
    // Always use OpenFlights for IATA code lookup as it's more comprehensive
    return await this.openFlightsService.getAirportByIataCode(iataCode);
  }

  /**
   * Search for airports directly using query
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
          isInternational: this.isInternationalAirport(place.name)
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
      console.error('Error in unified airport query search:', error);
      return [];
    }
  }

  /**
   * Get coordinates for a location using Google Places API
   */
  async getCoordinatesForLocation(locationName: string): Promise<LocationCoordinates | null> {
    if (this.googlePlacesService) {
      return await this.googlePlacesService.getPlaceDetails(locationName);
    }
    return null;
  }

  /**
   * Extract IATA code from airport name
   */
  private extractIataFromName(name: string): string | null {
    const iataMatch = name.match(/\(([A-Z]{3})\)/);
    return iataMatch ? iataMatch[1] : null;
  }

  /**
   * Extract city from formatted address
   */
  private extractCityFromAddress(address: string): string {
    const parts = address.split(',');
    if (parts.length >= 2) {
      return parts[0].trim();
    }
    return address.split(' ')[0] || 'Unknown';
  }

  /**
   * Extract country from formatted address
   */
  private extractCountryFromAddress(address: string): string {
    const parts = address.split(',');
    if (parts.length >= 2) {
      return parts[parts.length - 1].trim();
    }
    return 'Unknown';
  }

  /**
   * Determine if airport is international
   */
  private isInternationalAirport(name: string): boolean {
    const lowerName = name.toLowerCase();
    return lowerName.includes('international') || 
           lowerName.includes('intl') ||
           lowerName.includes('regional') === false; // Assume non-regional airports are more likely to be international
  }

  /**
   * Utility methods for UI display
   */
  formatAirportDisplay(airport: Airport): string {
    return `${airport.name} (${airport.iataCode}) - ${airport.city}, ${airport.country}`;
  }

  formatAirportWithDistance(airport: Airport): string {
    const baseFormat = this.formatAirportDisplay(airport);
    return airport.distance 
      ? `${baseFormat} - ${Math.round(airport.distance)}km away`
      : baseFormat;
  }

  async validateIataCode(iataCode: string): Promise<boolean> {
    if (!iataCode || iataCode.length !== 3) {
      return false;
    }
    
    const airport = await this.getAirportByIataCode(iataCode.toUpperCase());
    return airport !== null;
  }
}
