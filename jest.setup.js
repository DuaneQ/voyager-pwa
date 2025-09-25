require('@testing-library/jest-dom');
// jest.setup.js
// Mock scrollIntoView for jsdom (guarded)
if (typeof window !== 'undefined' && window && window.HTMLElement && window.HTMLElement.prototype) {
	window.HTMLElement.prototype.scrollIntoView = function() {};
}

// Add manual mocks for firebase/auth if needed
jest.mock('firebase/auth', () => require('./src/__mocks__/firebase-auth.js'));
