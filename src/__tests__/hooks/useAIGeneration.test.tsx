import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Mock firebase/firestore with inline jest.fn() to avoid TDZ from jest hoisting
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1 })),
}));

// Mock firebase/functions with inline jest.fn() to avoid TDZ from jest hoisting
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn(),
}));

// Mock environments/firebaseConfig before requiring the hook so its module init won't call the real db/auth
jest.mock('../../environments/firebaseConfig', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-uid', email: 'me@example.com' } }
}));

// Now import the hook under test
import { useAIGeneration } from '../../hooks/useAIGeneration';
import { UserProfileContext } from '../../Context/UserProfileContext';

// Grab references to the mocked modules so we can control them in tests
const mockedFirestore = jest.requireMock('firebase/firestore');
const mockedFunctions = jest.requireMock('firebase/functions');

describe('useAIGeneration hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const mockDoc = mockedFirestore.doc as jest.Mock;
    const mockSetDoc = mockedFirestore.setDoc as jest.Mock;
    mockDoc.mockReturnValue('ai-doc-ref');
    mockSetDoc.mockResolvedValue(undefined);

    // Get the mocked functions from the mocked module (safe after jest.mock)
    const mockGetFunctions = mockedFunctions.getFunctions as jest.Mock;
    const mockHttpsCallable = mockedFunctions.httpsCallable as jest.Mock;

    mockGetFunctions.mockReturnValue({});

    // httpsCallable should return a function which when called returns a Promise
    mockHttpsCallable.mockImplementation((functions: any, name: string) => {
      if (name === 'searchAccommodations') {
        return jest.fn(() => Promise.resolve({ data: { hotels: [{ id: 'h1', name: 'Hotel 1' }] } }));
      }
      // default: flights or other calls
      return jest.fn(() => Promise.resolve({ data: {} }));
    });
  });

  const userProfile = { username: 'tester', email: 'me@example.com', uid: 'test-uid' };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <UserProfileContext.Provider value={{ userProfile, updateUserProfile: jest.fn(), setUserProfile: jest.fn(), isLoading: false }}>
      {children}
    </UserProfileContext.Provider>
  );

  it('succeeds and saves a generation when accommodations-only', async () => {
    const { result } = renderHook(() => useAIGeneration(), { wrapper });

    const req = {
      destination: 'Paris',
      startDate: '2025-10-01',
      endDate: '2025-10-05',
      // preferenceProfile with non-flight primary mode so flights are skipped
      preferenceProfile: { transportation: { primaryMode: 'ground' } }
    } as any;

    await act(async () => {
      const res = await result.current.generateItinerary(req);
      expect(res).toHaveProperty('id');
      expect(res.success).toBe(true);
    });

    // Ensure we attempted to write to Firestore
  const mockDoc = mockedFirestore.doc as jest.Mock;
  const mockSetDoc = mockedFirestore.setDoc as jest.Mock;
  expect(mockDoc).toHaveBeenCalledWith(expect.any(Object), 'ai_generations', expect.any(String));
  expect(mockSetDoc).toHaveBeenCalled();
  });
});
