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
});
