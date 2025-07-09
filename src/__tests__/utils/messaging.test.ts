import { initializeMessaging } from '../../utils/messaging';

describe('initializeMessaging', () => {
  let originalNavigator: any;
  let originalWindow: any;

  beforeEach(() => {
    // Save originals
    originalNavigator = { ...global.navigator };
    originalWindow = { ...global.window };
  });

  afterEach(() => {
    // Restore originals
    Object.defineProperty(global, 'navigator', { value: originalNavigator, configurable: true });
    Object.defineProperty(global, 'window', { value: originalWindow, configurable: true });
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('returns null and warns if serviceWorker or Notification not supported', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    Object.defineProperty(global, 'navigator', { value: {}, configurable: true });
    Object.defineProperty(global, 'window', { value: {}, configurable: true });
    const result = await initializeMessaging();
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Browser does not support push notifications');
    warnSpy.mockRestore();
  });

  it('returns null and warns if isSupported resolves to false', async () => {
    Object.defineProperty(global, 'navigator', { value: { serviceWorker: {} }, configurable: true });
    Object.defineProperty(global, 'window', { value: { Notification: {} }, configurable: true });
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.doMock('firebase/messaging', () => ({
      isSupported: jest.fn().mockResolvedValue(false),
      getMessaging: jest.fn(),
    }));
    // Re-import after mocking
    const { initializeMessaging: isolatedInit } = require('../../utils/messaging');
    const result = await isolatedInit();
    expect(result).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith('Firebase Messaging not supported');
    warnSpy.mockRestore();
  });

  it('returns messaging instance if supported', async () => {
    Object.defineProperty(global, 'navigator', { value: { serviceWorker: {} }, configurable: true });
    Object.defineProperty(global, 'window', { value: { Notification: {} }, configurable: true });
    const mockMessaging = { foo: 'bar' };
    jest.doMock('firebase/messaging', () => ({
      isSupported: jest.fn().mockResolvedValue(true),
      getMessaging: jest.fn().mockReturnValue(mockMessaging),
    }));
    const { initializeMessaging: isolatedInit } = require('../../utils/messaging');
    const result = await isolatedInit();
    expect(result).toBe(mockMessaging);
  });

  it('returns null and logs error if import or call fails', async () => {
    Object.defineProperty(global, 'navigator', { value: { serviceWorker: {} }, configurable: true });
    Object.defineProperty(global, 'window', { value: { Notification: {} }, configurable: true });
    const error = new Error('fail');
    jest.doMock('firebase/messaging', () => { throw error; });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { initializeMessaging: isolatedInit } = require('../../utils/messaging');
    const result = await isolatedInit();
    expect(result).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith('Failed to initialize messaging:', error);
    errorSpy.mockRestore();
  });
});
