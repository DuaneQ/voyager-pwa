// Polyfill for setImmediate in Jest (jsdom) environment
if (typeof global.setImmediate === "undefined") {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}
