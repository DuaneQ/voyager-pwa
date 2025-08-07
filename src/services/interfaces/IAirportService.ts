// Airport service interface following SOLID principles (Interface Segregation)

import { Airport, AirportSearchResult, LocationCoordinates } from '../../types/Airport';

export interface IAirportService {
  /**
   * Search for airports near a given location
   * @param locationName - The name of the city/location
   * @param coordinates - Optional coordinates if already known
   * @param maxDistance - Maximum search radius in kilometers (default: 200)
   * @returns Promise with found airports
   */
  searchAirportsNearLocation(
    locationName: string, 
    coordinates?: LocationCoordinates,
    maxDistance?: number
  ): Promise<AirportSearchResult>;

  /**
   * Get airport details by IATA code
   * @param iataCode - 3-letter IATA airport code
   * @returns Promise with airport details or null if not found
   */
  getAirportByIataCode(iataCode: string): Promise<Airport | null>;

  /**
   * Search for airports directly using Google Places API
   * @param query - Search query (e.g., "JFK Airport" or "New York airports")
   * @returns Promise with found airports
   */
  searchAirportsByQuery(query: string): Promise<Airport[]>;
}

export interface IGooglePlacesService {
  /**
   * Get place details including coordinates
   * @param placeQuery - Place name or address
   * @returns Promise with place details
   */
  getPlaceDetails(placeQuery: string): Promise<LocationCoordinates | null>;

  /**
   * Search for airports using Google Places API
   * @param query - Search query
   * @param location - Optional center point for search
   * @returns Promise with airport places
   */
  searchAirports(query: string, location?: LocationCoordinates): Promise<any[]>;
}

export interface IDistanceCalculator {
  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param coord1 - First coordinate
   * @param coord2 - Second coordinate
   * @returns Distance in kilometers
   */
  calculateDistance(coord1: LocationCoordinates, coord2: LocationCoordinates): number;
}
