// Per-file localStorage polyfill to avoid JSDOM opaque-origin SecurityError for imports that access localStorage.
if (typeof window !== 'undefined' && typeof (window as any).localStorage === 'undefined') {
  const _store: Record<string, string> = {};
  try {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      enumerable: true,
      value: {
        getItem: (key: string) => (_store.hasOwnProperty(key) ? _store[key] : null),
        setItem: (key: string, value: string) => { _store[key] = String(value); },
        removeItem: (key: string) => { delete _store[key]; },
        clear: () => { Object.keys(_store).forEach(k => delete _store[k]); }
      }
    });
  } catch (e) {
    // Some environments won't allow defining window.localStorage; ignore and let tests provide mocks in beforeEach
  }
}

import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Mock firebase/firestore with inline jest.fn() to avoid TDZ from jest hoisting
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1 })),
  getFirestore: jest.fn(() => ({ firestore: true })),
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
  // Ensure getFirestore always returns a valid object
  mockedFirestore.getFirestore.mockReturnValue({ firestore: true });
    // Install per-test localStorage mock to avoid altering global setup
    const store: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: (k: string) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); }
    };
    try { Object.defineProperty(window, 'localStorage', { value: mockLocalStorage, configurable: true }); } catch (e) {}

    jest.clearAllMocks();
    const mockDoc = mockedFirestore.doc as jest.Mock;
    const mockSetDoc = mockedFirestore.setDoc as jest.Mock;
    mockDoc.mockImplementation((...args) => {
      // Log doc args for troubleshooting
      // eslint-disable-next-line no-console
      console.log('[TEST] doc called with:', ...args);
      return 'ai-doc-ref';
    });
    mockSetDoc.mockImplementation((...args) => {
      // Log setDoc args for troubleshooting
      // eslint-disable-next-line no-console
      console.log('[TEST] setDoc called with:', ...args);
      return Promise.resolve(undefined);
    });

    // Get the mocked functions from the mocked module (safe after jest.mock)
    const mockGetFunctions = mockedFunctions.getFunctions as jest.Mock;
    const mockHttpsCallable = mockedFunctions.httpsCallable as jest.Mock;

    mockGetFunctions.mockReturnValue({});

    // httpsCallable should return a function which when called returns a Promise
      mockHttpsCallable.mockImplementation((functions: any, name: string) => {
        if (name === 'searchAccommodations') {
          return jest.fn(() => Promise.resolve({ data: { hotels: [{ id: 'h1', name: 'Hotel 1' }] } }));
        }
        if (name === 'searchActivities') {
          // Return two activities with both id and placeId so alternativeActivities logic works
          return jest.fn(() => Promise.resolve({ data: { activities: [
            { id: 'a1', name: 'Louvre Tour', placeId: 'p1' },
            { id: 'a2', name: 'Eiffel Visit', placeId: 'p2' }
          ] } }));
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
    // Actual usage: doc(db, 'ai_generations', clientGenerationId)
    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'ai_generations', expect.any(String));
    expect(mockSetDoc).toHaveBeenCalled();
    const savedArg = mockSetDoc.mock.calls[0][1];
    expect(Array.isArray(savedArg.response.data.recommendations.alternativeActivities)).toBe(true);
    expect(savedArg.response.data.recommendations.alternativeActivities?.length).toBeGreaterThan(0);
    expect(savedArg.response.data.recommendations.alternativeActivities?.[0]?.name).toMatch(/Louvre Tour|Eiffel Visit/);
  });

  it('handles activities callable rejection gracefully and still saves generation with empty activities', async () => {
    // Override httpsCallable to make searchActivities reject
    const mockHttpsCallable = mockedFunctions.httpsCallable as jest.Mock;
    mockHttpsCallable.mockImplementation((functions: any, name: string) => {
      if (name === 'searchAccommodations') return jest.fn(() => Promise.resolve({ data: { hotels: [] } }));
      if (name === 'searchActivities') return jest.fn(() => Promise.reject(new Error('Places failed')));
      return jest.fn(() => Promise.resolve({ data: {} }));
    });

    const { result } = renderHook(() => useAIGeneration(), { wrapper });
    const req = { destination: 'Paris', startDate: '2025-10-01', endDate: '2025-10-05', preferenceProfile: { transportation: { primaryMode: 'ground' } } } as any;

    await act(async () => {
      const res = await result.current.generateItinerary(req);
      expect(res.success).toBe(true);
    });

    const mockSetDoc = mockedFirestore.setDoc as jest.Mock;
    // verify saved payload contains recommendations.activities (may be empty)
    expect(mockSetDoc).toHaveBeenCalled();
    const savedArg = mockSetDoc.mock.calls[0][1];
    // Fallback payload uses alternativeActivities, not activities
    expect(Array.isArray(savedArg.response.data.recommendations.alternativeActivities)).toBe(true);
  });

  it('parses nested activities response shapes correctly', async () => {
    // Override httpsCallable to return nested shape
    const mockHttpsCallable = mockedFunctions.httpsCallable as jest.Mock;
    mockHttpsCallable.mockImplementation((functions: any, name: string) => {
      if (name === 'searchAccommodations') return jest.fn(() => Promise.resolve({ data: { hotels: [] } }));
      if (name === 'searchActivities') return jest.fn(() => Promise.resolve({ data: { data: { activities: [{ id: 'a2', name: 'Nested Tour' }] } } }));
      return jest.fn(() => Promise.resolve({ data: {} }));
    });

    const { result } = renderHook(() => useAIGeneration(), { wrapper });
    const req = { destination: 'Paris', startDate: '2025-10-01', endDate: '2025-10-05', preferenceProfile: { transportation: { primaryMode: 'ground' } } } as any;

    await act(async () => {
      const res = await result.current.generateItinerary(req);
      expect(res.success).toBe(true);
    });

    const mockSetDoc = mockedFirestore.setDoc as jest.Mock;
    expect(mockSetDoc).toHaveBeenCalled();
    const savedArg = mockSetDoc.mock.calls[0][1];
  // Fallback payload uses alternativeActivities, not activities
  expect(Array.isArray(savedArg.response.data.recommendations.alternativeActivities)).toBe(true);
  expect(savedArg.response.data.recommendations.alternativeActivities?.length).toBeGreaterThan(0);
  expect(savedArg.response.data.recommendations.alternativeActivities?.[0]?.name).toMatch(/Nested Tour/);
  });

  it('handles Firestore write failure gracefully', async () => {
    const mockSetDoc = mockedFirestore.setDoc as jest.Mock;
    mockSetDoc.mockRejectedValueOnce(new Error('Firestore write failed'));
    const { result } = renderHook(() => useAIGeneration(), { wrapper });
    const req = { destination: 'Paris', startDate: '2025-10-01', endDate: '2025-10-05', preferenceProfile: { transportation: { primaryMode: 'ground' } } } as any;
    await expect(result.current.generateItinerary(req)).rejects.toThrow('Firestore write failed');
  });
});
