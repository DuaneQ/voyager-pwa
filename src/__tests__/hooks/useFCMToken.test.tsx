import React from 'react';
import { renderHook, act } from '@testing-library/react';

// We'll mock the fcmUtils functions used by the hook
const mockIsSupported = jest.fn();
const mockValidate = jest.fn();
const mockSetup = jest.fn();

jest.mock('../../utils/fcmUtils', () => ({
  isFCMSupported: (...args: any[]) => mockIsSupported(...args),
  validateFCMSetup: (...args: any[]) => mockValidate(...args),
  setupFCMForUser: (...args: any[]) => mockSetup(...args)
}));

// Mock auth
jest.mock('../../environments/firebaseConfig', () => ({ auth: { currentUser: { uid: 'user-1' } } }));

describe('useFCMToken', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('does nothing when FCM is not supported', () => {
    mockIsSupported.mockReturnValue(false);
    mockValidate.mockReturnValue({ supported: false, issues: [] });

    const { result, unmount } = renderHook(() => require('../../hooks/useFCMToken').useFCMToken());
    // advance timers so effect runs
    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(mockIsSupported).toHaveBeenCalled();
    expect(mockValidate).not.toHaveBeenCalled();
    unmount();
  });

  it('runs validation and setup when supported and setup succeeds', async () => {
    mockIsSupported.mockReturnValue(true);
    mockValidate.mockReturnValue({ supported: true, issues: [] });
    mockSetup.mockResolvedValue({ success: true });

    renderHook(() => require('../../hooks/useFCMToken').useFCMToken());

    await act(async () => {
      jest.runOnlyPendingTimers();
      // allow any pending promises to resolve
      await Promise.resolve();
    });

    expect(mockValidate).toHaveBeenCalled();
    expect(mockSetup).toHaveBeenCalledWith('user-1');
  });

  it('logs error when setup fails', async () => {
    mockIsSupported.mockReturnValue(true);
    mockValidate.mockReturnValue({ supported: true, issues: [] });
    mockSetup.mockResolvedValue({ success: false, error: 'no-permission' });

    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    renderHook(() => require('../../hooks/useFCMToken').useFCMToken());

    await act(async () => {
      jest.runOnlyPendingTimers();
      await Promise.resolve();
    });

    expect(mockSetup).toHaveBeenCalled();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
