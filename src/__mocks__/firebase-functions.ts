// Minimal mock for firebase/functions used by the frontend hooks in tests.
// Tests should set `global.__mockHttpsCallableReturn = { data: { success: true, data: [...] }}`
// or use jest.spyOn to override behavior per-test.

const httpsCallable: any = typeof jest !== 'undefined' && typeof jest.fn === 'function'
  ? jest.fn((functionsInstance: any, name: string) => {
      // If tests call httpsCallable with a custom implementation we should
      // register the returned callable into __rpcMocks so tests can assert
      // calls by inspecting mockedFunctions.__rpcMocks.
      const impl: any = (httpsCallable as any).getMockImplementation ? (httpsCallable as any).getMockImplementation() : undefined;
      if (typeof impl === 'function') {
        const result: any = impl(functionsInstance, name);
        try { (module as any).exports.__rpcMocks = (module as any).exports.__rpcMocks || {}; (module as any).exports.__rpcMocks[name] = result; } catch (e) {}
        return result;
      }
  const defaultFn = async (payload: any): Promise<any> => {
        try {
          if ((module as any).exports && (module as any).exports.__rpcMocks && (module as any).exports.__rpcMocks[name]) {
            const m = (module as any).exports.__rpcMocks[name];
            if (typeof m === 'function') return m(payload);
          }
        } catch (e) {}
        const globalHandlerKey = `__mock_httpsCallable_${name}`;
        if ((global as any)[globalHandlerKey] && typeof (global as any)[globalHandlerKey] === 'function') {
          return (global as any)[globalHandlerKey](payload);
        }
        if ((global as any).__mockHttpsCallableReturn) {
          return (global as any).__mockHttpsCallableReturn;
        }
        return { data: { success: true, data: [] } };
      };
      try { (module as any).exports.__rpcMocks = (module as any).exports.__rpcMocks || {}; (module as any).exports.__rpcMocks[name] = defaultFn; } catch (e) {}
      return defaultFn;
    })
  : (functionsInstance: any, name: string) => {
    return async (payload: any): Promise<any> => {
        const globalHandlerKey = `__mock_httpsCallable_${name}`;
        if ((global as any)[globalHandlerKey] && typeof (global as any)[globalHandlerKey] === 'function') {
          return (global as any)[globalHandlerKey](payload);
        }
        if ((global as any).__mockHttpsCallableReturn) {
          return (global as any).__mockHttpsCallableReturn;
        }
        return { data: { success: true, data: [] } };
      };
    };

const getFunctions: any = typeof jest !== 'undefined' && typeof jest.fn === 'function' ? jest.fn(() => ({})) : (() => ({}));

module.exports = { httpsCallable, getFunctions };

// Make this file a module for TypeScript's isolatedModules
export {};
