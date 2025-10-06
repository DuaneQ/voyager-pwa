// Modern Google Places service implementation for coordinate resolution

import { IGooglePlacesService } from './interfaces/IAirportService';
import { LocationCoordinates } from '../types/Airport';

export class ModernGooglePlacesService implements IGooglePlacesService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get place details including coordinates using Geocoding service
   * This uses the Google Geocoding API with proper CORS handling
   */
  async getPlaceDetails(placeQuery: string): Promise<LocationCoordinates | null> {
    try {
      // Use Google Geocoding API
      const encodedQuery = encodeURIComponent(placeQuery);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedQuery}&key=${this.apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng
        };
      } else {
        console.warn('No results found for:', placeQuery, 'Status:', data.status);
        return null;
      }
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  /**
   * Search for airports using Google Places API
   * This uses the Google Places API Text Search
   */
  async searchAirports(query: string, location?: LocationCoordinates): Promise<any[]> {
    try {
      let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' airport')}&type=airport&key=${this.apiKey}`;
      
      // Add location bias if coordinates provided
      if (location) {
        url += `&location=${location.lat},${location.lng}&radius=100000`; // 100km radius
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Places API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status === 'OK' && data.results) {
        return data.results.map((place: any) => ({
          name: place.name,
          formatted_address: place.formatted_address,
          geometry: {
            location: {
              lat: place.geometry.location.lat,
              lng: place.geometry.location.lng
            }
          },
          types: place.types,
          place_id: place.place_id,
          rating: place.rating || null
        }));
      } else {
        console.warn('No airport results found for:', query, 'Status:', data.status);
        return [];
      }
    } catch (error) {
      console.error('Error searching airports:', error);
      return [];
    }
  }

  /**
   * Get place details by place ID
   */
  async getPlaceById(placeId: string): Promise<any | null> {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,types&key=${this.apiKey}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Place Details API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status === 'OK' && data.result) {
        return data.result;
      } else {
        console.warn('No place found for ID:', placeId, 'Status:', data.status);
        return null;
      }
    } catch (error) {
      console.error('Error getting place by ID:', error);
      return null;
    }
  }

  /**
   * Search for places with autocomplete
   */
  async autocompletePlace(input: string, location?: LocationCoordinates): Promise<any[]> {
    try {
      let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${this.apiKey}`;
      
      // Add location bias if coordinates provided
      if (location) {
        url += `&location=${location.lat},${location.lng}&radius=50000`; // 50km radius
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Autocomplete API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.status === 'OK' && data.predictions) {
        return data.predictions;
      } else {
        console.warn('No autocomplete results for:', input, 'Status:', data.status);
        return [];
      }
    } catch (error) {
      console.error('Error with autocomplete:', error);
      return [];
    }
  }
}
