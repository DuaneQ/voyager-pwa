// Jest setup file: provide a minimal localStorage implementation early
// Avoid using jest.fn at top-level to ensure this file can run before Jest
const _localStorage = (() => {
  let store = {};
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      store = {};
    }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: _localStorage,
  writable: true
});

if (typeof window !== 'undefined' && !window.localStorage) {
  window.localStorage = global.localStorage;
}

// Keep this file small and free of Jest APIs so it runs early.
