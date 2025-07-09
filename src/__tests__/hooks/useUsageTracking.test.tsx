import { renderHook } from '@testing-library/react-hooks';
import { useUsageTracking } from '../../hooks/useUsageTracking';
import React from 'react';

jest.mock('../../environments/firebaseConfig', () => ({
  app: {},
}));
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
    return ({ children }: any) => (
      <UserProfileContext.Provider value={{ userProfile, updateUserProfile: mockUpdateUserProfile }}>
        {children}
      </UserProfileContext.Provider>
    );
  }

  it('should return correct daily limit', () => {
    const userProfile = {
      subscriptionType: 'free',
      subscriptionEndDate: null,
      subscriptionCancelled: false,
      dailyUsage: { date: '2025-07-05', viewCount: 5 },
    };
    const { result } = renderHook(() => useUsageTracking(), {
      wrapper: getWrapper(userProfile),
    });
    expect(result.current.dailyLimit).toBe(20);
  });

  it('should detect premium status', () => {
    const premiumProfile = {
      subscriptionType: 'premium',
      subscriptionEndDate: '2099-12-31',
      subscriptionCancelled: false,
      dailyUsage: { date: '2025-07-05', viewCount: 5 },
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
      dailyUsage: { date: new Date().toISOString().split('T')[0], viewCount: 20 },
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
    expect(result.current.getRemainingViews()).toBe(15);
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
