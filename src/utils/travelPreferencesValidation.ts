import { 
  TravelPreferenceProfile, 
  UserTravelPreferences, 
  PreferenceSignal 
} from '../types/TravelPreferences';
import { TravelPreferencesErrors } from '../errors/TravelPreferencesErrors';

// Validation rules and constants
export const VALIDATION_RULES = {
  profile: {
    name: {
      minLength: 1,
      maxLength: 50,
      allowedChars: /^[a-zA-Z0-9\s\-_.,&()]+$/
    },
    budgetRange: {
      min: { min: 0, max: 1000000 },
      max: { min: 100, max: 1000000 }
    },
    activities: {
      min: 0,
      max: 10
    },
    accommodation: {
      starRating: { min: 1, max: 5 }
    },
    transportation: {
      maxWalkingDistance: { min: 0, max: 120 } // minutes
    },
    groupSize: {
      preferred: { min: 1, max: 50 },
      sizes: { min: 1, max: 50, maxItems: 10 }
    }
  },
  preferences: {
    maxProfiles: 20,
    maxPreferenceSignals: 10000
  },
  preferenceSignal: {
    confidence: { min: 0, max: 1 },
    metadata: {
      maxStringLength: 500,
      watchDuration: { min: 0, max: 86400 }, // seconds
      completionRate: { min: 0, max: 1 }
    }
  }
} as const;

// Profile validation
export function validateTravelPreferenceProfile(
  profile: Partial<TravelPreferenceProfile>, 
  isPartialUpdate = false
): void {
  // Name validation
  if (!isPartialUpdate || profile.name !== undefined) {
    const name = profile.name;
    if (!name || typeof name !== 'string') {
      throw TravelPreferencesErrors.invalidProfileData('name', 'Profile name is required');
    }
    
    const trimmedName = name.trim();
    if (trimmedName.length < VALIDATION_RULES.profile.name.minLength) {
      throw TravelPreferencesErrors.invalidProfileData('name', 'Profile name cannot be empty');
    }
    
    if (trimmedName.length > VALIDATION_RULES.profile.name.maxLength) {
      throw TravelPreferencesErrors.invalidProfileData(
        'name', 
        `Profile name cannot exceed ${VALIDATION_RULES.profile.name.maxLength} characters`
      );
    }
    
    if (!VALIDATION_RULES.profile.name.allowedChars.test(trimmedName)) {
      throw TravelPreferencesErrors.invalidProfileData(
        'name', 
        'Profile name contains invalid characters'
      );
    }
  }

  // Travel style validation
  if (!isPartialUpdate || profile.travelStyle !== undefined) {
    const validTravelStyles = ['luxury', 'budget', 'mid-range', 'backpacker'] as const;
    if (profile.travelStyle && !validTravelStyles.includes(profile.travelStyle)) {
      throw TravelPreferencesErrors.invalidProfileData(
        'travelStyle', 
        `Travel style must be one of: ${validTravelStyles.join(', ')}`
      );
    }
  }

  // Budget range validation
  if (!isPartialUpdate || profile.budgetRange !== undefined) {
    const budgetRange = profile.budgetRange;
    if (budgetRange) {
      if (typeof budgetRange.min !== 'number' || budgetRange.min < VALIDATION_RULES.profile.budgetRange.min.min) {
        throw TravelPreferencesErrors.invalidProfileData(
          'budgetRange.min', 
          `Budget minimum must be at least ${VALIDATION_RULES.profile.budgetRange.min.min}`
        );
      }
      
      if (typeof budgetRange.max !== 'number' || budgetRange.max < VALIDATION_RULES.profile.budgetRange.max.min) {
        throw TravelPreferencesErrors.invalidProfileData(
          'budgetRange.max', 
          `Budget maximum must be at least ${VALIDATION_RULES.profile.budgetRange.max.min}`
        );
      }
      
      if (budgetRange.min >= budgetRange.max) {
        throw TravelPreferencesErrors.invalidProfileData(
          'budgetRange', 
          'Budget maximum must be greater than minimum'
        );
      }
      
      if (budgetRange.currency !== 'USD') {
        throw TravelPreferencesErrors.invalidProfileData(
          'budgetRange.currency', 
          'Only USD currency is currently supported'
        );
      }
    }
  }

  // Activities validation
  if (!isPartialUpdate || profile.activities !== undefined) {
    const activities = profile.activities;
    if (activities) {
      const requiredActivities = [
        'cultural', 'adventure', 'relaxation', 'nightlife', 
        'shopping', 'food', 'nature', 'photography'
      ];
      
      for (const activity of requiredActivities) {
        const value = activities[activity as keyof typeof activities];
        if (typeof value !== 'number' || 
            value < VALIDATION_RULES.profile.activities.min || 
            value > VALIDATION_RULES.profile.activities.max) {
          throw TravelPreferencesErrors.invalidProfileData(
            `activities.${activity}`, 
            `Activity score must be between ${VALIDATION_RULES.profile.activities.min} and ${VALIDATION_RULES.profile.activities.max}`
          );
        }
      }
    }
  }

  // Food preferences validation
  if (!isPartialUpdate || profile.foodPreferences !== undefined) {
    const foodPrefs = profile.foodPreferences;
    if (foodPrefs) {
      if (!Array.isArray(foodPrefs.dietaryRestrictions)) {
        throw TravelPreferencesErrors.invalidProfileData(
          'foodPreferences.dietaryRestrictions', 
          'Dietary restrictions must be an array'
        );
      }
      
      if (!Array.isArray(foodPrefs.cuisineTypes)) {
        throw TravelPreferencesErrors.invalidProfileData(
          'foodPreferences.cuisineTypes', 
          'Cuisine types must be an array'
        );
      }
      
      const validFoodBudgetLevels = ['low', 'medium', 'high'] as const;
      if (foodPrefs.foodBudgetLevel && !validFoodBudgetLevels.includes(foodPrefs.foodBudgetLevel)) {
        throw TravelPreferencesErrors.invalidProfileData(
          'foodPreferences.foodBudgetLevel', 
          `Food budget level must be one of: ${validFoodBudgetLevels.join(', ')}`
        );
      }
    }
  }

  // Accommodation validation
  if (!isPartialUpdate || profile.accommodation !== undefined) {
    const accommodation = profile.accommodation;
    if (accommodation) {
      const validAccommodationTypes = ['hotel', 'hostel', 'airbnb', 'resort', 'any'] as const;
      if (accommodation.type && !validAccommodationTypes.includes(accommodation.type)) {
        throw TravelPreferencesErrors.invalidProfileData(
          'accommodation.type', 
          `Accommodation type must be one of: ${validAccommodationTypes.join(', ')}`
        );
      }
      
      if (typeof accommodation.starRating !== 'number' || 
          accommodation.starRating < VALIDATION_RULES.profile.accommodation.starRating.min || 
          accommodation.starRating > VALIDATION_RULES.profile.accommodation.starRating.max) {
        throw TravelPreferencesErrors.invalidProfileData(
          'accommodation.starRating', 
          `Star rating must be between ${VALIDATION_RULES.profile.accommodation.starRating.min} and ${VALIDATION_RULES.profile.accommodation.starRating.max}`
        );
      }
    }
  }

  // Transportation validation
  if (!isPartialUpdate || profile.transportation !== undefined) {
    const transportation = profile.transportation;
    if (transportation) {
      const validTransportationModes = ['walking', 'public', 'taxi', 'rental', 'mixed'] as const;
      if (transportation.primaryMode && !validTransportationModes.includes(transportation.primaryMode)) {
        throw TravelPreferencesErrors.invalidProfileData(
          'transportation.primaryMode', 
          `Transportation mode must be one of: ${validTransportationModes.join(', ')}`
        );
      }
      
      if (typeof transportation.maxWalkingDistance !== 'number' || 
          transportation.maxWalkingDistance < VALIDATION_RULES.profile.transportation.maxWalkingDistance.min || 
          transportation.maxWalkingDistance > VALIDATION_RULES.profile.transportation.maxWalkingDistance.max) {
        throw TravelPreferencesErrors.invalidProfileData(
          'transportation.maxWalkingDistance', 
          `Max walking distance must be between ${VALIDATION_RULES.profile.transportation.maxWalkingDistance.min} and ${VALIDATION_RULES.profile.transportation.maxWalkingDistance.max} minutes`
        );
      }
    }
  }

  // Group size validation
  if (!isPartialUpdate || profile.groupSize !== undefined) {
    const groupSize = profile.groupSize;
    if (groupSize) {
      if (typeof groupSize.preferred !== 'number' || 
          groupSize.preferred < VALIDATION_RULES.profile.groupSize.preferred.min || 
          groupSize.preferred > VALIDATION_RULES.profile.groupSize.preferred.max) {
        throw TravelPreferencesErrors.invalidProfileData(
          'groupSize.preferred', 
          `Preferred group size must be between ${VALIDATION_RULES.profile.groupSize.preferred.min} and ${VALIDATION_RULES.profile.groupSize.preferred.max}`
        );
      }
      
      if (!Array.isArray(groupSize.sizes) || groupSize.sizes.length === 0) {
        throw TravelPreferencesErrors.invalidProfileData(
          'groupSize.sizes', 
          'Group sizes must be a non-empty array'
        );
      }
      
      if (groupSize.sizes.length > VALIDATION_RULES.profile.groupSize.sizes.maxItems) {
        throw TravelPreferencesErrors.invalidProfileData(
          'groupSize.sizes', 
          `Cannot have more than ${VALIDATION_RULES.profile.groupSize.sizes.maxItems} group size options`
        );
      }
      
      for (const size of groupSize.sizes) {
        if (typeof size !== 'number' || 
            size < VALIDATION_RULES.profile.groupSize.sizes.min || 
            size > VALIDATION_RULES.profile.groupSize.sizes.max) {
          throw TravelPreferencesErrors.invalidProfileData(
            'groupSize.sizes', 
            `Each group size must be between ${VALIDATION_RULES.profile.groupSize.sizes.min} and ${VALIDATION_RULES.profile.groupSize.sizes.max}`
          );
        }
      }
    }
  }

  // Accessibility validation
  if (!isPartialUpdate || profile.accessibility !== undefined) {
    const accessibility = profile.accessibility;
    if (accessibility) {
      if (typeof accessibility.mobilityNeeds !== 'boolean' ||
          typeof accessibility.visualNeeds !== 'boolean' ||
          typeof accessibility.hearingNeeds !== 'boolean') {
        throw TravelPreferencesErrors.invalidProfileData(
          'accessibility', 
          'Accessibility needs must be boolean values'
        );
      }
      
      if (accessibility.details && typeof accessibility.details !== 'string') {
        throw TravelPreferencesErrors.invalidProfileData(
          'accessibility.details', 
          'Accessibility details must be a string'
        );
      }
    }
  }
}

// User travel preferences validation
export function validateUserTravelPreferences(preferences: UserTravelPreferences): void {
  // Basic structure validation
  if (!preferences || typeof preferences !== 'object') {
    throw TravelPreferencesErrors.invalidProfileData('preferences', 'Invalid preferences structure');
  }

  // Profiles validation
  if (!Array.isArray(preferences.profiles)) {
    throw TravelPreferencesErrors.invalidProfileData('profiles', 'Profiles must be an array');
  }

  if (preferences.profiles.length === 0) {
    throw TravelPreferencesErrors.invalidProfileData('profiles', 'At least one profile is required');
  }

  if (preferences.profiles.length > VALIDATION_RULES.preferences.maxProfiles) {
    throw TravelPreferencesErrors.invalidProfileData(
      'profiles', 
      `Cannot have more than ${VALIDATION_RULES.preferences.maxProfiles} profiles`
    );
  }

  // Validate each profile
  const profileNames = new Set<string>();
  const profileIds = new Set<string>();
  
  for (const profile of preferences.profiles) {
    // Validate individual profile
    validateTravelPreferenceProfile(profile, false);
    
    // Check for duplicate names (case-insensitive)
    const lowerName = profile.name.toLowerCase().trim();
    if (profileNames.has(lowerName)) {
      throw TravelPreferencesErrors.duplicateProfileName(profile.name);
    }
    profileNames.add(lowerName);
    
    // Check for duplicate IDs
    if (profileIds.has(profile.id)) {
      throw TravelPreferencesErrors.invalidProfileData('id', `Duplicate profile ID: ${profile.id}`);
    }
    profileIds.add(profile.id);
  }

  // Default profile validation
  if (preferences.defaultProfileId) {
    const defaultProfile = preferences.profiles.find(p => p.id === preferences.defaultProfileId);
    if (!defaultProfile) {
      throw TravelPreferencesErrors.profileNotFound(preferences.defaultProfileId);
    }
  }

  // Preference signals validation
  if (!Array.isArray(preferences.preferenceSignals)) {
    throw TravelPreferencesErrors.invalidProfileData('preferenceSignals', 'Preference signals must be an array');
  }

  if (preferences.preferenceSignals.length > VALIDATION_RULES.preferences.maxPreferenceSignals) {
    throw TravelPreferencesErrors.invalidProfileData(
      'preferenceSignals', 
      `Cannot have more than ${VALIDATION_RULES.preferences.maxPreferenceSignals} preference signals`
    );
  }

  // Validate each preference signal
  for (const signal of preferences.preferenceSignals) {
    validatePreferenceSignal(signal);
  }
}

// Preference signal validation
export function validatePreferenceSignal(signal: PreferenceSignal): void {
  if (!signal || typeof signal !== 'object') {
    throw TravelPreferencesErrors.invalidProfileData('signal', 'Invalid signal structure');
  }

  // Type validation
  const validSignalTypes = ['like', 'dislike', 'save', 'book', 'share', 'view_time', 'search'] as const;
  if (!signal.type || !validSignalTypes.includes(signal.type)) {
    throw TravelPreferencesErrors.invalidProfileData(
      'signal.type', 
      `Signal type must be one of: ${validSignalTypes.join(', ')}`
    );
  }

  // Activity type validation
  if (!signal.activityType || typeof signal.activityType !== 'string') {
    throw TravelPreferencesErrors.invalidProfileData('signal.activityType', 'Activity type is required');
  }

  // Confidence validation
  if (typeof signal.confidence !== 'number' || 
      signal.confidence < VALIDATION_RULES.preferenceSignal.confidence.min || 
      signal.confidence > VALIDATION_RULES.preferenceSignal.confidence.max) {
    throw TravelPreferencesErrors.invalidProfileData(
      'signal.confidence', 
      `Confidence must be between ${VALIDATION_RULES.preferenceSignal.confidence.min} and ${VALIDATION_RULES.preferenceSignal.confidence.max}`
    );
  }

  // Metadata validation
  if (signal.metadata) {
    const metadata = signal.metadata;
    
    // String length validation
    const stringFields = ['destination', 'query', 'source'] as const;
    for (const field of stringFields) {
      const value = metadata[field];
      if (value && (typeof value !== 'string' || value.length > VALIDATION_RULES.preferenceSignal.metadata.maxStringLength)) {
        throw TravelPreferencesErrors.invalidProfileData(
          `signal.metadata.${field}`, 
          `${field} must be a string with max ${VALIDATION_RULES.preferenceSignal.metadata.maxStringLength} characters`
        );
      }
    }
    
    // Array validation
    if (metadata.activities && !Array.isArray(metadata.activities)) {
      throw TravelPreferencesErrors.invalidProfileData('signal.metadata.activities', 'Activities must be an array');
    }
    
    if (metadata.rawActivities && !Array.isArray(metadata.rawActivities)) {
      throw TravelPreferencesErrors.invalidProfileData('signal.metadata.rawActivities', 'Raw activities must be an array');
    }
    
    // Numeric validation
    if (metadata.watchDuration !== undefined) {
      if (typeof metadata.watchDuration !== 'number' || 
          metadata.watchDuration < VALIDATION_RULES.preferenceSignal.metadata.watchDuration.min || 
          metadata.watchDuration > VALIDATION_RULES.preferenceSignal.metadata.watchDuration.max) {
        throw TravelPreferencesErrors.invalidProfileData(
          'signal.metadata.watchDuration', 
          `Watch duration must be between ${VALIDATION_RULES.preferenceSignal.metadata.watchDuration.min} and ${VALIDATION_RULES.preferenceSignal.metadata.watchDuration.max} seconds`
        );
      }
    }
    
    if (metadata.completionRate !== undefined) {
      if (typeof metadata.completionRate !== 'number' || 
          metadata.completionRate < VALIDATION_RULES.preferenceSignal.metadata.completionRate.min || 
          metadata.completionRate > VALIDATION_RULES.preferenceSignal.metadata.completionRate.max) {
        throw TravelPreferencesErrors.invalidProfileData(
          'signal.metadata.completionRate', 
          `Completion rate must be between ${VALIDATION_RULES.preferenceSignal.metadata.completionRate.min} and ${VALIDATION_RULES.preferenceSignal.metadata.completionRate.max}`
        );
      }
    }
    
    // Data quality validation
    if (metadata.dataQuality) {
      const validDataQualities = ['high', 'medium', 'low', 'inferred_from_text', 'inferred_from_destination_and_activities'] as const;
      if (!validDataQualities.includes(metadata.dataQuality)) {
        throw TravelPreferencesErrors.invalidProfileData(
          'signal.metadata.dataQuality', 
          `Data quality must be one of: ${validDataQualities.join(', ')}`
        );
      }
    }
  }
}

// Sanitization functions
export function sanitizeProfileName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

export function sanitizePreferences(preferences: UserTravelPreferences): UserTravelPreferences {
  return {
    ...preferences,
    profiles: preferences.profiles.map(profile => ({
      ...profile,
      name: sanitizeProfileName(profile.name)
    }))
  };
}
