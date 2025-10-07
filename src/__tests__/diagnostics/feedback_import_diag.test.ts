// Diagnostic: import FeedbackDashboard after minimal localStorage polyfill to capture any SecurityError stacks
// This file is temporary and can be removed after diagnosis.

// Minimal early polyfill to avoid opaque origin blocking for the diagnostic run only
if (typeof global !== 'undefined' && typeof global.localStorage === 'undefined') {
  Object.defineProperty(global, 'localStorage', {
    value: (function () {
      let store = {};
      return {
        getItem(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
        setItem(k, v) { store[k] = String(v); },
        removeItem(k) { delete store[k]; },
        clear() { store = {}; }
      };
    })(),
    writable: true
  });
}
if (typeof window !== 'undefined' && typeof window.localStorage === 'undefined') {
  // @ts-ignore
  window.localStorage = global.localStorage;
}

// Now require the component to see what imports run
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { FeedbackDashboard } = require('../../components/admin/FeedbackDashboard');
  // eslint-disable-next-line no-console
  
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('Import diagnostic failed:', err && err.stack ? err.stack : err);
  throw err;
}

test('diagnostic import', () => { expect(true).toBe(true); });
