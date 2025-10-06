import { TravelPreferenceProfile } from '../../types/TravelPreferences';

describe('TravelPreferences Types', () => {
  describe('TravelPreferenceProfile', () => {
    it('should have correct structure for a valid profile', () => {
      const validProfile: TravelPreferenceProfile = {
        id: 'test-id',
        name: 'Test Profile',
        isDefault: true,
        travelStyle: 'mid-range',
        budgetRange: {
          min: 1000,
          max: 5000,
          currency: 'USD'
        },
        activities: ['cultural','food','nature'],
        foodPreferences: {
          dietaryRestrictions: ['vegetarian'],
          cuisineTypes: ['italian', 'local'],
          foodBudgetLevel: 'medium'
        },
        accommodation: {
          type: 'hotel',
          starRating: 3
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

      // Test that the object conforms to the type
      expect(validProfile.id).toBe('test-id');
      expect(validProfile.name).toBe('Test Profile');
      expect(validProfile.isDefault).toBe(true);
      expect(validProfile.travelStyle).toBe('mid-range');
      expect(validProfile.budgetRange.min).toBe(1000);
      expect(validProfile.budgetRange.max).toBe(5000);
      expect(validProfile.budgetRange.currency).toBe('USD');
  expect(validProfile.activities).toContain('cultural');
      expect(validProfile.foodPreferences.foodBudgetLevel).toBe('medium');
      expect(validProfile.accommodation.type).toBe('hotel');
      expect(validProfile.transportation.primaryMode).toBe('mixed');
      expect(validProfile.groupSize.preferred).toBe(2);
      expect(validProfile.accessibility.mobilityNeeds).toBe(false);
    });

    it('should support all travel style options', () => {
      const styles: TravelPreferenceProfile['travelStyle'][] = [
        'budget',
        'mid-range', 
        'luxury',
        'backpacker'
      ];

      styles.forEach(style => {
        const profile: Pick<TravelPreferenceProfile, 'travelStyle'> = {
          travelStyle: style
        };
        expect(profile.travelStyle).toBe(style);
      });
    });

    it('should support all accommodation types', () => {
      const types: TravelPreferenceProfile['accommodation']['type'][] = [
        'hotel',
        'hostel',
        'airbnb',
        'resort',
        'any'
      ];

      types.forEach(type => {
        const accommodation: TravelPreferenceProfile['accommodation'] = {
          type: type,
          starRating: 3
        };
        expect(accommodation.type).toBe(type);
      });
    });

    it('should support all transportation modes', () => {
      const modes: TravelPreferenceProfile['transportation']['primaryMode'][] = [
        'walking',
        'public',
        'taxi',
        'rental',
        'mixed'
      ];

      modes.forEach(mode => {
        const transportation: TravelPreferenceProfile['transportation'] = {
          primaryMode: mode,
          maxWalkingDistance: 15
        };
        expect(transportation.primaryMode).toBe(mode);
      });
    });

    it('should support all food budget levels', () => {
      const levels: TravelPreferenceProfile['foodPreferences']['foodBudgetLevel'][] = [
        'low',
        'medium',
        'high'
      ];

      levels.forEach(level => {
        const foodPrefs: TravelPreferenceProfile['foodPreferences'] = {
          dietaryRestrictions: [],
          cuisineTypes: [],
          foodBudgetLevel: level
        };
        expect(foodPrefs.foodBudgetLevel).toBe(level);
      });
    });

    it('should handle activity preferences with valid ranges', () => {
      const activities: TravelPreferenceProfile['activities'] = {
        cultural: 10,
        adventure: 0,
        relaxation: 5,
        nightlife: 3,
        shopping: 7,
        food: 9,
        nature: 8,
        photography: 6
      };

      Object.values(activities).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('Profile Validation', () => {
    it('should handle profile with minimal required fields', () => {
      const minimalProfile: Partial<TravelPreferenceProfile> = {
        name: 'Minimal Profile',
        travelStyle: 'budget'
      };

      expect(minimalProfile.name).toBe('Minimal Profile');
      expect(minimalProfile.travelStyle).toBe('budget');
    });

    it('should handle profile dates as Date objects', () => {
      const now = new Date();
      const profile: Pick<TravelPreferenceProfile, 'createdAt' | 'updatedAt'> = {
        createdAt: now,
        updatedAt: now
      };

      expect(profile.createdAt).toBeInstanceOf(Date);
      expect(profile.updatedAt).toBeInstanceOf(Date);
    });
  });
});
