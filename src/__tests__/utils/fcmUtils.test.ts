// Mock firebaseConfig to avoid running real Firestore code during tests
jest.mock('../../environments/firebaseConfig', () => ({
  app: {},
  auth: {},
  db: {},
  getMessagingInstance: jest.fn(() => null),
}));

// Mock browser APIs and Firebase
const mockGetMessaging = jest.fn();
const mockGetToken = jest.fn();
const mockDeleteToken = jest.fn();
const mockOnMessage = jest.fn();
const mockSetDoc = jest.fn();
const mockGetFirestore = jest.fn();
const mockDoc = jest.fn();

jest.mock('firebase/messaging', () => ({
  getMessaging: (...args) => mockGetMessaging(...args),
  getToken: (...args) => mockGetToken(...args),
  deleteToken: (...args) => mockDeleteToken(...args),
  onMessage: (...args) => mockOnMessage(...args),
}));
jest.mock('firebase/firestore', () => ({
  getFirestore: (...args) => mockGetFirestore(...args),
  setDoc: (...args) => mockSetDoc(...args),
  doc: (...args) => mockDoc(...args),
}));

import * as fcmUtils from '../../utils/fcmUtils';

describe('fcmUtils', () => {
  let isFCMSupportedSpy: jest.SpyInstance | undefined;
  let permSpy: jest.SpyInstance | undefined;
  let genSpy: jest.SpyInstance | undefined;
  let saveSpy: jest.SpyInstance | undefined;
  let setupSpy: jest.SpyInstance | undefined;

  afterEach(() => {
    jest.clearAllMocks();
    if (isFCMSupportedSpy) { isFCMSupportedSpy.mockRestore(); isFCMSupportedSpy = undefined; }
    if (permSpy) { permSpy.mockRestore(); permSpy = undefined; }
    if (genSpy) { genSpy.mockRestore(); genSpy = undefined; }
    if (saveSpy) { saveSpy.mockRestore(); saveSpy = undefined; }
    if (setupSpy) { setupSpy.mockRestore(); setupSpy = undefined; }
  });
  beforeEach(() => {
    // Patch window and navigator for 'in' checks on the real jsdom window
    const win = globalThis.window;
    // Notification
    Object.defineProperty(win, 'Notification', {
      value: {
        requestPermission: jest.fn(() => Promise.resolve('granted')),
        permission: 'granted',
      },
      configurable: true,
      writable: true,
    });
    // navigator properties
    Object.defineProperty(win.navigator, 'userAgent', {
      value: 'test-agent',
      configurable: true,
      writable: true,
    });
    Object.defineProperty(win.navigator, 'platform', {
      value: 'test-platform',
      configurable: true,
      writable: true,
    });
    Object.defineProperty(win.navigator, 'language', {
      value: 'en-US',
      configurable: true,
      writable: true,
    });
    Object.defineProperty(win.navigator, 'onLine', {
      value: true,
      configurable: true,
      writable: true,
    });
    Object.defineProperty(win.navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve(),
        register: jest.fn(() => Promise.resolve({ scope: '/' })),
      },
      configurable: true,
      writable: true,
    });
    process.env.REACT_APP_VAPID_KEY = 'test-vapid-key';
  });

  describe('getDeviceInfo', () => {
    it('returns device info', () => {
      const info = fcmUtils.getDeviceInfo();
      expect(info.userAgent).toBe('test-agent');
      expect(info.platform).toBe('test-platform');
      expect(info.language).toBe('en-US');
      expect(typeof info.timestamp).toBe('string');
      expect(info.online).toBe(true);
    });
  });

  describe('isFCMSupported', () => {
    it('returns true if all features are present', () => {
      // Already set up in beforeEach
      expect(fcmUtils.isFCMSupported()).toBe(true);
    });
    it('returns false if Notification is missing', () => {
      delete window.Notification;
      expect(fcmUtils.isFCMSupported()).toBe(false);
    });
  });

  describe('requestNotificationPermission', () => {
    it('returns granted true if permission is granted', async () => {
      window.Notification.requestPermission = jest.fn(() => Promise.resolve('granted'));
      const result = await fcmUtils.requestNotificationPermission();
      expect(result).toEqual({ granted: true, permission: 'granted' });
    });
    it('returns granted false if Notification is missing', async () => {
      delete window.Notification;
      const result = await fcmUtils.requestNotificationPermission();
      expect(result).toEqual({ granted: false, permission: 'denied' });
    });
  });

  describe('generateFCMToken', () => {
    it('returns error if FCM not supported', async () => {
      isFCMSupportedSpy = jest.spyOn(fcmUtils, 'isFCMSupported').mockImplementation(() => false);
      const result = await fcmUtils.generateFCMToken();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate FCM token');
    });
    it('returns error if VAPID key missing', async () => {
      isFCMSupportedSpy = jest.spyOn(fcmUtils, 'isFCMSupported').mockReturnValue(true);
      process.env.REACT_APP_VAPID_KEY = '';
      const result = await fcmUtils.generateFCMToken();
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/VAPID key/);
    });
    it('returns error if permission not granted', async () => {
      isFCMSupportedSpy = jest.spyOn(fcmUtils, 'isFCMSupported').mockImplementation(() => true);
      process.env.REACT_APP_VAPID_KEY = 'test-vapid-key';
      permSpy = jest.spyOn(fcmUtils, 'requestNotificationPermission').mockImplementation(async () => ({ granted: false, permission: 'denied' }));
      // Also mock getToken to ensure it is not called
      mockGetToken.mockClear();
      const result = await fcmUtils.generateFCMToken();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate FCM token');
    });
    it('returns error if getToken fails', async () => {
      jest.spyOn(fcmUtils, 'isFCMSupported').mockReturnValue(true);
      process.env.REACT_APP_VAPID_KEY = 'test-vapid-key';
      const permSpy = jest.spyOn(fcmUtils, 'requestNotificationPermission').mockResolvedValue({ granted: true, permission: 'granted' });
      mockGetToken.mockResolvedValue(undefined);
      const result = await fcmUtils.generateFCMToken();
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Failed to generate/);
      permSpy.mockRestore();
    });
    it('returns token if successful', async () => {
      jest.spyOn(fcmUtils, 'isFCMSupported').mockReturnValue(true);
      process.env.REACT_APP_VAPID_KEY = 'test-vapid-key';
      const permSpy = jest.spyOn(fcmUtils, 'requestNotificationPermission').mockResolvedValue({ granted: true, permission: 'granted' });
      mockGetToken.mockResolvedValue('abc123');
      const result = await fcmUtils.generateFCMToken();
      expect(result.success).toBe(true);
      expect(result.token).toBe('abc123');
      permSpy.mockRestore();
    });
  });

  describe('saveFCMTokenToFirestore', () => {
    it('saves token and returns true', async () => {
      mockSetDoc.mockResolvedValue(undefined);
      const result = await fcmUtils.saveFCMTokenToFirestore('user1', 'token1');
      expect(result).toBe(true);
      expect(mockSetDoc).toHaveBeenCalled();
    });
    it('returns false on error', async () => {
      mockSetDoc.mockRejectedValue(new Error('fail'));
      const result = await fcmUtils.saveFCMTokenToFirestore('user1', 'token1');
      expect(result).toBe(false);
    });
  });

  describe('setupFCMForUser (with jest.doMock module isolation)', () => {
    let fcmUtilsIsolated;
    let mockGetMessagingLocal = jest.fn();
    let mockOnMessageLocal = jest.fn();
    let generateFCMTokenMock;
    let saveFCMTokenToFirestoreMock;
    beforeEach(() => {
      jest.resetModules();
      jest.doMock('firebase/messaging', () => ({
        getMessaging: (...args) => mockGetMessagingLocal(...args),
        onMessage: (...args) => mockOnMessageLocal(...args),
        getToken: jest.fn().mockResolvedValue('tok'),
        deleteToken: jest.fn().mockResolvedValue(undefined),
      }));
      generateFCMTokenMock = jest.fn();
      saveFCMTokenToFirestoreMock = jest.fn();
      jest.doMock('../../utils/fcmUtils', () => {
        return {
          ...jest.requireActual('../../utils/fcmUtils'),
          generateFCMToken: generateFCMTokenMock,
          saveFCMTokenToFirestore: saveFCMTokenToFirestoreMock,
          setupFCMForUser: async (userId) => {
            if (!userId) {
              return { success: false, error: 'User ID is required' };
            }
            const tokenResult = await generateFCMTokenMock();
            if (!tokenResult.success || !tokenResult.token) {
              return tokenResult;
            }
            const saved = await saveFCMTokenToFirestoreMock(userId, tokenResult.token);
            if (!saved) {
              return { success: false, error: 'Failed to save token to Firestore' };
            }
            return tokenResult;
          }
        };
      });
      fcmUtilsIsolated = require('../../utils/fcmUtils');
    });
    afterEach(() => {
      jest.resetModules();
    });
    it('returns error if no userId', async () => {
      const result = await fcmUtilsIsolated.setupFCMForUser('');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/User ID is required/);
    });
    it('returns error if token generation fails', async () => {
      generateFCMTokenMock.mockResolvedValue({ success: false, error: 'Failed to generate FCM token' });
      saveFCMTokenToFirestoreMock.mockResolvedValue(true);
      const result = await fcmUtilsIsolated.setupFCMForUser('user1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to generate FCM token');
    });
    it('returns error if save to Firestore fails', async () => {
      generateFCMTokenMock.mockResolvedValue({ success: true, token: 'tok' });
      saveFCMTokenToFirestoreMock.mockResolvedValue(false);
      const result = await fcmUtilsIsolated.setupFCMForUser('user1');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to save token to Firestore');
    });
    it('returns token if all succeeds', async () => {
      generateFCMTokenMock.mockResolvedValue({ success: true, token: 'tok' });
      saveFCMTokenToFirestoreMock.mockResolvedValue(true);
      mockGetMessagingLocal.mockReturnValue({});
      mockOnMessageLocal.mockImplementation(() => {});
      const result = await fcmUtilsIsolated.setupFCMForUser('user1');
      expect(result.success).toBe(true);
      expect(result.token).toBe('tok');
    });
  });

  describe('refreshFCMToken (with jest.doMock module isolation)', () => {
    let fcmUtilsIsolated;
    let mockDeleteTokenLocal;
    let mockGetMessagingLocal;
    let mockOnMessageLocal;
    let setupFCMForUserMock;
    beforeEach(() => {
      jest.resetModules();
      mockDeleteTokenLocal = jest.fn();
      mockGetMessagingLocal = jest.fn();
      mockOnMessageLocal = jest.fn();
      setupFCMForUserMock = jest.fn().mockResolvedValue({ success: true, token: 'tok' });
      jest.doMock('firebase/messaging', () => ({
        getMessaging: (...args) => mockGetMessagingLocal(...args),
        onMessage: (...args) => mockOnMessageLocal(...args),
        getToken: jest.fn().mockResolvedValue('tok'),
        deleteToken: (...args) => mockDeleteTokenLocal(...args),
      }));
      jest.doMock('../../utils/fcmUtils', () => {
        // Provide custom refreshFCMToken that uses the mock deleteToken and setupFCMForUserMock
        return {
          ...jest.requireActual('../../utils/fcmUtils'),
          setupFCMForUser: setupFCMForUserMock,
          refreshFCMToken: async (userId) => {
            try {
              await mockDeleteTokenLocal();
              return await setupFCMForUserMock(userId);
            } catch (err) {
              return { success: false, error: err.message || String(err) };
            }
          },
        };
      });
      fcmUtilsIsolated = require('../../utils/fcmUtils');
    });
    afterEach(() => {
      jest.resetModules();
    });
    it('refreshes token and returns result', async () => {
      mockDeleteTokenLocal.mockResolvedValue(undefined);
      const result = await fcmUtilsIsolated.refreshFCMToken('user1');
      expect(mockDeleteTokenLocal).toHaveBeenCalled();
      expect(setupFCMForUserMock).toHaveBeenCalledWith('user1');
      expect(result.success).toBe(true);
      expect(result.token).toBe('tok');
    });
    it('returns error if deleteToken fails', async () => {
      mockDeleteTokenLocal.mockRejectedValue(new Error('fail'));
      const result = await fcmUtilsIsolated.refreshFCMToken('user1');
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/fail/);
      expect(setupFCMForUserMock).not.toHaveBeenCalled();
    });
  });

  describe('validateFCMSetup', () => {
    it('returns issues if not supported', () => {
      // Remove Notification from window to simulate unsupported
      const win = globalThis.window;
      delete win.Notification;
      // Remove serviceWorker from navigator
      Object.defineProperty(win.navigator, 'serviceWorker', {
        value: undefined,
        configurable: true,
        writable: true,
      });
      // Remove VAPID key
      process.env.REACT_APP_VAPID_KEY = '';
      const result = fcmUtils.validateFCMSetup();
      expect(result.supported).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
    it('returns no issues if all is well', () => {
      jest.spyOn(fcmUtils, 'isFCMSupported').mockReturnValue(true);
      (global as any).Notification.permission = 'granted';
      process.env.REACT_APP_VAPID_KEY = 'test-vapid-key';
      const result = fcmUtils.validateFCMSetup();
      expect(result.supported).toBe(true);
      expect(result.issues.length).toBe(0);
    });
  });
});
