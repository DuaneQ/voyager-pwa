// Lightweight localStorage shim to be loaded very early in Jest setup to avoid
// SecurityError in jsdom opaque origins when modules access localStorage during import.

export const createLocalStorageFallback = () => {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
};

try {
  // Try to access localStorage; if it works, do nothing.
  const testKey = '__storage_test__';
  window.localStorage.setItem(testKey, testKey);
  window.localStorage.removeItem(testKey);
} catch (e) {
  // Define a fallback on window.localStorage
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    enumerable: true,
    writable: false,
    value: createLocalStorageFallback()
  });
}
  // Export default no-op so importing this file runs the shim and TypeScript treats it as a module.
  export default {};
