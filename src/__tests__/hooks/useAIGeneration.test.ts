import { renderHook, act } from '@testing-library/react';
import { useAIGeneration } from '../../hooks/useAIGeneration';
import { AIGenerationRequest } from '../../types/AIGeneration';

// Mock Firebase auth
jest.mock('../../environments/firebaseConfig', () => ({
  auth: {
    currentUser: { uid: 'test-user-id' }
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
    const { result } = renderHook(() => useAIGeneration());

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.progress).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.result).toBe(null);
  });

  it('should handle generation lifecycle', async () => {
    const { result } = renderHook(() => useAIGeneration());

    // Start generation
    act(() => {
      result.current.generateItinerary(mockRequest);
    });

    expect(result.current.isGenerating).toBe(true);
    expect(result.current.progress?.stage).toBe(1);
    expect(result.current.error).toBe(null);

    // Wait for generation to complete (using fake timers would be better for real tests)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  it('should handle generation cancellation', () => {
    const { result } = renderHook(() => useAIGeneration());

    act(() => {
      result.current.generateItinerary(mockRequest);
    });

    expect(result.current.isGenerating).toBe(true);

    act(() => {
      result.current.cancelGeneration();
    });

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.error).toBe('Generation cancelled by user');
  });

  it('should reset generation state', () => {
    const { result } = renderHook(() => useAIGeneration());

    // Set some state first
    act(() => {
      result.current.generateItinerary(mockRequest);
      result.current.cancelGeneration();
    });

    expect(result.current.error).toBe('Generation cancelled by user');

    // Reset state
    act(() => {
      result.current.resetGeneration();
    });

    expect(result.current.isGenerating).toBe(false);
    expect(result.current.progress).toBe(null);
    expect(result.current.error).toBe(null);
    expect(result.current.result).toBe(null);
  });

  it('should estimate cost correctly', async () => {
    const { result } = renderHook(() => useAIGeneration());

    const cost = await act(async () => {
      return await result.current.estimateCost({
        preferenceProfileId: 'profile-1',
        startDate: '2025-03-15',
        endDate: '2025-03-22'
      });
    });

    expect(typeof cost).toBe('number');
    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThanOrEqual(3000); // Should not exceed max budget from profile
  });

  it('should handle authentication error', async () => {
    // Mock unauthenticated user
    const originalAuth = jest.requireMock('../../environments/firebaseConfig').auth;
    originalAuth.currentUser = null;

    const { result } = renderHook(() => useAIGeneration());

    await expect(act(async () => {
      await result.current.generateItinerary(mockRequest);
    })).rejects.toThrow('User must be authenticated to generate itineraries');

    // Restore auth
    originalAuth.currentUser = { uid: 'test-user-id' };
  });
});
