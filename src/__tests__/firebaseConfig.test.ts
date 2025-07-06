
describe('firebaseConfig', () => {
  let originalWindow;
  let originalRequire;

  beforeEach(() => {
    originalWindow = global.window;
    originalRequire = global.require;
  });

  afterEach(() => {
    global.window = originalWindow;
    if (originalRequire) global.require = originalRequire;
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
    global.window = { Cypress: true, location: { hostname: 'irrelevant' } };
    jest.resetModules();
    jest.doMock('firebase/messaging', () => ({ getMessaging: jest.fn() }));
    const mod = require('../environments/firebaseConfig');
    expect(mod.app.options.projectId).toBe('mundo1-dev');
  });

  it('uses devConfig for dev hosts', () => {
    global.window = { location: { hostname: 'localhost' } };
    jest.resetModules();
    jest.doMock('firebase/messaging', () => ({ getMessaging: jest.fn() }));
    const mod = require('../environments/firebaseConfig');
    expect(mod.app.options.projectId).toBe('mundo1-dev');
  });

  it('uses prodConfig for prod hosts', () => {
    // Remove Cypress/dev state
    delete global.window;
    // Use a prod host not in devHosts or dev preview pattern
    global.window = { location: { hostname: 'mundo1-1.web.app' } };
    jest.resetModules();
    jest.doMock('firebase/messaging', () => ({ getMessaging: jest.fn() }));
    const mod = require('../environments/firebaseConfig');
    expect(mod.app.options.projectId).toBe('mundo1-1');
  });

  it('getMessagingInstance returns null if not in browser', () => {
    delete global.window;
    jest.resetModules();
    jest.doMock('firebase/messaging', () => ({ getMessaging: jest.fn() }));
    const mod = require('../environments/firebaseConfig');
    expect(mod.getMessagingInstance()).toBeNull();
  });

  it('getMessagingInstance returns null in Cypress', () => {
    global.window = { Cypress: true, location: { hostname: 'localhost' } };
    jest.resetModules();
    jest.doMock('firebase/messaging', () => ({ getMessaging: jest.fn() }));
    const mod = require('../environments/firebaseConfig');
    expect(mod.getMessagingInstance()).toBeNull();
  });

  it('getMessagingInstance returns messaging instance in browser', () => {
    const mockGetMessaging = jest.fn().mockReturnValue('messagingInstance');
    global.window = { location: { hostname: 'localhost' } };
    jest.resetModules();
    jest.doMock('firebase/messaging', () => ({ getMessaging: mockGetMessaging }));
    const mod = require('../environments/firebaseConfig');
    const result = mod.getMessagingInstance();
    expect(result).toBe('messagingInstance');
  });
});
