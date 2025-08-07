import { IDistanceCalculator } from '../services/interfaces/IAirportService';
import { LocationCoordinates } from '../types/Airport';

export class DistanceCalculator implements IDistanceCalculator {
  /**
   * Calculate distance between two coordinates using Haversine formula
   * @param coord1 - First coordinate
   * @param coord2 - Second coordinate
   * @returns Distance in kilometers
   */
  calculateDistance(coord1: LocationCoordinates, coord2: LocationCoordinates): number {
    const R = 6371; // Earth's radius in kilometers
    
    const dLat = this.toRadians(coord2.lat - coord1.lat);
    const dLng = this.toRadians(coord2.lng - coord1.lng);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(coord1.lat)) * Math.cos(this.toRadians(coord2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
