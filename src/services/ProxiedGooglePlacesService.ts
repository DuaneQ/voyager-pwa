import { IGooglePlacesService } from './interfaces/IAirportService';
import { LocationCoordinates } from '../types/Airport';
import { getFunctions, httpsCallable } from 'firebase/functions';

export class ProxiedGooglePlacesService implements IGooglePlacesService {
  private functions: any;

  constructor() {
    this.functions = getFunctions();
  }

  async getPlaceDetails(placeQuery: string): Promise<LocationCoordinates | null> {
    try {
      const fn = httpsCallable(this.functions, 'placeSearch');
      const resp = await fn({ q: placeQuery, maxResults: 1 });
      const payload: any = resp?.data ?? resp;
      const first = payload?.data?.results?.[0];
      if (!first) return null;
      return { lat: first.geometry.location.lat, lng: first.geometry.location.lng };
    } catch (err) {
      console.error('[ProxiedGooglePlacesService] getPlaceDetails error', err);
      return null;
    }
  }

  async searchAirports(query: string, location?: LocationCoordinates): Promise<any[]> {
    try {
  const fn = httpsCallable(this.functions, 'placeSearch');
  const resp = await fn({ q: query, location, maxResults: 10 });
  const payload: any = resp?.data ?? resp;
  return payload?.data?.results || [];
    } catch (err) {
      console.error('[ProxiedGooglePlacesService] searchAirports error', err);
      return [];
    }
  }

  async getPlaceById(placeId: string): Promise<any | null> {
    // Not implemented for proxy. Client can call geocodePlace if needed.
    return null;
  }

  async autocompletePlace(input: string, location?: LocationCoordinates): Promise<any[]> {
    try {
  const fn = httpsCallable(this.functions, 'placeSearch');
  const resp = await fn({ q: input, location, maxResults: 5 });
  const payload: any = resp?.data ?? resp;
  return payload?.data?.results || [];
    } catch (err) {
      console.error('[ProxiedGooglePlacesService] autocompletePlace error', err);
      return [];
    }
  }
}

export default {};
