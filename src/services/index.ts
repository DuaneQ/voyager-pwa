// Factory service for creating airport service instances

import { AirportService } from './AirportService';
import { GooglePlacesService } from './GooglePlacesService';
import { UnifiedAirportService } from './UnifiedAirportService';

export class AirportServiceFactory {
  // Legacy service creation for backward compatibility
  static createAirportService(googlePlacesApiKey: string): AirportService {
    const googlePlacesService = new GooglePlacesService(googlePlacesApiKey);
    return new AirportService(googlePlacesService);
  }

  // Modern service creation with comprehensive airport coverage
  static createUnifiedAirportService(googlePlacesApiKey?: string): UnifiedAirportService {
    return new UnifiedAirportService(googlePlacesApiKey);
  }
}

// Default export for convenience - now uses the unified service
export { AirportService } from './AirportService';
export { GooglePlacesService } from './GooglePlacesService';
export { UnifiedAirportService } from './UnifiedAirportService';
export * from './interfaces/IAirportService';
