import { defineConfig } from "cypress";

// Ensure the env flag is set before webpack.config.js is loaded so that
// webpack can pick up the alias to the local mock for component tests.
if (!process.env.CYPRESS_COMPONENT_TEST) {
  process.env.CYPRESS_COMPONENT_TEST = "1";
}

import webpackConfig from "./webpack.config.js";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:3000",
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  component: {
      devServer: {
        framework: "react",
        bundler: "webpack",
        webpackConfig,
      },
    supportFile: "cypress/support/component.ts",
  },
});
