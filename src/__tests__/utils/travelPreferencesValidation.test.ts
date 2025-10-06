import {
  validateTravelPreferenceProfile,
  validateUserTravelPreferences,
  validatePreferenceSignal,
  sanitizePreferences,
  VALIDATION_RULES
} from '../../utils/travelPreferencesValidation';
import { TravelPreferenceProfile, UserTravelPreferences, PreferenceSignal } from '../../types/TravelPreferences';
import { TravelPreferencesError } from '../../errors/TravelPreferencesErrors';

const mockProfile: TravelPreferenceProfile = {
  id: 'test-profile-id',
  name: 'Test Profile',
  isDefault: true,
  travelStyle: 'mid-range',
  budgetRange: { min: 1000, max: 5000, currency: 'USD' },
  activities: [],
  foodPreferences: {
    dietaryRestrictions: [],
    cuisineTypes: ['italian', 'japanese'],
    foodBudgetLevel: 'medium'
  },
  accommodation: {
    type: 'hotel',
    starRating: 4
  },
  transportation: {
    primaryMode: 'mixed',
    maxWalkingDistance: 20
  },
  groupSize: {
    preferred: 2,
    sizes: [1, 2, 4]
  },
  accessibility: {
    mobilityNeeds: false,
    visualNeeds: false,
    hearingNeeds: false
  },
  createdAt: new Date(),
  updatedAt: new Date()
};

describe('travelPreferencesValidation', () => {
  describe('validateTravelPreferenceProfile', () => {
    it('validates a correct profile without errors', () => {
      expect(() => validateTravelPreferenceProfile(mockProfile, false)).not.toThrow();
    });

    it('validates partial updates correctly', () => {
      expect(() => validateTravelPreferenceProfile({ name: 'Updated Name' }, true)).not.toThrow();
      expect(() => validateTravelPreferenceProfile({ travelStyle: 'luxury' }, true)).not.toThrow();
    });

    describe('name validation', () => {
      it('rejects empty names for full validation', () => {
        expect(() => validateTravelPreferenceProfile({ ...mockProfile, name: '' }, false))
          .toThrow('Profile name is required');
      });

      it('rejects names that are too long', () => {
        const longName = 'a'.repeat(51);
        expect(() => validateTravelPreferenceProfile({ ...mockProfile, name: longName }, false))
          .toThrow('cannot exceed 50 characters');
      });

      it('rejects names with invalid characters', () => {
        expect(() => validateTravelPreferenceProfile({ ...mockProfile, name: 'Test<>Profile' }, false))
          .toThrow('contains invalid characters');
      });

      it('allows valid names with allowed special characters', () => {
        expect(() => validateTravelPreferenceProfile({ ...mockProfile, name: 'Work Travel - Europe (2024)' }, false))
          .not.toThrow();
      });
    });

    describe('travel style validation', () => {
      it('accepts valid travel styles', () => {
        const validStyles = ['luxury', 'budget', 'mid-range', 'backpacker'] as const;
        for (const style of validStyles) {
          expect(() => validateTravelPreferenceProfile({ ...mockProfile, travelStyle: style }, false))
            .not.toThrow();
        }
      });

      it('rejects invalid travel styles', () => {
        expect(() => validateTravelPreferenceProfile({ ...mockProfile, travelStyle: 'invalid' as any }, false))
          .toThrow('Travel style must be one of');
      });
    });

    describe('budget range validation', () => {
      it('accepts valid budget ranges', () => {
        expect(() => validateTravelPreferenceProfile({
          ...mockProfile,
          budgetRange: { min: 500, max: 2000, currency: 'USD' }
        }, false)).not.toThrow();
      });

      it('rejects budget range where min >= max', () => {
        expect(() => validateTravelPreferenceProfile({
          ...mockProfile,
          budgetRange: { min: 5000, max: 1000, currency: 'USD' }
        }, false)).toThrow('Budget maximum must be greater than minimum');
      });

      it('rejects negative budget values', () => {
        expect(() => validateTravelPreferenceProfile({
          ...mockProfile,
          budgetRange: { min: -100, max: 1000, currency: 'USD' }
        }, false)).toThrow('Budget minimum must be at least 0');
      });

      it('rejects non-USD currency', () => {
        expect(() => validateTravelPreferenceProfile({
          ...mockProfile,
          budgetRange: { min: 1000, max: 5000, currency: 'EUR' as any }
        }, false)).toThrow('Only USD currency is currently supported');
      });
    });

    describe('activities validation', () => {
      it('accepts valid activities array', () => {
        const validActivities = ['cultural', 'adventure', 'relaxation', 'nightlife', 'shopping', 'food', 'nature', 'photography'];
        expect(() => validateTravelPreferenceProfile({
          ...mockProfile,
          activities: validActivities
        }, false)).not.toThrow();
      });

      it('rejects invalid activities array', () => {
        expect(() => validateTravelPreferenceProfile({
          ...mockProfile,
          activities: ['invalid']
        }, false)).toThrow('Invalid activity: invalid');

        expect(() => validateTravelPreferenceProfile({
          ...mockProfile,
          activities: Array(9).fill('cultural')
        }, false)).toThrow('Too many activities selected');
      });
    });

    describe('accommodation validation', () => {
      it('accepts valid accommodation types', () => {
        const validTypes = ['hotel', 'hostel', 'airbnb', 'resort', 'any'] as const;
        for (const type of validTypes) {
          expect(() => validateTravelPreferenceProfile({
            ...mockProfile,
            accommodation: { type, starRating: 3 }
          }, false)).not.toThrow();
        }
      });

      it('rejects invalid accommodation types', () => {
        expect(() => validateTravelPreferenceProfile({
          ...mockProfile,
          accommodation: { type: 'motel' as any, starRating: 3 }
        }, false)).toThrow('Accommodation type must be one of');
      });

      it('validates star rating range', () => {
        expect(() => validateTravelPreferenceProfile({
          ...mockProfile,
          accommodation: { type: 'hotel', starRating: 0 }
        }, false)).toThrow('Star rating must be between 1 and 5');

        expect(() => validateTravelPreferenceProfile({
          ...mockProfile,
          accommodation: { type: 'hotel', starRating: 6 }
        }, false)).toThrow('Star rating must be between 1 and 5');
      });
    });

    describe('transportation validation', () => {
      it('accepts valid transportation modes', () => {
        const validModes = ['walking', 'public', 'taxi', 'rental', 'mixed'] as const;
        for (const mode of validModes) {
          expect(() => validateTravelPreferenceProfile({
            ...mockProfile,
            transportation: { primaryMode: mode, maxWalkingDistance: 15 }
          }, false)).not.toThrow();
        }
      });

      it('validates walking distance range', () => {
        expect(() => validateTravelPreferenceProfile({
          ...mockProfile,
          transportation: { primaryMode: 'walking', maxWalkingDistance: -1 }
        }, false)).toThrow('Max walking distance must be between 0 and 120 minutes');

        expect(() => validateTravelPreferenceProfile({
          ...mockProfile,
          transportation: { primaryMode: 'walking', maxWalkingDistance: 121 }
        }, false)).toThrow('Max walking distance must be between 0 and 120 minutes');
      });
    });

    describe('group size validation', () => {
      it('validates preferred group size range', () => {
        expect(() => validateTravelPreferenceProfile({
          ...mockProfile,
          groupSize: { preferred: 0, sizes: [1, 2] }
        }, false)).toThrow('Preferred group size must be between 1 and 50');

        expect(() => validateTravelPreferenceProfile({
          ...mockProfile,
          groupSize: { preferred: 51, sizes: [1, 2] }
        }, false)).toThrow('Preferred group size must be between 1 and 50');
      });

      it('validates group sizes array', () => {
        expect(() => validateTravelPreferenceProfile({
          ...mockProfile,
          groupSize: { preferred: 2, sizes: [] }
        }, false)).toThrow('Group sizes must be a non-empty array');

        const tooManySizes = Array.from({ length: 11 }, (_, i) => i + 1);
        expect(() => validateTravelPreferenceProfile({
          ...mockProfile,
          groupSize: { preferred: 2, sizes: tooManySizes }
        }, false)).toThrow('Cannot have more than 10 group size options');
      });

      it('validates individual group sizes', () => {
        expect(() => validateTravelPreferenceProfile({
          ...mockProfile,
          groupSize: { preferred: 2, sizes: [0, 2] }
        }, false)).toThrow('Each group size must be between 1 and 50');

        expect(() => validateTravelPreferenceProfile({
          ...mockProfile,
          groupSize: { preferred: 2, sizes: [1, 51] }
        }, false)).toThrow('Each group size must be between 1 and 50');
      });
    });

    describe('accessibility validation', () => {
      it('validates boolean accessibility fields', () => {
        expect(() => validateTravelPreferenceProfile({
          ...mockProfile,
          accessibility: {
            mobilityNeeds: 'yes' as any,
            visualNeeds: false,
            hearingNeeds: false
          }
        }, false)).toThrow('Accessibility needs must be boolean values');
      });

      it('validates accessibility details type', () => {
        expect(() => validateTravelPreferenceProfile({
          ...mockProfile,
          accessibility: {
            mobilityNeeds: false,
            visualNeeds: false,
            hearingNeeds: false,
            details: 123 as any
          }
        }, false)).toThrow('Accessibility details must be a string');
      });
    });
  });

  describe('validateUserTravelPreferences', () => {
    const validPreferences: UserTravelPreferences = {
      profiles: [mockProfile],
      defaultProfileId: 'test-profile-id',
      preferenceSignals: []
    };

    it('validates correct preferences structure', () => {
      expect(() => validateUserTravelPreferences(validPreferences)).not.toThrow();
    });

    it('rejects invalid preferences structure', () => {
      expect(() => validateUserTravelPreferences(null as any))
        .toThrow('Invalid preferences structure');

      expect(() => validateUserTravelPreferences({} as any))
        .toThrow('Profiles must be an array');
    });

    it('rejects empty profiles array', () => {
      expect(() => validateUserTravelPreferences({
        ...validPreferences,
        profiles: []
      })).toThrow('At least one profile is required');
    });

    it('rejects too many profiles', () => {
      const tooManyProfiles = Array.from({ length: 21 }, (_, i) => ({
        ...mockProfile,
        id: `profile-${i}`,
        name: `Profile ${i}`
      }));

      expect(() => validateUserTravelPreferences({
        ...validPreferences,
        profiles: tooManyProfiles
      })).toThrow('Cannot have more than 20 profiles');
    });

    it('detects duplicate profile names', () => {
      const duplicateProfiles = [
        mockProfile,
        { ...mockProfile, id: 'profile-2', name: 'Test Profile' } // Same name
      ];

      expect(() => validateUserTravelPreferences({
        ...validPreferences,
        profiles: duplicateProfiles
      })).toThrow('Duplicate profile name: Test Profile');
    });

    it('detects duplicate profile IDs', () => {
      const duplicateProfiles = [
        mockProfile,
        { ...mockProfile, name: 'Different Name' } // Same ID
      ];

      expect(() => validateUserTravelPreferences({
        ...validPreferences,
        profiles: duplicateProfiles
      })).toThrow('Duplicate profile ID');
    });

    it('validates default profile exists', () => {
      expect(() => validateUserTravelPreferences({
        ...validPreferences,
        defaultProfileId: 'non-existent-id'
      })).toThrow("Profile with ID 'non-existent-id' not found");
    });

    it('validates preference signals array', () => {
      expect(() => validateUserTravelPreferences({
        ...validPreferences,
        preferenceSignals: 'invalid' as any
      })).toThrow('Preference signals must be an array');
    });
  });

  describe('validatePreferenceSignal', () => {
    const validSignal: PreferenceSignal = {
      id: 'signal-1',
      type: 'like',
      activityType: 'cultural',
      confidence: 0.8,
      timestamp: new Date(),
      processed: false
    };

    it('validates correct signal structure', () => {
      expect(() => validatePreferenceSignal(validSignal)).not.toThrow();
    });

    it('validates signal type', () => {
      expect(() => validatePreferenceSignal({
        ...validSignal,
        type: 'invalid' as any
      })).toThrow('Signal type must be one of');
    });

    it('validates confidence range', () => {
      expect(() => validatePreferenceSignal({
        ...validSignal,
        confidence: -0.1
      })).toThrow('Confidence must be between 0 and 1');

      expect(() => validatePreferenceSignal({
        ...validSignal,
        confidence: 1.1
      })).toThrow('Confidence must be between 0 and 1');
    });

    it('validates activity type is present', () => {
      expect(() => validatePreferenceSignal({
        ...validSignal,
        activityType: ''
      })).toThrow('Activity type is required');
    });

    it('validates metadata watch duration', () => {
      expect(() => validatePreferenceSignal({
        ...validSignal,
        metadata: {
          watchDuration: -1
        }
      })).toThrow('Watch duration must be between 0 and 86400 seconds');

      expect(() => validatePreferenceSignal({
        ...validSignal,
        metadata: {
          watchDuration: 86401
        }
      })).toThrow('Watch duration must be between 0 and 86400 seconds');
    });

    it('validates metadata completion rate', () => {
      expect(() => validatePreferenceSignal({
        ...validSignal,
        metadata: {
          completionRate: 1.1
        }
      })).toThrow('Completion rate must be between 0 and 1');
    });

    it('validates metadata string field lengths', () => {
      const longString = 'a'.repeat(501);
      expect(() => validatePreferenceSignal({
        ...validSignal,
        metadata: {
          destination: longString
        }
      })).toThrow('destination must be a string with max 500 characters');
    });

    it('validates metadata array fields', () => {
      expect(() => validatePreferenceSignal({
        ...validSignal,
        metadata: {
          activities: 'not-an-array' as any
        }
      })).toThrow('Activities must be an array');
    });

    it('validates data quality values', () => {
      const validQualities = ['high', 'medium', 'low', 'inferred_from_text', 'inferred_from_destination_and_activities'];
      for (const quality of validQualities) {
        expect(() => validatePreferenceSignal({
          ...validSignal,
          metadata: {
            dataQuality: quality as any
          }
        })).not.toThrow();
      }

      expect(() => validatePreferenceSignal({
        ...validSignal,
        metadata: {
          dataQuality: 'invalid' as any
        }
      })).toThrow('Data quality must be one of');
    });
  });

  describe('sanitizePreferences', () => {
    it('trims whitespace from profile names', () => {
      const preferencesWithWhitespace = {
        profiles: [
          { ...mockProfile, name: '  Test Profile  ' },
          { ...mockProfile, id: 'profile-2', name: '\tAnother Profile\n' }
        ],
        defaultProfileId: 'test-profile-id',
        preferenceSignals: []
      };

      const sanitized = sanitizePreferences(preferencesWithWhitespace);

      expect(sanitized.profiles[0].name).toBe('Test Profile');
      expect(sanitized.profiles[1].name).toBe('Another Profile');
    });

    it('normalizes multiple spaces in profile names', () => {
      const preferencesWithSpaces = {
        profiles: [
          { ...mockProfile, name: 'Test    Profile    Name' }
        ],
        defaultProfileId: 'test-profile-id',
        preferenceSignals: []
      };

      const sanitized = sanitizePreferences(preferencesWithSpaces);

      expect(sanitized.profiles[0].name).toBe('Test Profile Name');
    });
  });

  describe('VALIDATION_RULES', () => {
    it('has consistent validation rules', () => {
      expect(VALIDATION_RULES.profile.name.minLength).toBe(1);
      expect(VALIDATION_RULES.profile.name.maxLength).toBe(50);
      expect(VALIDATION_RULES.profile.activities.min).toBe(0);
      expect(VALIDATION_RULES.profile.activities.max).toBe(10);
      expect(VALIDATION_RULES.preferences.maxProfiles).toBe(20);
      expect(VALIDATION_RULES.preferences.maxPreferenceSignals).toBe(10000);
    });
  });
});
