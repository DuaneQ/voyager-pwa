import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react';
import { useTravelPreferences } from '../../hooks/useTravelPreferences';
import { TravelPreferenceProfile } from '../../types/TravelPreferences';

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn()
}));
jest.mock('../../environments/firebaseConfig', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-id' } }
}));

describe('useTravelPreferences profile creation vs update', () => {
  beforeEach(() => {
    // Default mock for getDoc to avoid undefined errors
    require('firebase/firestore').getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ travelPreferences: { profiles: [], defaultProfileId: null, preferenceSignals: [] } })
    });
  });
  it('creates a new profile when name is changed', async () => {
    const initialProfile: TravelPreferenceProfile = {
      id: 'profile_1',
      name: 'Original Profile',
      isDefault: true,
      travelStyle: 'mid-range',
      budgetRange: { min: 1000, max: 5000, currency: 'USD' },
      activities: [],
      foodPreferences: { dietaryRestrictions: [], cuisineTypes: [], foodBudgetLevel: 'medium' },
      accommodation: { type: 'hotel', starRating: 3 },
      transportation: { primaryMode: 'mixed', maxWalkingDistance: 15 },
      groupSize: { preferred: 2, sizes: [1, 2] },
      accessibility: { mobilityNeeds: false, visualNeeds: false, hearingNeeds: false },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    // Use a mutable profiles array to persist state between calls
    const profiles = [initialProfile];
    const getDocMock = require('firebase/firestore').getDoc;
    getDocMock.mockImplementation(() => Promise.resolve({
      exists: () => true,
      data: () => ({ travelPreferences: { profiles, defaultProfileId: 'profile_1', preferenceSignals: [] } })
    }));
    const { result } = renderHook(() => useTravelPreferences());
    await act(async () => {
      await result.current.updateProfile('profile_1', { name: 'New Profile Name' });
      // After mutation, push the new profile to the array
      if (result.current.preferences?.profiles.length === 2) {
        profiles.push(result.current.preferences.profiles[1]);
      }
    });
    console.log('[TEST] profiles after name change:', JSON.stringify(result.current.preferences?.profiles, null, 2));
    expect(result.current.preferences?.profiles.length).toBe(2);
    // The original profile should remain unchanged
    expect(result.current.preferences?.profiles[0].name).toBe('Original Profile');
    // The new profile should have the updated name
    expect(result.current.preferences?.profiles[1].name).toBe('New Profile Name');
  });

  it('updates the profile if name is unchanged', async () => {
    const initialProfile: TravelPreferenceProfile = {
      id: 'profile_2',
      name: 'Keep Name',
      isDefault: true,
      travelStyle: 'mid-range',
      budgetRange: { min: 1000, max: 5000, currency: 'USD' },
      activities: [],
      foodPreferences: { dietaryRestrictions: [], cuisineTypes: [], foodBudgetLevel: 'medium' },
      accommodation: { type: 'hotel', starRating: 3 },
      transportation: { primaryMode: 'mixed', maxWalkingDistance: 15 },
      groupSize: { preferred: 2, sizes: [1, 2] },
      accessibility: { mobilityNeeds: false, visualNeeds: false, hearingNeeds: false },
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const getDocMock = require('firebase/firestore').getDoc;
    getDocMock.mockResolvedValueOnce({ exists: () => true, data: () => ({ travelPreferences: { profiles: [initialProfile], defaultProfileId: 'profile_2', preferenceSignals: [] } }) });
    const { result } = renderHook(() => useTravelPreferences());
    await act(async () => {
      await result.current.updateProfile('profile_2', { travelStyle: 'luxury' });
    });
    console.log('[TEST] profiles after update:', result.current.preferences?.profiles);
    expect(result.current.preferences?.profiles.length).toBe(1);
    expect(result.current.preferences?.profiles[0].travelStyle).toBe('luxury');
  });
});
