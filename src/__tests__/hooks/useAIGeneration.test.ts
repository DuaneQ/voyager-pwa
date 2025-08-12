// Mock Firestore for useAIGeneration
const singletonFunctions = {};
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(),
  onSnapshot: jest.fn((_, onNext) => {
    setTimeout(() => {
      onNext({ exists: () => true, data: () => ({
        status: 'completed',
        response: { success: true, data: { itinerary: {}, recommendations: [], costBreakdown: {}, metadata: { generationId: 'gen_123' } } },
        id: 'gen_123',
        request: {},
        createdAt: { toDate: () => new Date() }
      }) });
    }, 50);
    return () => {};
  }),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
}));
jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => singletonFunctions),
  httpsCallable: jest.fn((_, name, options) => {
    return async (request: any) => {
      console.log('MOCK httpsCallable called with:', name);
      if (name === 'estimateItineraryCost') {
        return { data: { success: true, data: { estimatedCost: 2000 } } };
      }
      if (name === 'generateItinerary') {
        return { data: { success: true, data: { itinerary: {}, recommendations: [], costBreakdown: {}, metadata: { generationId: 'gen_123' } } } };
      }
      return { data: { success: true, data: {} } };
    };
  }),
}));
import { renderHook, act } from '@testing-library/react';
import { waitFor } from '@testing-library/react';
import React from 'react';
import { useAIGeneration } from '../../hooks/useAIGeneration';
import { AIGenerationRequest } from '../../types/AIGeneration';
import { UserProfileContext } from '../../Context/UserProfileContext';

// Mock Firebase auth
jest.mock('../../environments/firebaseConfig', () => ({
  auth: {
    currentUser: { uid: 'test-user-id', email: 'test@example.com' }
  }
}));

// Mock the travel preferences hook
jest.mock('../../hooks/useTravelPreferences', () => ({
  useTravelPreferences: () => ({
    preferences: {
      profiles: [
        { 
          id: 'profile-1', 
          name: 'Default', 
          isDefault: true,
          budgetRange: { min: 1000, max: 3000, currency: 'USD' },
          groupSize: { preferred: 2, sizes: [1, 2, 4] }
        }
      ]
    },
    loading: false,
    getDefaultProfile: () => ({ 
      id: 'profile-1', 
      name: 'Default', 
      isDefault: true,
      budgetRange: { min: 1000, max: 3000, currency: 'USD' },
      groupSize: { preferred: 2, sizes: [1, 2, 4] }
    }),
    getProfileById: (id: string) => ({ 
      id: 'profile-1', 
      name: 'Default', 
      isDefault: true,
      budgetRange: { min: 1000, max: 3000, currency: 'USD' },
      groupSize: { preferred: 2, sizes: [1, 2, 4] }
    })
  })
}));

// Mock UserProfileContext
const mockUserProfile = {
  uid: 'test-user-id',
  username: 'testuser',
  email: 'test@example.com',
  gender: 'male',
  dob: '1990-01-01',
  status: 'active',
  sexualOrientation: 'straight',
  blocked: []
};

const MockUserProfileProvider = ({ children }: { children: React.ReactNode }) => {
  return React.createElement(UserProfileContext.Provider, {
    value: { 
      userProfile: mockUserProfile, 
      setUserProfile: jest.fn(), 
      updateUserProfile: jest.fn(), 
      isLoading: false 
    }
  }, children);
};

describe('useAIGeneration', () => {
  const mockRequest: AIGenerationRequest = {
    destination: 'Tokyo, Japan',
    startDate: '2025-03-15',
    endDate: '2025-03-22',
    tripType: 'leisure',
    preferenceProfileId: 'profile-1',
    specialRequests: '',
    mustInclude: [],
    mustAvoid: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useAIGeneration(), {
      wrapper: MockUserProfileProvider
    });

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.progress).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.result).toBe(null);
  });

  it('should estimate cost correctly', async () => {
    const { result } = renderHook(() => useAIGeneration(), {
      wrapper: MockUserProfileProvider
    });

    let cost: number = 0;
    await act(async () => {
      cost = await result.current.estimateCost({
        preferenceProfileId: 'profile-1',
        startDate: '2025-03-15',
        endDate: '2025-03-22'
      });
    });

    await waitFor(() => {
      expect(typeof cost).toBe('number');
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBeLessThanOrEqual(3000);
    });
  });

  it('should handle authentication error', async () => {
    // Mock unauthenticated user
    const originalAuth = jest.requireMock('../../environments/firebaseConfig').auth;
    originalAuth.currentUser = null;

    const { result } = renderHook(() => useAIGeneration(), {
      wrapper: MockUserProfileProvider
    });

    await expect(act(async () => {
      await result.current.generateItinerary(mockRequest);
    })).rejects.toThrow('User must be authenticated to generate itineraries');

    // Restore auth
    originalAuth.currentUser = { uid: 'test-user-id', email: 'test@example.com' };
  });
});
