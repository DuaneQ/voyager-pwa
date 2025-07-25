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

// Increase Jest timeout for integration tests
jest.setTimeout(30000);
