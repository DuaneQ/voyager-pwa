import { defineConfig } from "cypress";
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
      before: (options) => {
        // Set env var for Webpack aliasing
        process.env.CYPRESS_COMPONENT_TEST = "1";
        return options;
      },
    },
    supportFile: "cypress/support/component.ts",
  },
});
