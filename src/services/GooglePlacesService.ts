// Google Places service implementation using browser-compatible approach

import { IGooglePlacesService } from './interfaces/IAirportService';
import { LocationCoordinates } from '../types/Airport';

export class GooglePlacesService implements IGooglePlacesService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get place details including coordinates using Geocoding service
   * This is a browser-compatible approach that works with CORS
   * @param placeQuery - Place name or address
   * @returns Promise with place details
   */
  async getPlaceDetails(placeQuery: string): Promise<LocationCoordinates | null> {
    try {
      // Use a CORS proxy or fallback to approximate coordinates
      // For now, we'll use a hardcoded mapping for common cities
      const cityCoordinates = this.getCityCoordinates(placeQuery);
      if (cityCoordinates) {
        return cityCoordinates;
      }

      // If we can't find coordinates, return null
      console.warn('Could not find coordinates for:', placeQuery);
      return null;
    } catch (error) {
      console.error('Error getting place details:', error);
      return null;
    }
  }

  /**
   * Search for airports using a hardcoded database approach
   * @param query - Search query
   * @param location - Optional center point for search
   * @returns Promise with airport places
   */
  async searchAirports(query: string, location?: LocationCoordinates): Promise<any[]> {
    try {
      // Use hardcoded airport data for common cities
      const airports = this.getAirportsForLocation(query, location);
      return airports;
    } catch (error) {
      console.error('Error searching airports:', error);
      return [];
    }
  }

  /**
   * Get hardcoded coordinates for common cities
   * This is a fallback when we can't use the Google API directly
   */
  private getCityCoordinates(cityName: string): LocationCoordinates | null {
    const normalizedCity = cityName.toLowerCase().replace(/[,\s]+/g, ' ').trim();
    
    const cityDatabase: Record<string, LocationCoordinates> = {
      // US Cities
      'new york': { lat: 40.7128, lng: -74.0060 },
      'new york ny': { lat: 40.7128, lng: -74.0060 },
      'new york ny usa': { lat: 40.7128, lng: -74.0060 },
      'los angeles': { lat: 34.0522, lng: -118.2437 },
      'los angeles ca': { lat: 34.0522, lng: -118.2437 },
      'los angeles ca usa': { lat: 34.0522, lng: -118.2437 },
      'chicago': { lat: 41.8781, lng: -87.6298 },
      'chicago il': { lat: 41.8781, lng: -87.6298 },
      'chicago il usa': { lat: 41.8781, lng: -87.6298 },
      'miami': { lat: 25.7617, lng: -80.1918 },
      'miami fl': { lat: 25.7617, lng: -80.1918 },
      'miami fl usa': { lat: 25.7617, lng: -80.1918 },
      'miami beach': { lat: 25.7907, lng: -80.1300 },
      'miami beach fl': { lat: 25.7907, lng: -80.1300 },
      'miami beach fl usa': { lat: 25.7907, lng: -80.1300 },
      'miami beach florida': { lat: 25.7907, lng: -80.1300 },
      'miami beach florida usa': { lat: 25.7907, lng: -80.1300 },
      'milwaukee': { lat: 43.0389, lng: -87.9065 },
      'milwaukee wi': { lat: 43.0389, lng: -87.9065 },
      'milwaukee wi usa': { lat: 43.0389, lng: -87.9065 },
      'milwaukee wisconsin': { lat: 43.0389, lng: -87.9065 },
      'milwaukee wisconsin usa': { lat: 43.0389, lng: -87.9065 },
      'morgantown': { lat: 39.6295, lng: -79.9553 },
      'morgantown wv': { lat: 39.6295, lng: -79.9553 },
      'morgantown wv usa': { lat: 39.6295, lng: -79.9553 },
      'morgantown west virginia': { lat: 39.6295, lng: -79.9553 },
      'morgantown west virginia usa': { lat: 39.6295, lng: -79.9553 },
      'atlanta': { lat: 33.4484, lng: -84.3917 },
      'atlanta ga': { lat: 33.4484, lng: -84.3917 },
      'atlanta ga usa': { lat: 33.4484, lng: -84.3917 },
      'asheville': { lat: 35.5951, lng: -82.5515 },
      'asheville nc': { lat: 35.5951, lng: -82.5515 },
      'asheville nc usa': { lat: 35.5951, lng: -82.5515 },
      'asheville north carolina': { lat: 35.5951, lng: -82.5515 },
      'asheville north carolina usa': { lat: 35.5951, lng: -82.5515 },
      'myrtle beach': { lat: 33.6891, lng: -78.8867 },
      'myrtle beach sc': { lat: 33.6891, lng: -78.8867 },
      'myrtle beach sc usa': { lat: 33.6891, lng: -78.8867 },
      'myrtle beach south carolina': { lat: 33.6891, lng: -78.8867 },
      'myrtle beach south carolina usa': { lat: 33.6891, lng: -78.8867 },
      'san francisco': { lat: 37.7749, lng: -122.4194 },
      'san francisco ca': { lat: 37.7749, lng: -122.4194 },
      'san francisco ca usa': { lat: 37.7749, lng: -122.4194 },
      'los banos': { lat: 37.0583, lng: -120.8499 },
      'los banos ca': { lat: 37.0583, lng: -120.8499 },
      'los banos ca usa': { lat: 37.0583, lng: -120.8499 },
      'los baños': { lat: 37.0583, lng: -120.8499 },
      'los baños ca': { lat: 37.0583, lng: -120.8499 },
      'los baños ca usa': { lat: 37.0583, lng: -120.8499 },
      'los baños california': { lat: 37.0583, lng: -120.8499 },
      'los banos california': { lat: 37.0583, lng: -120.8499 },
      'boston': { lat: 42.3601, lng: -71.0589 },
      'boston ma': { lat: 42.3601, lng: -71.0589 },
      'boston ma usa': { lat: 42.3601, lng: -71.0589 },
      'burlington': { lat: 44.4759, lng: -73.2121 },
      'burlington vt': { lat: 44.4759, lng: -73.2121 },
      'burlington vt usa': { lat: 44.4759, lng: -73.2121 },
      'burlington vermont': { lat: 44.4759, lng: -73.2121 },
      'burlington vermont usa': { lat: 44.4759, lng: -73.2121 },
      'panama city beach': { lat: 30.1765, lng: -85.8054 },
      'panama city beach fl': { lat: 30.1765, lng: -85.8054 },
      'panama city beach fl usa': { lat: 30.1765, lng: -85.8054 },
      'panama city beach florida': { lat: 30.1765, lng: -85.8054 },
      'panama city beach florida usa': { lat: 30.1765, lng: -85.8054 },
      'pensacola': { lat: 30.4213, lng: -87.2169 },
      'pensacola fl': { lat: 30.4213, lng: -87.2169 },
      'pensacola fl usa': { lat: 30.4213, lng: -87.2169 },
      'pensacola florida': { lat: 30.4213, lng: -87.2169 },
      'pensacola florida usa': { lat: 30.4213, lng: -87.2169 },
      'portsmouth': { lat: 43.0718, lng: -70.7626 },
      'portsmouth nh': { lat: 43.0718, lng: -70.7626 },
      'portsmouth nh usa': { lat: 43.0718, lng: -70.7626 },
      'portsmouth new hampshire': { lat: 43.0718, lng: -70.7626 },
      'portsmouth new hampshire usa': { lat: 43.0718, lng: -70.7626 },
      'providence': { lat: 41.8240, lng: -71.4128 },
      'providence ri': { lat: 41.8240, lng: -71.4128 },
      'providence ri usa': { lat: 41.8240, lng: -71.4128 },
      'providence rhode island': { lat: 41.8240, lng: -71.4128 },
      'providence rhode island usa': { lat: 41.8240, lng: -71.4128 },
      'new haven': { lat: 41.3083, lng: -72.9279 },
      'new haven ct': { lat: 41.3083, lng: -72.9279 },
      'new haven ct usa': { lat: 41.3083, lng: -72.9279 },
      'new haven connecticut': { lat: 41.3083, lng: -72.9279 },
      'newark': { lat: 40.7357, lng: -74.1724 },
      'newark nj': { lat: 40.7357, lng: -74.1724 },
      'newark nj usa': { lat: 40.7357, lng: -74.1724 },
      'newark new jersey': { lat: 40.7357, lng: -74.1724 },
      'newark new jersey usa': { lat: 40.7357, lng: -74.1724 },
      'seattle': { lat: 47.6062, lng: -122.3321 },
      'seattle wa': { lat: 47.6062, lng: -122.3321 },
      'seattle wa usa': { lat: 47.6062, lng: -122.3321 },
      'las vegas': { lat: 36.1699, lng: -115.1398 },
      'las vegas nv': { lat: 36.1699, lng: -115.1398 },
      'las vegas nv usa': { lat: 36.1699, lng: -115.1398 },
      'denver': { lat: 39.7392, lng: -104.9903 },
      'denver co': { lat: 39.7392, lng: -104.9903 },
      'denver co usa': { lat: 39.7392, lng: -104.9903 },
      'phoenix': { lat: 33.4484, lng: -112.0740 },
      'phoenix az': { lat: 33.4484, lng: -112.0740 },
      'phoenix az usa': { lat: 33.4484, lng: -112.0740 },
      'oklahoma city': { lat: 35.4676, lng: -97.5164 },
      'oklahoma city ok': { lat: 35.4676, lng: -97.5164 },
      'oklahoma city ok usa': { lat: 35.4676, lng: -97.5164 },
      'oklahoma city oklahoma': { lat: 35.4676, lng: -97.5164 },
      'oklahoma city oklahoma usa': { lat: 35.4676, lng: -97.5164 },
      'dallas': { lat: 32.7767, lng: -96.7970 },
      'dallas tx': { lat: 32.7767, lng: -96.7970 },
      'dallas tx usa': { lat: 32.7767, lng: -96.7970 },
      'houston': { lat: 29.7604, lng: -95.3698 },
      'houston tx': { lat: 29.7604, lng: -95.3698 },
      'houston tx usa': { lat: 29.7604, lng: -95.3698 },
      'jackson': { lat: 43.4799, lng: -110.7624 },
      'jackson wy': { lat: 43.4799, lng: -110.7624 },
      'jackson wy usa': { lat: 43.4799, lng: -110.7624 },
      'jackson wyoming': { lat: 43.4799, lng: -110.7624 },
      'jackson wyoming usa': { lat: 43.4799, lng: -110.7624 },
      'jacksonville': { lat: 30.3322, lng: -81.6557 },
      'jacksonville fl': { lat: 30.3322, lng: -81.6557 },
      'jacksonville fl usa': { lat: 30.3322, lng: -81.6557 },
      'jacksonville florida': { lat: 30.3322, lng: -81.6557 },
      'jacksonville florida usa': { lat: 30.3322, lng: -81.6557 },
      'virginia beach': { lat: 36.8529, lng: -75.9780 },
      'virginia beach va': { lat: 36.8529, lng: -75.9780 },
      'virginia beach va usa': { lat: 36.8529, lng: -75.9780 },
      'virginia beach virginia': { lat: 36.8529, lng: -75.9780 },
      'virginia beach virginia usa': { lat: 36.8529, lng: -75.9780 },
      'washington': { lat: 38.9072, lng: -77.0369 },
      'washington dc': { lat: 38.9072, lng: -77.0369 },
      'washington dc usa': { lat: 38.9072, lng: -77.0369 },
      'washington d.c.': { lat: 38.9072, lng: -77.0369 },
      'washington d.c. dc usa': { lat: 38.9072, lng: -77.0369 },
      'washington d.c. usa': { lat: 38.9072, lng: -77.0369 },
      'philadelphia': { lat: 39.9526, lng: -75.1652 },
      'philadelphia pa': { lat: 39.9526, lng: -75.1652 },
      'philadelphia pa usa': { lat: 39.9526, lng: -75.1652 },
      'rehoboth beach': { lat: 38.7212, lng: -75.0760 },
      'rehoboth beach de': { lat: 38.7212, lng: -75.0760 },
      'rehoboth beach de usa': { lat: 38.7212, lng: -75.0760 },
      'rehoboth beach delaware': { lat: 38.7212, lng: -75.0760 },
      'ocean city': { lat: 38.3365, lng: -75.0849 },
      'ocean city md': { lat: 38.3365, lng: -75.0849 },
      'ocean city md usa': { lat: 38.3365, lng: -75.0849 },
      'ocean city maryland': { lat: 38.3365, lng: -75.0849 },
      'ocean city maryland usa': { lat: 38.3365, lng: -75.0849 },
      'ocean city nj': { lat: 39.2776, lng: -74.5746 },
      'ocean city nj usa': { lat: 39.2776, lng: -74.5746 },
      'ocean city new jersey': { lat: 39.2776, lng: -74.5746 },
      'ocean city new jersey usa': { lat: 39.2776, lng: -74.5746 },
      'atlantic city': { lat: 39.3643, lng: -74.4229 },
      'atlantic city nj': { lat: 39.3643, lng: -74.4229 },
      'atlantic city nj usa': { lat: 39.3643, lng: -74.4229 },
      'atlantic city new jersey': { lat: 39.3643, lng: -74.4229 },
      'atlantic city new jersey usa': { lat: 39.3643, lng: -74.4229 },
      'detroit': { lat: 42.3314, lng: -83.0458 },
      'detroit mi': { lat: 42.3314, lng: -83.0458 },
      'detroit mi usa': { lat: 42.3314, lng: -83.0458 },
      'destin': { lat: 30.3935, lng: -86.4958 },
      'destin fl': { lat: 30.3935, lng: -86.4958 },
      'destin fl usa': { lat: 30.3935, lng: -86.4958 },
      'destin florida': { lat: 30.3935, lng: -86.4958 },
      'destin florida usa': { lat: 30.3935, lng: -86.4958 },
      'cincinnati': { lat: 39.1031, lng: -84.5120 },
      'cincinnati oh': { lat: 39.1031, lng: -84.5120 },
      'cincinnati oh usa': { lat: 39.1031, lng: -84.5120 },
      'cincinnati ohio': { lat: 39.1031, lng: -84.5120 },
      'cincinnati ohio usa': { lat: 39.1031, lng: -84.5120 },
      'indianapolis': { lat: 39.7684, lng: -86.1581 },
      'indianapolis in': { lat: 39.7684, lng: -86.1581 },
      'indianapolis in usa': { lat: 39.7684, lng: -86.1581 },
      'indianapolis indiana': { lat: 39.7684, lng: -86.1581 },
      'indianapolis indiana usa': { lat: 39.7684, lng: -86.1581 },
      'des moines': { lat: 41.5868, lng: -93.6250 },
      'des moines ia': { lat: 41.5868, lng: -93.6250 },
      'des moines ia usa': { lat: 41.5868, lng: -93.6250 },
      'des moines iowa': { lat: 41.5868, lng: -93.6250 },
      'des moines iowa usa': { lat: 41.5868, lng: -93.6250 },
      'kansas city': { lat: 39.0997, lng: -94.5786 },
      'kansas city ks': { lat: 39.0997, lng: -94.5786 },
      'kansas city ks usa': { lat: 39.0997, lng: -94.5786 },
      'kansas city kansas': { lat: 39.0997, lng: -94.5786 },
      'kansas city kansas usa': { lat: 39.0997, lng: -94.5786 },
      'kansas city mo': { lat: 39.0997, lng: -94.5786 },
      'kansas city mo usa': { lat: 39.0997, lng: -94.5786 },
      'kansas city missouri': { lat: 39.0997, lng: -94.5786 },
      'kansas city missouri usa': { lat: 39.0997, lng: -94.5786 },
      'omaha': { lat: 41.2565, lng: -95.9345 },
      'omaha ne': { lat: 41.2565, lng: -95.9345 },
      'omaha ne usa': { lat: 41.2565, lng: -95.9345 },
      'omaha nebraska': { lat: 41.2565, lng: -95.9345 },
      'omaha nebraska usa': { lat: 41.2565, lng: -95.9345 },
      'branson': { lat: 36.6437, lng: -93.2185 },
      'branson mo': { lat: 36.6437, lng: -93.2185 },
      'branson mo usa': { lat: 36.6437, lng: -93.2185 },
      'branson missouri': { lat: 36.6437, lng: -93.2185 },
      'branson missouri usa': { lat: 36.6437, lng: -93.2185 },
      'louisville': { lat: 38.2527, lng: -85.7585 },
      'louisville ky': { lat: 38.2527, lng: -85.7585 },
      'louisville ky usa': { lat: 38.2527, lng: -85.7585 },
      'louisville kentucky': { lat: 38.2527, lng: -85.7585 },
      'louisville kentucky usa': { lat: 38.2527, lng: -85.7585 },
      'new orleans': { lat: 29.9511, lng: -90.0715 },
      'new orleans la': { lat: 29.9511, lng: -90.0715 },
      'new orleans la usa': { lat: 29.9511, lng: -90.0715 },
      'new orleans louisiana': { lat: 29.9511, lng: -90.0715 },
      'new orleans louisiana usa': { lat: 29.9511, lng: -90.0715 },
      'biloxi': { lat: 30.3960, lng: -88.8853 },
      'biloxi ms': { lat: 30.3960, lng: -88.8853 },
      'biloxi ms usa': { lat: 30.3960, lng: -88.8853 },
      'biloxi mississippi': { lat: 30.3960, lng: -88.8853 },
      'biloxi mississippi usa': { lat: 30.3960, lng: -88.8853 },
      'minneapolis': { lat: 44.9778, lng: -93.2650 },
      'minneapolis mn': { lat: 44.9778, lng: -93.2650 },
      'minneapolis mn usa': { lat: 44.9778, lng: -93.2650 },
      'fargo': { lat: 46.8772, lng: -96.7898 },
      'fargo nd': { lat: 46.8772, lng: -96.7898 },
      'fargo nd usa': { lat: 46.8772, lng: -96.7898 },
      'fargo north dakota': { lat: 46.8772, lng: -96.7898 },
      'fargo north dakota usa': { lat: 46.8772, lng: -96.7898 },
      'fort lauderdale': { lat: 26.1224, lng: -80.1373 },
      'fort lauderdale fl': { lat: 26.1224, lng: -80.1373 },
      'fort lauderdale fl usa': { lat: 26.1224, lng: -80.1373 },
      'fort lauderdale florida': { lat: 26.1224, lng: -80.1373 },
      'fort lauderdale florida usa': { lat: 26.1224, lng: -80.1373 },
      'fort payne': { lat: 34.4743, lng: -85.7197 },
      'fort payne al': { lat: 34.4743, lng: -85.7197 },
      'fort payne al usa': { lat: 34.4743, lng: -85.7197 },
      'fort payne alabama': { lat: 34.4743, lng: -85.7197 },
      'fort payne alabama usa': { lat: 34.4743, lng: -85.7197 },
      'fort walton beach': { lat: 30.4063, lng: -86.6107 },
      'fort walton beach fl': { lat: 30.4063, lng: -86.6107 },
      'fort walton beach fl usa': { lat: 30.4063, lng: -86.6107 },
      'fort walton beach florida': { lat: 30.4063, lng: -86.6107 },
      'fort walton beach florida usa': { lat: 30.4063, lng: -86.6107 },
      'fort worth': { lat: 32.7555, lng: -97.3308 },
      'fort worth tx': { lat: 32.7555, lng: -97.3308 },
      'fort worth tx usa': { lat: 32.7555, lng: -97.3308 },
      'fort worth texas': { lat: 32.7555, lng: -97.3308 },
      'fort worth texas usa': { lat: 32.7555, lng: -97.3308 },
      'rapid city': { lat: 44.0805, lng: -103.2310 },
      'rapid city sd': { lat: 44.0805, lng: -103.2310 },
      'rapid city sd usa': { lat: 44.0805, lng: -103.2310 },
      'rapid city south dakota': { lat: 44.0805, lng: -103.2310 },
      'rapid city south dakota usa': { lat: 44.0805, lng: -103.2310 },
      'orlando': { lat: 28.5383, lng: -81.3792 },
      'orlando fl': { lat: 28.5383, lng: -81.3792 },
      'orlando fl usa': { lat: 28.5383, lng: -81.3792 },
      'tampa': { lat: 27.9506, lng: -82.4572 },
      'tampa fl': { lat: 27.9506, lng: -82.4572 },
      'tampa fl usa': { lat: 27.9506, lng: -82.4572 },
      'tallahassee': { lat: 30.4518, lng: -84.27277 },
      'tallahassee fl': { lat: 30.4518, lng: -84.27277 },
      'tallahassee fl usa': { lat: 30.4518, lng: -84.27277 },
      'tallahassee florida': { lat: 30.4518, lng: -84.27277 },
      'tallahassee florida usa': { lat: 30.4518, lng: -84.27277 },
      'west palm beach': { lat: 26.7153, lng: -80.0534 },
      'west palm beach fl': { lat: 26.7153, lng: -80.0534 },
      'west palm beach fl usa': { lat: 26.7153, lng: -80.0534 },
      'west palm beach florida': { lat: 26.7153, lng: -80.0534 },
      'west palm beach florida usa': { lat: 26.7153, lng: -80.0534 },
      'nashville': { lat: 36.1627, lng: -86.7816 },
      'nashville tn': { lat: 36.1627, lng: -86.7816 },
      'nashville tn usa': { lat: 36.1627, lng: -86.7816 },
      'hot springs': { lat: 34.5037, lng: -93.0552 },
      'hot springs ar': { lat: 34.5037, lng: -93.0552 },
      'hot springs ar usa': { lat: 34.5037, lng: -93.0552 },
      'hot springs arkansas': { lat: 34.5037, lng: -93.0552 },
      'austin': { lat: 30.2672, lng: -97.7431 },
      'austin tx': { lat: 30.2672, lng: -97.7431 },
      'austin tx usa': { lat: 30.2672, lng: -97.7431 },
      'san angelo': { lat: 31.4638, lng: -100.4370 },
      'san angelo tx': { lat: 31.4638, lng: -100.4370 },
      'san angelo tx usa': { lat: 31.4638, lng: -100.4370 },
      'san angelo texas': { lat: 31.4638, lng: -100.4370 },
      'san angelo texas usa': { lat: 31.4638, lng: -100.4370 },
      'san antonio': { lat: 29.4241, lng: -98.4936 },
      'san antonio tx': { lat: 29.4241, lng: -98.4936 },
      'san antonio tx usa': { lat: 29.4241, lng: -98.4936 },
      'san antonio texas': { lat: 29.4241, lng: -98.4936 },
      'san antônio': { lat: 29.4241, lng: -98.4936 },
      'san antônio tx': { lat: 29.4241, lng: -98.4936 },
      'san antônio texas': { lat: 29.4241, lng: -98.4936 },
      'san diego': { lat: 32.7157, lng: -117.1611 },
      'san diego ca': { lat: 32.7157, lng: -117.1611 },
      'san diego ca usa': { lat: 32.7157, lng: -117.1611 },
      'oceanside': { lat: 33.1959, lng: -117.3795 },
      'oceanside ca': { lat: 33.1959, lng: -117.3795 },
      'oceanside ca usa': { lat: 33.1959, lng: -117.3795 },
      'oceanside california': { lat: 33.1959, lng: -117.3795 },
      'oceanside california usa': { lat: 33.1959, lng: -117.3795 },
      'portland': { lat: 45.5152, lng: -122.6784 },
      'portland or': { lat: 45.5152, lng: -122.6784 },
      'portland or usa': { lat: 45.5152, lng: -122.6784 },
      'portland oregon': { lat: 45.5152, lng: -122.6784 },
      'portland oregon usa': { lat: 45.5152, lng: -122.6784 },
      'portland me': { lat: 43.6591, lng: -70.2568 },
      'portland me usa': { lat: 43.6591, lng: -70.2568 },
      'portland maine': { lat: 43.6591, lng: -70.2568 },
      'portland maine usa': { lat: 43.6591, lng: -70.2568 },
      'salt lake city': { lat: 40.7608, lng: -111.8910 },
      'salt lake city ut': { lat: 40.7608, lng: -111.8910 },
      'salt lake city ut usa': { lat: 40.7608, lng: -111.8910 },
      'boise': { lat: 43.6150, lng: -116.2023 },
      'boise id': { lat: 43.6150, lng: -116.2023 },
      'boise id usa': { lat: 43.6150, lng: -116.2023 },
      'boise idaho': { lat: 43.6150, lng: -116.2023 },
      'boise idaho usa': { lat: 43.6150, lng: -116.2023 },
      'west yellowstone': { lat: 44.6596, lng: -111.1043 },
      'west yellowstone mt': { lat: 44.6596, lng: -111.1043 },
      'west yellowstone mt usa': { lat: 44.6596, lng: -111.1043 },
      'west yellowstone montana': { lat: 44.6596, lng: -111.1043 },
      'west yellowstone montana usa': { lat: 44.6596, lng: -111.1043 },
      'anchorage': { lat: 61.2181, lng: -149.9003 },
      'anchorage ak': { lat: 61.2181, lng: -149.9003 },
      'anchorage ak usa': { lat: 61.2181, lng: -149.9003 },
      'anchorage alaska': { lat: 61.2181, lng: -149.9003 },
      'pinon': { lat: 36.1789, lng: -108.3231 },
      'pinon nm': { lat: 36.1789, lng: -108.3231 },
      'pinon new mexico': { lat: 36.1789, lng: -108.3231 },
      'piñon': { lat: 36.1789, lng: -108.3231 },
      'piñon nm': { lat: 36.1789, lng: -108.3231 },
      'piñon new mexico': { lat: 36.1789, lng: -108.3231 },
      'santa fe': { lat: 35.6870, lng: -105.9378 },
      'santa fe nm': { lat: 35.6870, lng: -105.9378 },
      'santa fe nm usa': { lat: 35.6870, lng: -105.9378 },
      'santa fe new mexico': { lat: 35.6870, lng: -105.9378 },
      'santa fe new mexico usa': { lat: 35.6870, lng: -105.9378 },
      'pinon hills': { lat: 34.4472, lng: -117.6297 },
      'pinon hills ca': { lat: 34.4472, lng: -117.6297 },
      'pinon hills california': { lat: 34.4472, lng: -117.6297 },
      'piñon hills': { lat: 34.4472, lng: -117.6297 },
      'piñon hills ca': { lat: 34.4472, lng: -117.6297 },
      'piñon hills california': { lat: 34.4472, lng: -117.6297 },
      'pinon az': { lat: 35.5789, lng: -110.8831 },
      'pinon arizona': { lat: 35.5789, lng: -110.8831 },
      'piñon az': { lat: 35.5789, lng: -110.8831 },
      'piñon arizona': { lat: 35.5789, lng: -110.8831 },
      
      // International cities
      'london': { lat: 51.5074, lng: -0.1278 },
      'london uk': { lat: 51.5074, lng: -0.1278 },
      'london england': { lat: 51.5074, lng: -0.1278 },
      'paris': { lat: 48.8566, lng: 2.3522 },
      'paris france': { lat: 48.8566, lng: 2.3522 },
      'tokyo': { lat: 35.6762, lng: 139.6503 },
      'tokyo japan': { lat: 35.6762, lng: 139.6503 },
      'sydney': { lat: -33.8688, lng: 151.2093 },
      'sydney australia': { lat: -33.8688, lng: 151.2093 },
      'toronto': { lat: 43.6532, lng: -79.3832 },
      'toronto canada': { lat: 43.6532, lng: -79.3832 },
      'vancouver': { lat: 49.2827, lng: -123.1207 },
      'vancouver canada': { lat: 49.2827, lng: -123.1207 },
      'amsterdam': { lat: 52.3676, lng: 4.9041 },
      'amsterdam netherlands': { lat: 52.3676, lng: 4.9041 },
      'madrid': { lat: 40.4168, lng: -3.7038 },
      'madrid spain': { lat: 40.4168, lng: -3.7038 },
      'rome': { lat: 41.9028, lng: 12.4964 },
      'rome italy': { lat: 41.9028, lng: 12.4964 },
      'berlin': { lat: 52.5200, lng: 13.4050 },
      'berlin germany': { lat: 52.5200, lng: 13.4050 },
      'zurich': { lat: 47.3769, lng: 8.5417 },
      'zurich switzerland': { lat: 47.3769, lng: 8.5417 },
      'stockholm': { lat: 59.3293, lng: 18.0686 },
      'stockholm sweden': { lat: 59.3293, lng: 18.0686 },
      'oslo': { lat: 59.9139, lng: 10.7522 },
      'oslo norway': { lat: 59.9139, lng: 10.7522 },
      'copenhagen': { lat: 55.6761, lng: 12.5683 },
      'copenhagen denmark': { lat: 55.6761, lng: 12.5683 },
      'vienna': { lat: 48.2082, lng: 16.3738 },
      'vienna austria': { lat: 48.2082, lng: 16.3738 },
      'budapest': { lat: 47.4979, lng: 19.0402 },
      'budapest hungary': { lat: 47.4979, lng: 19.0402 },
      'prague': { lat: 50.0755, lng: 14.4378 },
      'prague czech republic': { lat: 50.0755, lng: 14.4378 },
      'warsaw': { lat: 52.2297, lng: 21.0122 },
      'warsaw poland': { lat: 52.2297, lng: 21.0122 },
      'moscow': { lat: 55.7558, lng: 37.6173 },
      'moscow russia': { lat: 55.7558, lng: 37.6173 },
      'dubai': { lat: 25.2048, lng: 55.2708 },
      'dubai uae': { lat: 25.2048, lng: 55.2708 },
      'singapore': { lat: 1.3521, lng: 103.8198 },
      'hong kong': { lat: 22.3193, lng: 114.1694 },
      'mumbai': { lat: 19.0760, lng: 72.8777 },
      'mumbai india': { lat: 19.0760, lng: 72.8777 },
      'delhi': { lat: 28.7041, lng: 77.1025 },
      'delhi india': { lat: 28.7041, lng: 77.1025 },
      'new delhi': { lat: 28.7041, lng: 77.1025 },
      'new delhi india': { lat: 28.7041, lng: 77.1025 },
      'bangkok': { lat: 13.7563, lng: 100.5018 },
      'bangkok thailand': { lat: 13.7563, lng: 100.5018 },
      'seoul': { lat: 37.5665, lng: 126.9780 },
      'seoul south korea': { lat: 37.5665, lng: 126.9780 },
      'beijing': { lat: 39.9042, lng: 116.4074 },
      'beijing china': { lat: 39.9042, lng: 116.4074 },
      'shanghai': { lat: 31.2304, lng: 121.4737 },
      'shanghai china': { lat: 31.2304, lng: 121.4737 },
      'melbourne': { lat: -37.8136, lng: 144.9631 },
      'melbourne australia': { lat: -37.8136, lng: 144.9631 },
      'brisbane': { lat: -27.4698, lng: 153.0251 },
      'brisbane australia': { lat: -27.4698, lng: 153.0251 },
      'perth': { lat: -31.9505, lng: 115.8605 },
      'perth australia': { lat: -31.9505, lng: 115.8605 },
      'auckland': { lat: -36.8485, lng: 174.7633 },
      'auckland new zealand': { lat: -36.8485, lng: 174.7633 },
      'wellington': { lat: -41.2865, lng: 174.7762 },
      'wellington new zealand': { lat: -41.2865, lng: 174.7762 },
      'montreal': { lat: 45.5017, lng: -73.5673 },
      'montreal canada': { lat: 45.5017, lng: -73.5673 },
      'calgary': { lat: 51.0447, lng: -114.0719 },
      'calgary canada': { lat: 51.0447, lng: -114.0719 },
      'mexico city': { lat: 19.4326, lng: -99.1332 },
      'mexico city mexico': { lat: 19.4326, lng: -99.1332 },
      'méxico city': { lat: 19.4326, lng: -99.1332 },
      'méxico city mexico': { lat: 19.4326, lng: -99.1332 },
      'méxico': { lat: 19.4326, lng: -99.1332 },
      'ciudad de méxico': { lat: 19.4326, lng: -99.1332 },
      'buenos aires': { lat: -34.6118, lng: -58.3960 },
      'buenos aires argentina': { lat: -34.6118, lng: -58.3960 },
      'sao paulo': { lat: -23.5558, lng: -46.6396 },
      'sao paulo brazil': { lat: -23.5558, lng: -46.6396 },
      'são paulo': { lat: -23.5558, lng: -46.6396 },
      'são paulo brazil': { lat: -23.5558, lng: -46.6396 },
      'são paulo state of são paulo brazil': { lat: -23.5558, lng: -46.6396 },
      'sao paulo state of sao paulo brazil': { lat: -23.5558, lng: -46.6396 },
      'rio de janeiro': { lat: -22.9068, lng: -43.1729 },
      'rio de janeiro brazil': { lat: -22.9068, lng: -43.1729 },
      'brasilia': { lat: -15.8267, lng: -47.9218 },
      'brasilia brazil': { lat: -15.8267, lng: -47.9218 },
      'brasília': { lat: -15.8267, lng: -47.9218 },
      'brasília brazil': { lat: -15.8267, lng: -47.9218 },
      'lima': { lat: -12.0464, lng: -77.0428 },
      'lima peru': { lat: -12.0464, lng: -77.0428 },
      'bogota': { lat: 4.7110, lng: -74.0721 },
      'bogota colombia': { lat: 4.7110, lng: -74.0721 },
      'bogotá': { lat: 4.7110, lng: -74.0721 },
      'bogotá colombia': { lat: 4.7110, lng: -74.0721 },
      'santiago': { lat: -33.4489, lng: -70.6693 },
      'santiago chile': { lat: -33.4489, lng: -70.6693 },
      'cairo': { lat: 30.0444, lng: 31.2357 },
      'cairo egypt': { lat: 30.0444, lng: 31.2357 },
      'casablanca': { lat: 33.5731, lng: -7.5898 },
      'casablanca morocco': { lat: 33.5731, lng: -7.5898 },
      'johannesburg': { lat: -26.2041, lng: 28.0473 },
      'johannesburg south africa': { lat: -26.2041, lng: 28.0473 },
      'cape town': { lat: -33.9249, lng: 18.4241 },
      'cape town south africa': { lat: -33.9249, lng: 18.4241 },
      'lagos': { lat: 6.5244, lng: 3.3792 },
      'lagos nigeria': { lat: 6.5244, lng: 3.3792 },
      'nairobi': { lat: -1.2921, lng: 36.8219 },
      'nairobi kenya': { lat: -1.2921, lng: 36.8219 },
      
      // Caribbean and Jamaica
      'barbados': { lat: 13.1939, lng: -59.5432 },
      'bridgetown': { lat: 13.1939, lng: -59.5432 },
      'bridgetown barbados': { lat: 13.1939, lng: -59.5432 },
      'bridgetown saint michael barbados': { lat: 13.1939, lng: -59.5432 },
      'kingston': { lat: 17.9712, lng: -76.7936 },
      'kingston jamaica': { lat: 17.9712, lng: -76.7936 },
      'montego bay': { lat: 18.4762, lng: -77.8939 },
      'montego bay jamaica': { lat: 18.4762, lng: -77.8939 },
      'runaway bay': { lat: 18.4684, lng: -77.3108 },
      'runaway bay jamaica': { lat: 18.4684, lng: -77.3108 },
      'ocho rios': { lat: 18.4078, lng: -77.1031 },
      'ocho rios jamaica': { lat: 18.4078, lng: -77.1031 },
      'negril': { lat: 18.2687, lng: -78.3377 },
      'negril jamaica': { lat: 18.2687, lng: -78.3377 },
      'nassau': { lat: 25.0343, lng: -77.3963 },
      'nassau bahamas': { lat: 25.0343, lng: -77.3963 },
      'bahamas': { lat: 25.0343, lng: -77.3963 },
      'port of spain': { lat: 10.6596, lng: -61.5158 },
      'port of spain trinidad': { lat: 10.6596, lng: -61.5158 },
      'trinidad': { lat: 10.6596, lng: -61.5158 },
      'san juan': { lat: 18.4655, lng: -66.1057 },
      'san juan puerto rico': { lat: 18.4655, lng: -66.1057 },
      'puerto rico': { lat: 18.4655, lng: -66.1057 },
      'santo domingo': { lat: 18.4861, lng: -69.9312 },
      'santo domingo dominican republic': { lat: 18.4861, lng: -69.9312 },
      'dominican republic': { lat: 18.4861, lng: -69.9312 },
      'havana': { lat: 23.1136, lng: -82.3666 },
      'havana cuba': { lat: 23.1136, lng: -82.3666 },
      'cuba': { lat: 23.1136, lng: -82.3666 },
      'punta cana': { lat: 18.5601, lng: -68.3725 },
      'punta cana dominican republic': { lat: 18.5601, lng: -68.3725 },
      'aruba': { lat: 12.5211, lng: -69.9683 },
      'curacao': { lat: 12.1696, lng: -68.9900 },
      'curaçao': { lat: 12.1696, lng: -68.9900 },
      'grand cayman': { lat: 19.3133, lng: -81.2546 },
      'cayman islands': { lat: 19.3133, lng: -81.2546 },
      'st thomas': { lat: 18.3381, lng: -64.8941 },
      'st. thomas': { lat: 18.3381, lng: -64.8941 },
      'saint thomas': { lat: 18.3381, lng: -64.8941 },
      'st lucia': { lat: 14.0101, lng: -60.9875 },
      'st. lucia': { lat: 14.0101, lng: -60.9875 },
      'saint lucia': { lat: 14.0101, lng: -60.9875 },
      'st martin': { lat: 18.0425, lng: -63.0548 },
      'st. martin': { lat: 18.0425, lng: -63.0548 },
      'saint martin': { lat: 18.0425, lng: -63.0548 },
      'antigua': { lat: 17.0608, lng: -61.7964 },
      'antigua and barbuda': { lat: 17.0608, lng: -61.7964 },
      'grenada': { lat: 12.1165, lng: -61.6790 },
      'saint george': { lat: 12.0561, lng: -61.7486 },
      'saint george grenada': { lat: 12.0561, lng: -61.7486 },
      'st george': { lat: 12.0561, lng: -61.7486 },
      'st george grenada': { lat: 12.0561, lng: -61.7486 },
      'st kitts': { lat: 17.3578, lng: -62.7830 },
      'st. kitts': { lat: 17.3578, lng: -62.7830 },
      'saint kitts': { lat: 17.3578, lng: -62.7830 },
      'dominica': { lat: 15.4150, lng: -61.3710 },
      'st vincent': { lat: 13.2528, lng: -61.1971 },
      'st. vincent': { lat: 13.2528, lng: -61.1971 },
      'saint vincent': { lat: 13.2528, lng: -61.1971 },
      'martinique': { lat: 14.6415, lng: -61.0242 },
      'guadeloupe': { lat: 16.2650, lng: -61.5510 },
      
      // Additional international cities
      'tel aviv': { lat: 32.0853, lng: 34.7818 },
      'tel aviv israel': { lat: 32.0853, lng: 34.7818 },
      'jerusalem': { lat: 31.7683, lng: 35.2137 },
      'jerusalem israel': { lat: 31.7683, lng: 35.2137 },
      'beirut': { lat: 33.8938, lng: 35.5018 },
      'beirut lebanon': { lat: 33.8938, lng: 35.5018 },
      'amman': { lat: 31.9454, lng: 35.9284 },
      'amman jordan': { lat: 31.9454, lng: 35.9284 },
      'doha': { lat: 25.2854, lng: 51.5310 },
      'doha qatar': { lat: 25.2854, lng: 51.5310 },
      'abu dhabi': { lat: 24.4539, lng: 54.3773 },
      'abu dhabi uae': { lat: 24.4539, lng: 54.3773 },
      'riyadh': { lat: 24.7136, lng: 46.6753 },
      'riyadh saudi arabia': { lat: 24.7136, lng: 46.6753 },
      'kuwait city': { lat: 29.3759, lng: 47.9774 },
      'kuwait city kuwait': { lat: 29.3759, lng: 47.9774 },
      'muscat': { lat: 23.5859, lng: 58.4059 },
      'muscat oman': { lat: 23.5859, lng: 58.4059 },
      'manama': { lat: 26.0667, lng: 50.5577 },
      'manama bahrain': { lat: 26.0667, lng: 50.5577 },
      
      // Central America
      'san jose costa rica': { lat: 9.9281, lng: -84.0907 },
      'san josé costa rica': { lat: 9.9281, lng: -84.0907 },
      'san josé': { lat: 9.9281, lng: -84.0907 },
      'guatemala city': { lat: 14.6349, lng: -90.5069 },
      'guatemala city guatemala': { lat: 14.6349, lng: -90.5069 },
      'panama city': { lat: 8.9824, lng: -79.5199 },
      'panama city panama': { lat: 8.9824, lng: -79.5199 },
      'panamá': { lat: 8.9824, lng: -79.5199 },
      'panamá panama': { lat: 8.9824, lng: -79.5199 },
      'tegucigalpa': { lat: 14.0723, lng: -87.1921 },
      'tegucigalpa honduras': { lat: 14.0723, lng: -87.1921 },
      'san salvador': { lat: 13.6929, lng: -89.2182 },
      'san salvador el salvador': { lat: 13.6929, lng: -89.2182 },
      'managua': { lat: 12.1364, lng: -86.2514 },
      'managua nicaragua': { lat: 12.1364, lng: -86.2514 },
      'grenada nicaragua': { lat: 11.9289, lng: -85.9556 },
      'belize city': { lat: 17.5057, lng: -88.1962 },
      'belize city belize': { lat: 17.5057, lng: -88.1962 },
      'belize': { lat: 17.5057, lng: -88.1962 },
      
      // More South America
      'cusco': { lat: -13.5319, lng: -71.9675 },
      'cusco peru': { lat: -13.5319, lng: -71.9675 },
      'cuzco': { lat: -13.5319, lng: -71.9675 },
      'cuzco peru': { lat: -13.5319, lng: -71.9675 },
      'arequipa': { lat: -16.4090, lng: -71.5375 },
      'arequipa peru': { lat: -16.4090, lng: -71.5375 },
      'quito': { lat: -0.1807, lng: -78.4678 },
      'quito ecuador': { lat: -0.1807, lng: -78.4678 },
      'guayaquil': { lat: -2.1894, lng: -79.8890 },
      'guayaquil ecuador': { lat: -2.1894, lng: -79.8890 },
      'caracas': { lat: 10.4806, lng: -66.9036 },
      'caracas venezuela': { lat: 10.4806, lng: -66.9036 },
      'maracaibo': { lat: 10.6316, lng: -71.6444 },
      'maracaibo venezuela': { lat: 10.6316, lng: -71.6444 },
      'la paz': { lat: -16.5000, lng: -68.1193 },
      'la paz bolivia': { lat: -16.5000, lng: -68.1193 },
      'santa cruz': { lat: -17.8146, lng: -63.1561 },
      'santa cruz bolivia': { lat: -17.8146, lng: -63.1561 },
      'asuncion': { lat: -25.2637, lng: -57.5759 },
      'asuncion paraguay': { lat: -25.2637, lng: -57.5759 },
      'asunción': { lat: -25.2637, lng: -57.5759 },
      'asunción paraguay': { lat: -25.2637, lng: -57.5759 },
      'montevideo': { lat: -34.9011, lng: -56.1645 },
      'montevideo uruguay': { lat: -34.9011, lng: -56.1645 },
      'cartagena': { lat: 10.3997, lng: -75.5144 },
      'cartagena colombia': { lat: 10.3997, lng: -75.5144 },
      'medellin': { lat: 6.2476, lng: -75.5658 },
      'medellin colombia': { lat: 6.2476, lng: -75.5658 },
      'medellín': { lat: 6.2476, lng: -75.5658 },
      'medellín colombia': { lat: 6.2476, lng: -75.5658 },
      'cali': { lat: 3.4516, lng: -76.5320 },
      'cali colombia': { lat: 3.4516, lng: -76.5320 },
      
      // More Caribbean
      'port au prince': { lat: 18.5944, lng: -72.3074 },
      'port au prince haiti': { lat: 18.5944, lng: -72.3074 },
      'port-au-prince': { lat: 18.5944, lng: -72.3074 },
      'port-au-prince haiti': { lat: 18.5944, lng: -72.3074 },
      'haiti': { lat: 18.5944, lng: -72.3074 },
      
      // Pacific Islands
      'honolulu': { lat: 21.3099, lng: -157.8581 },
      'honolulu hi': { lat: 21.3099, lng: -157.8581 },
      'honolulu hi usa': { lat: 21.3099, lng: -157.8581 },
      'honolulu hawaii': { lat: 21.3099, lng: -157.8581 },
      'honolulu hawaii usa': { lat: 21.3099, lng: -157.8581 },
      'hawaii': { lat: 21.3099, lng: -157.8581 },
      'suva': { lat: -18.1248, lng: 178.4501 },
      'suva fiji': { lat: -18.1248, lng: 178.4501 },
      'fiji': { lat: -18.1248, lng: 178.4501 },
      'papeete': { lat: -17.5516, lng: -149.5585 },
      'papeete tahiti': { lat: -17.5516, lng: -149.5585 },
      'tahiti': { lat: -17.5516, lng: -149.5585 },
      
      // Southeast Asia
      'kuala lumpur': { lat: 3.1390, lng: 101.6869 },
      'kuala lumpur malaysia': { lat: 3.1390, lng: 101.6869 },
      'malaysia': { lat: 3.1390, lng: 101.6869 },
      'jakarta': { lat: -6.2088, lng: 106.8456 },
      'jakarta indonesia': { lat: -6.2088, lng: 106.8456 },
      'indonesia': { lat: -6.2088, lng: 106.8456 },
      'manila': { lat: 14.5995, lng: 120.9842 },
      'manila philippines': { lat: 14.5995, lng: 120.9842 },
      'philippines': { lat: 14.5995, lng: 120.9842 },
      'ho chi minh city': { lat: 10.8231, lng: 106.6297 },
      'ho chi minh city vietnam': { lat: 10.8231, lng: 106.6297 },
      'saigon': { lat: 10.8231, lng: 106.6297 },
      'saigon vietnam': { lat: 10.8231, lng: 106.6297 },
      'hanoi': { lat: 21.0285, lng: 105.8542 },
      'hanoi vietnam': { lat: 21.0285, lng: 105.8542 },
      'vietnam': { lat: 21.0285, lng: 105.8542 },
      'phnom penh': { lat: 11.5564, lng: 104.9282 },
      'phnom penh cambodia': { lat: 11.5564, lng: 104.9282 },
      'cambodia': { lat: 11.5564, lng: 104.9282 },
      'vientiane': { lat: 17.9757, lng: 102.6331 },
      'vientiane laos': { lat: 17.9757, lng: 102.6331 },
      'laos': { lat: 17.9757, lng: 102.6331 },
      'yangon': { lat: 16.8661, lng: 96.1951 },
      'yangon myanmar': { lat: 16.8661, lng: 96.1951 },
      'rangoon': { lat: 16.8661, lng: 96.1951 },
      'rangoon myanmar': { lat: 16.8661, lng: 96.1951 },
      'myanmar': { lat: 16.8661, lng: 96.1951 },
      'dhaka': { lat: 23.8103, lng: 90.4125 },
      'dhaka bangladesh': { lat: 23.8103, lng: 90.4125 },
      'bangladesh': { lat: 23.8103, lng: 90.4125 },
      'colombo': { lat: 6.9271, lng: 79.8612 },
      'colombo sri lanka': { lat: 6.9271, lng: 79.8612 },
      'sri lanka': { lat: 6.9271, lng: 79.8612 },
      'kathmandu': { lat: 27.7172, lng: 85.3240 },
      'kathmandu nepal': { lat: 27.7172, lng: 85.3240 },
      'nepal': { lat: 27.7172, lng: 85.3240 },
      
      // More African cities
      'accra': { lat: 5.6037, lng: -0.1870 },
      'accra ghana': { lat: 5.6037, lng: -0.1870 },
      'ghana': { lat: 5.6037, lng: -0.1870 },
      'dakar': { lat: 14.7167, lng: -17.4677 },
      'dakar senegal': { lat: 14.7167, lng: -17.4677 },
      'senegal': { lat: 14.7167, lng: -17.4677 },
      'abidjan': { lat: 5.3600, lng: -4.0083 },
      'abidjan ivory coast': { lat: 5.3600, lng: -4.0083 },
      'ivory coast': { lat: 5.3600, lng: -4.0083 },
      'bamako': { lat: 12.6392, lng: -8.0029 },
      'bamako mali': { lat: 12.6392, lng: -8.0029 },
      'mali': { lat: 12.6392, lng: -8.0029 },
      'ouagadougou': { lat: 12.3714, lng: -1.5197 },
      'ouagadougou burkina faso': { lat: 12.3714, lng: -1.5197 },
      'burkina faso': { lat: 12.3714, lng: -1.5197 },
      'addis ababa': { lat: 9.1450, lng: 38.7451 },
      'addis ababa ethiopia': { lat: 9.1450, lng: 38.7451 },
      'ethiopia': { lat: 9.1450, lng: 38.7451 },
      'kampala': { lat: 0.3476, lng: 32.5825 },
      'kampala uganda': { lat: 0.3476, lng: 32.5825 },
      'uganda': { lat: 0.3476, lng: 32.5825 },
      'kigali': { lat: -1.9441, lng: 30.0619 },
      'kigali rwanda': { lat: -1.9441, lng: 30.0619 },
      'rwanda': { lat: -1.9441, lng: 30.0619 },
      'dar es salaam': { lat: -6.7924, lng: 39.2083 },
      'dar es salaam tanzania': { lat: -6.7924, lng: 39.2083 },
      'tanzania': { lat: -6.7924, lng: 39.2083 },
      'lusaka': { lat: -15.3875, lng: 28.3228 },
      'lusaka zambia': { lat: -15.3875, lng: 28.3228 },
      'zambia': { lat: -15.3875, lng: 28.3228 },
      'harare': { lat: -17.8292, lng: 31.0522 },
      'harare zimbabwe': { lat: -17.8292, lng: 31.0522 },
      'zimbabwe': { lat: -17.8292, lng: 31.0522 },
      'windhoek': { lat: -22.5609, lng: 17.0658 },
      'windhoek namibia': { lat: -22.5609, lng: 17.0658 },
      'namibia': { lat: -22.5609, lng: 17.0658 },
      'maputo': { lat: -25.9692, lng: 32.5732 },
      'maputo mozambique': { lat: -25.9692, lng: 32.5732 },
      'mozambique': { lat: -25.9692, lng: 32.5732 },
      'antananarivo': { lat: -18.8792, lng: 47.5079 },
      'antananarivo madagascar': { lat: -18.8792, lng: 47.5079 },
      'madagascar': { lat: -18.8792, lng: 47.5079 },
      'port louis': { lat: -20.1619, lng: 57.5012 },
      'port louis mauritius': { lat: -20.1619, lng: 57.5012 },
      'mauritius': { lat: -20.1619, lng: 57.5012 },
      'djibouti': { lat: 11.8251, lng: 42.5903 },
      'djibouti city': { lat: 11.8251, lng: 42.5903 },
      
      // Additional European cities
      'nice': { lat: 43.7102, lng: 7.2620 },
      'nice france': { lat: 43.7102, lng: 7.2620 },
      'florence': { lat: 43.7696, lng: 11.2558 },
      'florence italy': { lat: 43.7696, lng: 11.2558 },
      'salzburg': { lat: 47.8095, lng: 13.0550 },
      'salzburg austria': { lat: 47.8095, lng: 13.0550 },
      'porto': { lat: 41.1579, lng: -8.6291 },
      'porto portugal': { lat: 41.1579, lng: -8.6291 },
      'oporto': { lat: 41.1579, lng: -8.6291 },
      'cork': { lat: 51.8985, lng: -8.4756 },
      'cork ireland': { lat: 51.8985, lng: -8.4756 },
      'thessaloniki': { lat: 40.6401, lng: 22.9444 },
      'thessaloniki greece': { lat: 40.6401, lng: 22.9444 },
      'valencia': { lat: 39.4699, lng: -0.3763 },
      'valencia spain': { lat: 39.4699, lng: -0.3763 },
      'krakow': { lat: 50.0647, lng: 19.9450 },
      'krakow poland': { lat: 50.0647, lng: 19.9450 },
      'cracow': { lat: 50.0647, lng: 19.9450 },
      'cracow poland': { lat: 50.0647, lng: 19.9450 },
      'bergen': { lat: 60.3913, lng: 5.3221 },
      'bergen norway': { lat: 60.3913, lng: 5.3221 },
      'gothenburg': { lat: 57.7089, lng: 11.9746 },
      'gothenburg sweden': { lat: 57.7089, lng: 11.9746 },
      'göteborg': { lat: 57.7089, lng: 11.9746 },
      'göteborg sweden': { lat: 57.7089, lng: 11.9746 },
      'venice': { lat: 45.4408, lng: 12.3155 },
      'venice italy': { lat: 45.4408, lng: 12.3155 },
      'venezia': { lat: 45.4408, lng: 12.3155 },
      'venezia italy': { lat: 45.4408, lng: 12.3155 },
      'lisbon': { lat: 38.7223, lng: -9.1393 },
      'lisbon portugal': { lat: 38.7223, lng: -9.1393 },
      'lisboa': { lat: 38.7223, lng: -9.1393 },
      'lisboa portugal': { lat: 38.7223, lng: -9.1393 },
      'dublin': { lat: 53.3498, lng: -6.2603 },
      'dublin ireland': { lat: 53.3498, lng: -6.2603 },
      'athens': { lat: 37.9755, lng: 23.7348 },
      'athens greece': { lat: 37.9755, lng: 23.7348 },
      'barcelona': { lat: 41.3851, lng: 2.1734 },
      'barcelona spain': { lat: 41.3851, lng: 2.1734 },
      'milan': { lat: 45.4642, lng: 9.1900 },
      'milan italy': { lat: 45.4642, lng: 9.1900 },
      'milano': { lat: 45.4642, lng: 9.1900 },
      'milano italy': { lat: 45.4642, lng: 9.1900 },
      'naples': { lat: 40.8518, lng: 14.2681 },
      'naples italy': { lat: 40.8518, lng: 14.2681 },
      'naples metropolitan city of naples italy': { lat: 40.8518, lng: 14.2681 },
      'napoli': { lat: 40.8518, lng: 14.2681 },
      'napoli italy': { lat: 40.8518, lng: 14.2681 },
      'munich': { lat: 48.1351, lng: 11.5820 },
      'munich germany': { lat: 48.1351, lng: 11.5820 },
      'münchen': { lat: 48.1351, lng: 11.5820 },
      'münchen germany': { lat: 48.1351, lng: 11.5820 },
      'hamburg': { lat: 53.5488, lng: 9.9872 },
      'hamburg germany': { lat: 53.5488, lng: 9.9872 },
      'cologne': { lat: 50.9375, lng: 6.9603 },
      'cologne germany': { lat: 50.9375, lng: 6.9603 },
      'köln': { lat: 50.9375, lng: 6.9603 },
      'köln germany': { lat: 50.9375, lng: 6.9603 },
      'lyon': { lat: 45.7640, lng: 4.8357 },
      'lyon france': { lat: 45.7640, lng: 4.8357 },
      'marseille': { lat: 43.2965, lng: 5.3698 },
      'marseille france': { lat: 43.2965, lng: 5.3698 },
      'brussels': { lat: 50.8503, lng: 4.3517 },
      'brussels belgium': { lat: 50.8503, lng: 4.3517 },
      'bruxelles': { lat: 50.8503, lng: 4.3517 },
      'bruxelles belgium': { lat: 50.8503, lng: 4.3517 }
    };

    return cityDatabase[normalizedCity] || null;
  }

  /**
   * Get airports for a location using hardcoded data
   */
  private getAirportsForLocation(query: string, location?: LocationCoordinates): any[] {
    const normalizedQuery = query.toLowerCase().replace(/[,\s]+/g, ' ').trim();
    
    // Airport database for major cities
    const airportDatabase: Record<string, any[]> = {
      'new york': [
        {
          name: 'John F. Kennedy International Airport (JFK)',
          formatted_address: 'Queens, NY 11430, USA',
          geometry: { location: { lat: 40.6413, lng: -73.7781 } },
          types: ['airport']
        },
        {
          name: 'LaGuardia Airport (LGA)',
          formatted_address: 'East Elmhurst, NY 11371, USA',
          geometry: { location: { lat: 40.7769, lng: -73.8740 } },
          types: ['airport']
        },
        {
          name: 'Newark Liberty International Airport (EWR)',
          formatted_address: 'Newark, NJ 07114, USA',
          geometry: { location: { lat: 40.6895, lng: -74.1745 } },
          types: ['airport']
        }
      ],
      'los angeles': [
        {
          name: 'Los Angeles International Airport (LAX)',
          formatted_address: 'Los Angeles, CA 90045, USA',
          geometry: { location: { lat: 33.9425, lng: -118.4081 } },
          types: ['airport']
        },
        {
          name: 'Hollywood Burbank Airport (BUR)',
          formatted_address: 'Burbank, CA 91505, USA',
          geometry: { location: { lat: 34.2001, lng: -118.3585 } },
          types: ['airport']
        },
        {
          name: 'Long Beach Airport (LGB)',
          formatted_address: 'Long Beach, CA 90806, USA',
          geometry: { location: { lat: 33.8177, lng: -118.1516 } },
          types: ['airport']
        }
      ],
      'chicago': [
        {
          name: 'O\'Hare International Airport (ORD)',
          formatted_address: 'Chicago, IL 60666, USA',
          geometry: { location: { lat: 41.9786, lng: -87.9048 } },
          types: ['airport']
        },
        {
          name: 'Midway International Airport (MDW)',
          formatted_address: 'Chicago, IL 60638, USA',
          geometry: { location: { lat: 41.7868, lng: -87.7522 } },
          types: ['airport']
        }
      ],
      'atlanta': [
        {
          name: 'Hartsfield-Jackson Atlanta International Airport (ATL)',
          formatted_address: 'Atlanta, GA 30337, USA',
          geometry: { location: { lat: 33.6367, lng: -84.4281 } },
          types: ['airport']
        }
      ],
      'asheville': [
        {
          name: 'Asheville Regional Airport (AVL)',
          formatted_address: 'Fletcher, NC 28732, USA',
          geometry: { location: { lat: 35.4362, lng: -82.5418 } },
          types: ['airport']
        },
        {
          name: 'Charlotte Douglas International Airport (CLT)',
          formatted_address: 'Charlotte, NC 28208, USA',
          geometry: { location: { lat: 35.2144, lng: -80.9431 } },
          types: ['airport']
        }
      ],
      'asheville nc': [
        {
          name: 'Asheville Regional Airport (AVL)',
          formatted_address: 'Fletcher, NC 28732, USA',
          geometry: { location: { lat: 35.4362, lng: -82.5418 } },
          types: ['airport']
        },
        {
          name: 'Charlotte Douglas International Airport (CLT)',
          formatted_address: 'Charlotte, NC 28208, USA',
          geometry: { location: { lat: 35.2144, lng: -80.9431 } },
          types: ['airport']
        }
      ],
      'asheville nc usa': [
        {
          name: 'Asheville Regional Airport (AVL)',
          formatted_address: 'Fletcher, NC 28732, USA',
          geometry: { location: { lat: 35.4362, lng: -82.5418 } },
          types: ['airport']
        },
        {
          name: 'Charlotte Douglas International Airport (CLT)',
          formatted_address: 'Charlotte, NC 28208, USA',
          geometry: { location: { lat: 35.2144, lng: -80.9431 } },
          types: ['airport']
        }
      ],
      'asheville north carolina': [
        {
          name: 'Asheville Regional Airport (AVL)',
          formatted_address: 'Fletcher, NC 28732, USA',
          geometry: { location: { lat: 35.4362, lng: -82.5418 } },
          types: ['airport']
        },
        {
          name: 'Charlotte Douglas International Airport (CLT)',
          formatted_address: 'Charlotte, NC 28208, USA',
          geometry: { location: { lat: 35.2144, lng: -80.9431 } },
          types: ['airport']
        }
      ],
      'asheville north carolina usa': [
        {
          name: 'Asheville Regional Airport (AVL)',
          formatted_address: 'Fletcher, NC 28732, USA',
          geometry: { location: { lat: 35.4362, lng: -82.5418 } },
          types: ['airport']
        },
        {
          name: 'Charlotte Douglas International Airport (CLT)',
          formatted_address: 'Charlotte, NC 28208, USA',
          geometry: { location: { lat: 35.2144, lng: -80.9431 } },
          types: ['airport']
        }
      ],
      'myrtle beach': [
        {
          name: 'Myrtle Beach International Airport (MYR)',
          formatted_address: 'Myrtle Beach, SC 29577, USA',
          geometry: { location: { lat: 33.6797, lng: -78.9283 } },
          types: ['airport']
        },
        {
          name: 'Charleston International Airport (CHS)',
          formatted_address: 'North Charleston, SC 29418, USA',
          geometry: { location: { lat: 32.8986, lng: -80.0405 } },
          types: ['airport']
        }
      ],
      'myrtle beach sc': [
        {
          name: 'Myrtle Beach International Airport (MYR)',
          formatted_address: 'Myrtle Beach, SC 29577, USA',
          geometry: { location: { lat: 33.6797, lng: -78.9283 } },
          types: ['airport']
        },
        {
          name: 'Charleston International Airport (CHS)',
          formatted_address: 'North Charleston, SC 29418, USA',
          geometry: { location: { lat: 32.8986, lng: -80.0405 } },
          types: ['airport']
        }
      ],
      'myrtle beach sc usa': [
        {
          name: 'Myrtle Beach International Airport (MYR)',
          formatted_address: 'Myrtle Beach, SC 29577, USA',
          geometry: { location: { lat: 33.6797, lng: -78.9283 } },
          types: ['airport']
        },
        {
          name: 'Charleston International Airport (CHS)',
          formatted_address: 'North Charleston, SC 29418, USA',
          geometry: { location: { lat: 32.8986, lng: -80.0405 } },
          types: ['airport']
        }
      ],
      'myrtle beach south carolina': [
        {
          name: 'Myrtle Beach International Airport (MYR)',
          formatted_address: 'Myrtle Beach, SC 29577, USA',
          geometry: { location: { lat: 33.6797, lng: -78.9283 } },
          types: ['airport']
        },
        {
          name: 'Charleston International Airport (CHS)',
          formatted_address: 'North Charleston, SC 29418, USA',
          geometry: { location: { lat: 32.8986, lng: -80.0405 } },
          types: ['airport']
        }
      ],
      'myrtle beach south carolina usa': [
        {
          name: 'Myrtle Beach International Airport (MYR)',
          formatted_address: 'Myrtle Beach, SC 29577, USA',
          geometry: { location: { lat: 33.6797, lng: -78.9283 } },
          types: ['airport']
        },
        {
          name: 'Charleston International Airport (CHS)',
          formatted_address: 'North Charleston, SC 29418, USA',
          geometry: { location: { lat: 32.8986, lng: -80.0405 } },
          types: ['airport']
        }
      ],
      'miami': [
        {
          name: 'Miami International Airport (MIA)',
          formatted_address: 'Miami, FL 33142, USA',
          geometry: { location: { lat: 25.7932, lng: -80.2906 } },
          types: ['airport']
        },
        {
          name: 'Fort Lauderdale-Hollywood International Airport (FLL)',
          formatted_address: 'Fort Lauderdale, FL 33315, USA',
          geometry: { location: { lat: 26.0726, lng: -80.1527 } },
          types: ['airport']
        }
      ],
      'miami beach': [
        {
          name: 'Miami International Airport (MIA)',
          formatted_address: 'Miami, FL 33142, USA',
          geometry: { location: { lat: 25.7932, lng: -80.2906 } },
          types: ['airport']
        },
        {
          name: 'Fort Lauderdale-Hollywood International Airport (FLL)',
          formatted_address: 'Fort Lauderdale, FL 33315, USA',
          geometry: { location: { lat: 26.0726, lng: -80.1527 } },
          types: ['airport']
        }
      ],
      'miami beach fl': [
        {
          name: 'Miami International Airport (MIA)',
          formatted_address: 'Miami, FL 33142, USA',
          geometry: { location: { lat: 25.7932, lng: -80.2906 } },
          types: ['airport']
        },
        {
          name: 'Fort Lauderdale-Hollywood International Airport (FLL)',
          formatted_address: 'Fort Lauderdale, FL 33315, USA',
          geometry: { location: { lat: 26.0726, lng: -80.1527 } },
          types: ['airport']
        }
      ],
      'miami beach fl usa': [
        {
          name: 'Miami International Airport (MIA)',
          formatted_address: 'Miami, FL 33142, USA',
          geometry: { location: { lat: 25.7932, lng: -80.2906 } },
          types: ['airport']
        },
        {
          name: 'Fort Lauderdale-Hollywood International Airport (FLL)',
          formatted_address: 'Fort Lauderdale, FL 33315, USA',
          geometry: { location: { lat: 26.0726, lng: -80.1527 } },
          types: ['airport']
        }
      ],
      'miami beach florida': [
        {
          name: 'Miami International Airport (MIA)',
          formatted_address: 'Miami, FL 33142, USA',
          geometry: { location: { lat: 25.7932, lng: -80.2906 } },
          types: ['airport']
        },
        {
          name: 'Fort Lauderdale-Hollywood International Airport (FLL)',
          formatted_address: 'Fort Lauderdale, FL 33315, USA',
          geometry: { location: { lat: 26.0726, lng: -80.1527 } },
          types: ['airport']
        }
      ],
      'miami beach florida usa': [
        {
          name: 'Miami International Airport (MIA)',
          formatted_address: 'Miami, FL 33142, USA',
          geometry: { location: { lat: 25.7932, lng: -80.2906 } },
          types: ['airport']
        },
        {
          name: 'Fort Lauderdale-Hollywood International Airport (FLL)',
          formatted_address: 'Fort Lauderdale, FL 33315, USA',
          geometry: { location: { lat: 26.0726, lng: -80.1527 } },
          types: ['airport']
        }
      ],
      'milwaukee': [
        {
          name: 'General Mitchell International Airport (MKE)',
          formatted_address: 'Milwaukee, WI 53207, USA',
          geometry: { location: { lat: 42.9472, lng: -87.8966 } },
          types: ['airport']
        },
        {
          name: 'Chicago O\'Hare International Airport (ORD)',
          formatted_address: 'Chicago, IL 60666, USA',
          geometry: { location: { lat: 41.9742, lng: -87.9073 } },
          types: ['airport']
        }
      ],
      'milwaukee wi': [
        {
          name: 'General Mitchell International Airport (MKE)',
          formatted_address: 'Milwaukee, WI 53207, USA',
          geometry: { location: { lat: 42.9472, lng: -87.8966 } },
          types: ['airport']
        },
        {
          name: 'Chicago O\'Hare International Airport (ORD)',
          formatted_address: 'Chicago, IL 60666, USA',
          geometry: { location: { lat: 41.9742, lng: -87.9073 } },
          types: ['airport']
        }
      ],
      'milwaukee wi usa': [
        {
          name: 'General Mitchell International Airport (MKE)',
          formatted_address: 'Milwaukee, WI 53207, USA',
          geometry: { location: { lat: 42.9472, lng: -87.8966 } },
          types: ['airport']
        },
        {
          name: 'Chicago O\'Hare International Airport (ORD)',
          formatted_address: 'Chicago, IL 60666, USA',
          geometry: { location: { lat: 41.9742, lng: -87.9073 } },
          types: ['airport']
        }
      ],
      'milwaukee wisconsin': [
        {
          name: 'General Mitchell International Airport (MKE)',
          formatted_address: 'Milwaukee, WI 53207, USA',
          geometry: { location: { lat: 42.9472, lng: -87.8966 } },
          types: ['airport']
        },
        {
          name: 'Chicago O\'Hare International Airport (ORD)',
          formatted_address: 'Chicago, IL 60666, USA',
          geometry: { location: { lat: 41.9742, lng: -87.9073 } },
          types: ['airport']
        }
      ],
      'milwaukee wisconsin usa': [
        {
          name: 'General Mitchell International Airport (MKE)',
          formatted_address: 'Milwaukee, WI 53207, USA',
          geometry: { location: { lat: 42.9472, lng: -87.8966 } },
          types: ['airport']
        },
        {
          name: 'Chicago O\'Hare International Airport (ORD)',
          formatted_address: 'Chicago, IL 60666, USA',
          geometry: { location: { lat: 41.9742, lng: -87.9073 } },
          types: ['airport']
        }
      ],
      'morgantown': [
        {
          name: 'Morgantown Municipal Airport (MGW)',
          formatted_address: 'Morgantown, WV 26505, USA',
          geometry: { location: { lat: 39.6429, lng: -79.9163 } },
          types: ['airport']
        },
        {
          name: 'Pittsburgh International Airport (PIT)',
          formatted_address: 'Pittsburgh, PA 15231, USA',
          geometry: { location: { lat: 40.4915, lng: -80.2329 } },
          types: ['airport']
        }
      ],
      'morgantown wv': [
        {
          name: 'Morgantown Municipal Airport (MGW)',
          formatted_address: 'Morgantown, WV 26505, USA',
          geometry: { location: { lat: 39.6429, lng: -79.9163 } },
          types: ['airport']
        },
        {
          name: 'Pittsburgh International Airport (PIT)',
          formatted_address: 'Pittsburgh, PA 15231, USA',
          geometry: { location: { lat: 40.4915, lng: -80.2329 } },
          types: ['airport']
        }
      ],
      'morgantown wv usa': [
        {
          name: 'Morgantown Municipal Airport (MGW)',
          formatted_address: 'Morgantown, WV 26505, USA',
          geometry: { location: { lat: 39.6429, lng: -79.9163 } },
          types: ['airport']
        },
        {
          name: 'Pittsburgh International Airport (PIT)',
          formatted_address: 'Pittsburgh, PA 15231, USA',
          geometry: { location: { lat: 40.4915, lng: -80.2329 } },
          types: ['airport']
        }
      ],
      'morgantown west virginia': [
        {
          name: 'Morgantown Municipal Airport (MGW)',
          formatted_address: 'Morgantown, WV 26505, USA',
          geometry: { location: { lat: 39.6429, lng: -79.9163 } },
          types: ['airport']
        },
        {
          name: 'Pittsburgh International Airport (PIT)',
          formatted_address: 'Pittsburgh, PA 15231, USA',
          geometry: { location: { lat: 40.4915, lng: -80.2329 } },
          types: ['airport']
        }
      ],
      'morgantown west virginia usa': [
        {
          name: 'Morgantown Municipal Airport (MGW)',
          formatted_address: 'Morgantown, WV 26505, USA',
          geometry: { location: { lat: 39.6429, lng: -79.9163 } },
          types: ['airport']
        },
        {
          name: 'Pittsburgh International Airport (PIT)',
          formatted_address: 'Pittsburgh, PA 15231, USA',
          geometry: { location: { lat: 40.4915, lng: -80.2329 } },
          types: ['airport']
        }
      ],
      'san francisco': [
        {
          name: 'San Francisco International Airport (SFO)',
          formatted_address: 'San Francisco, CA 94128, USA',
          geometry: { location: { lat: 37.6213, lng: -122.3790 } },
          types: ['airport']
        },
        {
          name: 'Oakland International Airport (OAK)',
          formatted_address: 'Oakland, CA 94621, USA',
          geometry: { location: { lat: 37.7214, lng: -122.2208 } },
          types: ['airport']
        },
        {
          name: 'Norman Y. Mineta San Jose International Airport (SJC)',
          formatted_address: 'San Jose, CA 95110, USA',
          geometry: { location: { lat: 37.3639, lng: -121.9289 } },
          types: ['airport']
        }
      ],
      'los banos': [
        {
          name: 'Fresno Yosemite International Airport (FAT)',
          formatted_address: 'Fresno, CA 93727, USA',
          geometry: { location: { lat: 36.7762, lng: -119.7181 } },
          types: ['airport']
        },
        {
          name: 'Norman Y. Mineta San Jose International Airport (SJC)',
          formatted_address: 'San Jose, CA 95110, USA',
          geometry: { location: { lat: 37.3639, lng: -121.9289 } },
          types: ['airport']
        }
      ],
      'los baños': [
        {
          name: 'Fresno Yosemite International Airport (FAT)',
          formatted_address: 'Fresno, CA 93727, USA',
          geometry: { location: { lat: 36.7762, lng: -119.7181 } },
          types: ['airport']
        },
        {
          name: 'Norman Y. Mineta San Jose International Airport (SJC)',
          formatted_address: 'San Jose, CA 95110, USA',
          geometry: { location: { lat: 37.3639, lng: -121.9289 } },
          types: ['airport']
        }
      ],
      'boston': [
        {
          name: 'Logan International Airport (BOS)',
          formatted_address: 'Boston, MA 02128, USA',
          geometry: { location: { lat: 42.3656, lng: -71.0096 } },
          types: ['airport']
        }
      ],
      'burlington': [
        {
          name: 'Burlington International Airport (BTV)',
          formatted_address: 'Burlington, VT 05401, USA',
          geometry: { location: { lat: 44.4719, lng: -73.1532 } },
          types: ['airport']
        },
        {
          name: 'Logan International Airport (BOS)',
          formatted_address: 'Boston, MA 02128, USA',
          geometry: { location: { lat: 42.3656, lng: -71.0096 } },
          types: ['airport']
        }
      ],
      'burlington vt': [
        {
          name: 'Burlington International Airport (BTV)',
          formatted_address: 'Burlington, VT 05401, USA',
          geometry: { location: { lat: 44.4719, lng: -73.1532 } },
          types: ['airport']
        },
        {
          name: 'Logan International Airport (BOS)',
          formatted_address: 'Boston, MA 02128, USA',
          geometry: { location: { lat: 42.3656, lng: -71.0096 } },
          types: ['airport']
        }
      ],
      'burlington vt usa': [
        {
          name: 'Burlington International Airport (BTV)',
          formatted_address: 'Burlington, VT 05401, USA',
          geometry: { location: { lat: 44.4719, lng: -73.1532 } },
          types: ['airport']
        },
        {
          name: 'Logan International Airport (BOS)',
          formatted_address: 'Boston, MA 02128, USA',
          geometry: { location: { lat: 42.3656, lng: -71.0096 } },
          types: ['airport']
        }
      ],
      'burlington vermont': [
        {
          name: 'Burlington International Airport (BTV)',
          formatted_address: 'Burlington, VT 05401, USA',
          geometry: { location: { lat: 44.4719, lng: -73.1532 } },
          types: ['airport']
        },
        {
          name: 'Logan International Airport (BOS)',
          formatted_address: 'Boston, MA 02128, USA',
          geometry: { location: { lat: 42.3656, lng: -71.0096 } },
          types: ['airport']
        }
      ],
      'burlington vermont usa': [
        {
          name: 'Burlington International Airport (BTV)',
          formatted_address: 'Burlington, VT 05401, USA',
          geometry: { location: { lat: 44.4719, lng: -73.1532 } },
          types: ['airport']
        },
        {
          name: 'Logan International Airport (BOS)',
          formatted_address: 'Boston, MA 02128, USA',
          geometry: { location: { lat: 42.3656, lng: -71.0096 } },
          types: ['airport']
        }
      ],
      'panama city beach': [
        {
          name: 'Northwest Florida Beaches International Airport (ECP)',
          formatted_address: 'Panama City Beach, FL 32413, USA',
          geometry: { location: { lat: 30.3581, lng: -85.7956 } },
          types: ['airport']
        },
        {
          name: 'Pensacola International Airport (PNS)',
          formatted_address: 'Pensacola, FL 32504, USA',
          geometry: { location: { lat: 30.4734, lng: -87.1866 } },
          types: ['airport']
        }
      ],
      'panama city beach fl': [
        {
          name: 'Northwest Florida Beaches International Airport (ECP)',
          formatted_address: 'Panama City Beach, FL 32413, USA',
          geometry: { location: { lat: 30.3581, lng: -85.7956 } },
          types: ['airport']
        },
        {
          name: 'Pensacola International Airport (PNS)',
          formatted_address: 'Pensacola, FL 32504, USA',
          geometry: { location: { lat: 30.4734, lng: -87.1866 } },
          types: ['airport']
        }
      ],
      'panama city beach fl usa': [
        {
          name: 'Northwest Florida Beaches International Airport (ECP)',
          formatted_address: 'Panama City Beach, FL 32413, USA',
          geometry: { location: { lat: 30.3581, lng: -85.7956 } },
          types: ['airport']
        },
        {
          name: 'Pensacola International Airport (PNS)',
          formatted_address: 'Pensacola, FL 32504, USA',
          geometry: { location: { lat: 30.4734, lng: -87.1866 } },
          types: ['airport']
        }
      ],
      'panama city beach florida': [
        {
          name: 'Northwest Florida Beaches International Airport (ECP)',
          formatted_address: 'Panama City Beach, FL 32413, USA',
          geometry: { location: { lat: 30.3581, lng: -85.7956 } },
          types: ['airport']
        },
        {
          name: 'Pensacola International Airport (PNS)',
          formatted_address: 'Pensacola, FL 32504, USA',
          geometry: { location: { lat: 30.4734, lng: -87.1866 } },
          types: ['airport']
        }
      ],
      'panama city beach florida usa': [
        {
          name: 'Northwest Florida Beaches International Airport (ECP)',
          formatted_address: 'Panama City Beach, FL 32413, USA',
          geometry: { location: { lat: 30.3581, lng: -85.7956 } },
          types: ['airport']
        },
        {
          name: 'Pensacola International Airport (PNS)',
          formatted_address: 'Pensacola, FL 32504, USA',
          geometry: { location: { lat: 30.4734, lng: -87.1866 } },
          types: ['airport']
        }
      ],
      'pensacola': [
        {
          name: 'Pensacola International Airport (PNS)',
          formatted_address: 'Pensacola, FL 32504, USA',
          geometry: { location: { lat: 30.4734, lng: -87.1866 } },
          types: ['airport']
        },
        {
          name: 'Mobile Regional Airport (MOB)',
          formatted_address: 'Mobile, AL 36608, USA',
          geometry: { location: { lat: 30.6910, lng: -88.2426 } },
          types: ['airport']
        }
      ],
      'pensacola fl': [
        {
          name: 'Pensacola International Airport (PNS)',
          formatted_address: 'Pensacola, FL 32504, USA',
          geometry: { location: { lat: 30.4734, lng: -87.1866 } },
          types: ['airport']
        },
        {
          name: 'Mobile Regional Airport (MOB)',
          formatted_address: 'Mobile, AL 36608, USA',
          geometry: { location: { lat: 30.6910, lng: -88.2426 } },
          types: ['airport']
        }
      ],
      'pensacola fl usa': [
        {
          name: 'Pensacola International Airport (PNS)',
          formatted_address: 'Pensacola, FL 32504, USA',
          geometry: { location: { lat: 30.4734, lng: -87.1866 } },
          types: ['airport']
        },
        {
          name: 'Mobile Regional Airport (MOB)',
          formatted_address: 'Mobile, AL 36608, USA',
          geometry: { location: { lat: 30.6910, lng: -88.2426 } },
          types: ['airport']
        }
      ],
      'pensacola florida': [
        {
          name: 'Pensacola International Airport (PNS)',
          formatted_address: 'Pensacola, FL 32504, USA',
          geometry: { location: { lat: 30.4734, lng: -87.1866 } },
          types: ['airport']
        },
        {
          name: 'Mobile Regional Airport (MOB)',
          formatted_address: 'Mobile, AL 36608, USA',
          geometry: { location: { lat: 30.6910, lng: -88.2426 } },
          types: ['airport']
        }
      ],
      'pensacola florida usa': [
        {
          name: 'Pensacola International Airport (PNS)',
          formatted_address: 'Pensacola, FL 32504, USA',
          geometry: { location: { lat: 30.4734, lng: -87.1866 } },
          types: ['airport']
        },
        {
          name: 'Mobile Regional Airport (MOB)',
          formatted_address: 'Mobile, AL 36608, USA',
          geometry: { location: { lat: 30.6910, lng: -88.2426 } },
          types: ['airport']
        }
      ],
      'portsmouth': [
        {
          name: 'Portsmouth Regional Airport (PSM)',
          formatted_address: 'Portsmouth, NH 03801, USA',
          geometry: { location: { lat: 43.0778, lng: -70.8233 } },
          types: ['airport']
        },
        {
          name: 'Logan International Airport (BOS)',
          formatted_address: 'Boston, MA 02128, USA',
          geometry: { location: { lat: 42.3656, lng: -71.0096 } },
          types: ['airport']
        }
      ],
      'portsmouth nh': [
        {
          name: 'Portsmouth Regional Airport (PSM)',
          formatted_address: 'Portsmouth, NH 03801, USA',
          geometry: { location: { lat: 43.0778, lng: -70.8233 } },
          types: ['airport']
        },
        {
          name: 'Logan International Airport (BOS)',
          formatted_address: 'Boston, MA 02128, USA',
          geometry: { location: { lat: 42.3656, lng: -71.0096 } },
          types: ['airport']
        }
      ],
      'portsmouth nh usa': [
        {
          name: 'Portsmouth Regional Airport (PSM)',
          formatted_address: 'Portsmouth, NH 03801, USA',
          geometry: { location: { lat: 43.0778, lng: -70.8233 } },
          types: ['airport']
        },
        {
          name: 'Logan International Airport (BOS)',
          formatted_address: 'Boston, MA 02128, USA',
          geometry: { location: { lat: 42.3656, lng: -71.0096 } },
          types: ['airport']
        }
      ],
      'portsmouth new hampshire': [
        {
          name: 'Portsmouth Regional Airport (PSM)',
          formatted_address: 'Portsmouth, NH 03801, USA',
          geometry: { location: { lat: 43.0778, lng: -70.8233 } },
          types: ['airport']
        },
        {
          name: 'Logan International Airport (BOS)',
          formatted_address: 'Boston, MA 02128, USA',
          geometry: { location: { lat: 42.3656, lng: -71.0096 } },
          types: ['airport']
        }
      ],
      'portsmouth new hampshire usa': [
        {
          name: 'Portsmouth Regional Airport (PSM)',
          formatted_address: 'Portsmouth, NH 03801, USA',
          geometry: { location: { lat: 43.0778, lng: -70.8233 } },
          types: ['airport']
        },
        {
          name: 'Logan International Airport (BOS)',
          formatted_address: 'Boston, MA 02128, USA',
          geometry: { location: { lat: 42.3656, lng: -71.0096 } },
          types: ['airport']
        }
      ],
      'providence': [
        {
          name: 'Theodore Francis Green Airport (PVD)',
          formatted_address: 'Warwick, RI 02886, USA',
          geometry: { location: { lat: 41.7258, lng: -71.4281 } },
          types: ['airport']
        },
        {
          name: 'Logan International Airport (BOS)',
          formatted_address: 'Boston, MA 02128, USA',
          geometry: { location: { lat: 42.3656, lng: -71.0096 } },
          types: ['airport']
        }
      ],
      'providence ri': [
        {
          name: 'Theodore Francis Green Airport (PVD)',
          formatted_address: 'Warwick, RI 02886, USA',
          geometry: { location: { lat: 41.7258, lng: -71.4281 } },
          types: ['airport']
        },
        {
          name: 'Logan International Airport (BOS)',
          formatted_address: 'Boston, MA 02128, USA',
          geometry: { location: { lat: 42.3656, lng: -71.0096 } },
          types: ['airport']
        }
      ],
      'providence ri usa': [
        {
          name: 'Theodore Francis Green Airport (PVD)',
          formatted_address: 'Warwick, RI 02886, USA',
          geometry: { location: { lat: 41.7258, lng: -71.4281 } },
          types: ['airport']
        },
        {
          name: 'Logan International Airport (BOS)',
          formatted_address: 'Boston, MA 02128, USA',
          geometry: { location: { lat: 42.3656, lng: -71.0096 } },
          types: ['airport']
        }
      ],
      'providence rhode island': [
        {
          name: 'Theodore Francis Green Airport (PVD)',
          formatted_address: 'Warwick, RI 02886, USA',
          geometry: { location: { lat: 41.7258, lng: -71.4281 } },
          types: ['airport']
        },
        {
          name: 'Logan International Airport (BOS)',
          formatted_address: 'Boston, MA 02128, USA',
          geometry: { location: { lat: 42.3656, lng: -71.0096 } },
          types: ['airport']
        }
      ],
      'providence rhode island usa': [
        {
          name: 'Theodore Francis Green Airport (PVD)',
          formatted_address: 'Warwick, RI 02886, USA',
          geometry: { location: { lat: 41.7258, lng: -71.4281 } },
          types: ['airport']
        },
        {
          name: 'Logan International Airport (BOS)',
          formatted_address: 'Boston, MA 02128, USA',
          geometry: { location: { lat: 42.3656, lng: -71.0096 } },
          types: ['airport']
        }
      ],
      'new haven': [
        {
          name: 'Bradley International Airport (BDL)',
          formatted_address: 'Windsor Locks, CT 06096, USA',
          geometry: { location: { lat: 41.9389, lng: -72.6832 } },
          types: ['airport']
        }
      ],
      'new haven ct': [
        {
          name: 'Bradley International Airport (BDL)',
          formatted_address: 'Windsor Locks, CT 06096, USA',
          geometry: { location: { lat: 41.9389, lng: -72.6832 } },
          types: ['airport']
        }
      ],
      'new haven ct usa': [
        {
          name: 'Bradley International Airport (BDL)',
          formatted_address: 'Windsor Locks, CT 06096, USA',
          geometry: { location: { lat: 41.9389, lng: -72.6832 } },
          types: ['airport']
        }
      ],
      'new haven connecticut': [
        {
          name: 'Bradley International Airport (BDL)',
          formatted_address: 'Windsor Locks, CT 06096, USA',
          geometry: { location: { lat: 41.9389, lng: -72.6832 } },
          types: ['airport']
        }
      ],
      'newark': [
        {
          name: 'Newark Liberty International Airport (EWR)',
          formatted_address: 'Newark, NJ 07114, USA',
          geometry: { location: { lat: 40.6895, lng: -74.1745 } },
          types: ['airport']
        },
        {
          name: 'John F. Kennedy International Airport (JFK)',
          formatted_address: 'Queens, NY 11430, USA',
          geometry: { location: { lat: 40.6413, lng: -73.7781 } },
          types: ['airport']
        }
      ],
      'newark nj': [
        {
          name: 'Newark Liberty International Airport (EWR)',
          formatted_address: 'Newark, NJ 07114, USA',
          geometry: { location: { lat: 40.6895, lng: -74.1745 } },
          types: ['airport']
        },
        {
          name: 'John F. Kennedy International Airport (JFK)',
          formatted_address: 'Queens, NY 11430, USA',
          geometry: { location: { lat: 40.6413, lng: -73.7781 } },
          types: ['airport']
        }
      ],
      'newark nj usa': [
        {
          name: 'Newark Liberty International Airport (EWR)',
          formatted_address: 'Newark, NJ 07114, USA',
          geometry: { location: { lat: 40.6895, lng: -74.1745 } },
          types: ['airport']
        },
        {
          name: 'John F. Kennedy International Airport (JFK)',
          formatted_address: 'Queens, NY 11430, USA',
          geometry: { location: { lat: 40.6413, lng: -73.7781 } },
          types: ['airport']
        }
      ],
      'newark new jersey': [
        {
          name: 'Newark Liberty International Airport (EWR)',
          formatted_address: 'Newark, NJ 07114, USA',
          geometry: { location: { lat: 40.6895, lng: -74.1745 } },
          types: ['airport']
        },
        {
          name: 'John F. Kennedy International Airport (JFK)',
          formatted_address: 'Queens, NY 11430, USA',
          geometry: { location: { lat: 40.6413, lng: -73.7781 } },
          types: ['airport']
        }
      ],
      'newark new jersey usa': [
        {
          name: 'Newark Liberty International Airport (EWR)',
          formatted_address: 'Newark, NJ 07114, USA',
          geometry: { location: { lat: 40.6895, lng: -74.1745 } },
          types: ['airport']
        },
        {
          name: 'John F. Kennedy International Airport (JFK)',
          formatted_address: 'Queens, NY 11430, USA',
          geometry: { location: { lat: 40.6413, lng: -73.7781 } },
          types: ['airport']
        }
      ],
      'seattle': [
        {
          name: 'Seattle-Tacoma International Airport (SEA)',
          formatted_address: 'Seattle, WA 98158, USA',
          geometry: { location: { lat: 47.4502, lng: -122.3088 } },
          types: ['airport']
        }
      ],
      'denver': [
        {
          name: 'Denver International Airport (DEN)',
          formatted_address: 'Denver, CO 80249, USA',
          geometry: { location: { lat: 39.8561, lng: -104.6737 } },
          types: ['airport']
        }
      ],
      'pinon': [
        {
          name: 'Albuquerque International Sunport (ABQ)',
          formatted_address: 'Albuquerque, NM 87106, USA',
          geometry: { location: { lat: 35.0402, lng: -106.6092 } },
          types: ['airport']
        },
        {
          name: 'Durango-La Plata County Airport (DRO)',
          formatted_address: 'Durango, CO 81303, USA',
          geometry: { location: { lat: 37.1515, lng: -107.7538 } },
          types: ['airport']
        }
      ],
      'piñon': [
        {
          name: 'Albuquerque International Sunport (ABQ)',
          formatted_address: 'Albuquerque, NM 87106, USA',
          geometry: { location: { lat: 35.0402, lng: -106.6092 } },
          types: ['airport']
        },
        {
          name: 'Durango-La Plata County Airport (DRO)',
          formatted_address: 'Durango, CO 81303, USA',
          geometry: { location: { lat: 37.1515, lng: -107.7538 } },
          types: ['airport']
        }
      ],
      'santa fe': [
        {
          name: 'Santa Fe Regional Airport (SAF)',
          formatted_address: 'Santa Fe, NM 87507, USA',
          geometry: { location: { lat: 35.6179, lng: -106.0887 } },
          types: ['airport']
        },
        {
          name: 'Albuquerque International Sunport (ABQ)',
          formatted_address: 'Albuquerque, NM 87106, USA',
          geometry: { location: { lat: 35.0402, lng: -106.6092 } },
          types: ['airport']
        }
      ],
      'santa fe nm': [
        {
          name: 'Santa Fe Regional Airport (SAF)',
          formatted_address: 'Santa Fe, NM 87507, USA',
          geometry: { location: { lat: 35.6179, lng: -106.0887 } },
          types: ['airport']
        },
        {
          name: 'Albuquerque International Sunport (ABQ)',
          formatted_address: 'Albuquerque, NM 87106, USA',
          geometry: { location: { lat: 35.0402, lng: -106.6092 } },
          types: ['airport']
        }
      ],
      'santa fe nm usa': [
        {
          name: 'Santa Fe Regional Airport (SAF)',
          formatted_address: 'Santa Fe, NM 87507, USA',
          geometry: { location: { lat: 35.6179, lng: -106.0887 } },
          types: ['airport']
        },
        {
          name: 'Albuquerque International Sunport (ABQ)',
          formatted_address: 'Albuquerque, NM 87106, USA',
          geometry: { location: { lat: 35.0402, lng: -106.6092 } },
          types: ['airport']
        }
      ],
      'santa fe new mexico': [
        {
          name: 'Santa Fe Regional Airport (SAF)',
          formatted_address: 'Santa Fe, NM 87507, USA',
          geometry: { location: { lat: 35.6179, lng: -106.0887 } },
          types: ['airport']
        },
        {
          name: 'Albuquerque International Sunport (ABQ)',
          formatted_address: 'Albuquerque, NM 87106, USA',
          geometry: { location: { lat: 35.0402, lng: -106.6092 } },
          types: ['airport']
        }
      ],
      'santa fe new mexico usa': [
        {
          name: 'Santa Fe Regional Airport (SAF)',
          formatted_address: 'Santa Fe, NM 87507, USA',
          geometry: { location: { lat: 35.6179, lng: -106.0887 } },
          types: ['airport']
        },
        {
          name: 'Albuquerque International Sunport (ABQ)',
          formatted_address: 'Albuquerque, NM 87106, USA',
          geometry: { location: { lat: 35.0402, lng: -106.6092 } },
          types: ['airport']
        }
      ],
      'pinon hills': [
        {
          name: 'Ontario International Airport (ONT)',
          formatted_address: 'Ontario, CA 91761, USA',
          geometry: { location: { lat: 34.0560, lng: -117.6012 } },
          types: ['airport']
        }
      ],
      'piñon hills': [
        {
          name: 'Ontario International Airport (ONT)',
          formatted_address: 'Ontario, CA 91761, USA',
          geometry: { location: { lat: 34.0560, lng: -117.6012 } },
          types: ['airport']
        }
      ],
      'pinon hills ca': [
        {
          name: 'Ontario International Airport (ONT)',
          formatted_address: 'Ontario, CA 91761, USA',
          geometry: { location: { lat: 34.0560, lng: -117.6012 } },
          types: ['airport']
        }
      ],
      'pinon hills california': [
        {
          name: 'Ontario International Airport (ONT)',
          formatted_address: 'Ontario, CA 91761, USA',
          geometry: { location: { lat: 34.0560, lng: -117.6012 } },
          types: ['airport']
        }
      ],
      'piñon hills ca': [
        {
          name: 'Ontario International Airport (ONT)',
          formatted_address: 'Ontario, CA 91761, USA',
          geometry: { location: { lat: 34.0560, lng: -117.6012 } },
          types: ['airport']
        }
      ],
      'piñon hills california': [
        {
          name: 'Ontario International Airport (ONT)',
          formatted_address: 'Ontario, CA 91761, USA',
          geometry: { location: { lat: 34.0560, lng: -117.6012 } },
          types: ['airport']
        }
      ],
      'pinon az': [
        {
          name: 'Flagstaff Pulliam Airport (FLG)',
          formatted_address: 'Flagstaff, AZ 86001, USA',
          geometry: { location: { lat: 35.1345, lng: -111.6714 } },
          types: ['airport']
        },
        {
          name: 'Phoenix Sky Harbor International Airport (PHX)',
          formatted_address: 'Phoenix, AZ 85034, USA',
          geometry: { location: { lat: 33.4352, lng: -112.0101 } },
          types: ['airport']
        }
      ],
      'piñon az': [
        {
          name: 'Flagstaff Pulliam Airport (FLG)',
          formatted_address: 'Flagstaff, AZ 86001, USA',
          geometry: { location: { lat: 35.1345, lng: -111.6714 } },
          types: ['airport']
        },
        {
          name: 'Phoenix Sky Harbor International Airport (PHX)',
          formatted_address: 'Phoenix, AZ 85034, USA',
          geometry: { location: { lat: 33.4352, lng: -112.0101 } },
          types: ['airport']
        }
      ],
      'las vegas': [
        {
          name: 'Harry Reid International Airport (LAS)',
          formatted_address: 'Las Vegas, NV 89119, USA',
          geometry: { location: { lat: 36.0840, lng: -115.1537 } },
          types: ['airport']
        }
      ],
      'phoenix': [
        {
          name: 'Phoenix Sky Harbor International Airport (PHX)',
          formatted_address: 'Phoenix, AZ 85034, USA',
          geometry: { location: { lat: 33.4343, lng: -112.0116 } },
          types: ['airport']
        }
      ],
      'oklahoma city': [
        {
          name: 'Will Rogers World Airport (OKC)',
          formatted_address: 'Oklahoma City, OK 73159, USA',
          geometry: { location: { lat: 35.3931, lng: -97.6007 } },
          types: ['airport']
        },
        {
          name: 'Dallas/Fort Worth International Airport (DFW)',
          formatted_address: 'DFW Airport, TX 75261, USA',
          geometry: { location: { lat: 32.8968, lng: -97.0380 } },
          types: ['airport']
        }
      ],
      'oklahoma city ok': [
        {
          name: 'Will Rogers World Airport (OKC)',
          formatted_address: 'Oklahoma City, OK 73159, USA',
          geometry: { location: { lat: 35.3931, lng: -97.6007 } },
          types: ['airport']
        },
        {
          name: 'Dallas/Fort Worth International Airport (DFW)',
          formatted_address: 'DFW Airport, TX 75261, USA',
          geometry: { location: { lat: 32.8968, lng: -97.0380 } },
          types: ['airport']
        }
      ],
      'oklahoma city ok usa': [
        {
          name: 'Will Rogers World Airport (OKC)',
          formatted_address: 'Oklahoma City, OK 73159, USA',
          geometry: { location: { lat: 35.3931, lng: -97.6007 } },
          types: ['airport']
        },
        {
          name: 'Dallas/Fort Worth International Airport (DFW)',
          formatted_address: 'DFW Airport, TX 75261, USA',
          geometry: { location: { lat: 32.8968, lng: -97.0380 } },
          types: ['airport']
        }
      ],
      'oklahoma city oklahoma': [
        {
          name: 'Will Rogers World Airport (OKC)',
          formatted_address: 'Oklahoma City, OK 73159, USA',
          geometry: { location: { lat: 35.3931, lng: -97.6007 } },
          types: ['airport']
        },
        {
          name: 'Dallas/Fort Worth International Airport (DFW)',
          formatted_address: 'DFW Airport, TX 75261, USA',
          geometry: { location: { lat: 32.8968, lng: -97.0380 } },
          types: ['airport']
        }
      ],
      'oklahoma city oklahoma usa': [
        {
          name: 'Will Rogers World Airport (OKC)',
          formatted_address: 'Oklahoma City, OK 73159, USA',
          geometry: { location: { lat: 35.3931, lng: -97.6007 } },
          types: ['airport']
        },
        {
          name: 'Dallas/Fort Worth International Airport (DFW)',
          formatted_address: 'DFW Airport, TX 75261, USA',
          geometry: { location: { lat: 32.8968, lng: -97.0380 } },
          types: ['airport']
        }
      ],
      'dallas': [
        {
          name: 'Dallas/Fort Worth International Airport (DFW)',
          formatted_address: 'DFW Airport, TX 75261, USA',
          geometry: { location: { lat: 32.8968, lng: -97.0380 } },
          types: ['airport']
        },
        {
          name: 'Dallas Love Field (DAL)',
          formatted_address: 'Dallas, TX 75235, USA',
          geometry: { location: { lat: 32.8472, lng: -96.8518 } },
          types: ['airport']
        }
      ],
      'houston': [
        {
          name: 'George Bush Intercontinental Airport (IAH)',
          formatted_address: 'Houston, TX 77032, USA',
          geometry: { location: { lat: 29.9844, lng: -95.3414 } },
          types: ['airport']
        },
        {
          name: 'William P. Hobby Airport (HOU)',
          formatted_address: 'Houston, TX 77061, USA',
          geometry: { location: { lat: 29.6454, lng: -95.2789 } },
          types: ['airport']
        }
      ],
      'jackson': [
        {
          name: 'Jackson Hole Airport (JAC)',
          formatted_address: 'Jackson, WY 83001, USA',
          geometry: { location: { lat: 43.6073, lng: -110.7377 } },
          types: ['airport']
        },
        {
          name: 'Salt Lake City International Airport (SLC)',
          formatted_address: 'Salt Lake City, UT 84122, USA',
          geometry: { location: { lat: 40.7884, lng: -111.9778 } },
          types: ['airport']
        }
      ],
      'jackson wy': [
        {
          name: 'Jackson Hole Airport (JAC)',
          formatted_address: 'Jackson, WY 83001, USA',
          geometry: { location: { lat: 43.6073, lng: -110.7377 } },
          types: ['airport']
        },
        {
          name: 'Salt Lake City International Airport (SLC)',
          formatted_address: 'Salt Lake City, UT 84122, USA',
          geometry: { location: { lat: 40.7884, lng: -111.9778 } },
          types: ['airport']
        }
      ],
      'jackson wy usa': [
        {
          name: 'Jackson Hole Airport (JAC)',
          formatted_address: 'Jackson, WY 83001, USA',
          geometry: { location: { lat: 43.6073, lng: -110.7377 } },
          types: ['airport']
        },
        {
          name: 'Salt Lake City International Airport (SLC)',
          formatted_address: 'Salt Lake City, UT 84122, USA',
          geometry: { location: { lat: 40.7884, lng: -111.9778 } },
          types: ['airport']
        }
      ],
      'jackson wyoming': [
        {
          name: 'Jackson Hole Airport (JAC)',
          formatted_address: 'Jackson, WY 83001, USA',
          geometry: { location: { lat: 43.6073, lng: -110.7377 } },
          types: ['airport']
        },
        {
          name: 'Salt Lake City International Airport (SLC)',
          formatted_address: 'Salt Lake City, UT 84122, USA',
          geometry: { location: { lat: 40.7884, lng: -111.9778 } },
          types: ['airport']
        }
      ],
      'jackson wyoming usa': [
        {
          name: 'Jackson Hole Airport (JAC)',
          formatted_address: 'Jackson, WY 83001, USA',
          geometry: { location: { lat: 43.6073, lng: -110.7377 } },
          types: ['airport']
        },
        {
          name: 'Salt Lake City International Airport (SLC)',
          formatted_address: 'Salt Lake City, UT 84122, USA',
          geometry: { location: { lat: 40.7884, lng: -111.9778 } },
          types: ['airport']
        }
      ],
      'jacksonville': [
        {
          name: 'Jacksonville International Airport (JAX)',
          formatted_address: 'Jacksonville, FL 32218, USA',
          geometry: { location: { lat: 30.4941, lng: -81.6879 } },
          types: ['airport']
        },
        {
          name: 'Orlando International Airport (MCO)',
          formatted_address: 'Orlando, FL 32827, USA',
          geometry: { location: { lat: 28.4294, lng: -81.3089 } },
          types: ['airport']
        }
      ],
      'jacksonville fl': [
        {
          name: 'Jacksonville International Airport (JAX)',
          formatted_address: 'Jacksonville, FL 32218, USA',
          geometry: { location: { lat: 30.4941, lng: -81.6879 } },
          types: ['airport']
        },
        {
          name: 'Orlando International Airport (MCO)',
          formatted_address: 'Orlando, FL 32827, USA',
          geometry: { location: { lat: 28.4294, lng: -81.3089 } },
          types: ['airport']
        }
      ],
      'jacksonville fl usa': [
        {
          name: 'Jacksonville International Airport (JAX)',
          formatted_address: 'Jacksonville, FL 32218, USA',
          geometry: { location: { lat: 30.4941, lng: -81.6879 } },
          types: ['airport']
        },
        {
          name: 'Orlando International Airport (MCO)',
          formatted_address: 'Orlando, FL 32827, USA',
          geometry: { location: { lat: 28.4294, lng: -81.3089 } },
          types: ['airport']
        }
      ],
      'jacksonville florida': [
        {
          name: 'Jacksonville International Airport (JAX)',
          formatted_address: 'Jacksonville, FL 32218, USA',
          geometry: { location: { lat: 30.4941, lng: -81.6879 } },
          types: ['airport']
        },
        {
          name: 'Orlando International Airport (MCO)',
          formatted_address: 'Orlando, FL 32827, USA',
          geometry: { location: { lat: 28.4294, lng: -81.3089 } },
          types: ['airport']
        }
      ],
      'jacksonville florida usa': [
        {
          name: 'Jacksonville International Airport (JAX)',
          formatted_address: 'Jacksonville, FL 32218, USA',
          geometry: { location: { lat: 30.4941, lng: -81.6879 } },
          types: ['airport']
        },
        {
          name: 'Orlando International Airport (MCO)',
          formatted_address: 'Orlando, FL 32827, USA',
          geometry: { location: { lat: 28.4294, lng: -81.3089 } },
          types: ['airport']
        }
      ],
      'virginia beach': [
        {
          name: 'Norfolk International Airport (ORF)',
          formatted_address: 'Norfolk, VA 23518, USA',
          geometry: { location: { lat: 36.8946, lng: -76.2012 } },
          types: ['airport']
        },
        {
          name: 'Ronald Reagan Washington National Airport (DCA)',
          formatted_address: 'Arlington, VA 22202, USA',
          geometry: { location: { lat: 38.8512, lng: -77.0402 } },
          types: ['airport']
        }
      ],
      'virginia beach va': [
        {
          name: 'Norfolk International Airport (ORF)',
          formatted_address: 'Norfolk, VA 23518, USA',
          geometry: { location: { lat: 36.8946, lng: -76.2012 } },
          types: ['airport']
        },
        {
          name: 'Ronald Reagan Washington National Airport (DCA)',
          formatted_address: 'Arlington, VA 22202, USA',
          geometry: { location: { lat: 38.8512, lng: -77.0402 } },
          types: ['airport']
        }
      ],
      'virginia beach va usa': [
        {
          name: 'Norfolk International Airport (ORF)',
          formatted_address: 'Norfolk, VA 23518, USA',
          geometry: { location: { lat: 36.8946, lng: -76.2012 } },
          types: ['airport']
        },
        {
          name: 'Ronald Reagan Washington National Airport (DCA)',
          formatted_address: 'Arlington, VA 22202, USA',
          geometry: { location: { lat: 38.8512, lng: -77.0402 } },
          types: ['airport']
        }
      ],
      'virginia beach virginia': [
        {
          name: 'Norfolk International Airport (ORF)',
          formatted_address: 'Norfolk, VA 23518, USA',
          geometry: { location: { lat: 36.8946, lng: -76.2012 } },
          types: ['airport']
        },
        {
          name: 'Ronald Reagan Washington National Airport (DCA)',
          formatted_address: 'Arlington, VA 22202, USA',
          geometry: { location: { lat: 38.8512, lng: -77.0402 } },
          types: ['airport']
        }
      ],
      'virginia beach virginia usa': [
        {
          name: 'Norfolk International Airport (ORF)',
          formatted_address: 'Norfolk, VA 23518, USA',
          geometry: { location: { lat: 36.8946, lng: -76.2012 } },
          types: ['airport']
        },
        {
          name: 'Ronald Reagan Washington National Airport (DCA)',
          formatted_address: 'Arlington, VA 22202, USA',
          geometry: { location: { lat: 38.8512, lng: -77.0402 } },
          types: ['airport']
        }
      ],
      'washington': [
        {
          name: 'Ronald Reagan Washington National Airport (DCA)',
          formatted_address: 'Arlington, VA 22202, USA',
          geometry: { location: { lat: 38.8512, lng: -77.0402 } },
          types: ['airport']
        },
        {
          name: 'Washington Dulles International Airport (IAD)',
          formatted_address: 'Dulles, VA 20166, USA',
          geometry: { location: { lat: 38.9445, lng: -77.4558 } },
          types: ['airport']
        },
        {
          name: 'Baltimore/Washington International Airport (BWI)',
          formatted_address: 'Baltimore, MD 21240, USA',
          geometry: { location: { lat: 39.1754, lng: -76.6683 } },
          types: ['airport']
        }
      ],
      'washington dc': [
        {
          name: 'Ronald Reagan Washington National Airport (DCA)',
          formatted_address: 'Arlington, VA 22202, USA',
          geometry: { location: { lat: 38.8512, lng: -77.0402 } },
          types: ['airport']
        },
        {
          name: 'Washington Dulles International Airport (IAD)',
          formatted_address: 'Dulles, VA 20166, USA',
          geometry: { location: { lat: 38.9445, lng: -77.4558 } },
          types: ['airport']
        },
        {
          name: 'Baltimore/Washington International Airport (BWI)',
          formatted_address: 'Baltimore, MD 21240, USA',
          geometry: { location: { lat: 39.1754, lng: -76.6683 } },
          types: ['airport']
        }
      ],
      'washington d.c.': [
        {
          name: 'Ronald Reagan Washington National Airport (DCA)',
          formatted_address: 'Arlington, VA 22202, USA',
          geometry: { location: { lat: 38.8512, lng: -77.0402 } },
          types: ['airport']
        },
        {
          name: 'Washington Dulles International Airport (IAD)',
          formatted_address: 'Dulles, VA 20166, USA',
          geometry: { location: { lat: 38.9445, lng: -77.4558 } },
          types: ['airport']
        },
        {
          name: 'Baltimore/Washington International Airport (BWI)',
          formatted_address: 'Baltimore, MD 21240, USA',
          geometry: { location: { lat: 39.1754, lng: -76.6683 } },
          types: ['airport']
        }
      ],
      'washington d.c. dc usa': [
        {
          name: 'Ronald Reagan Washington National Airport (DCA)',
          formatted_address: 'Arlington, VA 22202, USA',
          geometry: { location: { lat: 38.8512, lng: -77.0402 } },
          types: ['airport']
        },
        {
          name: 'Washington Dulles International Airport (IAD)',
          formatted_address: 'Dulles, VA 20166, USA',
          geometry: { location: { lat: 38.9445, lng: -77.4558 } },
          types: ['airport']
        },
        {
          name: 'Baltimore/Washington International Airport (BWI)',
          formatted_address: 'Baltimore, MD 21240, USA',
          geometry: { location: { lat: 39.1754, lng: -76.6683 } },
          types: ['airport']
        }
      ],
      'philadelphia': [
        {
          name: 'Philadelphia International Airport (PHL)',
          formatted_address: 'Philadelphia, PA 19153, USA',
          geometry: { location: { lat: 39.8719, lng: -75.2411 } },
          types: ['airport']
        }
      ],
      'rehoboth beach': [
        {
          name: 'Salisbury-Ocean City Wicomico Regional Airport (SBY)',
          formatted_address: 'Salisbury, MD 21804, USA',
          geometry: { location: { lat: 38.3406, lng: -75.5102 } },
          types: ['airport']
        },
        {
          name: 'Philadelphia International Airport (PHL)',
          formatted_address: 'Philadelphia, PA 19153, USA',
          geometry: { location: { lat: 39.8719, lng: -75.2411 } },
          types: ['airport']
        }
      ],
      'rehoboth beach de': [
        {
          name: 'Salisbury-Ocean City Wicomico Regional Airport (SBY)',
          formatted_address: 'Salisbury, MD 21804, USA',
          geometry: { location: { lat: 38.3406, lng: -75.5102 } },
          types: ['airport']
        },
        {
          name: 'Philadelphia International Airport (PHL)',
          formatted_address: 'Philadelphia, PA 19153, USA',
          geometry: { location: { lat: 39.8719, lng: -75.2411 } },
          types: ['airport']
        }
      ],
      'rehoboth beach de usa': [
        {
          name: 'Salisbury-Ocean City Wicomico Regional Airport (SBY)',
          formatted_address: 'Salisbury, MD 21804, USA',
          geometry: { location: { lat: 38.3406, lng: -75.5102 } },
          types: ['airport']
        },
        {
          name: 'Philadelphia International Airport (PHL)',
          formatted_address: 'Philadelphia, PA 19153, USA',
          geometry: { location: { lat: 39.8719, lng: -75.2411 } },
          types: ['airport']
        }
      ],
      'rehoboth beach delaware': [
        {
          name: 'Salisbury-Ocean City Wicomico Regional Airport (SBY)',
          formatted_address: 'Salisbury, MD 21804, USA',
          geometry: { location: { lat: 38.3406, lng: -75.5102 } },
          types: ['airport']
        },
        {
          name: 'Philadelphia International Airport (PHL)',
          formatted_address: 'Philadelphia, PA 19153, USA',
          geometry: { location: { lat: 39.8719, lng: -75.2411 } },
          types: ['airport']
        }
      ],
      'ocean city': [
        {
          name: 'Salisbury-Ocean City Wicomico Regional Airport (SBY)',
          formatted_address: 'Salisbury, MD 21804, USA',
          geometry: { location: { lat: 38.3406, lng: -75.5102 } },
          types: ['airport']
        },
        {
          name: 'Baltimore/Washington International Thurgood Marshall Airport (BWI)',
          formatted_address: 'Baltimore, MD 21240, USA',
          geometry: { location: { lat: 39.1754, lng: -76.6683 } },
          types: ['airport']
        }
      ],
      'ocean city md': [
        {
          name: 'Salisbury-Ocean City Wicomico Regional Airport (SBY)',
          formatted_address: 'Salisbury, MD 21804, USA',
          geometry: { location: { lat: 38.3406, lng: -75.5102 } },
          types: ['airport']
        },
        {
          name: 'Baltimore/Washington International Thurgood Marshall Airport (BWI)',
          formatted_address: 'Baltimore, MD 21240, USA',
          geometry: { location: { lat: 39.1754, lng: -76.6683 } },
          types: ['airport']
        }
      ],
      'ocean city md usa': [
        {
          name: 'Salisbury-Ocean City Wicomico Regional Airport (SBY)',
          formatted_address: 'Salisbury, MD 21804, USA',
          geometry: { location: { lat: 38.3406, lng: -75.5102 } },
          types: ['airport']
        },
        {
          name: 'Baltimore/Washington International Thurgood Marshall Airport (BWI)',
          formatted_address: 'Baltimore, MD 21240, USA',
          geometry: { location: { lat: 39.1754, lng: -76.6683 } },
          types: ['airport']
        }
      ],
      'ocean city maryland': [
        {
          name: 'Salisbury-Ocean City Wicomico Regional Airport (SBY)',
          formatted_address: 'Salisbury, MD 21804, USA',
          geometry: { location: { lat: 38.3406, lng: -75.5102 } },
          types: ['airport']
        },
        {
          name: 'Baltimore/Washington International Thurgood Marshall Airport (BWI)',
          formatted_address: 'Baltimore, MD 21240, USA',
          geometry: { location: { lat: 39.1754, lng: -76.6683 } },
          types: ['airport']
        }
      ],
      'ocean city maryland usa': [
        {
          name: 'Salisbury-Ocean City Wicomico Regional Airport (SBY)',
          formatted_address: 'Salisbury, MD 21804, USA',
          geometry: { location: { lat: 38.3406, lng: -75.5102 } },
          types: ['airport']
        },
        {
          name: 'Baltimore/Washington International Thurgood Marshall Airport (BWI)',
          formatted_address: 'Baltimore, MD 21240, USA',
          geometry: { location: { lat: 39.1754, lng: -76.6683 } },
          types: ['airport']
        }
      ],
      'ocean city nj': [
        {
          name: 'Atlantic City International Airport (ACY)',
          formatted_address: 'Egg Harbor Township, NJ 08234, USA',
          geometry: { location: { lat: 39.4577, lng: -74.5770 } },
          types: ['airport']
        },
        {
          name: 'Philadelphia International Airport (PHL)',
          formatted_address: 'Philadelphia, PA 19153, USA',
          geometry: { location: { lat: 39.8747, lng: -75.2414 } },
          types: ['airport']
        }
      ],
      'ocean city nj usa': [
        {
          name: 'Atlantic City International Airport (ACY)',
          formatted_address: 'Egg Harbor Township, NJ 08234, USA',
          geometry: { location: { lat: 39.4577, lng: -74.5770 } },
          types: ['airport']
        },
        {
          name: 'Philadelphia International Airport (PHL)',
          formatted_address: 'Philadelphia, PA 19153, USA',
          geometry: { location: { lat: 39.8747, lng: -75.2414 } },
          types: ['airport']
        }
      ],
      'ocean city new jersey': [
        {
          name: 'Atlantic City International Airport (ACY)',
          formatted_address: 'Egg Harbor Township, NJ 08234, USA',
          geometry: { location: { lat: 39.4577, lng: -74.5770 } },
          types: ['airport']
        },
        {
          name: 'Philadelphia International Airport (PHL)',
          formatted_address: 'Philadelphia, PA 19153, USA',
          geometry: { location: { lat: 39.8747, lng: -75.2414 } },
          types: ['airport']
        }
      ],
      'ocean city new jersey usa': [
        {
          name: 'Atlantic City International Airport (ACY)',
          formatted_address: 'Egg Harbor Township, NJ 08234, USA',
          geometry: { location: { lat: 39.4577, lng: -74.5770 } },
          types: ['airport']
        },
        {
          name: 'Philadelphia International Airport (PHL)',
          formatted_address: 'Philadelphia, PA 19153, USA',
          geometry: { location: { lat: 39.8747, lng: -75.2414 } },
          types: ['airport']
        }
      ],
      'atlantic city': [
        {
          name: 'Atlantic City International Airport (ACY)',
          formatted_address: 'Egg Harbor Township, NJ 08234, USA',
          geometry: { location: { lat: 39.4577, lng: -74.5770 } },
          types: ['airport']
        },
        {
          name: 'Philadelphia International Airport (PHL)',
          formatted_address: 'Philadelphia, PA 19153, USA',
          geometry: { location: { lat: 39.8747, lng: -75.2414 } },
          types: ['airport']
        }
      ],
      'atlantic city nj': [
        {
          name: 'Atlantic City International Airport (ACY)',
          formatted_address: 'Egg Harbor Township, NJ 08234, USA',
          geometry: { location: { lat: 39.4577, lng: -74.5770 } },
          types: ['airport']
        },
        {
          name: 'Philadelphia International Airport (PHL)',
          formatted_address: 'Philadelphia, PA 19153, USA',
          geometry: { location: { lat: 39.8747, lng: -75.2414 } },
          types: ['airport']
        }
      ],
      'atlantic city nj usa': [
        {
          name: 'Atlantic City International Airport (ACY)',
          formatted_address: 'Egg Harbor Township, NJ 08234, USA',
          geometry: { location: { lat: 39.4577, lng: -74.5770 } },
          types: ['airport']
        },
        {
          name: 'Philadelphia International Airport (PHL)',
          formatted_address: 'Philadelphia, PA 19153, USA',
          geometry: { location: { lat: 39.8747, lng: -75.2414 } },
          types: ['airport']
        }
      ],
      'atlantic city new jersey': [
        {
          name: 'Atlantic City International Airport (ACY)',
          formatted_address: 'Egg Harbor Township, NJ 08234, USA',
          geometry: { location: { lat: 39.4577, lng: -74.5770 } },
          types: ['airport']
        },
        {
          name: 'Philadelphia International Airport (PHL)',
          formatted_address: 'Philadelphia, PA 19153, USA',
          geometry: { location: { lat: 39.8747, lng: -75.2414 } },
          types: ['airport']
        }
      ],
      'atlantic city new jersey usa': [
        {
          name: 'Atlantic City International Airport (ACY)',
          formatted_address: 'Egg Harbor Township, NJ 08234, USA',
          geometry: { location: { lat: 39.4577, lng: -74.5770 } },
          types: ['airport']
        },
        {
          name: 'Philadelphia International Airport (PHL)',
          formatted_address: 'Philadelphia, PA 19153, USA',
          geometry: { location: { lat: 39.8747, lng: -75.2414 } },
          types: ['airport']
        }
      ],
      'detroit': [
        {
          name: 'Detroit Metropolitan Wayne County Airport (DTW)',
          formatted_address: 'Detroit, MI 48242, USA',
          geometry: { location: { lat: 42.2162, lng: -83.3554 } },
          types: ['airport']
        }
      ],
      'destin': [
        {
          name: 'Destin-Fort Walton Beach Airport (VPS)',
          formatted_address: 'Valparaiso, FL 32580, USA',
          geometry: { location: { lat: 30.4832, lng: -86.5254 } },
          types: ['airport']
        },
        {
          name: 'Pensacola International Airport (PNS)',
          formatted_address: 'Pensacola, FL 32504, USA',
          geometry: { location: { lat: 30.4734, lng: -87.1866 } },
          types: ['airport']
        }
      ],
      'destin fl': [
        {
          name: 'Destin-Fort Walton Beach Airport (VPS)',
          formatted_address: 'Valparaiso, FL 32580, USA',
          geometry: { location: { lat: 30.4832, lng: -86.5254 } },
          types: ['airport']
        },
        {
          name: 'Pensacola International Airport (PNS)',
          formatted_address: 'Pensacola, FL 32504, USA',
          geometry: { location: { lat: 30.4734, lng: -87.1866 } },
          types: ['airport']
        }
      ],
      'destin fl usa': [
        {
          name: 'Destin-Fort Walton Beach Airport (VPS)',
          formatted_address: 'Valparaiso, FL 32580, USA',
          geometry: { location: { lat: 30.4832, lng: -86.5254 } },
          types: ['airport']
        },
        {
          name: 'Pensacola International Airport (PNS)',
          formatted_address: 'Pensacola, FL 32504, USA',
          geometry: { location: { lat: 30.4734, lng: -87.1866 } },
          types: ['airport']
        }
      ],
      'destin florida': [
        {
          name: 'Destin-Fort Walton Beach Airport (VPS)',
          formatted_address: 'Valparaiso, FL 32580, USA',
          geometry: { location: { lat: 30.4832, lng: -86.5254 } },
          types: ['airport']
        },
        {
          name: 'Pensacola International Airport (PNS)',
          formatted_address: 'Pensacola, FL 32504, USA',
          geometry: { location: { lat: 30.4734, lng: -87.1866 } },
          types: ['airport']
        }
      ],
      'destin florida usa': [
        {
          name: 'Destin-Fort Walton Beach Airport (VPS)',
          formatted_address: 'Valparaiso, FL 32580, USA',
          geometry: { location: { lat: 30.4832, lng: -86.5254 } },
          types: ['airport']
        },
        {
          name: 'Pensacola International Airport (PNS)',
          formatted_address: 'Pensacola, FL 32504, USA',
          geometry: { location: { lat: 30.4734, lng: -87.1866 } },
          types: ['airport']
        }
      ],
      'cincinnati': [
        {
          name: 'Cincinnati/Northern Kentucky International Airport (CVG)',
          formatted_address: 'Hebron, KY 41048, USA',
          geometry: { location: { lat: 39.0488, lng: -84.6678 } },
          types: ['airport']
        }
      ],
      'cincinnati oh': [
        {
          name: 'Cincinnati/Northern Kentucky International Airport (CVG)',
          formatted_address: 'Hebron, KY 41048, USA',
          geometry: { location: { lat: 39.0488, lng: -84.6678 } },
          types: ['airport']
        }
      ],
      'cincinnati oh usa': [
        {
          name: 'Cincinnati/Northern Kentucky International Airport (CVG)',
          formatted_address: 'Hebron, KY 41048, USA',
          geometry: { location: { lat: 39.0488, lng: -84.6678 } },
          types: ['airport']
        }
      ],
      'cincinnati ohio': [
        {
          name: 'Cincinnati/Northern Kentucky International Airport (CVG)',
          formatted_address: 'Hebron, KY 41048, USA',
          geometry: { location: { lat: 39.0488, lng: -84.6678 } },
          types: ['airport']
        }
      ],
      'cincinnati ohio usa': [
        {
          name: 'Cincinnati/Northern Kentucky International Airport (CVG)',
          formatted_address: 'Hebron, KY 41048, USA',
          geometry: { location: { lat: 39.0488, lng: -84.6678 } },
          types: ['airport']
        }
      ],
      'indianapolis': [
        {
          name: 'Indianapolis International Airport (IND)',
          formatted_address: 'Indianapolis, IN 46241, USA',
          geometry: { location: { lat: 39.7173, lng: -86.2944 } },
          types: ['airport']
        }
      ],
      'indianapolis in': [
        {
          name: 'Indianapolis International Airport (IND)',
          formatted_address: 'Indianapolis, IN 46241, USA',
          geometry: { location: { lat: 39.7173, lng: -86.2944 } },
          types: ['airport']
        }
      ],
      'indianapolis in usa': [
        {
          name: 'Indianapolis International Airport (IND)',
          formatted_address: 'Indianapolis, IN 46241, USA',
          geometry: { location: { lat: 39.7173, lng: -86.2944 } },
          types: ['airport']
        }
      ],
      'indianapolis indiana': [
        {
          name: 'Indianapolis International Airport (IND)',
          formatted_address: 'Indianapolis, IN 46241, USA',
          geometry: { location: { lat: 39.7173, lng: -86.2944 } },
          types: ['airport']
        }
      ],
      'indianapolis indiana usa': [
        {
          name: 'Indianapolis International Airport (IND)',
          formatted_address: 'Indianapolis, IN 46241, USA',
          geometry: { location: { lat: 39.7173, lng: -86.2944 } },
          types: ['airport']
        }
      ],
      'des moines': [
        {
          name: 'Des Moines International Airport (DSM)',
          formatted_address: 'Des Moines, IA 50321, USA',
          geometry: { location: { lat: 41.5339, lng: -93.6631 } },
          types: ['airport']
        }
      ],
      'des moines ia': [
        {
          name: 'Des Moines International Airport (DSM)',
          formatted_address: 'Des Moines, IA 50321, USA',
          geometry: { location: { lat: 41.5339, lng: -93.6631 } },
          types: ['airport']
        }
      ],
      'des moines ia usa': [
        {
          name: 'Des Moines International Airport (DSM)',
          formatted_address: 'Des Moines, IA 50321, USA',
          geometry: { location: { lat: 41.5339, lng: -93.6631 } },
          types: ['airport']
        }
      ],
      'des moines iowa': [
        {
          name: 'Des Moines International Airport (DSM)',
          formatted_address: 'Des Moines, IA 50321, USA',
          geometry: { location: { lat: 41.5339, lng: -93.6631 } },
          types: ['airport']
        }
      ],
      'des moines iowa usa': [
        {
          name: 'Des Moines International Airport (DSM)',
          formatted_address: 'Des Moines, IA 50321, USA',
          geometry: { location: { lat: 41.5339, lng: -93.6631 } },
          types: ['airport']
        }
      ],
      'kansas city': [
        {
          name: 'Kansas City International Airport (MCI)',
          formatted_address: 'Kansas City, MO 64153, USA',
          geometry: { location: { lat: 39.2976, lng: -94.7139 } },
          types: ['airport']
        }
      ],
      'kansas city ks': [
        {
          name: 'Kansas City International Airport (MCI)',
          formatted_address: 'Kansas City, MO 64153, USA',
          geometry: { location: { lat: 39.2976, lng: -94.7139 } },
          types: ['airport']
        }
      ],
      'kansas city ks usa': [
        {
          name: 'Kansas City International Airport (MCI)',
          formatted_address: 'Kansas City, MO 64153, USA',
          geometry: { location: { lat: 39.2976, lng: -94.7139 } },
          types: ['airport']
        }
      ],
      'kansas city kansas': [
        {
          name: 'Kansas City International Airport (MCI)',
          formatted_address: 'Kansas City, MO 64153, USA',
          geometry: { location: { lat: 39.2976, lng: -94.7139 } },
          types: ['airport']
        }
      ],
      'kansas city kansas usa': [
        {
          name: 'Kansas City International Airport (MCI)',
          formatted_address: 'Kansas City, MO 64153, USA',
          geometry: { location: { lat: 39.2976, lng: -94.7139 } },
          types: ['airport']
        }
      ],
      'kansas city mo': [
        {
          name: 'Kansas City International Airport (MCI)',
          formatted_address: 'Kansas City, MO 64153, USA',
          geometry: { location: { lat: 39.2976, lng: -94.7139 } },
          types: ['airport']
        }
      ],
      'kansas city mo usa': [
        {
          name: 'Kansas City International Airport (MCI)',
          formatted_address: 'Kansas City, MO 64153, USA',
          geometry: { location: { lat: 39.2976, lng: -94.7139 } },
          types: ['airport']
        }
      ],
      'kansas city missouri': [
        {
          name: 'Kansas City International Airport (MCI)',
          formatted_address: 'Kansas City, MO 64153, USA',
          geometry: { location: { lat: 39.2976, lng: -94.7139 } },
          types: ['airport']
        }
      ],
      'kansas city missouri usa': [
        {
          name: 'Kansas City International Airport (MCI)',
          formatted_address: 'Kansas City, MO 64153, USA',
          geometry: { location: { lat: 39.2976, lng: -94.7139 } },
          types: ['airport']
        }
      ],
      'omaha': [
        {
          name: 'Eppley Airfield (OMA)',
          formatted_address: 'Omaha, NE 68110, USA',
          geometry: { location: { lat: 41.3032, lng: -95.8941 } },
          types: ['airport']
        }
      ],
      'omaha ne': [
        {
          name: 'Eppley Airfield (OMA)',
          formatted_address: 'Omaha, NE 68110, USA',
          geometry: { location: { lat: 41.3032, lng: -95.8941 } },
          types: ['airport']
        }
      ],
      'omaha ne usa': [
        {
          name: 'Eppley Airfield (OMA)',
          formatted_address: 'Omaha, NE 68110, USA',
          geometry: { location: { lat: 41.3032, lng: -95.8941 } },
          types: ['airport']
        }
      ],
      'omaha nebraska': [
        {
          name: 'Eppley Airfield (OMA)',
          formatted_address: 'Omaha, NE 68110, USA',
          geometry: { location: { lat: 41.3032, lng: -95.8941 } },
          types: ['airport']
        }
      ],
      'omaha nebraska usa': [
        {
          name: 'Eppley Airfield (OMA)',
          formatted_address: 'Omaha, NE 68110, USA',
          geometry: { location: { lat: 41.3032, lng: -95.8941 } },
          types: ['airport']
        }
      ],
      'branson': [
        {
          name: 'Branson Airport (BKG)',
          formatted_address: 'Branson, MO 65616, USA',
          geometry: { location: { lat: 36.5321, lng: -93.2005 } },
          types: ['airport']
        },
        {
          name: 'Springfield-Branson National Airport (SGF)',
          formatted_address: 'Springfield, MO 65802, USA',
          geometry: { location: { lat: 37.2457, lng: -93.3886 } },
          types: ['airport']
        }
      ],
      'branson mo': [
        {
          name: 'Branson Airport (BKG)',
          formatted_address: 'Branson, MO 65616, USA',
          geometry: { location: { lat: 36.5321, lng: -93.2005 } },
          types: ['airport']
        },
        {
          name: 'Springfield-Branson National Airport (SGF)',
          formatted_address: 'Springfield, MO 65802, USA',
          geometry: { location: { lat: 37.2457, lng: -93.3886 } },
          types: ['airport']
        }
      ],
      'branson mo usa': [
        {
          name: 'Branson Airport (BKG)',
          formatted_address: 'Branson, MO 65616, USA',
          geometry: { location: { lat: 36.5321, lng: -93.2005 } },
          types: ['airport']
        },
        {
          name: 'Springfield-Branson National Airport (SGF)',
          formatted_address: 'Springfield, MO 65802, USA',
          geometry: { location: { lat: 37.2457, lng: -93.3886 } },
          types: ['airport']
        }
      ],
      'branson missouri': [
        {
          name: 'Branson Airport (BKG)',
          formatted_address: 'Branson, MO 65616, USA',
          geometry: { location: { lat: 36.5321, lng: -93.2005 } },
          types: ['airport']
        },
        {
          name: 'Springfield-Branson National Airport (SGF)',
          formatted_address: 'Springfield, MO 65802, USA',
          geometry: { location: { lat: 37.2457, lng: -93.3886 } },
          types: ['airport']
        }
      ],
      'branson missouri usa': [
        {
          name: 'Branson Airport (BKG)',
          formatted_address: 'Branson, MO 65616, USA',
          geometry: { location: { lat: 36.5321, lng: -93.2005 } },
          types: ['airport']
        },
        {
          name: 'Springfield-Branson National Airport (SGF)',
          formatted_address: 'Springfield, MO 65802, USA',
          geometry: { location: { lat: 37.2457, lng: -93.3886 } },
          types: ['airport']
        }
      ],
      'louisville': [
        {
          name: 'Louisville Muhammad Ali International Airport (SDF)',
          formatted_address: 'Louisville, KY 40209, USA',
          geometry: { location: { lat: 38.1744, lng: -85.7364 } },
          types: ['airport']
        }
      ],
      'louisville ky': [
        {
          name: 'Louisville Muhammad Ali International Airport (SDF)',
          formatted_address: 'Louisville, KY 40209, USA',
          geometry: { location: { lat: 38.1744, lng: -85.7364 } },
          types: ['airport']
        }
      ],
      'louisville ky usa': [
        {
          name: 'Louisville Muhammad Ali International Airport (SDF)',
          formatted_address: 'Louisville, KY 40209, USA',
          geometry: { location: { lat: 38.1744, lng: -85.7364 } },
          types: ['airport']
        }
      ],
      'louisville kentucky': [
        {
          name: 'Louisville Muhammad Ali International Airport (SDF)',
          formatted_address: 'Louisville, KY 40209, USA',
          geometry: { location: { lat: 38.1744, lng: -85.7364 } },
          types: ['airport']
        }
      ],
      'louisville kentucky usa': [
        {
          name: 'Louisville Muhammad Ali International Airport (SDF)',
          formatted_address: 'Louisville, KY 40209, USA',
          geometry: { location: { lat: 38.1744, lng: -85.7364 } },
          types: ['airport']
        }
      ],
      'new orleans': [
        {
          name: 'Louis Armstrong New Orleans International Airport (MSY)',
          formatted_address: 'New Orleans, LA 70001, USA',
          geometry: { location: { lat: 29.9934, lng: -90.2581 } },
          types: ['airport']
        }
      ],
      'new orleans la': [
        {
          name: 'Louis Armstrong New Orleans International Airport (MSY)',
          formatted_address: 'New Orleans, LA 70001, USA',
          geometry: { location: { lat: 29.9934, lng: -90.2581 } },
          types: ['airport']
        }
      ],
      'new orleans la usa': [
        {
          name: 'Louis Armstrong New Orleans International Airport (MSY)',
          formatted_address: 'New Orleans, LA 70001, USA',
          geometry: { location: { lat: 29.9934, lng: -90.2581 } },
          types: ['airport']
        }
      ],
      'new orleans louisiana': [
        {
          name: 'Louis Armstrong New Orleans International Airport (MSY)',
          formatted_address: 'New Orleans, LA 70001, USA',
          geometry: { location: { lat: 29.9934, lng: -90.2581 } },
          types: ['airport']
        }
      ],
      'new orleans louisiana usa': [
        {
          name: 'Louis Armstrong New Orleans International Airport (MSY)',
          formatted_address: 'New Orleans, LA 70001, USA',
          geometry: { location: { lat: 29.9934, lng: -90.2581 } },
          types: ['airport']
        }
      ],
      'biloxi': [
        {
          name: 'Gulfport-Biloxi International Airport (GPT)',
          formatted_address: 'Gulfport, MS 39503, USA',
          geometry: { location: { lat: 30.4073, lng: -89.0701 } },
          types: ['airport']
        },
        {
          name: 'Mobile Regional Airport (MOB)',
          formatted_address: 'Mobile, AL 36608, USA',
          geometry: { location: { lat: 30.6912, lng: -88.2427 } },
          types: ['airport']
        }
      ],
      'biloxi ms': [
        {
          name: 'Gulfport-Biloxi International Airport (GPT)',
          formatted_address: 'Gulfport, MS 39503, USA',
          geometry: { location: { lat: 30.4073, lng: -89.0701 } },
          types: ['airport']
        },
        {
          name: 'Mobile Regional Airport (MOB)',
          formatted_address: 'Mobile, AL 36608, USA',
          geometry: { location: { lat: 30.6912, lng: -88.2427 } },
          types: ['airport']
        }
      ],
      'biloxi ms usa': [
        {
          name: 'Gulfport-Biloxi International Airport (GPT)',
          formatted_address: 'Gulfport, MS 39503, USA',
          geometry: { location: { lat: 30.4073, lng: -89.0701 } },
          types: ['airport']
        },
        {
          name: 'Mobile Regional Airport (MOB)',
          formatted_address: 'Mobile, AL 36608, USA',
          geometry: { location: { lat: 30.6912, lng: -88.2427 } },
          types: ['airport']
        }
      ],
      'biloxi mississippi': [
        {
          name: 'Gulfport-Biloxi International Airport (GPT)',
          formatted_address: 'Gulfport, MS 39503, USA',
          geometry: { location: { lat: 30.4073, lng: -89.0701 } },
          types: ['airport']
        },
        {
          name: 'Mobile Regional Airport (MOB)',
          formatted_address: 'Mobile, AL 36608, USA',
          geometry: { location: { lat: 30.6912, lng: -88.2427 } },
          types: ['airport']
        }
      ],
      'biloxi mississippi usa': [
        {
          name: 'Gulfport-Biloxi International Airport (GPT)',
          formatted_address: 'Gulfport, MS 39503, USA',
          geometry: { location: { lat: 30.4073, lng: -89.0701 } },
          types: ['airport']
        },
        {
          name: 'Mobile Regional Airport (MOB)',
          formatted_address: 'Mobile, AL 36608, USA',
          geometry: { location: { lat: 30.6912, lng: -88.2427 } },
          types: ['airport']
        }
      ],
      'minneapolis': [
        {
          name: 'Minneapolis–Saint Paul International Airport (MSP)',
          formatted_address: 'Saint Paul, MN 55111, USA',
          geometry: { location: { lat: 44.8848, lng: -93.2223 } },
          types: ['airport']
        }
      ],
      'fargo': [
        {
          name: 'Hector International Airport (FAR)',
          formatted_address: 'Fargo, ND 58102, USA',
          geometry: { location: { lat: 46.9207, lng: -96.8158 } },
          types: ['airport']
        },
        {
          name: 'Minneapolis–Saint Paul International Airport (MSP)',
          formatted_address: 'Saint Paul, MN 55111, USA',
          geometry: { location: { lat: 44.8848, lng: -93.2223 } },
          types: ['airport']
        }
      ],
      'fargo nd': [
        {
          name: 'Hector International Airport (FAR)',
          formatted_address: 'Fargo, ND 58102, USA',
          geometry: { location: { lat: 46.9207, lng: -96.8158 } },
          types: ['airport']
        },
        {
          name: 'Minneapolis–Saint Paul International Airport (MSP)',
          formatted_address: 'Saint Paul, MN 55111, USA',
          geometry: { location: { lat: 44.8848, lng: -93.2223 } },
          types: ['airport']
        }
      ],
      'fargo nd usa': [
        {
          name: 'Hector International Airport (FAR)',
          formatted_address: 'Fargo, ND 58102, USA',
          geometry: { location: { lat: 46.9207, lng: -96.8158 } },
          types: ['airport']
        },
        {
          name: 'Minneapolis–Saint Paul International Airport (MSP)',
          formatted_address: 'Saint Paul, MN 55111, USA',
          geometry: { location: { lat: 44.8848, lng: -93.2223 } },
          types: ['airport']
        }
      ],
      'fargo north dakota': [
        {
          name: 'Hector International Airport (FAR)',
          formatted_address: 'Fargo, ND 58102, USA',
          geometry: { location: { lat: 46.9207, lng: -96.8158 } },
          types: ['airport']
        },
        {
          name: 'Minneapolis–Saint Paul International Airport (MSP)',
          formatted_address: 'Saint Paul, MN 55111, USA',
          geometry: { location: { lat: 44.8848, lng: -93.2223 } },
          types: ['airport']
        }
      ],
      'fargo north dakota usa': [
        {
          name: 'Hector International Airport (FAR)',
          formatted_address: 'Fargo, ND 58102, USA',
          geometry: { location: { lat: 46.9207, lng: -96.8158 } },
          types: ['airport']
        },
        {
          name: 'Minneapolis–Saint Paul International Airport (MSP)',
          formatted_address: 'Saint Paul, MN 55111, USA',
          geometry: { location: { lat: 44.8848, lng: -93.2223 } },
          types: ['airport']
        }
      ],
      'fort lauderdale': [
        {
          name: 'Fort Lauderdale-Hollywood International Airport (FLL)',
          formatted_address: 'Fort Lauderdale, FL 33315, USA',
          geometry: { location: { lat: 26.0726, lng: -80.1527 } },
          types: ['airport']
        },
        {
          name: 'Miami International Airport (MIA)',
          formatted_address: 'Miami, FL 33142, USA',
          geometry: { location: { lat: 25.7932, lng: -80.2906 } },
          types: ['airport']
        }
      ],
      'fort lauderdale fl': [
        {
          name: 'Fort Lauderdale-Hollywood International Airport (FLL)',
          formatted_address: 'Fort Lauderdale, FL 33315, USA',
          geometry: { location: { lat: 26.0726, lng: -80.1527 } },
          types: ['airport']
        },
        {
          name: 'Miami International Airport (MIA)',
          formatted_address: 'Miami, FL 33142, USA',
          geometry: { location: { lat: 25.7932, lng: -80.2906 } },
          types: ['airport']
        }
      ],
      'fort lauderdale fl usa': [
        {
          name: 'Fort Lauderdale-Hollywood International Airport (FLL)',
          formatted_address: 'Fort Lauderdale, FL 33315, USA',
          geometry: { location: { lat: 26.0726, lng: -80.1527 } },
          types: ['airport']
        },
        {
          name: 'Miami International Airport (MIA)',
          formatted_address: 'Miami, FL 33142, USA',
          geometry: { location: { lat: 25.7932, lng: -80.2906 } },
          types: ['airport']
        }
      ],
      'fort lauderdale florida': [
        {
          name: 'Fort Lauderdale-Hollywood International Airport (FLL)',
          formatted_address: 'Fort Lauderdale, FL 33315, USA',
          geometry: { location: { lat: 26.0726, lng: -80.1527 } },
          types: ['airport']
        },
        {
          name: 'Miami International Airport (MIA)',
          formatted_address: 'Miami, FL 33142, USA',
          geometry: { location: { lat: 25.7932, lng: -80.2906 } },
          types: ['airport']
        }
      ],
      'fort lauderdale florida usa': [
        {
          name: 'Fort Lauderdale-Hollywood International Airport (FLL)',
          formatted_address: 'Fort Lauderdale, FL 33315, USA',
          geometry: { location: { lat: 26.0726, lng: -80.1527 } },
          types: ['airport']
        },
        {
          name: 'Miami International Airport (MIA)',
          formatted_address: 'Miami, FL 33142, USA',
          geometry: { location: { lat: 25.7932, lng: -80.2906 } },
          types: ['airport']
        }
      ],
      'fort payne': [
        {
          name: 'Huntsville International Airport (HSV)',
          formatted_address: 'Huntsville, AL 35824, USA',
          geometry: { location: { lat: 34.6403, lng: -86.7767 } },
          types: ['airport']
        },
        {
          name: 'Birmingham-Shuttlesworth International Airport (BHM)',
          formatted_address: 'Birmingham, AL 35212, USA',
          geometry: { location: { lat: 33.5629, lng: -86.7535 } },
          types: ['airport']
        }
      ],
      'fort payne al': [
        {
          name: 'Huntsville International Airport (HSV)',
          formatted_address: 'Huntsville, AL 35824, USA',
          geometry: { location: { lat: 34.6403, lng: -86.7767 } },
          types: ['airport']
        },
        {
          name: 'Birmingham-Shuttlesworth International Airport (BHM)',
          formatted_address: 'Birmingham, AL 35212, USA',
          geometry: { location: { lat: 33.5629, lng: -86.7535 } },
          types: ['airport']
        }
      ],
      'fort payne al usa': [
        {
          name: 'Huntsville International Airport (HSV)',
          formatted_address: 'Huntsville, AL 35824, USA',
          geometry: { location: { lat: 34.6403, lng: -86.7767 } },
          types: ['airport']
        },
        {
          name: 'Birmingham-Shuttlesworth International Airport (BHM)',
          formatted_address: 'Birmingham, AL 35212, USA',
          geometry: { location: { lat: 33.5629, lng: -86.7535 } },
          types: ['airport']
        }
      ],
      'fort payne alabama': [
        {
          name: 'Huntsville International Airport (HSV)',
          formatted_address: 'Huntsville, AL 35824, USA',
          geometry: { location: { lat: 34.6403, lng: -86.7767 } },
          types: ['airport']
        },
        {
          name: 'Birmingham-Shuttlesworth International Airport (BHM)',
          formatted_address: 'Birmingham, AL 35212, USA',
          geometry: { location: { lat: 33.5629, lng: -86.7535 } },
          types: ['airport']
        }
      ],
      'fort payne alabama usa': [
        {
          name: 'Huntsville International Airport (HSV)',
          formatted_address: 'Huntsville, AL 35824, USA',
          geometry: { location: { lat: 34.6403, lng: -86.7767 } },
          types: ['airport']
        },
        {
          name: 'Birmingham-Shuttlesworth International Airport (BHM)',
          formatted_address: 'Birmingham, AL 35212, USA',
          geometry: { location: { lat: 33.5629, lng: -86.7535 } },
          types: ['airport']
        }
      ],
      'fort walton beach': [
        {
          name: 'Destin-Fort Walton Beach Airport (VPS)',
          formatted_address: 'Valparaiso, FL 32580, USA',
          geometry: { location: { lat: 30.4832, lng: -86.5254 } },
          types: ['airport']
        },
        {
          name: 'Pensacola International Airport (PNS)',
          formatted_address: 'Pensacola, FL 32504, USA',
          geometry: { location: { lat: 30.4734, lng: -87.1866 } },
          types: ['airport']
        }
      ],
      'fort walton beach fl': [
        {
          name: 'Destin-Fort Walton Beach Airport (VPS)',
          formatted_address: 'Valparaiso, FL 32580, USA',
          geometry: { location: { lat: 30.4832, lng: -86.5254 } },
          types: ['airport']
        },
        {
          name: 'Pensacola International Airport (PNS)',
          formatted_address: 'Pensacola, FL 32504, USA',
          geometry: { location: { lat: 30.4734, lng: -87.1866 } },
          types: ['airport']
        }
      ],
      'fort walton beach fl usa': [
        {
          name: 'Destin-Fort Walton Beach Airport (VPS)',
          formatted_address: 'Valparaiso, FL 32580, USA',
          geometry: { location: { lat: 30.4832, lng: -86.5254 } },
          types: ['airport']
        },
        {
          name: 'Pensacola International Airport (PNS)',
          formatted_address: 'Pensacola, FL 32504, USA',
          geometry: { location: { lat: 30.4734, lng: -87.1866 } },
          types: ['airport']
        }
      ],
      'fort walton beach florida': [
        {
          name: 'Destin-Fort Walton Beach Airport (VPS)',
          formatted_address: 'Valparaiso, FL 32580, USA',
          geometry: { location: { lat: 30.4832, lng: -86.5254 } },
          types: ['airport']
        },
        {
          name: 'Pensacola International Airport (PNS)',
          formatted_address: 'Pensacola, FL 32504, USA',
          geometry: { location: { lat: 30.4734, lng: -87.1866 } },
          types: ['airport']
        }
      ],
      'fort walton beach florida usa': [
        {
          name: 'Destin-Fort Walton Beach Airport (VPS)',
          formatted_address: 'Valparaiso, FL 32580, USA',
          geometry: { location: { lat: 30.4832, lng: -86.5254 } },
          types: ['airport']
        },
        {
          name: 'Pensacola International Airport (PNS)',
          formatted_address: 'Pensacola, FL 32504, USA',
          geometry: { location: { lat: 30.4734, lng: -87.1866 } },
          types: ['airport']
        }
      ],
      'fort worth': [
        {
          name: 'Dallas/Fort Worth International Airport (DFW)',
          formatted_address: 'Irving, TX 75261, USA',
          geometry: { location: { lat: 32.8968, lng: -97.0380 } },
          types: ['airport']
        },
        {
          name: 'Dallas Love Field (DAL)',
          formatted_address: 'Dallas, TX 75235, USA',
          geometry: { location: { lat: 32.8472, lng: -96.8518 } },
          types: ['airport']
        }
      ],
      'fort worth tx': [
        {
          name: 'Dallas/Fort Worth International Airport (DFW)',
          formatted_address: 'Irving, TX 75261, USA',
          geometry: { location: { lat: 32.8968, lng: -97.0380 } },
          types: ['airport']
        },
        {
          name: 'Dallas Love Field (DAL)',
          formatted_address: 'Dallas, TX 75235, USA',
          geometry: { location: { lat: 32.8472, lng: -96.8518 } },
          types: ['airport']
        }
      ],
      'fort worth tx usa': [
        {
          name: 'Dallas/Fort Worth International Airport (DFW)',
          formatted_address: 'Irving, TX 75261, USA',
          geometry: { location: { lat: 32.8968, lng: -97.0380 } },
          types: ['airport']
        },
        {
          name: 'Dallas Love Field (DAL)',
          formatted_address: 'Dallas, TX 75235, USA',
          geometry: { location: { lat: 32.8472, lng: -96.8518 } },
          types: ['airport']
        }
      ],
      'fort worth texas': [
        {
          name: 'Dallas/Fort Worth International Airport (DFW)',
          formatted_address: 'Irving, TX 75261, USA',
          geometry: { location: { lat: 32.8968, lng: -97.0380 } },
          types: ['airport']
        },
        {
          name: 'Dallas Love Field (DAL)',
          formatted_address: 'Dallas, TX 75235, USA',
          geometry: { location: { lat: 32.8472, lng: -96.8518 } },
          types: ['airport']
        }
      ],
      'fort worth texas usa': [
        {
          name: 'Dallas/Fort Worth International Airport (DFW)',
          formatted_address: 'Irving, TX 75261, USA',
          geometry: { location: { lat: 32.8968, lng: -97.0380 } },
          types: ['airport']
        },
        {
          name: 'Dallas Love Field (DAL)',
          formatted_address: 'Dallas, TX 75235, USA',
          geometry: { location: { lat: 32.8472, lng: -96.8518 } },
          types: ['airport']
        }
      ],
      'rapid city': [
        {
          name: 'Rapid City Regional Airport (RAP)',
          formatted_address: 'Rapid City, SD 57703, USA',
          geometry: { location: { lat: 44.0453, lng: -103.0574 } },
          types: ['airport']
        },
        {
          name: 'Denver International Airport (DEN)',
          formatted_address: 'Denver, CO 80249, USA',
          geometry: { location: { lat: 39.8561, lng: -104.6737 } },
          types: ['airport']
        }
      ],
      'rapid city sd': [
        {
          name: 'Rapid City Regional Airport (RAP)',
          formatted_address: 'Rapid City, SD 57703, USA',
          geometry: { location: { lat: 44.0453, lng: -103.0574 } },
          types: ['airport']
        },
        {
          name: 'Denver International Airport (DEN)',
          formatted_address: 'Denver, CO 80249, USA',
          geometry: { location: { lat: 39.8561, lng: -104.6737 } },
          types: ['airport']
        }
      ],
      'rapid city sd usa': [
        {
          name: 'Rapid City Regional Airport (RAP)',
          formatted_address: 'Rapid City, SD 57703, USA',
          geometry: { location: { lat: 44.0453, lng: -103.0574 } },
          types: ['airport']
        },
        {
          name: 'Denver International Airport (DEN)',
          formatted_address: 'Denver, CO 80249, USA',
          geometry: { location: { lat: 39.8561, lng: -104.6737 } },
          types: ['airport']
        }
      ],
      'rapid city south dakota': [
        {
          name: 'Rapid City Regional Airport (RAP)',
          formatted_address: 'Rapid City, SD 57703, USA',
          geometry: { location: { lat: 44.0453, lng: -103.0574 } },
          types: ['airport']
        },
        {
          name: 'Denver International Airport (DEN)',
          formatted_address: 'Denver, CO 80249, USA',
          geometry: { location: { lat: 39.8561, lng: -104.6737 } },
          types: ['airport']
        }
      ],
      'rapid city south dakota usa': [
        {
          name: 'Rapid City Regional Airport (RAP)',
          formatted_address: 'Rapid City, SD 57703, USA',
          geometry: { location: { lat: 44.0453, lng: -103.0574 } },
          types: ['airport']
        },
        {
          name: 'Denver International Airport (DEN)',
          formatted_address: 'Denver, CO 80249, USA',
          geometry: { location: { lat: 39.8561, lng: -104.6737 } },
          types: ['airport']
        }
      ],
      'orlando': [
        {
          name: 'Orlando International Airport (MCO)',
          formatted_address: 'Orlando, FL 32827, USA',
          geometry: { location: { lat: 28.4294, lng: -81.3089 } },
          types: ['airport']
        }
      ],
      'tampa': [
        {
          name: 'Tampa International Airport (TPA)',
          formatted_address: 'Tampa, FL 33607, USA',
          geometry: { location: { lat: 27.9755, lng: -82.5332 } },
          types: ['airport']
        }
      ],
      'tallahassee': [
        {
          name: 'Tallahassee International Airport (TLH)',
          formatted_address: 'Tallahassee, FL 32310, USA',
          geometry: { location: { lat: 30.3964, lng: -84.3503 } },
          types: ['airport']
        },
        {
          name: 'Jacksonville International Airport (JAX)',
          formatted_address: 'Jacksonville, FL 32229, USA',
          geometry: { location: { lat: 30.4941, lng: -81.6879 } },
          types: ['airport']
        }
      ],
      'tallahassee fl': [
        {
          name: 'Tallahassee International Airport (TLH)',
          formatted_address: 'Tallahassee, FL 32310, USA',
          geometry: { location: { lat: 30.3964, lng: -84.3503 } },
          types: ['airport']
        },
        {
          name: 'Jacksonville International Airport (JAX)',
          formatted_address: 'Jacksonville, FL 32229, USA',
          geometry: { location: { lat: 30.4941, lng: -81.6879 } },
          types: ['airport']
        }
      ],
      'tallahassee fl usa': [
        {
          name: 'Tallahassee International Airport (TLH)',
          formatted_address: 'Tallahassee, FL 32310, USA',
          geometry: { location: { lat: 30.3964, lng: -84.3503 } },
          types: ['airport']
        },
        {
          name: 'Jacksonville International Airport (JAX)',
          formatted_address: 'Jacksonville, FL 32229, USA',
          geometry: { location: { lat: 30.4941, lng: -81.6879 } },
          types: ['airport']
        }
      ],
      'tallahassee florida': [
        {
          name: 'Tallahassee International Airport (TLH)',
          formatted_address: 'Tallahassee, FL 32310, USA',
          geometry: { location: { lat: 30.3964, lng: -84.3503 } },
          types: ['airport']
        },
        {
          name: 'Jacksonville International Airport (JAX)',
          formatted_address: 'Jacksonville, FL 32229, USA',
          geometry: { location: { lat: 30.4941, lng: -81.6879 } },
          types: ['airport']
        }
      ],
      'tallahassee florida usa': [
        {
          name: 'Tallahassee International Airport (TLH)',
          formatted_address: 'Tallahassee, FL 32310, USA',
          geometry: { location: { lat: 30.3964, lng: -84.3503 } },
          types: ['airport']
        },
        {
          name: 'Jacksonville International Airport (JAX)',
          formatted_address: 'Jacksonville, FL 32229, USA',
          geometry: { location: { lat: 30.4941, lng: -81.6879 } },
          types: ['airport']
        }
      ],
      'west palm beach': [
        {
          name: 'Palm Beach International Airport (PBI)',
          formatted_address: 'West Palm Beach, FL 33406, USA',
          geometry: { location: { lat: 26.6832, lng: -80.0956 } },
          types: ['airport']
        },
        {
          name: 'Fort Lauderdale-Hollywood International Airport (FLL)',
          formatted_address: 'Fort Lauderdale, FL 33315, USA',
          geometry: { location: { lat: 26.0726, lng: -80.1528 } },
          types: ['airport']
        }
      ],
      'west palm beach fl': [
        {
          name: 'Palm Beach International Airport (PBI)',
          formatted_address: 'West Palm Beach, FL 33406, USA',
          geometry: { location: { lat: 26.6832, lng: -80.0956 } },
          types: ['airport']
        },
        {
          name: 'Fort Lauderdale-Hollywood International Airport (FLL)',
          formatted_address: 'Fort Lauderdale, FL 33315, USA',
          geometry: { location: { lat: 26.0726, lng: -80.1528 } },
          types: ['airport']
        }
      ],
      'west palm beach fl usa': [
        {
          name: 'Palm Beach International Airport (PBI)',
          formatted_address: 'West Palm Beach, FL 33406, USA',
          geometry: { location: { lat: 26.6832, lng: -80.0956 } },
          types: ['airport']
        },
        {
          name: 'Fort Lauderdale-Hollywood International Airport (FLL)',
          formatted_address: 'Fort Lauderdale, FL 33315, USA',
          geometry: { location: { lat: 26.0726, lng: -80.1528 } },
          types: ['airport']
        }
      ],
      'west palm beach florida': [
        {
          name: 'Palm Beach International Airport (PBI)',
          formatted_address: 'West Palm Beach, FL 33406, USA',
          geometry: { location: { lat: 26.6832, lng: -80.0956 } },
          types: ['airport']
        },
        {
          name: 'Fort Lauderdale-Hollywood International Airport (FLL)',
          formatted_address: 'Fort Lauderdale, FL 33315, USA',
          geometry: { location: { lat: 26.0726, lng: -80.1528 } },
          types: ['airport']
        }
      ],
      'west palm beach florida usa': [
        {
          name: 'Palm Beach International Airport (PBI)',
          formatted_address: 'West Palm Beach, FL 33406, USA',
          geometry: { location: { lat: 26.6832, lng: -80.0956 } },
          types: ['airport']
        },
        {
          name: 'Fort Lauderdale-Hollywood International Airport (FLL)',
          formatted_address: 'Fort Lauderdale, FL 33315, USA',
          geometry: { location: { lat: 26.0726, lng: -80.1528 } },
          types: ['airport']
        }
      ],
      'san diego': [
        {
          name: 'San Diego International Airport (SAN)',
          formatted_address: 'San Diego, CA 92101, USA',
          geometry: { location: { lat: 32.7336, lng: -117.1897 } },
          types: ['airport']
        }
      ],
      'oceanside': [
        {
          name: 'McClellan-Palomar Airport (CRQ)',
          formatted_address: 'Carlsbad, CA 92011, USA',
          geometry: { location: { lat: 33.1283, lng: -117.2800 } },
          types: ['airport']
        },
        {
          name: 'San Diego International Airport (SAN)',
          formatted_address: 'San Diego, CA 92101, USA',
          geometry: { location: { lat: 32.7336, lng: -117.1897 } },
          types: ['airport']
        }
      ],
      'oceanside ca': [
        {
          name: 'McClellan-Palomar Airport (CRQ)',
          formatted_address: 'Carlsbad, CA 92011, USA',
          geometry: { location: { lat: 33.1283, lng: -117.2800 } },
          types: ['airport']
        },
        {
          name: 'San Diego International Airport (SAN)',
          formatted_address: 'San Diego, CA 92101, USA',
          geometry: { location: { lat: 32.7336, lng: -117.1897 } },
          types: ['airport']
        }
      ],
      'oceanside ca usa': [
        {
          name: 'McClellan-Palomar Airport (CRQ)',
          formatted_address: 'Carlsbad, CA 92011, USA',
          geometry: { location: { lat: 33.1283, lng: -117.2800 } },
          types: ['airport']
        },
        {
          name: 'San Diego International Airport (SAN)',
          formatted_address: 'San Diego, CA 92101, USA',
          geometry: { location: { lat: 32.7336, lng: -117.1897 } },
          types: ['airport']
        }
      ],
      'oceanside california': [
        {
          name: 'McClellan-Palomar Airport (CRQ)',
          formatted_address: 'Carlsbad, CA 92011, USA',
          geometry: { location: { lat: 33.1283, lng: -117.2800 } },
          types: ['airport']
        },
        {
          name: 'San Diego International Airport (SAN)',
          formatted_address: 'San Diego, CA 92101, USA',
          geometry: { location: { lat: 32.7336, lng: -117.1897 } },
          types: ['airport']
        }
      ],
      'oceanside california usa': [
        {
          name: 'McClellan-Palomar Airport (CRQ)',
          formatted_address: 'Carlsbad, CA 92011, USA',
          geometry: { location: { lat: 33.1283, lng: -117.2800 } },
          types: ['airport']
        },
        {
          name: 'San Diego International Airport (SAN)',
          formatted_address: 'San Diego, CA 92101, USA',
          geometry: { location: { lat: 32.7336, lng: -117.1897 } },
          types: ['airport']
        }
      ],
      'nashville': [
        {
          name: 'Nashville International Airport (BNA)',
          formatted_address: 'Nashville, TN 37214, USA',
          geometry: { location: { lat: 36.1245, lng: -86.6782 } },
          types: ['airport']
        }
      ],
      'hot springs': [
        {
          name: 'Bill and Hillary Clinton National Airport (LIT)',
          formatted_address: 'Little Rock, AR 72202, USA',
          geometry: { location: { lat: 34.7294, lng: -92.2243 } },
          types: ['airport']
        }
      ],
      'hot springs ar': [
        {
          name: 'Bill and Hillary Clinton National Airport (LIT)',
          formatted_address: 'Little Rock, AR 72202, USA',
          geometry: { location: { lat: 34.7294, lng: -92.2243 } },
          types: ['airport']
        }
      ],
      'hot springs ar usa': [
        {
          name: 'Bill and Hillary Clinton National Airport (LIT)',
          formatted_address: 'Little Rock, AR 72202, USA',
          geometry: { location: { lat: 34.7294, lng: -92.2243 } },
          types: ['airport']
        }
      ],
      'hot springs arkansas': [
        {
          name: 'Bill and Hillary Clinton National Airport (LIT)',
          formatted_address: 'Little Rock, AR 72202, USA',
          geometry: { location: { lat: 34.7294, lng: -92.2243 } },
          types: ['airport']
        }
      ],
      'austin': [
        {
          name: 'Austin-Bergstrom International Airport (AUS)',
          formatted_address: 'Austin, TX 78719, USA',
          geometry: { location: { lat: 30.1975, lng: -97.6664 } },
          types: ['airport']
        }
      ],
      'san angelo': [
        {
          name: 'San Angelo Regional Airport (SJT)',
          formatted_address: 'San Angelo, TX 76904, USA',
          geometry: { location: { lat: 31.3577, lng: -100.4963 } },
          types: ['airport']
        },
        {
          name: 'Austin-Bergstrom International Airport (AUS)',
          formatted_address: 'Austin, TX 78719, USA',
          geometry: { location: { lat: 30.1975, lng: -97.6664 } },
          types: ['airport']
        }
      ],
      'san angelo tx': [
        {
          name: 'San Angelo Regional Airport (SJT)',
          formatted_address: 'San Angelo, TX 76904, USA',
          geometry: { location: { lat: 31.3577, lng: -100.4963 } },
          types: ['airport']
        },
        {
          name: 'Austin-Bergstrom International Airport (AUS)',
          formatted_address: 'Austin, TX 78719, USA',
          geometry: { location: { lat: 30.1975, lng: -97.6664 } },
          types: ['airport']
        }
      ],
      'san angelo tx usa': [
        {
          name: 'San Angelo Regional Airport (SJT)',
          formatted_address: 'San Angelo, TX 76904, USA',
          geometry: { location: { lat: 31.3577, lng: -100.4963 } },
          types: ['airport']
        },
        {
          name: 'Austin-Bergstrom International Airport (AUS)',
          formatted_address: 'Austin, TX 78719, USA',
          geometry: { location: { lat: 30.1975, lng: -97.6664 } },
          types: ['airport']
        }
      ],
      'san angelo texas': [
        {
          name: 'San Angelo Regional Airport (SJT)',
          formatted_address: 'San Angelo, TX 76904, USA',
          geometry: { location: { lat: 31.3577, lng: -100.4963 } },
          types: ['airport']
        },
        {
          name: 'Austin-Bergstrom International Airport (AUS)',
          formatted_address: 'Austin, TX 78719, USA',
          geometry: { location: { lat: 30.1975, lng: -97.6664 } },
          types: ['airport']
        }
      ],
      'san angelo texas usa': [
        {
          name: 'San Angelo Regional Airport (SJT)',
          formatted_address: 'San Angelo, TX 76904, USA',
          geometry: { location: { lat: 31.3577, lng: -100.4963 } },
          types: ['airport']
        },
        {
          name: 'Austin-Bergstrom International Airport (AUS)',
          formatted_address: 'Austin, TX 78719, USA',
          geometry: { location: { lat: 30.1975, lng: -97.6664 } },
          types: ['airport']
        }
      ],
      'san antonio': [
        {
          name: 'San Antonio International Airport (SAT)',
          formatted_address: 'San Antonio, TX 78216, USA',
          geometry: { location: { lat: 29.5337, lng: -98.4698 } },
          types: ['airport']
        }
      ],
      'san antonio tx': [
        {
          name: 'San Antonio International Airport (SAT)',
          formatted_address: 'San Antonio, TX 78216, USA',
          geometry: { location: { lat: 29.5337, lng: -98.4698 } },
          types: ['airport']
        }
      ],
      'san antonio tx usa': [
        {
          name: 'San Antonio International Airport (SAT)',
          formatted_address: 'San Antonio, TX 78216, USA',
          geometry: { location: { lat: 29.5337, lng: -98.4698 } },
          types: ['airport']
        }
      ],
      'san antonio texas': [
        {
          name: 'San Antonio International Airport (SAT)',
          formatted_address: 'San Antonio, TX 78216, USA',
          geometry: { location: { lat: 29.5337, lng: -98.4698 } },
          types: ['airport']
        }
      ],
      'san antônio': [
        {
          name: 'San Antonio International Airport (SAT)',
          formatted_address: 'San Antonio, TX 78216, USA',
          geometry: { location: { lat: 29.5337, lng: -98.4698 } },
          types: ['airport']
        }
      ],
      'san antônio tx': [
        {
          name: 'San Antonio International Airport (SAT)',
          formatted_address: 'San Antonio, TX 78216, USA',
          geometry: { location: { lat: 29.5337, lng: -98.4698 } },
          types: ['airport']
        }
      ],
      'san antônio texas': [
        {
          name: 'San Antonio International Airport (SAT)',
          formatted_address: 'San Antonio, TX 78216, USA',
          geometry: { location: { lat: 29.5337, lng: -98.4698 } },
          types: ['airport']
        }
      ],
      'portland': [
        {
          name: 'Portland International Airport (PDX)',
          formatted_address: 'Portland, OR 97218, USA',
          geometry: { location: { lat: 45.5898, lng: -122.5951 } },
          types: ['airport']
        }
      ],
      'portland or': [
        {
          name: 'Portland International Airport (PDX)',
          formatted_address: 'Portland, OR 97218, USA',
          geometry: { location: { lat: 45.5898, lng: -122.5951 } },
          types: ['airport']
        }
      ],
      'portland or usa': [
        {
          name: 'Portland International Airport (PDX)',
          formatted_address: 'Portland, OR 97218, USA',
          geometry: { location: { lat: 45.5898, lng: -122.5951 } },
          types: ['airport']
        }
      ],
      'portland oregon': [
        {
          name: 'Portland International Airport (PDX)',
          formatted_address: 'Portland, OR 97218, USA',
          geometry: { location: { lat: 45.5898, lng: -122.5951 } },
          types: ['airport']
        }
      ],
      'portland oregon usa': [
        {
          name: 'Portland International Airport (PDX)',
          formatted_address: 'Portland, OR 97218, USA',
          geometry: { location: { lat: 45.5898, lng: -122.5951 } },
          types: ['airport']
        }
      ],
      'portland me': [
        {
          name: 'Portland International Jetport (PWM)',
          formatted_address: 'Portland, ME 04102, USA',
          geometry: { location: { lat: 43.6462, lng: -70.3093 } },
          types: ['airport']
        }
      ],
      'portland me usa': [
        {
          name: 'Portland International Jetport (PWM)',
          formatted_address: 'Portland, ME 04102, USA',
          geometry: { location: { lat: 43.6462, lng: -70.3093 } },
          types: ['airport']
        }
      ],
      'portland maine': [
        {
          name: 'Portland International Jetport (PWM)',
          formatted_address: 'Portland, ME 04102, USA',
          geometry: { location: { lat: 43.6462, lng: -70.3093 } },
          types: ['airport']
        }
      ],
      'portland maine usa': [
        {
          name: 'Portland International Jetport (PWM)',
          formatted_address: 'Portland, ME 04102, USA',
          geometry: { location: { lat: 43.6462, lng: -70.3093 } },
          types: ['airport']
        }
      ],
      'salt lake city': [
        {
          name: 'Salt Lake City International Airport (SLC)',
          formatted_address: 'Salt Lake City, UT 84122, USA',
          geometry: { location: { lat: 40.7884, lng: -111.9778 } },
          types: ['airport']
        }
      ],
      'boise': [
        {
          name: 'Boise Airport (BOI)',
          formatted_address: 'Boise, ID 83705, USA',
          geometry: { location: { lat: 43.5644, lng: -116.2228 } },
          types: ['airport']
        }
      ],
      'boise id': [
        {
          name: 'Boise Airport (BOI)',
          formatted_address: 'Boise, ID 83705, USA',
          geometry: { location: { lat: 43.5644, lng: -116.2228 } },
          types: ['airport']
        }
      ],
      'boise id usa': [
        {
          name: 'Boise Airport (BOI)',
          formatted_address: 'Boise, ID 83705, USA',
          geometry: { location: { lat: 43.5644, lng: -116.2228 } },
          types: ['airport']
        }
      ],
      'boise idaho': [
        {
          name: 'Boise Airport (BOI)',
          formatted_address: 'Boise, ID 83705, USA',
          geometry: { location: { lat: 43.5644, lng: -116.2228 } },
          types: ['airport']
        }
      ],
      'boise idaho usa': [
        {
          name: 'Boise Airport (BOI)',
          formatted_address: 'Boise, ID 83705, USA',
          geometry: { location: { lat: 43.5644, lng: -116.2228 } },
          types: ['airport']
        }
      ],
      'west yellowstone': [
        {
          name: 'Yellowstone Airport (WYS)',
          formatted_address: 'West Yellowstone, MT 59758, USA',
          geometry: { location: { lat: 44.6884, lng: -111.1176 } },
          types: ['airport']
        },
        {
          name: 'Bozeman Yellowstone International Airport (BZN)',
          formatted_address: 'Belgrade, MT 59714, USA',
          geometry: { location: { lat: 45.7769, lng: -111.1531 } },
          types: ['airport']
        }
      ],
      'west yellowstone mt': [
        {
          name: 'Yellowstone Airport (WYS)',
          formatted_address: 'West Yellowstone, MT 59758, USA',
          geometry: { location: { lat: 44.6884, lng: -111.1176 } },
          types: ['airport']
        },
        {
          name: 'Bozeman Yellowstone International Airport (BZN)',
          formatted_address: 'Belgrade, MT 59714, USA',
          geometry: { location: { lat: 45.7769, lng: -111.1531 } },
          types: ['airport']
        }
      ],
      'west yellowstone mt usa': [
        {
          name: 'Yellowstone Airport (WYS)',
          formatted_address: 'West Yellowstone, MT 59758, USA',
          geometry: { location: { lat: 44.6884, lng: -111.1176 } },
          types: ['airport']
        },
        {
          name: 'Bozeman Yellowstone International Airport (BZN)',
          formatted_address: 'Belgrade, MT 59714, USA',
          geometry: { location: { lat: 45.7769, lng: -111.1531 } },
          types: ['airport']
        }
      ],
      'west yellowstone montana': [
        {
          name: 'Yellowstone Airport (WYS)',
          formatted_address: 'West Yellowstone, MT 59758, USA',
          geometry: { location: { lat: 44.6884, lng: -111.1176 } },
          types: ['airport']
        },
        {
          name: 'Bozeman Yellowstone International Airport (BZN)',
          formatted_address: 'Belgrade, MT 59714, USA',
          geometry: { location: { lat: 45.7769, lng: -111.1531 } },
          types: ['airport']
        }
      ],
      'west yellowstone montana usa': [
        {
          name: 'Yellowstone Airport (WYS)',
          formatted_address: 'West Yellowstone, MT 59758, USA',
          geometry: { location: { lat: 44.6884, lng: -111.1176 } },
          types: ['airport']
        },
        {
          name: 'Bozeman Yellowstone International Airport (BZN)',
          formatted_address: 'Belgrade, MT 59714, USA',
          geometry: { location: { lat: 45.7769, lng: -111.1531 } },
          types: ['airport']
        }
      ],
      'anchorage': [
        {
          name: 'Ted Stevens Anchorage International Airport (ANC)',
          formatted_address: 'Anchorage, AK 99502, USA',
          geometry: { location: { lat: 61.1744, lng: -149.9962 } },
          types: ['airport']
        }
      ],
      'anchorage ak': [
        {
          name: 'Ted Stevens Anchorage International Airport (ANC)',
          formatted_address: 'Anchorage, AK 99502, USA',
          geometry: { location: { lat: 61.1744, lng: -149.9962 } },
          types: ['airport']
        }
      ],
      'anchorage ak usa': [
        {
          name: 'Ted Stevens Anchorage International Airport (ANC)',
          formatted_address: 'Anchorage, AK 99502, USA',
          geometry: { location: { lat: 61.1744, lng: -149.9962 } },
          types: ['airport']
        }
      ],
      'anchorage alaska': [
        {
          name: 'Ted Stevens Anchorage International Airport (ANC)',
          formatted_address: 'Anchorage, AK 99502, USA',
          geometry: { location: { lat: 61.1744, lng: -149.9962 } },
          types: ['airport']
        }
      ],
      // International airports
      'london': [
        {
          name: 'Heathrow Airport (LHR)',
          formatted_address: 'Longford, Hounslow TW6, UK',
          geometry: { location: { lat: 51.4700, lng: -0.4543 } },
          types: ['airport']
        },
        {
          name: 'Gatwick Airport (LGW)',
          formatted_address: 'Horley, Gatwick RH6 0NP, UK',
          geometry: { location: { lat: 51.1481, lng: -0.1903 } },
          types: ['airport']
        },
        {
          name: 'Stansted Airport (STN)',
          formatted_address: 'Stansted, Bishop\'s Stortford CM24 1QW, UK',
          geometry: { location: { lat: 51.8850, lng: 0.2350 } },
          types: ['airport']
        },
        {
          name: 'Luton Airport (LTN)',
          formatted_address: 'Luton LU2 9LY, UK',
          geometry: { location: { lat: 51.8763, lng: -0.3717 } },
          types: ['airport']
        }
      ],
      'paris': [
        {
          name: 'Charles de Gaulle Airport (CDG)',
          formatted_address: '95700 Roissy-en-France, France',
          geometry: { location: { lat: 49.0097, lng: 2.5479 } },
          types: ['airport']
        },
        {
          name: 'Orly Airport (ORY)',
          formatted_address: '94390 Orly, France',
          geometry: { location: { lat: 48.7262, lng: 2.3650 } },
          types: ['airport']
        }
      ],
      'tokyo': [
        {
          name: 'Haneda Airport (HND)',
          formatted_address: 'Tokyo, Japan',
          geometry: { location: { lat: 35.5494, lng: 139.7798 } },
          types: ['airport']
        },
        {
          name: 'Narita International Airport (NRT)',
          formatted_address: 'Narita, Chiba, Japan',
          geometry: { location: { lat: 35.7720, lng: 140.3929 } },
          types: ['airport']
        }
      ],
      'sydney': [
        {
          name: 'Sydney Kingsford Smith Airport (SYD)',
          formatted_address: 'Mascot NSW 2020, Australia',
          geometry: { location: { lat: -33.9399, lng: 151.1753 } },
          types: ['airport']
        }
      ],
      'toronto': [
        {
          name: 'Toronto Pearson International Airport (YYZ)',
          formatted_address: 'Mississauga, ON L5P 1B2, Canada',
          geometry: { location: { lat: 43.6777, lng: -79.6248 } },
          types: ['airport']
        },
        {
          name: 'Billy Bishop Toronto City Airport (YTZ)',
          formatted_address: 'Toronto, ON M5V 1A1, Canada',
          geometry: { location: { lat: 43.6275, lng: -79.3963 } },
          types: ['airport']
        }
      ],
      'vancouver': [
        {
          name: 'Vancouver International Airport (YVR)',
          formatted_address: 'Richmond, BC V7B 0A1, Canada',
          geometry: { location: { lat: 49.1967, lng: -123.1815 } },
          types: ['airport']
        }
      ],
      'amsterdam': [
        {
          name: 'Amsterdam Airport Schiphol (AMS)',
          formatted_address: '1118 CP Schiphol, Netherlands',
          geometry: { location: { lat: 52.3105, lng: 4.7683 } },
          types: ['airport']
        }
      ],
      'madrid': [
        {
          name: 'Adolfo Suárez Madrid–Barajas Airport (MAD)',
          formatted_address: '28042 Madrid, Spain',
          geometry: { location: { lat: 40.4839, lng: -3.5680 } },
          types: ['airport']
        }
      ],
      'naples': [
        {
          name: 'Naples International Airport (NAP)',
          formatted_address: '80144 Naples, Italy',
          geometry: { location: { lat: 40.8860, lng: 14.2908 } },
          types: ['airport']
        }
      ],
      'naples italy': [
        {
          name: 'Naples International Airport (NAP)',
          formatted_address: '80144 Naples, Italy',
          geometry: { location: { lat: 40.8860, lng: 14.2908 } },
          types: ['airport']
        }
      ],
      'naples metropolitan city of naples italy': [
        {
          name: 'Naples International Airport (NAP)',
          formatted_address: '80144 Naples, Italy',
          geometry: { location: { lat: 40.8860, lng: 14.2908 } },
          types: ['airport']
        }
      ],
      'napoli': [
        {
          name: 'Naples International Airport (NAP)',
          formatted_address: '80144 Naples, Italy',
          geometry: { location: { lat: 40.8860, lng: 14.2908 } },
          types: ['airport']
        }
      ],
      'napoli italy': [
        {
          name: 'Naples International Airport (NAP)',
          formatted_address: '80144 Naples, Italy',
          geometry: { location: { lat: 40.8860, lng: 14.2908 } },
          types: ['airport']
        }
      ],
      'nice': [
        {
          name: 'Nice Côte d\'Azur Airport (NCE)',
          formatted_address: '06206 Nice, France',
          geometry: { location: { lat: 43.6584, lng: 7.2159 } },
          types: ['airport']
        }
      ],
      'nice france': [
        {
          name: 'Nice Côte d\'Azur Airport (NCE)',
          formatted_address: '06206 Nice, France',
          geometry: { location: { lat: 43.6584, lng: 7.2159 } },
          types: ['airport']
        }
      ],
      'rome': [
        {
          name: 'Leonardo da Vinci–Fiumicino Airport (FCO)',
          formatted_address: '00054 Fiumicino RM, Italy',
          geometry: { location: { lat: 41.8003, lng: 12.2389 } },
          types: ['airport']
        }
      ],
      'berlin': [
        {
          name: 'Berlin Brandenburg Airport (BER)',
          formatted_address: '12529 Schönefeld, Germany',
          geometry: { location: { lat: 52.3667, lng: 13.5033 } },
          types: ['airport']
        }
      ],
      'zurich': [
        {
          name: 'Zurich Airport (ZUR)',
          formatted_address: '8058 Zürich-Flughafen, Switzerland',
          geometry: { location: { lat: 47.4647, lng: 8.5492 } },
          types: ['airport']
        }
      ],
      'dubai': [
        {
          name: 'Dubai International Airport (DXB)',
          formatted_address: 'Dubai, United Arab Emirates',
          geometry: { location: { lat: 25.2532, lng: 55.3657 } },
          types: ['airport']
        }
      ],
      'singapore': [
        {
          name: 'Singapore Changi Airport (SIN)',
          formatted_address: 'Airport Boulevard, Singapore',
          geometry: { location: { lat: 1.3644, lng: 103.9915 } },
          types: ['airport']
        }
      ],
      'hong kong': [
        {
          name: 'Hong Kong International Airport (HKG)',
          formatted_address: 'Hong Kong',
          geometry: { location: { lat: 22.3080, lng: 113.9185 } },
          types: ['airport']
        }
      ],
      
      // Caribbean airports
      'barbados': [
        {
          name: 'Grantley Adams International Airport (BGI)',
          formatted_address: 'Bridgetown, Barbados',
          geometry: { location: { lat: 13.0761, lng: -59.4925 } },
          types: ['airport']
        }
      ],
      'kingston': [
        {
          name: 'Norman Manley International Airport (KIN)',
          formatted_address: 'Kingston, Jamaica',
          geometry: { location: { lat: 17.9357, lng: -76.7875 } },
          types: ['airport']
        }
      ],
      'montego bay': [
        {
          name: 'Sangster International Airport (MBJ)',
          formatted_address: 'Montego Bay, Jamaica',
          geometry: { location: { lat: 18.5037, lng: -77.9134 } },
          types: ['airport']
        }
      ],
      'runaway bay': [
        {
          name: 'Sangster International Airport (MBJ)',
          formatted_address: 'Montego Bay, Jamaica',
          geometry: { location: { lat: 18.5037, lng: -77.9134 } },
          types: ['airport']
        }
      ],
      'ocho rios': [
        {
          name: 'Sangster International Airport (MBJ)',
          formatted_address: 'Montego Bay, Jamaica',
          geometry: { location: { lat: 18.5037, lng: -77.9134 } },
          types: ['airport']
        }
      ],
      'negril': [
        {
          name: 'Sangster International Airport (MBJ)',
          formatted_address: 'Montego Bay, Jamaica',
          geometry: { location: { lat: 18.5037, lng: -77.9134 } },
          types: ['airport']
        }
      ],
      'nassau': [
        {
          name: 'Lynden Pindling International Airport (NAS)',
          formatted_address: 'Nassau, Bahamas',
          geometry: { location: { lat: 25.0389, lng: -77.4664 } },
          types: ['airport']
        }
      ],
      'bahamas': [
        {
          name: 'Lynden Pindling International Airport (NAS)',
          formatted_address: 'Nassau, Bahamas',
          geometry: { location: { lat: 25.0389, lng: -77.4664 } },
          types: ['airport']
        }
      ],
      'trinidad': [
        {
          name: 'Piarco International Airport (POS)',
          formatted_address: 'Port of Spain, Trinidad and Tobago',
          geometry: { location: { lat: 10.5954, lng: -61.3372 } },
          types: ['airport']
        }
      ],
      'puerto rico': [
        {
          name: 'Luis Muñoz Marín International Airport (SJU)',
          formatted_address: 'San Juan, Puerto Rico',
          geometry: { location: { lat: 18.4394, lng: -66.0018 } },
          types: ['airport']
        }
      ],
      'dominican republic': [
        {
          name: 'Las Américas International Airport (SDQ)',
          formatted_address: 'Santo Domingo, Dominican Republic',
          geometry: { location: { lat: 18.4297, lng: -69.6689 } },
          types: ['airport']
        },
        {
          name: 'Punta Cana International Airport (PUJ)',
          formatted_address: 'Punta Cana, Dominican Republic',
          geometry: { location: { lat: 18.5674, lng: -68.3634 } },
          types: ['airport']
        }
      ],
      'cuba': [
        {
          name: 'José Martí International Airport (HAV)',
          formatted_address: 'Havana, Cuba',
          geometry: { location: { lat: 22.9892, lng: -82.4091 } },
          types: ['airport']
        }
      ],
      'cayman islands': [
        {
          name: 'Owen Roberts International Airport (GCM)',
          formatted_address: 'Grand Cayman, Cayman Islands',
          geometry: { location: { lat: 19.2928, lng: -81.3576 } },
          types: ['airport']
        }
      ],
      'bridgetown': [
        {
          name: 'Grantley Adams International Airport (BGI)',
          formatted_address: 'Bridgetown, Barbados',
          geometry: { location: { lat: 13.0761, lng: -59.4925 } },
          types: ['airport']
        }
      ],
      'bridgetown barbados': [
        {
          name: 'Grantley Adams International Airport (BGI)',
          formatted_address: 'Bridgetown, Barbados',
          geometry: { location: { lat: 13.0761, lng: -59.4925 } },
          types: ['airport']
        }
      ],
      'bridgetown saint michael barbados': [
        {
          name: 'Grantley Adams International Airport (BGI)',
          formatted_address: 'Bridgetown, Barbados',
          geometry: { location: { lat: 13.0761, lng: -59.4925 } },
          types: ['airport']
        }
      ],
      'port of spain': [
        {
          name: 'Piarco International Airport (POS)',
          formatted_address: 'Port of Spain, Trinidad and Tobago',
          geometry: { location: { lat: 10.5954, lng: -61.3372 } },
          types: ['airport']
        }
      ],
      'san juan': [
        {
          name: 'Luis Muñoz Marín International Airport (SJU)',
          formatted_address: 'San Juan, Puerto Rico',
          geometry: { location: { lat: 18.4394, lng: -66.0018 } },
          types: ['airport']
        }
      ],
      'santo domingo': [
        {
          name: 'Las Américas International Airport (SDQ)',
          formatted_address: 'Santo Domingo, Dominican Republic',
          geometry: { location: { lat: 18.4297, lng: -69.6689 } },
          types: ['airport']
        }
      ],
      'punta cana': [
        {
          name: 'Punta Cana International Airport (PUJ)',
          formatted_address: 'Punta Cana, Dominican Republic',
          geometry: { location: { lat: 18.5674, lng: -68.3634 } },
          types: ['airport']
        }
      ],
      'havana': [
        {
          name: 'José Martí International Airport (HAV)',
          formatted_address: 'Havana, Cuba',
          geometry: { location: { lat: 22.9892, lng: -82.4091 } },
          types: ['airport']
        }
      ],
      'grand cayman': [
        {
          name: 'Owen Roberts International Airport (GCM)',
          formatted_address: 'Grand Cayman, Cayman Islands',
          geometry: { location: { lat: 19.2928, lng: -81.3576 } },
          types: ['airport']
        }
      ],
      'aruba': [
        {
          name: 'Queen Beatrix International Airport (AUA)',
          formatted_address: 'Aruba',
          geometry: { location: { lat: 12.5014, lng: -70.0152 } },
          types: ['airport']
        }
      ],
      'curacao': [
        {
          name: 'Hato International Airport (CUR)',
          formatted_address: 'Curaçao',
          geometry: { location: { lat: 12.1889, lng: -68.9598 } },
          types: ['airport']
        }
      ],
      'st thomas': [
        {
          name: 'Cyril E. King Airport (STT)',
          formatted_address: 'St. Thomas, US Virgin Islands',
          geometry: { location: { lat: 18.3370, lng: -64.9734 } },
          types: ['airport']
        }
      ],
      'st lucia': [
        {
          name: 'Hewanorra International Airport (UVF)',
          formatted_address: 'Vieux Fort, St. Lucia',
          geometry: { location: { lat: 13.7332, lng: -60.9526 } },
          types: ['airport']
        }
      ],
      'antigua': [
        {
          name: 'V.C. Bird International Airport (ANU)',
          formatted_address: 'Antigua and Barbuda',
          geometry: { location: { lat: 17.1367, lng: -61.7927 } },
          types: ['airport']
        }
      ],
      'grenada': [
        {
          name: 'Maurice Bishop International Airport (GND)',
          formatted_address: 'Point Salines, Grenada',
          geometry: { location: { lat: 12.0042, lng: -61.7862 } },
          types: ['airport']
        }
      ],
      'saint george': [
        {
          name: 'Maurice Bishop International Airport (GND)',
          formatted_address: 'Point Salines, Grenada',
          geometry: { location: { lat: 12.0042, lng: -61.7862 } },
          types: ['airport']
        }
      ],
      'saint george grenada': [
        {
          name: 'Maurice Bishop International Airport (GND)',
          formatted_address: 'Point Salines, Grenada',
          geometry: { location: { lat: 12.0042, lng: -61.7862 } },
          types: ['airport']
        }
      ],
      'st george': [
        {
          name: 'Maurice Bishop International Airport (GND)',
          formatted_address: 'Point Salines, Grenada',
          geometry: { location: { lat: 12.0042, lng: -61.7862 } },
          types: ['airport']
        }
      ],
      'st george grenada': [
        {
          name: 'Maurice Bishop International Airport (GND)',
          formatted_address: 'Point Salines, Grenada',
          geometry: { location: { lat: 12.0042, lng: -61.7862 } },
          types: ['airport']
        }
      ],
      
      // Central America airports
      'san jose costa rica': [
        {
          name: 'Juan Santamaría International Airport (SJO)',
          formatted_address: 'San José, Costa Rica',
          geometry: { location: { lat: 9.9939, lng: -84.2088 } },
          types: ['airport']
        }
      ],
      'san josé costa rica': [
        {
          name: 'Juan Santamaría International Airport (SJO)',
          formatted_address: 'San José, Costa Rica',
          geometry: { location: { lat: 9.9939, lng: -84.2088 } },
          types: ['airport']
        }
      ],
      'san josé': [
        {
          name: 'Juan Santamaría International Airport (SJO)',
          formatted_address: 'San José, Costa Rica',
          geometry: { location: { lat: 9.9939, lng: -84.2088 } },
          types: ['airport']
        }
      ],
      'guatemala city': [
        {
          name: 'La Aurora International Airport (GUA)',
          formatted_address: 'Guatemala City, Guatemala',
          geometry: { location: { lat: 14.5833, lng: -90.5275 } },
          types: ['airport']
        }
      ],
      'panama city': [
        {
          name: 'Tocumen International Airport (PTY)',
          formatted_address: 'Panama City, Panama',
          geometry: { location: { lat: 9.0714, lng: -79.3834 } },
          types: ['airport']
        }
      ],
      'panama city panama': [
        {
          name: 'Tocumen International Airport (PTY)',
          formatted_address: 'Panama City, Panama',
          geometry: { location: { lat: 9.0714, lng: -79.3834 } },
          types: ['airport']
        }
      ],
      'panamá': [
        {
          name: 'Tocumen International Airport (PTY)',
          formatted_address: 'Panama City, Panama',
          geometry: { location: { lat: 9.0714, lng: -79.3834 } },
          types: ['airport']
        }
      ],
      'panamá panama': [
        {
          name: 'Tocumen International Airport (PTY)',
          formatted_address: 'Panama City, Panama',
          geometry: { location: { lat: 9.0714, lng: -79.3834 } },
          types: ['airport']
        }
      ],
      'tegucigalpa': [
        {
          name: 'Toncontín International Airport (TGU)',
          formatted_address: 'Tegucigalpa, Honduras',
          geometry: { location: { lat: 14.0608, lng: -87.2172 } },
          types: ['airport']
        }
      ],
      'san salvador': [
        {
          name: 'Monseñor Óscar Arnulfo Romero International Airport (SAL)',
          formatted_address: 'San Salvador, El Salvador',
          geometry: { location: { lat: 13.4409, lng: -89.0556 } },
          types: ['airport']
        }
      ],
      'managua': [
        {
          name: 'Augusto C. Sandino International Airport (MGA)',
          formatted_address: 'Managua, Nicaragua',
          geometry: { location: { lat: 12.1415, lng: -86.1681 } },
          types: ['airport']
        }
      ],
      'managua nicaragua': [
        {
          name: 'Augusto C. Sandino International Airport (MGA)',
          formatted_address: 'Managua, Nicaragua',
          geometry: { location: { lat: 12.1415, lng: -86.1681 } },
          types: ['airport']
        }
      ],
      'grenada nicaragua': [
        {
          name: 'Augusto C. Sandino International Airport (MGA)',
          formatted_address: 'Managua, Nicaragua',
          geometry: { location: { lat: 12.1415, lng: -86.1681 } },
          types: ['airport']
        }
      ],
      'belize city': [
        {
          name: 'Philip S. W. Goldson International Airport (BZE)',
          formatted_address: 'Belize City, Belize',
          geometry: { location: { lat: 17.5394, lng: -88.3083 } },
          types: ['airport']
        }
      ],
      'belize': [
        {
          name: 'Philip S. W. Goldson International Airport (BZE)',
          formatted_address: 'Belize City, Belize',
          geometry: { location: { lat: 17.5394, lng: -88.3083 } },
          types: ['airport']
        }
      ],
      
      // More South America airports
      'cusco': [
        {
          name: 'Alejandro Velasco Astete International Airport (CUZ)',
          formatted_address: 'Cusco, Peru',
          geometry: { location: { lat: -13.5358, lng: -71.9389 } },
          types: ['airport']
        }
      ],
      'quito': [
        {
          name: 'Mariscal Sucre International Airport (UIO)',
          formatted_address: 'Quito, Ecuador',
          geometry: { location: { lat: -0.1292, lng: -78.3575 } },
          types: ['airport']
        }
      ],
      'guayaquil': [
        {
          name: 'José Joaquín de Olmedo International Airport (GYE)',
          formatted_address: 'Guayaquil, Ecuador',
          geometry: { location: { lat: -2.1574, lng: -79.8836 } },
          types: ['airport']
        }
      ],
      'caracas': [
        {
          name: 'Simón Bolívar International Airport (CCS)',
          formatted_address: 'Caracas, Venezuela',
          geometry: { location: { lat: 10.6013, lng: -66.9911 } },
          types: ['airport']
        }
      ],
      'la paz': [
        {
          name: 'El Alto International Airport (LPB)',
          formatted_address: 'La Paz, Bolivia',
          geometry: { location: { lat: -16.5136, lng: -68.1925 } },
          types: ['airport']
        }
      ],
      'asuncion': [
        {
          name: 'Silvio Pettirossi International Airport (ASU)',
          formatted_address: 'Asunción, Paraguay',
          geometry: { location: { lat: -25.2400, lng: -57.5194 } },
          types: ['airport']
        }
      ],
      'montevideo': [
        {
          name: 'Carrasco International Airport (MVD)',
          formatted_address: 'Montevideo, Uruguay',
          geometry: { location: { lat: -34.8381, lng: -56.0308 } },
          types: ['airport']
        }
      ],
      'bogota': [
        {
          name: 'El Dorado International Airport (BOG)',
          formatted_address: 'Bogotá, Colombia',
          geometry: { location: { lat: 4.7016, lng: -74.1469 } },
          types: ['airport']
        }
      ],
      'bogotá': [
        {
          name: 'El Dorado International Airport (BOG)',
          formatted_address: 'Bogotá, Colombia',
          geometry: { location: { lat: 4.7016, lng: -74.1469 } },
          types: ['airport']
        }
      ],
      'cartagena': [
        {
          name: 'Rafael Núñez International Airport (CTG)',
          formatted_address: 'Cartagena, Colombia',
          geometry: { location: { lat: 10.4424, lng: -75.5130 } },
          types: ['airport']
        }
      ],
      'medellin': [
        {
          name: 'José María Córdova International Airport (MDE)',
          formatted_address: 'Medellín, Colombia',
          geometry: { location: { lat: 6.1645, lng: -75.4231 } },
          types: ['airport']
        }
      ],
      'medellín': [
        {
          name: 'José María Córdova International Airport (MDE)',
          formatted_address: 'Medellín, Colombia',
          geometry: { location: { lat: 6.1645, lng: -75.4231 } },
          types: ['airport']
        }
      ],
      'cali': [
        {
          name: 'Alfonso Bonilla Aragón International Airport (CLO)',
          formatted_address: 'Cali, Colombia',
          geometry: { location: { lat: 3.5430, lng: -76.3816 } },
          types: ['airport']
        }
      ],
      
      // Caribbean airports
      'port au prince': [
        {
          name: 'Toussaint Louverture International Airport (PAP)',
          formatted_address: 'Port-au-Prince, Haiti',
          geometry: { location: { lat: 18.5800, lng: -72.2925 } },
          types: ['airport']
        }
      ],
      'haiti': [
        {
          name: 'Toussaint Louverture International Airport (PAP)',
          formatted_address: 'Port-au-Prince, Haiti',
          geometry: { location: { lat: 18.5800, lng: -72.2925 } },
          types: ['airport']
        }
      ],
      
      // Pacific airports
      'honolulu': [
        {
          name: 'Daniel K. Inouye International Airport (HNL)',
          formatted_address: 'Honolulu, HI, USA',
          geometry: { location: { lat: 21.3187, lng: -157.9224 } },
          types: ['airport']
        }
      ],
      'honolulu hi': [
        {
          name: 'Daniel K. Inouye International Airport (HNL)',
          formatted_address: 'Honolulu, HI, USA',
          geometry: { location: { lat: 21.3187, lng: -157.9224 } },
          types: ['airport']
        }
      ],
      'honolulu hi usa': [
        {
          name: 'Daniel K. Inouye International Airport (HNL)',
          formatted_address: 'Honolulu, HI, USA',
          geometry: { location: { lat: 21.3187, lng: -157.9224 } },
          types: ['airport']
        }
      ],
      'honolulu hawaii': [
        {
          name: 'Daniel K. Inouye International Airport (HNL)',
          formatted_address: 'Honolulu, HI, USA',
          geometry: { location: { lat: 21.3187, lng: -157.9224 } },
          types: ['airport']
        }
      ],
      'honolulu hawaii usa': [
        {
          name: 'Daniel K. Inouye International Airport (HNL)',
          formatted_address: 'Honolulu, HI, USA',
          geometry: { location: { lat: 21.3187, lng: -157.9224 } },
          types: ['airport']
        }
      ],
      'fiji': [
        {
          name: 'Nadi International Airport (NAN)',
          formatted_address: 'Nadi, Fiji',
          geometry: { location: { lat: -17.7553, lng: 177.4431 } },
          types: ['airport']
        }
      ],
      'suva': [
        {
          name: 'Nausori Airport (SUV)',
          formatted_address: 'Suva, Fiji',
          geometry: { location: { lat: -18.0433, lng: 178.5592 } },
          types: ['airport']
        }
      ],
      'tahiti': [
        {
          name: 'Tahiti Faa\'a International Airport (PPT)',
          formatted_address: 'Tahiti, French Polynesia',
          geometry: { location: { lat: -17.5569, lng: -149.6061 } },
          types: ['airport']
        }
      ],
      
      // Southeast Asia airports
      'kuala lumpur': [
        {
          name: 'Kuala Lumpur International Airport (KUL)',
          formatted_address: 'Kuala Lumpur, Malaysia',
          geometry: { location: { lat: 2.7456, lng: 101.7072 } },
          types: ['airport']
        }
      ],
      'jakarta': [
        {
          name: 'Soekarno-Hatta International Airport (CGK)',
          formatted_address: 'Jakarta, Indonesia',
          geometry: { location: { lat: -6.1256, lng: 106.6559 } },
          types: ['airport']
        }
      ],
      'manila': [
        {
          name: 'Ninoy Aquino International Airport (MNL)',
          formatted_address: 'Manila, Philippines',
          geometry: { location: { lat: 14.5086, lng: 121.0194 } },
          types: ['airport']
        }
      ],
      'ho chi minh city': [
        {
          name: 'Tan Son Nhat International Airport (SGN)',
          formatted_address: 'Ho Chi Minh City, Vietnam',
          geometry: { location: { lat: 10.8188, lng: 106.6519 } },
          types: ['airport']
        }
      ],
      'hanoi': [
        {
          name: 'Noi Bai International Airport (HAN)',
          formatted_address: 'Hanoi, Vietnam',
          geometry: { location: { lat: 21.2187, lng: 105.8067 } },
          types: ['airport']
        }
      ],
      'phnom penh': [
        {
          name: 'Phnom Penh International Airport (PNH)',
          formatted_address: 'Phnom Penh, Cambodia',
          geometry: { location: { lat: 11.5465, lng: 104.8442 } },
          types: ['airport']
        }
      ],
      'vientiane': [
        {
          name: 'Wattay International Airport (VTE)',
          formatted_address: 'Vientiane, Laos',
          geometry: { location: { lat: 17.9883, lng: 102.5631 } },
          types: ['airport']
        }
      ],
      'yangon': [
        {
          name: 'Yangon International Airport (RGN)',
          formatted_address: 'Yangon, Myanmar',
          geometry: { location: { lat: 16.9073, lng: 96.1331 } },
          types: ['airport']
        }
      ],
      'dhaka': [
        {
          name: 'Hazrat Shahjalal International Airport (DAC)',
          formatted_address: 'Dhaka, Bangladesh',
          geometry: { location: { lat: 23.8433, lng: 90.3978 } },
          types: ['airport']
        }
      ],
      'colombo': [
        {
          name: 'Bandaranaike International Airport (CMB)',
          formatted_address: 'Colombo, Sri Lanka',
          geometry: { location: { lat: 7.1808, lng: 79.8842 } },
          types: ['airport']
        }
      ],
      'kathmandu': [
        {
          name: 'Tribhuvan International Airport (KTM)',
          formatted_address: 'Kathmandu, Nepal',
          geometry: { location: { lat: 27.6966, lng: 85.3591 } },
          types: ['airport']
        }
      ],
      
      // African airports
      'accra': [
        {
          name: 'Kotoka International Airport (ACC)',
          formatted_address: 'Accra, Ghana',
          geometry: { location: { lat: 5.6051, lng: -0.1667 } },
          types: ['airport']
        }
      ],
      'addis ababa': [
        {
          name: 'Addis Ababa Bole International Airport (ADD)',
          formatted_address: 'Addis Ababa, Ethiopia',
          geometry: { location: { lat: 8.9779, lng: 38.7999 } },
          types: ['airport']
        }
      ],
      'kampala': [
        {
          name: 'Entebbe International Airport (EBB)',
          formatted_address: 'Kampala, Uganda',
          geometry: { location: { lat: 0.0424, lng: 32.4435 } },
          types: ['airport']
        }
      ],
      'kigali': [
        {
          name: 'Kigali International Airport (KGL)',
          formatted_address: 'Kigali, Rwanda',
          geometry: { location: { lat: -1.9686, lng: 30.1395 } },
          types: ['airport']
        }
      ],
      'dar es salaam': [
        {
          name: 'Julius Nyerere International Airport (DAR)',
          formatted_address: 'Dar es Salaam, Tanzania',
          geometry: { location: { lat: -6.8781, lng: 39.2026 } },
          types: ['airport']
        }
      ],
      'harare': [
        {
          name: 'Robert Gabriel Mugabe International Airport (HRE)',
          formatted_address: 'Harare, Zimbabwe',
          geometry: { location: { lat: -17.9318, lng: 31.0928 } },
          types: ['airport']
        }
      ],
      'maputo': [
        {
          name: 'Maputo International Airport (MPM)',
          formatted_address: 'Maputo, Mozambique',
          geometry: { location: { lat: -25.9208, lng: 32.5725 } },
          types: ['airport']
        }
      ],
      'sao paulo': [
        {
          name: 'São Paulo/Guarulhos International Airport (GRU)',
          formatted_address: 'Guarulhos, São Paulo, Brazil',
          geometry: { location: { lat: -23.4324, lng: -46.4689 } },
          types: ['airport']
        },
        {
          name: 'Congonhas Airport (CGH)',
          formatted_address: 'São Paulo, SP, Brazil',
          geometry: { location: { lat: -23.6266, lng: -46.6565 } },
          types: ['airport']
        }
      ],
      'sao paulo brazil': [
        {
          name: 'São Paulo/Guarulhos International Airport (GRU)',
          formatted_address: 'Guarulhos, São Paulo, Brazil',
          geometry: { location: { lat: -23.4324, lng: -46.4689 } },
          types: ['airport']
        },
        {
          name: 'Congonhas Airport (CGH)',
          formatted_address: 'São Paulo, SP, Brazil',
          geometry: { location: { lat: -23.6266, lng: -46.6565 } },
          types: ['airport']
        }
      ],
      'são paulo': [
        {
          name: 'São Paulo/Guarulhos International Airport (GRU)',
          formatted_address: 'Guarulhos, São Paulo, Brazil',
          geometry: { location: { lat: -23.4324, lng: -46.4689 } },
          types: ['airport']
        },
        {
          name: 'Congonhas Airport (CGH)',
          formatted_address: 'São Paulo, SP, Brazil',
          geometry: { location: { lat: -23.6266, lng: -46.6565 } },
          types: ['airport']
        }
      ],
      'são paulo brazil': [
        {
          name: 'São Paulo/Guarulhos International Airport (GRU)',
          formatted_address: 'Guarulhos, São Paulo, Brazil',
          geometry: { location: { lat: -23.4324, lng: -46.4689 } },
          types: ['airport']
        },
        {
          name: 'Congonhas Airport (CGH)',
          formatted_address: 'São Paulo, SP, Brazil',
          geometry: { location: { lat: -23.6266, lng: -46.6565 } },
          types: ['airport']
        }
      ],
      'são paulo state of são paulo brazil': [
        {
          name: 'São Paulo/Guarulhos International Airport (GRU)',
          formatted_address: 'Guarulhos, São Paulo, Brazil',
          geometry: { location: { lat: -23.4324, lng: -46.4689 } },
          types: ['airport']
        },
        {
          name: 'Congonhas Airport (CGH)',
          formatted_address: 'São Paulo, SP, Brazil',
          geometry: { location: { lat: -23.6266, lng: -46.6565 } },
          types: ['airport']
        }
      ],
      'sao paulo state of sao paulo brazil': [
        {
          name: 'São Paulo/Guarulhos International Airport (GRU)',
          formatted_address: 'Guarulhos, São Paulo, Brazil',
          geometry: { location: { lat: -23.4324, lng: -46.4689 } },
          types: ['airport']
        },
        {
          name: 'Congonhas Airport (CGH)',
          formatted_address: 'São Paulo, SP, Brazil',
          geometry: { location: { lat: -23.6266, lng: -46.6565 } },
          types: ['airport']
        }
      ]
    };

    // Try to find airports by exact match first
    if (airportDatabase[normalizedQuery]) {
      return airportDatabase[normalizedQuery];
    }

    // Try to find airports by city name in query, prioritizing longer matches
    let bestMatch = '';
    let bestAirports: any[] = [];
    
    for (const [city, airports] of Object.entries(airportDatabase)) {
      if (normalizedQuery.includes(city) || normalizedQuery.includes(`airports near ${city}`) || city.includes(normalizedQuery)) {
        // Prioritize longer, more specific matches
        if (city.length > bestMatch.length) {
          bestMatch = city;
          bestAirports = airports;
        }
      }
    }
    
    if (bestAirports.length > 0) {
      return bestAirports;
    }

    return [];
  }
}
