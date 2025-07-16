require('@testing-library/jest-dom');
// jest.setup.js
// Mock scrollIntoView for jsdom
window.HTMLElement.prototype.scrollIntoView = function() {};

// Add manual mocks for firebase/auth if needed
jest.mock('firebase/auth', () => require('./src/__mocks__/firebase-auth.js'));
