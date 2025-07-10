// __mocks__/scrollIntoView.js
// Jest setup file to mock scrollIntoView for jsdom
window.HTMLElement.prototype.scrollIntoView = function() {};
