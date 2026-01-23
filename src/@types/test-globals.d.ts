// Augment global Window for test environment flags (Cypress)
export {};

declare global {
  interface Window {
    // Cypress injector used in tests; optional in runtime
    Cypress?: any;
  }
}
