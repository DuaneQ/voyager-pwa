import { TravelPreferenceProfile } from '../types/TravelPreferences';
import { POPULAR_AIRLINES } from '../types/AIGeneration';
import { UserProfile } from '../types/UserProfile';

export type ValidationError = { field: string; code: string; message: string; severity: 'error' | 'warning' };
export type ValidationResult = { isValid: boolean; errors: ValidationError[] };

const toLower = (v?: any) => (v ? String(v).toLowerCase() : '');

export const ProfileValidationService = {
  isFlightSectionVisible(profile: TravelPreferenceProfile | null | undefined): boolean {
    const profileTransportation = profile?.transportation;
    return !!(
      profileTransportation && (
        profileTransportation.includeFlights === true ||
        toLower(profileTransportation.primaryMode) === 'airplane' ||
        toLower(profileTransportation.primaryMode) === 'flights'
      )
    );
  },

  validateProfileCompleteness(userProfile: UserProfile | null | undefined): ValidationResult {
    const errors: ValidationError[] = [];
    if (!userProfile) {
      errors.push({ field: 'profile', code: 'INCOMPLETE_PROFILE', message: 'Profile is required', severity: 'error' });
      return { isValid: false, errors };
    }
    if (!userProfile.dob || !userProfile.gender) {
      errors.push({ field: 'profile', code: 'INCOMPLETE_PROFILE', message: 'Please complete your profile by setting your date of birth and gender before creating an itinerary.', severity: 'error' });
    }
    return { isValid: errors.length === 0, errors };
  },

  validateFlightFields(formData: any, selectedProfile: TravelPreferenceProfile | null | undefined) {
    const errors: Record<string, string> = {};
    const showFlight = this.isFlightSectionVisible(selectedProfile);
    if (showFlight) {
      if (formData.departure && !formData.departureAirportCode) {
        errors.departureAirportCode = 'Departure airport is required.';
      }
      if (formData.destination && !formData.destinationAirportCode) {
        errors.destinationAirportCode = 'Destination airport is required.';
      }
    }
    
    // If both airport codes provided, ensure they are not the same
    const dep = formData.departureAirportCode ? String(formData.departureAirportCode).toUpperCase().trim() : '';
    const dest = formData.destinationAirportCode ? String(formData.destinationAirportCode).toUpperCase().trim() : '';
    if (dep && dest && dep === dest) {
      errors.destinationAirportCode = 'Departure and destination airports cannot be the same.';
    }

    // Validate basic IATA format (3 uppercase letters) when codes present
    const iataRegex = /^[A-Z]{3}$/;
    if (dep && !iataRegex.test(dep)) {
      errors.departureAirportCode = 'Invalid airport code format.';
    }
    if (dest && !iataRegex.test(dest)) {
      errors.destinationAirportCode = 'Invalid airport code format.';
    }

    // Validate preferred airlines (if provided) against known list
    const preferred = formData.flightPreferences?.preferredAirlines || [];
    if (Array.isArray(preferred) && preferred.length > 0) {
      const invalid = (preferred || []).filter((a: string) => !POPULAR_AIRLINES.includes(a));
      if (invalid.length > 0) {
        errors.preferredAirlines = `Unsupported airlines selected: ${invalid.join(', ')}.`;
      }
    }

    return errors;
  },

  validateTagsAndSpecialRequests(formData: any, limits: { maxTags: number; maxTagLength: number; maxSpecialRequestsLength: number }) {
    const errors: Record<string, string> = {};
    const { maxTags, maxTagLength, maxSpecialRequestsLength } = limits;

    if (formData.specialRequests && formData.specialRequests.length > maxSpecialRequestsLength) {
      errors.specialRequests = `Special requests must be at most ${maxSpecialRequestsLength} characters.`;
    }

    if (formData.mustInclude && formData.mustInclude.length > maxTags) {
      errors.mustInclude = `You can add up to ${maxTags} items.`;
    }
    if (formData.mustAvoid && formData.mustAvoid.length > maxTags) {
      errors.mustAvoid = `You can add up to ${maxTags} items.`;
    }

    (formData.mustInclude || []).forEach((t: string) => {
      if (t && t.length > maxTagLength) {
        errors.mustInclude = `Each item must be at most ${maxTagLength} characters.`;
      }
    });
    (formData.mustAvoid || []).forEach((t: string) => {
      if (t && t.length > maxTagLength) {
        errors.mustAvoid = `Each item must be at most ${maxTagLength} characters.`;
      }
    });

    return errors;
  }
};

export default ProfileValidationService;
