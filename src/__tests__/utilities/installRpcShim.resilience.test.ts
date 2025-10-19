jest.mock('firebase/functions');

import installRpcShim from '../../testUtils/installRpcShim';

describe('installRpcShim resilience', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('httpsCallable remains callable and consults global handlers after clearAllMocks', async () => {
    // install shim
    installRpcShim();

    // simulate clearing mocks in tests
    jest.clearAllMocks();

    const functions = require('firebase/functions');
    // ensure httpsCallable exists and returns a callable
    const callable = functions.httpsCallable({}, 'testRpc');
    expect(typeof callable).toBe('function');

    // set a global handler and call it
    (global as any).__mock_httpsCallable_testRpc = jest.fn().mockResolvedValue({ data: { success: true, data: { ok: true } } });

    const result = await callable({});
    expect((global as any).__mock_httpsCallable_testRpc).toHaveBeenCalled();
    expect(result).toEqual({ data: { success: true, data: { ok: true } } });
  });
});
