// OpenFlights airport service implementation using comprehensive airport database

import { IAirportService, IDistanceCalculator } from './interfaces/IAirportService';
import { Airport, AirportSearchResult, LocationCoordinates } from '../types/Airport';
import { DistanceCalculator } from '../utils/DistanceCalculator';

interface OpenFlightsAirport {
  id: number;
  name: string;
  city: string;
  country: string;
  iata: string | null;
  icao: string | null;
  latitude: number;
  longitude: number;
  altitude: number;
  timezone: number;
  dst: string;
  tz: string;
  type: string;
  source: string;
}

export class OpenFlightsAirportService implements IAirportService {
  private airports: OpenFlightsAirport[] = [];
  private airportsByIata: Map<string, OpenFlightsAirport> = new Map();
  private airportsByCity: Map<string, OpenFlightsAirport[]> = new Map();
  private distanceCalculator: IDistanceCalculator;
  private isDataLoaded = false;

  constructor(distanceCalculator?: IDistanceCalculator) {
    this.distanceCalculator = distanceCalculator || new DistanceCalculator();
  }

  /**
   * Load airport data from OpenFlights dataset
   */
  private async loadAirportData(): Promise<void> {
    if (this.isDataLoaded) return;

    try {
      // Try to load airports via Cloud Functions proxy (if Firebase functions are initialized)
      try {
        // Dynamically require firebase functions to avoid bundling at build-time
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getFunctions, httpsCallable } = require('firebase/functions');
        const functions = getFunctions();
        const fn = httpsCallable(functions, 'openFlightsGetAll');
        const resp = await fn();
        const payload: any = resp?.data ?? resp;
        const data = payload?.data;
        if (Array.isArray(data) && data.length > 0) {
          this.airports = data.map((a: any, idx: number) => ({
            id: idx + 1,
            name: a.name || '',
            city: a.city || '',
            country: a.country || '',
            iata: a.iata || null,
            icao: a.icao || null,
            latitude: a.lat || 0,
            longitude: a.lng || 0,
            altitude: 0,
            timezone: 0,
            dst: '',
            tz: '',
            type: 'airport',
            source: 'openflights-proxy'
          }));
          this.buildIndexes();
          this.isDataLoaded = true;
          console.log(`Loaded ${this.airports.length} airports from OpenFlights proxy`);
          return;
        }
      } catch (fnErr) {
        // If functions are not available or callable failed, continue to original fetch
        console.debug('openFlights proxy not available, falling back to direct fetch', fnErr);
      }

      // Fetch the OpenFlights airport data from the canonical GitHub source as a final fallback
      const response = await fetch('https://raw.githubusercontent.com/jpatokal/openflights/master/data/airports.dat');
      if (!response.ok) {
        throw new Error(`Failed to fetch airport data: ${response.statusText}`);
      }

      const csvData = await response.text();
      this.parseAirportData(csvData);
      this.buildIndexes();
      this.isDataLoaded = true;

      console.log(`Loaded ${this.airports.length} airports from OpenFlights dataset`);
    } catch (error) {
      console.error('Failed to load airport data:', error);
      // Fallback to limited hardcoded data if fetch fails
      this.loadFallbackData();
    }
  }

  /**
   * Parse CSV data from OpenFlights format
   */
  private parseAirportData(csvData: string): void {
    const lines = csvData.trim().split('\n');
    
    for (const line of lines) {
      try {
        // OpenFlights CSV format: ID,Name,City,Country,IATA,ICAO,Latitude,Longitude,Altitude,Timezone,DST,Tz,Type,Source
        const parts = this.parseCSVLine(line);
        if (parts.length >= 14) {
          const airport: OpenFlightsAirport = {
            id: parseInt(parts[0]) || 0,
            name: parts[1]?.replace(/"/g, '') || '',
            city: parts[2]?.replace(/"/g, '') || '',
            country: parts[3]?.replace(/"/g, '') || '',
            iata: parts[4]?.replace(/"/g, '') || null,
            icao: parts[5]?.replace(/"/g, '') || null,
            latitude: parseFloat(parts[6]) || 0,
            longitude: parseFloat(parts[7]) || 0,
            altitude: parseInt(parts[8]) || 0,
            timezone: parseFloat(parts[9]) || 0,
            dst: parts[10]?.replace(/"/g, '') || '',
            tz: parts[11]?.replace(/"/g, '') || '',
            type: parts[12]?.replace(/"/g, '') || '',
            source: parts[13]?.replace(/"/g, '') || ''
          };

          // Only include airports with valid IATA codes and coordinates
          if (airport.iata && airport.iata !== '\\N' && airport.iata.length === 3 && 
              airport.latitude !== 0 && airport.longitude !== 0 &&
              airport.type === 'airport') {
            this.airports.push(airport);
          }
        }
      } catch (error) {
        // Skip malformed lines
        continue;
      }
    }
  }

  /**
   * Parse CSV line handling quoted fields properly
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  /**
   * Build search indexes for faster lookups
   */
  private buildIndexes(): void {
    // Build IATA code index
    this.airportsByIata.clear();
    for (const airport of this.airports) {
      if (airport.iata) {
        this.airportsByIata.set(airport.iata.toUpperCase(), airport);
      }
    }

    // Build city name index
    this.airportsByCity.clear();
    for (const airport of this.airports) {
      const normalizedCity = this.normalizeString(airport.city);
      if (!this.airportsByCity.has(normalizedCity)) {
        this.airportsByCity.set(normalizedCity, []);
      }
      this.airportsByCity.get(normalizedCity)!.push(airport);
    }
  }

  /**
   * Normalize string for consistent matching
   */
  private normalizeString(str: string): string {
    return str.toLowerCase()
      .replace(/[áàâäã]/g, 'a')
      .replace(/[éèêë]/g, 'e')
      .replace(/[íìîï]/g, 'i')
      .replace(/[óòôöõ]/g, 'o')
      .replace(/[úùûü]/g, 'u')
      .replace(/[ñ]/g, 'n')
      .replace(/[ç]/g, 'c')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Load fallback data if external fetch fails
   */
  private loadFallbackData(): void {
    // Major airports fallback data
    const fallbackAirports: OpenFlightsAirport[] = [
      { id: 1, name: 'John F Kennedy International Airport', city: 'New York', country: 'United States', iata: 'JFK', icao: 'KJFK', latitude: 40.6413, longitude: -73.7781, altitude: 13, timezone: -5, dst: 'A', tz: 'America/New_York', type: 'airport', source: 'OurAirports' },
      { id: 2, name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'United States', iata: 'LAX', icao: 'KLAX', latitude: 33.9425, longitude: -118.4081, altitude: 125, timezone: -8, dst: 'A', tz: 'America/Los_Angeles', type: 'airport', source: 'OurAirports' },
      { id: 3, name: 'O\'Hare International Airport', city: 'Chicago', country: 'United States', iata: 'ORD', icao: 'KORD', latitude: 41.9786, longitude: -87.9048, altitude: 672, timezone: -6, dst: 'A', tz: 'America/Chicago', type: 'airport', source: 'OurAirports' },
      { id: 4, name: 'Hartsfield Jackson Atlanta International Airport', city: 'Atlanta', country: 'United States', iata: 'ATL', icao: 'KATL', latitude: 33.6367, longitude: -84.4281, altitude: 1026, timezone: -5, dst: 'A', tz: 'America/New_York', type: 'airport', source: 'OurAirports' },
      { id: 5, name: 'Miami International Airport', city: 'Miami', country: 'United States', iata: 'MIA', icao: 'KMIA', latitude: 25.7932, longitude: -80.2906, altitude: 8, timezone: -5, dst: 'A', tz: 'America/New_York', type: 'airport', source: 'OurAirports' },
      { id: 6, name: 'Seattle Tacoma International Airport', city: 'Seattle', country: 'United States', iata: 'SEA', icao: 'KSEA', latitude: 47.4502, longitude: -122.3088, altitude: 131, timezone: -8, dst: 'A', tz: 'America/Los_Angeles', type: 'airport', source: 'OurAirports' },
      { id: 7, name: 'Denver International Airport', city: 'Denver', country: 'United States', iata: 'DEN', icao: 'KDEN', latitude: 39.8561, longitude: -104.6737, altitude: 5431, timezone: -7, dst: 'A', tz: 'America/Denver', type: 'airport', source: 'OurAirports' },
      { id: 8, name: 'Phoenix Sky Harbor International Airport', city: 'Phoenix', country: 'United States', iata: 'PHX', icao: 'KPHX', latitude: 33.4343, longitude: -112.0116, altitude: 1135, timezone: -7, dst: 'N', tz: 'America/Phoenix', type: 'airport', source: 'OurAirports' },
      { id: 9, name: 'Heathrow Airport', city: 'London', country: 'United Kingdom', iata: 'LHR', icao: 'EGLL', latitude: 51.4706, longitude: -0.4619, altitude: 83, timezone: 0, dst: 'E', tz: 'Europe/London', type: 'airport', source: 'OurAirports' },
      { id: 10, name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France', iata: 'CDG', icao: 'LFPG', latitude: 49.0097, longitude: 2.5479, altitude: 392, timezone: 1, dst: 'E', tz: 'Europe/Paris', type: 'airport', source: 'OurAirports' }
    ];

    this.airports = fallbackAirports;
    this.buildIndexes();
    this.isDataLoaded = true;
    console.log('Loaded fallback airport data');
  }

  /**
   * Convert OpenFlights airport to our Airport type
   */
  private convertToAirport(openFlightsAirport: OpenFlightsAirport, distance?: number): Airport {
    return {
      iataCode: openFlightsAirport.iata || '',
      name: openFlightsAirport.name,
      city: openFlightsAirport.city,
      country: openFlightsAirport.country,
      coordinates: {
        lat: openFlightsAirport.latitude,
        lng: openFlightsAirport.longitude
      },
      distance,
      isInternational: this.isInternationalAirport(openFlightsAirport)
    };
  }

  /**
   * Determine if airport is a military base and should be excluded
   */
  private isMilitaryBase(airport: OpenFlightsAirport): boolean {
    const name = airport.name.toLowerCase();
    
    // Military indicators in airport names
    const militaryKeywords = [
      'air force base',
      'air base',
      'afb',
      'air national guard',
      'national guard',
      'naval air station',
      'nas ',
      'marine corps',
      'military',
      'army airfield',
      'air station',
      'naval station',
      'coast guard',
      'joint base'
    ];
    
    return militaryKeywords.some(keyword => name.includes(keyword));
  }

  /**
   * Determine if airport is international based on name and other factors
   */
  public isInternationalAirport(airport: OpenFlightsAirport | string): boolean {
    // Handle string input (airport name only)
    if (typeof airport === 'string') {
      const name = airport.toLowerCase();
      
      // Direct indicators of international status
      if (name.includes('international') || name.includes('intl')) {
        return true;
      }
      
      // Exclude clearly regional/domestic airports
      if (name.includes('regional') || 
          name.includes('municipal') || 
          name.includes('county') ||
          name.includes('field') ||
          name.includes('airfield') ||
          name.includes('strip')) {
        return false;
      }
      
      // For string input, we can only rely on name patterns
      return name.length > 35;
    }
    
    // Handle OpenFlightsAirport object
    const airportName = airport.name.toLowerCase();
    
    // Direct indicators of international status
    if (airportName.includes('international') || airportName.includes('intl')) {
      return true;
    }
    
    // Exclude clearly regional/domestic airports
    if (airportName.includes('regional') || 
        airportName.includes('municipal') || 
        airportName.includes('county') ||
        airportName.includes('field') ||
        airportName.includes('airfield') ||
        airportName.includes('strip') ||
        airportName.includes('local') ||
        airportName.includes('community') ||
        airportName.includes('heliport')) {
      return false;
    }
    
    // Check if airport is in a major international city
    const majorInternationalCities = new Set([
      // North America
      'new york', 'los angeles', 'chicago', 'miami', 'atlanta', 'seattle', 'denver', 'phoenix',
      'san francisco', 'washington', 'boston', 'houston', 'dallas', 'detroit', 'toronto', 
      'vancouver', 'montreal', 'mexico city',
      
      // Europe  
      'london', 'paris', 'madrid', 'barcelona', 'berlin', 'rome', 'milan', 'amsterdam', 'brussels',
      'zurich', 'vienna', 'stockholm', 'oslo', 'copenhagen', 'helsinki', 'moscow', 'istanbul',
      'frankfurt', 'munich', 'dublin', 'lisbon', 'prague', 'warsaw', 'athens',
      
      // Asia Pacific
      'tokyo', 'osaka', 'seoul', 'beijing', 'shanghai', 'hong kong', 'singapore', 'bangkok',
      'mumbai', 'delhi', 'sydney', 'melbourne', 'auckland', 'kuala lumpur', 'jakarta',
      
      // Middle East & Africa
      'dubai', 'doha', 'cairo', 'johannesburg', 'cape town', 'addis ababa', 'nairobi', 'casablanca',
      
      // South America
      'sao paulo', 'rio de janeiro', 'buenos aires', 'santiago', 'lima', 'bogota'
    ]);
    
    const normalizedCity = airport.city.toLowerCase();
    const isInMajorCity = majorInternationalCities.has(normalizedCity) ||
      Array.from(majorInternationalCities).some(city => 
        normalizedCity.includes(city) || city.includes(normalizedCity)
      );
    
    if (isInMajorCity) {
      return true;
    }
    
    // Capital city airports are usually international
    const capitalCities = new Set([
      'washington', 'london', 'paris', 'berlin', 'rome', 'madrid', 'amsterdam', 'brussels',
      'vienna', 'stockholm', 'oslo', 'copenhagen', 'helsinki', 'moscow', 'ankara', 'athens',
      'warsaw', 'prague', 'budapest', 'bucharest', 'sofia', 'zagreb', 'ljubljana', 'bratislava',
      'tokyo', 'seoul', 'beijing', 'bangkok', 'jakarta', 'manila', 'kuala lumpur', 'singapore',
      'new delhi', 'islamabad', 'dhaka', 'colombo', 'kathmandu', 'cairo', 'addis ababa',
      'nairobi', 'lagos', 'casablanca', 'tunis', 'algiers', 'brasilia', 'lima', 'bogota',
      'quito', 'caracas', 'buenos aires', 'santiago', 'montevideo', 'asuncion'
    ]);
    
    if (capitalCities.has(normalizedCity)) {
      return true;
    }
    
    // Hub airports (typically have longer, more formal names)
    if (airport.name.length > 35) {
      return true;
    }
    
    // Airports serving major population centers (basic heuristic)
    if (airportName.includes('hub') || 
        airportName.includes('gateway') || 
        airportName.includes('metropolitan')) {
      return true;
    }
    
    // Default to false for unclassified airports
    return false;
  }

  /**
   * Search for airports near a given location
   */
  async searchAirportsNearLocation(
    locationName: string, 
    coordinates?: LocationCoordinates,
    maxDistance: number = 200,
    maxResults: number = 5
  ): Promise<AirportSearchResult> {
    await this.loadAirportData();

    let searchCoordinates = coordinates;
    
    // If coordinates not provided, try to get them from city lookup
    if (!searchCoordinates) {
      const foundCoordinates = await this.getCoordinatesForLocation(locationName);
      if (!foundCoordinates) {
        throw new Error(`Could not find coordinates for location: ${locationName}`);
      }
      searchCoordinates = foundCoordinates;
    }

    // Find airports within the specified distance
    const nearbyAirports: Array<{ airport: OpenFlightsAirport; distance: number }> = [];

    for (const airport of this.airports) {
      // Skip airports without IATA codes for better quality results
      if (!airport.iata) continue;
      
      // Skip military bases
      if (this.isMilitaryBase(airport)) continue;

      const distance = this.distanceCalculator.calculateDistance(
        searchCoordinates,
        { lat: airport.latitude, lng: airport.longitude }
      );

      if (distance <= maxDistance) {
        nearbyAirports.push({ airport, distance });
      }
    }

    // Sort by distance (closest first)
    nearbyAirports.sort((a, b) => a.distance - b.distance);
    
    // Separate international and domestic airports
    const internationalAirports = nearbyAirports.filter(({ airport }) => this.isInternationalAirport(airport));
    const domesticAirports = nearbyAirports.filter(({ airport }) => !this.isInternationalAirport(airport));
    
    // Select 3 closest international and 2 closest domestic airports
    const selectedInternational = internationalAirports.slice(0, 3);
    const selectedDomestic = domesticAirports.slice(0, 2);
    
    // Combine and sort by distance again
    const selectedAirports = [...selectedInternational, ...selectedDomestic]
      .sort((a, b) => a.distance - b.distance);
    
    const airports = selectedAirports
      .map(({ airport, distance }) => this.convertToAirport(airport, distance));

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
    await this.loadAirportData();
    
    const airport = this.airportsByIata.get(iataCode.toUpperCase());
    return airport ? this.convertToAirport(airport) : null;
  }

  /**
   * Search for airports directly by query
   */
  async searchAirportsByQuery(query: string): Promise<Airport[]> {
    await this.loadAirportData();
    
    const normalizedQuery = this.normalizeString(query);
    const results: Array<{ airport: OpenFlightsAirport; score: number }> = [];

    for (const airport of this.airports) {
      // Skip military bases
      if (this.isMilitaryBase(airport)) continue;
      
      let score = 0;
      const normalizedName = this.normalizeString(airport.name);
      const normalizedCity = this.normalizeString(airport.city);
      const normalizedCountry = this.normalizeString(airport.country);

      // Exact IATA code match gets highest score
      if (airport.iata && normalizedQuery.toUpperCase() === airport.iata) {
        score += 100;
      }

      // Name matches
      if (normalizedName.includes(normalizedQuery)) {
        score += 50;
      }

      // City matches
      if (normalizedCity.includes(normalizedQuery)) {
        score += 30;
      }

      // Country matches
      if (normalizedCountry.includes(normalizedQuery)) {
        score += 10;
      }

      // Partial matches
      const queryWords = normalizedQuery.split(' ');
      for (const word of queryWords) {
        if (word.length > 2) { // Ignore very short words
          if (normalizedName.includes(word)) score += 5;
          if (normalizedCity.includes(word)) score += 3;
          if (normalizedCountry.includes(word)) score += 1;
        }
      }

      if (score > 0) {
        results.push({ airport, score });
      }
    }

    // Sort by score (descending) and return top 20 results
    results.sort((a, b) => b.score - a.score);
    
    return results
      .slice(0, 20)
      .map(({ airport }) => this.convertToAirport(airport));
  }

  /**
   * Get coordinates for a location name using basic city lookup
   */
  private async getCoordinatesForLocation(locationName: string): Promise<LocationCoordinates | null> {
    const normalizedLocation = this.normalizeString(locationName);
    
    // Try to find airports in this city first
    const cityAirports = this.airportsByCity.get(normalizedLocation);
    if (cityAirports && cityAirports.length > 0) {
      // Use the coordinates of the first airport in this city
      const airport = cityAirports[0];
      return { lat: airport.latitude, lng: airport.longitude };
    }

    // Basic hardcoded coordinates for major cities (fallback)
    const cityCoordinates: Record<string, LocationCoordinates> = {
      'new york': { lat: 40.7128, lng: -74.0060 },
      'los angeles': { lat: 34.0522, lng: -118.2437 },
      'chicago': { lat: 41.8781, lng: -87.6298 },
      'miami': { lat: 25.7617, lng: -80.1918 },
      'atlanta': { lat: 33.4484, lng: -84.3917 },
      'seattle': { lat: 47.6062, lng: -122.3321 },
      'denver': { lat: 39.7392, lng: -104.9903 },
      'phoenix': { lat: 33.4484, lng: -112.0740 },
      'london': { lat: 51.5074, lng: -0.1278 },
      'paris': { lat: 48.8566, lng: 2.3522 },
      'tokyo': { lat: 35.6762, lng: 139.6503 },
      'sydney': { lat: -33.8688, lng: 151.2093 }
    };

    return cityCoordinates[normalizedLocation] || null;
  }
}
