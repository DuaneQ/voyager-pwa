// Mock firebase/auth to provide a valid currentUser
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: { uid: 'test-user-id' },
  })),
}));
import { renderHook } from '@testing-library/react';
// Mock auth.currentUser for useUsageTracking
jest.mock('../../environments/firebaseConfig', () => {
  return {
    app: {},
    auth: {
      get currentUser() {
        return (global as any).__mockCurrentUser;
      },
    },
  };
});

import { useUsageTracking } from '../../hooks/useUsageTracking';
import React from 'react';

// (already mocked above)
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  getDoc: jest.fn(),
}));

// Import the real context (not the mock)
import { UserProfileContext } from '../../Context/UserProfileContext';
jest.mock('../../hooks/useGetUserId', () => () => 'test-user-id');

describe('useUsageTracking', () => {
  const mockUpdateUserProfile = jest.fn();

  function getWrapper(userProfile: any) {
    return ({ children }: any) => {
  (global as any).__mockCurrentUser = { uid: 'test-user-id' };
      return (
        <UserProfileContext.Provider value={{ userProfile, updateUserProfile: mockUpdateUserProfile }}>
          {children}
        </UserProfileContext.Provider>
      );
    };
  }

  it('should return correct daily limit', () => {
    const userProfile = {
      subscriptionType: 'free',
      subscriptionEndDate: null,
      subscriptionCancelled: false,
      dailyUsage: { date: '2035-07-05', viewCount: 5 }, // 10 years in the future
    };
    const { result } = renderHook(() => useUsageTracking(), {
      wrapper: getWrapper(userProfile),
    });
    expect(result.current.dailyLimit).toBe(10);
  });

  it('should detect premium status', () => {
    const premiumProfile = {
      subscriptionType: 'premium',
      subscriptionEndDate: '2099-12-31',
      subscriptionCancelled: false,
      dailyUsage: { date: '2035-07-05', viewCount: 5 }, // 10 years in the future
    };
    const { result } = renderHook(() => useUsageTracking(), {
      wrapper: getWrapper(premiumProfile),
    });
    expect(result.current.hasPremium()).toBe(true);
  });

  it('should detect when user has reached limit', () => {
    const profile = {
      subscriptionType: 'free',
      subscriptionEndDate: null,
      subscriptionCancelled: false,
      dailyUsage: { date: new Date().toISOString().split('T')[0], viewCount: 10 },
    };
    const { result } = renderHook(() => useUsageTracking(), {
      wrapper: getWrapper(profile),
    });
    expect(result.current.hasReachedLimit()).toBe(true);
  });

  it('should return correct remaining views', () => {
    const profile = {
      subscriptionType: 'free',
      subscriptionEndDate: null,
      subscriptionCancelled: false,
      dailyUsage: { date: new Date().toISOString().split('T')[0], viewCount: 5 },
    };
    const { result } = renderHook(() => useUsageTracking(), {
      wrapper: getWrapper(profile),
    });
    expect(result.current.getRemainingViews()).toBe(5);
  });

  it('should return correct remaining AI creations for free user', () => {
    const profile = {
      subscriptionType: 'free',
      subscriptionEndDate: null,
      subscriptionCancelled: false,
      dailyUsage: { date: new Date().toISOString().split('T')[0], viewCount: 1, aiItineraries: { date: new Date().toISOString().split('T')[0], count: 2 } },
    };
    const { result } = renderHook(() => useUsageTracking(), {
      wrapper: getWrapper(profile),
    });
  expect((result.current as any).getRemainingAICreations()).toBe(3); // FREE_DAILY_AI_LIMIT (5) - 2
  });

  it('should not allow tracking AI creation when free limit reached', async () => {
    const updateDoc = require('firebase/firestore').updateDoc;
    updateDoc.mockClear();
    const profile = {
      subscriptionType: 'free',
      subscriptionEndDate: null,
      subscriptionCancelled: false,
      dailyUsage: { date: new Date().toISOString().split('T')[0], viewCount: 1, aiItineraries: { date: new Date().toISOString().split('T')[0], count: 5 } },
    };
    const { result } = renderHook(() => useUsageTracking(), {
      wrapper: getWrapper(profile),
    });
  const success = await (result.current as any).trackAICreation();
    expect(success).toBe(false);
  });

  it('should track an AI creation for free user and update profile/localStorage', async () => {
    const updateDoc = require('firebase/firestore').updateDoc;
    updateDoc.mockResolvedValueOnce();
    const userProfile = {
      subscriptionType: 'free',
      subscriptionEndDate: null,
      subscriptionCancelled: false,
      dailyUsage: { date: new Date().toISOString().split('T')[0], viewCount: 0, aiItineraries: { date: new Date().toISOString().split('T')[0], count: 1 } },
    };
    const { result } = renderHook(() => useUsageTracking(), {
      wrapper: getWrapper(userProfile),
    });
    // Mock localStorage
    const setItemSpy = jest.spyOn(window.localStorage.__proto__, 'setItem');
    setItemSpy.mockImplementation(() => {});
  const success = await (result.current as any).trackAICreation();
    expect(success).toBe(true);
    expect(updateDoc).toHaveBeenCalled();
    expect(mockUpdateUserProfile).toHaveBeenCalled();
    expect(setItemSpy).toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it('should track a view for free user and update profile/localStorage', async () => {
    const updateDoc = require('firebase/firestore').updateDoc;
    updateDoc.mockResolvedValueOnce();
    const userProfile = {
      subscriptionType: 'free',
      subscriptionEndDate: null,
      subscriptionCancelled: false,
      dailyUsage: { date: new Date().toISOString().split('T')[0], viewCount: 5 },
    };
    const { result } = renderHook(() => useUsageTracking(), {
      wrapper: getWrapper(userProfile),
    });
    // Mock localStorage
    const setItemSpy = jest.spyOn(window.localStorage.__proto__, 'setItem');
    setItemSpy.mockImplementation(() => {});
    const success = await result.current.trackView();
    expect(success).toBe(true);
    expect(updateDoc).toHaveBeenCalled();
    expect(mockUpdateUserProfile).toHaveBeenCalled();
    expect(setItemSpy).toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it('should not track a view if user is premium', async () => {
    const updateDoc = require('firebase/firestore').updateDoc;
    updateDoc.mockClear();
    const premiumProfile = {
      subscriptionType: 'premium',
      subscriptionEndDate: '2099-12-31',
      subscriptionCancelled: false,
      dailyUsage: { date: new Date().toISOString().split('T')[0], viewCount: 5 },
    };
    const { result } = renderHook(() => useUsageTracking(), {
      wrapper: getWrapper(premiumProfile),
    });
    const success = await result.current.trackView();
    expect(success).toBe(true); // Premium users always succeed
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('should treat cancelled premium as premium until end date', () => {
    const cancelledProfile = {
      subscriptionType: 'premium',
      subscriptionEndDate: '2099-12-31',
      subscriptionCancelled: true,
      dailyUsage: { date: new Date().toISOString().split('T')[0], viewCount: 5 },
    };
    const { result } = renderHook(() => useUsageTracking(), {
      wrapper: getWrapper(cancelledProfile),
    });
    expect(result.current.hasPremium()).toBe(true);
  });

  it('should reset daily usage and update profile/localStorage', async () => {
    const updateDoc = require('firebase/firestore').updateDoc;
    const getDoc = require('firebase/firestore').getDoc;
    updateDoc.mockResolvedValueOnce();
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        subscriptionType: 'free',
        subscriptionEndDate: null,
        subscriptionCancelled: false,
        dailyUsage: { date: new Date().toISOString().split('T')[0], viewCount: 0 },
      }),
    });
    const userProfile = {
      subscriptionType: 'free',
      subscriptionEndDate: null,
      subscriptionCancelled: false,
      dailyUsage: { date: new Date().toISOString().split('T')[0], viewCount: 5 },
    };
    const setItemSpy = jest.spyOn(window.localStorage.__proto__, 'setItem');
    setItemSpy.mockImplementation(() => {});
    const { result } = renderHook(() => useUsageTracking(), {
      wrapper: getWrapper(userProfile),
    });
    await result.current.resetDailyUsage();
    expect(updateDoc).toHaveBeenCalled();
    expect(getDoc).toHaveBeenCalled();
    expect(mockUpdateUserProfile).toHaveBeenCalled();
    expect(setItemSpy).toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it('should handle error in trackView gracefully', async () => {
    const updateDoc = require('firebase/firestore').updateDoc;
    updateDoc.mockRejectedValueOnce(new Error('Firestore error'));
    const userProfile = {
      subscriptionType: 'free',
      subscriptionEndDate: null,
      subscriptionCancelled: false,
      dailyUsage: { date: new Date().toISOString().split('T')[0], viewCount: 5 },
    };
    const { result } = renderHook(() => useUsageTracking(), {
      wrapper: getWrapper(userProfile),
    });
    const success = await result.current.trackView();
    expect(success).toBe(false);
  });
});
