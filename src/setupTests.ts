import './setupTestsLocalStorage';
import '@testing-library/jest-dom';
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";
import "whatwg-fetch";

// Add setImmediate polyfill for Node.js compatibility
if (typeof setImmediate === 'undefined') {
  (window as any).setImmediate = (fn: Function) => setTimeout(fn, 0);
}

// Provide a safe localStorage shim for test environments where localStorage may throw
// (jsdom in some environments uses an opaque origin which can cause SecurityError).
try {
  // Accessing localStorage may throw if it's not available for the current origin.
  const testKey = '__storage_test__';
  window.localStorage.setItem(testKey, testKey);
  window.localStorage.removeItem(testKey);
} catch (e) {
  // Fallback in-memory implementation
  const store: Record<string, string> = {};
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    enumerable: true,
    get: () => ({
      getItem: (key: string) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null),
      setItem: (key: string, value: string) => { store[key] = String(value); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach(k => delete store[k]); }
    })
  });
}

// Increase Jest timeout for integration tests
jest.setTimeout(30000);
