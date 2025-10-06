import { renderHook, act } from '@testing-library/react-hooks';
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

describe('useTravelPreferences createProfile', () => {
  beforeEach(() => {
    require('firebase/firestore').getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ travelPreferences: { profiles: [], defaultProfileId: null, preferenceSignals: [] } })
    });
  });

  it('creates and saves a new profile', async () => {
    const newProfile: Omit<TravelPreferenceProfile, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'Test Profile',
      isDefault: true,
      travelStyle: 'mid-range',
      budgetRange: { min: 1000, max: 5000, currency: 'USD' },
      activities: [],
      foodPreferences: { dietaryRestrictions: [], cuisineTypes: [], foodBudgetLevel: 'medium' },
      accommodation: { type: 'hotel', starRating: 3 },
      transportation: { primaryMode: 'mixed', maxWalkingDistance: 15 },
      groupSize: { preferred: 2, sizes: [1, 2] },
      accessibility: { mobilityNeeds: false, visualNeeds: false, hearingNeeds: false }
    };
    const { result } = renderHook(() => useTravelPreferences());
    await act(async () => {
      await result.current.createProfile(newProfile);
    });
    expect(result.current.preferences?.profiles.length).toBe(1);
    expect(result.current.preferences?.profiles[0].name).toBe('Test Profile');
  });
});
