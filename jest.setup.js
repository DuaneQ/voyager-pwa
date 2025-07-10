// jest.setup.js
// Mock scrollIntoView for jsdom
window.HTMLElement.prototype.scrollIntoView = function() {};
