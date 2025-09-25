import React from 'react';
import { validateTravelPreferenceProfile } from '../../utils/travelPreferencesValidation';
import { TravelPreferenceProfile } from '../../types/TravelPreferences';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));

jest.mock('../../environments/firebaseConfig', () => ({
  app: {},
  auth: {
    currentUser: { uid: 'test-user-id' }
  }
}));

describe('Travel Preferences Validation', () => {
  const mockProfile: TravelPreferenceProfile = {
    id: 'test-profile-id',
    name: 'Test Profile',
    isDefault: true,
    travelStyle: 'mid-range',
    budgetRange: {
      min: 1000,
      max: 5000,
      currency: 'USD'
    },
    // Updated shape: array of activity keys (validation expects an array of activity keys)
    // Order doesn't matter; include the full allowed set to represent a complete profile
    activities: [
      'cultural',
      'adventure',
      'relaxation',
      'nightlife',
      'shopping',
      'food',
      'nature',
      'photography'
    ],
    foodPreferences: {
      dietaryRestrictions: ['vegetarian'],
      cuisineTypes: ['italian', 'asian'],
      foodBudgetLevel: 'medium'
    },
    accommodation: {
      type: 'hotel',
      starRating: 4
    },
    transportation: {
      primaryMode: 'mixed',
      maxWalkingDistance: 30
    },
    groupSize: {
      preferred: 2,
      sizes: [2, 4]
    },
    accessibility: {
      mobilityNeeds: false,
      visualNeeds: false,
      hearingNeeds: false
    },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  describe('profile validation', () => {
    it('should validate a complete profile successfully', () => {
      expect(() => {
        validateTravelPreferenceProfile(mockProfile);
      }).not.toThrow();
    });

    it('should fail validation for missing required fields', () => {
      const incompleteProfile = {
        ...mockProfile,
        name: '',
        travelStyle: undefined as any
      };

      expect(() => {
        validateTravelPreferenceProfile(incompleteProfile);
      }).toThrow();
    });

    it('should validate budget range constraints', () => {
      const invalidBudgetProfile = {
        ...mockProfile,
        budgetRange: {
          min: 5000,
          max: 1000,
          currency: 'USD'
        }
      };

      expect(() => {
        validateTravelPreferenceProfile(invalidBudgetProfile);
      }).toThrow('Budget maximum must be greater than minimum');
    });

    it('should validate activity preference ranges', () => {
      const invalidActivityProfile = {
        ...mockProfile,
        activities: {
          ...mockProfile.activities,
          adventure: 15 // Invalid: over maximum of 10
        }
      };

      expect(() => {
        validateTravelPreferenceProfile(invalidActivityProfile);
      }).toThrow();
    });

    it('should validate accommodation star rating', () => {
      const invalidAccommodationProfile = {
        ...mockProfile,
        accommodation: {
          ...mockProfile.accommodation,
          starRating: 6 // Invalid: over maximum of 5
        }
      };

      expect(() => {
        validateTravelPreferenceProfile(invalidAccommodationProfile);
      }).toThrow();
    });
  });
});
