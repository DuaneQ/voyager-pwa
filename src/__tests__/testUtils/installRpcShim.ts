// This file used to contain a test helper implementation which caused Jest to
// treat it as a test file accidentally. Convert it into a tiny test that
// verifies the canonical helper at `src/testUtils/installRpcShim.ts` exists
// and is callable. This prevents the "Your test suite must contain at least
// one test" error while keeping a light sanity check in the test tree.

import installRpcShim from '../../testUtils/installRpcShim';

describe('installRpcShim helper', () => {
  test('exports a function and can be invoked without throwing', () => {
    expect(typeof installRpcShim).toBe('function');
    expect(() => installRpcShim()).not.toThrow();
  });
});
