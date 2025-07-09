# Mocking External Modules in Cypress Component Tests

## Problem
Some external modules (like `react-google-places-autocomplete`) depend on browser globals or APIs that do not work in Cypress/component tests. Jest-style mocks (`jest.mock`) do not work in Cypress/component tests because they run in the browser, not Node.

## Solution: Manual Mock + Webpack Alias

### 1. Manual Mock
- Create a file in `__mocks__/` (e.g., `__mocks__/react-google-places-autocomplete.js`) that exports a simple React component for use in tests.

### 2. Webpack Alias
- In `webpack.config.js`, add an alias for the problematic module to point to your manual mock, but only when the `CYPRESS_COMPONENT_TEST` environment variable is set:

```js
if (process.env.CYPRESS_COMPONENT_TEST) {
  resolve.alias = {
    'react-google-places-autocomplete': path.resolve(__dirname, '__mocks__/react-google-places-autocomplete.js'),
    // Add more aliases as needed
  };
}
```

### 3. Cypress Config
- In `cypress.config.ts`, set the environment variable for component tests:

```ts
component: {
  devServer: {
    ...
    before: (options) => {
      process.env.CYPRESS_COMPONENT_TEST = "1";
      return options;
    },
  },
  ...
}
```

## Maintenance
- To mock other modules, add a manual mock in `__mocks__/` and extend the alias block in `webpack.config.js`.
- Do **not** use `jest.mock` in Cypress/component test files.

---

**This approach ensures that Cypress/component tests run reliably, even when third-party modules are not browser-test friendly.**
