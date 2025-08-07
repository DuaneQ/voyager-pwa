// Factory service for creating airport service instances

import { UnifiedAirportService } from './UnifiedAirportService';

export class AirportServiceFactory {
  // Primary service creation - uses comprehensive OpenFlights dataset
  static createUnifiedAirportService(googlePlacesApiKey?: string): UnifiedAirportService {
    return new UnifiedAirportService(googlePlacesApiKey);
  }

  // Convenience method for backward compatibility
  static createAirportService(googlePlacesApiKey: string): UnifiedAirportService {
    return new UnifiedAirportService(googlePlacesApiKey);
  }
}

// Default export for convenience - now uses the unified service
export { UnifiedAirportService } from './UnifiedAirportService';
export { OpenFlightsAirportService } from './OpenFlightsAirportService';
export { ModernGooglePlacesService } from './ModernGooglePlacesService';
export * from './interfaces/IAirportService';
