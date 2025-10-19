// Jest mock for firebase/functions used by hooks. Tests can set
// global.__mockHttpsCallableReturn or define global.__mock_httpsCallable_<name>
// functions to control per-function responses.

// Export httpsCallable as a jest.fn so tests can override with
// httpsCallable.mockImplementation(...) and so callers can rely on it
// returning a callable function.
const defaultCallable = (name) => {
  return async (payload) => {
    // If test harness registered a callable on module.exports.__rpcMocks, use it
    try {
      if (module.exports && module.exports.__rpcMocks && module.exports.__rpcMocks[name]) {
        const m = module.exports.__rpcMocks[name];
        if (typeof m === 'function') return m(payload);
      }
    } catch (e) {}
    const handlerKey = `__mock_httpsCallable_${name}`;
    if (global[handlerKey] && typeof global[handlerKey] === 'function') {
      return global[handlerKey](payload);
    }
    if (global.__mockHttpsCallableReturn) {
      return global.__mockHttpsCallableReturn;
    }
    return { data: { success: true, data: [] } };
  };
};

// Return a callable for the given RPC name. Prefer any module-level registration
// (module.exports.__rpcMocks[name]) so tests can register functions directly.
const httpsCallable = (functionsInstance, name) => {
  try {
    if (module.exports && module.exports.__rpcMocks && module.exports.__rpcMocks[name]) {
      const m = module.exports.__rpcMocks[name];
      if (typeof m === 'function') return m;
    }
  } catch (e) {}
  return defaultCallable(name);
};

const getFunctions = () => ({});

module.exports = { httpsCallable, getFunctions };
