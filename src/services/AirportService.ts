import { IAirportService, IGooglePlacesService, IDistanceCalculator } from './interfaces/IAirportService';
import { Airport, AirportSearchResult, LocationCoordinates } from '../types/Airport';
import { DistanceCalculator } from '../utils/DistanceCalculator';

export class AirportService implements IAirportService {
  private googlePlacesService: IGooglePlacesService;
  private distanceCalculator: IDistanceCalculator;

  constructor(googlePlacesService: IGooglePlacesService) {
    this.googlePlacesService = googlePlacesService;
    this.distanceCalculator = new DistanceCalculator();
  }

  async searchAirportsNearLocation(
    locationName: string, 
    coordinates?: LocationCoordinates,
    maxDistance: number = 200
  ): Promise<AirportSearchResult> {
    try {
      // Get coordinates if not provided
      let searchCoordinates = coordinates;
      if (!searchCoordinates) {
        const coords = await this.googlePlacesService.getPlaceDetails(locationName);
        if (!coords) {
          throw new Error('Could not get coordinates for location');
        }
        searchCoordinates = coords;
      }

      // Search for airports using Google Places API
      const airportPlaces = await this.googlePlacesService.searchAirports(
        `airports near ${locationName}`,
        searchCoordinates
      );

      // Convert Google Places results to Airport objects and calculate distances
      const airports: Airport[] = airportPlaces
        .map(place => this.convertPlaceToAirport(place, searchCoordinates!))
        .filter(airport => {
          if (!airport.distance) return true;
          return airport.distance <= maxDistance;
        })
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));

      return {
        airports,
        searchLocation: {
          name: locationName,
          coordinates: searchCoordinates!
        }
      };
    } catch (error) {
      console.error('Error searching airports near location:', error);
      throw new Error(`Failed to find airports near ${locationName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getAirportByIataCode(iataCode: string): Promise<Airport | null> {
    try {
      const query = `${iataCode} airport`;
      const airportPlaces = await this.googlePlacesService.searchAirports(query);
      
      // Find the airport that matches the IATA code
      const matchingPlace = airportPlaces.find(place => 
        place.name?.toUpperCase().includes(iataCode.toUpperCase()) ||
        place.formatted_address?.toUpperCase().includes(iataCode.toUpperCase())
      );

      if (!matchingPlace) {
        return null;
      }

      return this.convertPlaceToAirport(matchingPlace);
    } catch (error) {
      console.error('Error getting airport by IATA code:', error);
      return null;
    }
  }

  async searchAirportsByQuery(query: string): Promise<Airport[]> {
    try {
      const airportPlaces = await this.googlePlacesService.searchAirports(query);
      return airportPlaces.map(place => this.convertPlaceToAirport(place));
    } catch (error) {
      console.error('Error searching airports by query:', error);
      throw new Error(`Failed to search airports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private convertPlaceToAirport(place: any, referenceLocation?: LocationCoordinates): Airport {
    // Extract IATA code from name or try to determine it
    const iataCode = this.extractIataCode(place.name || '') || 'N/A';
    
    const airport: Airport = {
      iataCode,
      name: place.name || 'Unknown Airport',
      city: this.extractCityFromAddress(place.formatted_address || ''),
      country: this.extractCountryFromAddress(place.formatted_address || ''),
      coordinates: {
        lat: place.geometry?.location?.lat || 0,
        lng: place.geometry?.location?.lng || 0
      },
      isInternational: this.determineIfInternational(place.name || '', place.types || [])
    };

    // Calculate distance if reference location is provided
    if (referenceLocation && airport.coordinates.lat && airport.coordinates.lng) {
      airport.distance = this.distanceCalculator.calculateDistance(
        referenceLocation,
        airport.coordinates
      );
    }

    return airport;
  }

  private extractIataCode(name: string): string | null {
    // Look for 3-letter codes in parentheses like "John F. Kennedy Airport (JFK)"
    const match = name.match(/\(([A-Z]{3})\)/);
    if (match) {
      return match[1];
    }
    
    // Look for common airport code patterns
    const codeMatch = name.match(/\b([A-Z]{3})\b/);
    if (codeMatch) {
      return codeMatch[1];
    }
    
    return null;
  }

  private extractCityFromAddress(address: string): string {
    const parts = address.split(',');
    return parts.length > 1 ? parts[parts.length - 3]?.trim() || 'Unknown' : 'Unknown';
  }

  private extractCountryFromAddress(address: string): string {
    const parts = address.split(',');
    return parts[parts.length - 1]?.trim() || 'Unknown';
  }

  private determineIfInternational(name: string, types: string[]): boolean {
    const internationalKeywords = ['international', 'intl'];
    const nameCheck = internationalKeywords.some(keyword => 
      name.toLowerCase().includes(keyword)
    );
    const typeCheck = types.includes('airport') || types.includes('establishment');
    
    return nameCheck || typeCheck;
  }

  // Utility methods for UI display
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
