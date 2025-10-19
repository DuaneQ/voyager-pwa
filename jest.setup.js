// Ensure fetch is available in the Jest/node environment for tests that rely on it
try {
	// small wrapper that loads the whatwg-fetch polyfill which sets global.fetch
	require('./jest.fetch-polyfill.js');
} catch (e) {
	// ignore if polyfill can't be loaded in some environments
}

require('@testing-library/jest-dom');
// jest.setup.js
// Mock scrollIntoView for jsdom (guarded)
if (typeof window !== 'undefined' && window && window.HTMLElement && window.HTMLElement.prototype) {
	window.HTMLElement.prototype.scrollIntoView = function() {};
}

// Add manual mocks for firebase/auth if needed
jest.mock('firebase/auth', () => require('./src/__mocks__/firebase-auth.js'));
// Mock firebase/functions to route httpsCallable to our Jest mock implementation
try {
	// __mocks__ lives at the repository root next to this file
	jest.mock('firebase/functions', () => require('./__mocks__/firebase-functions.js'));
} catch (e) {
	// ignore in environments without jest available
}

// Provide React globally for older files that rely on the classic runtime
// (some test files/components don't import React explicitly)
try {
	// eslint-disable-next-line global-require
	global.React = require('react');
} catch (e) {
	// ignore in environments without node_modules/react available
}

// Mock minimal firebase-functions/v1 for tests that import it (functions unit tests)
try {
	jest.mock('firebase-functions/v1', () => ({
		https: { onCall: () => {} },
		logger: { info: () => {}, error: () => {}, warn: () => {} }
	}));
} catch (e) {
	// ignore if jest.mock isn't available (some runners)
}
