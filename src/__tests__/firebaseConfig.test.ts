
describe('firebaseConfig', () => {
  let originalWindow: any;
  let originalNavigator: any;

  beforeEach(() => {
    originalWindow = global.window;
    originalNavigator = global.navigator;
  });

  afterEach(() => {
    global.window = originalWindow;
    if (originalNavigator) {
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        configurable: true,
      });
    }
    jest.resetModules();
    jest.clearAllMocks();
    // Remove cached module to force fresh config detection
    try { delete require.cache[require.resolve('../environments/firebaseConfig')]; } catch {}
  });

  it('exports app and auth', () => {
    jest.resetModules();
    jest.doMock('firebase/messaging', () => ({ getMessaging: jest.fn() }));
    const mod = require('../environments/firebaseConfig');
    expect(mod.app).toBeDefined();
    expect(mod.auth).toBeDefined();
  });

  it('uses devConfig for Cypress', () => {
    (global as any).window = { 
      Cypress: {} as any, 
      location: { hostname: 'irrelevant' } as any 
    };
    jest.resetModules();
    jest.doMock('firebase/messaging', () => ({ getMessaging: jest.fn() }));
    const mod = require('../environments/firebaseConfig');
    expect(mod.app.options.projectId).toBe('mundo1-dev');
  });

  it('uses devConfig for dev hosts', () => {
    (global as any).window = { location: { hostname: 'localhost' } as any };
    jest.resetModules();
    jest.doMock('firebase/messaging', () => ({ getMessaging: jest.fn() }));
    const mod = require('../environments/firebaseConfig');
    expect(mod.app.options.projectId).toBe('mundo1-dev');
  });

  it('uses prodConfig for prod hosts', () => {
    // Remove Cypress/dev state
    delete (global as any).window;
    // Use a prod host not in devHosts or dev preview pattern
    (global as any).window = { location: { hostname: 'mundo1-1.web.app' } as any };
    jest.resetModules();
    jest.doMock('firebase/messaging', () => ({ getMessaging: jest.fn() }));
    const mod = require('../environments/firebaseConfig');
    expect(mod.app.options.projectId).toBe('mundo1-1');
  });

  it('getMessagingInstance returns null if not in browser', () => {
    delete (global as any).window;
    jest.resetModules();
    jest.doMock('firebase/messaging', () => ({ getMessaging: jest.fn() }));
    const mod = require('../environments/firebaseConfig');
    expect(mod.getMessagingInstance()).toBeNull();
  });

  it('getMessagingInstance returns null in Cypress', () => {
    (global as any).window = { 
      Cypress: {} as any, 
      location: { hostname: 'localhost' } as any 
    };
    jest.resetModules();
    jest.doMock('firebase/messaging', () => ({ getMessaging: jest.fn() }));
    const mod = require('../environments/firebaseConfig');
    expect(mod.getMessagingInstance()).toBeNull();
  });

  it('getMessagingInstance returns messaging instance in browser', () => {
    const mockGetMessaging = jest.fn().mockReturnValue('messagingInstance');
    
    // Set up proper browser environment for FCM support
    (global as any).window = { 
      location: { hostname: 'localhost' } as any,
      chrome: { webstore: {} }, // Chrome indicator must be truthy
    };
    
    // Mock navigator with Chrome user agent that doesn't match Safari regex
    // The regex is /^((?!chrome|android).)*safari/i so we need "chrome" in the string
    Object.defineProperty(global, 'navigator', {
      value: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124',
        serviceWorker: { register: jest.fn() } // ServiceWorker support is required
      },
      configurable: true,
    });
    
    jest.resetModules();
    jest.doMock('firebase/messaging', () => ({ getMessaging: mockGetMessaging }));
    const mod = require('../environments/firebaseConfig');
    const result = mod.getMessagingInstance();
    expect(result).toBe('messagingInstance');
  });
});
