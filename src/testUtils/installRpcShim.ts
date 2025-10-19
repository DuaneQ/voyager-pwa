// Install a defensive httpsCallable shim for the mocked firebase/functions
// module. Tests in this repo prefer to set global.__mock_httpsCallable_<name>
// handlers; this shim ensures httpsCallable returns a callable that consults
// those globals. Install this from `setupTests.ts` so it's always available.

export function installRpcShim() {
  try {
    // Prefer the Jest mock if it's available so we don't accidentally require
    // the real SDK and seed the module cache with non-mocked exports.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    let mockedFunctions: any;
    try {
      // jest.requireMock is available in test runtime and returns the manual mock
      if (typeof (global as any).jest === 'object' && typeof (global as any).jest.requireMock === 'function') {
        mockedFunctions = (global as any).jest.requireMock('firebase/functions');
      }
    } catch (e) {}
    if (!mockedFunctions) {
      // Fallback to a plain require if the mock isn't registered yet
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      mockedFunctions = require('firebase/functions');
    }
    const originalHttpsCallable = mockedFunctions && mockedFunctions.httpsCallable;

    // Create a resilient wrapper function that will NOT be cleared by jest.clearAllMocks
    const resilient = (functionsInstance: any, name: string) => {

      // Default callable that consults per-test global handlers
      const defaultFn = async (payload: any) => {
        try {
          if (mockedFunctions && mockedFunctions.__rpcMocks && mockedFunctions.__rpcMocks[name]) {
            const m = mockedFunctions.__rpcMocks[name];
            // Avoid calling ourselves (which would cause infinite recursion)
            if (m && m !== defaultFn && typeof m === 'function') return m(payload);
          }
        } catch (e) {}
        const handlerKey = `__mock_httpsCallable_${name}`;
        if ((global as any)[handlerKey] && typeof (global as any)[handlerKey] === 'function') {
          return (global as any)[handlerKey](payload);
        }
        if ((global as any).__mockHttpsCallableReturn) return (global as any).__mockHttpsCallableReturn;
        return { data: { success: true, data: [] } };
      };
      try { mockedFunctions.__rpcMocks = mockedFunctions.__rpcMocks || {}; mockedFunctions.__rpcMocks[name] = defaultFn; } catch (e) {}
      return defaultFn;
    };

    try {
      // If the original export is a jest.fn, ensure its mockImplementation returns our resilient callable
      if (originalHttpsCallable && typeof originalHttpsCallable.mockImplementation === 'function') {
        try { originalHttpsCallable.mockImplementation((functionsInstance: any, name: string) => resilient(functionsInstance, name)); } catch (e) {}
      } else {
        // If there is no jest.fn present, replace the export with our resilient wrapper
        try {
          if (mockedFunctions && mockedFunctions.httpsCallable !== resilient) {
            mockedFunctions.httpsCallable = resilient;
          }
        } catch (e) {}
      }
    } catch (e) {}
  } catch (e) {
    // Safe no-op in environments where require or mocks are unavailable
  }
}

export default installRpcShim;
