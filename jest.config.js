module.exports = {
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  testEnvironment: "jsdom",
  // Ensure testEnvironmentOptions exists so older/newer jest-environment-jsdom
  // builds won't crash when accessing config.testEnvironmentOptions.html
  testEnvironmentOptions: {},
  transformIgnorePatterns: ["node_modules/(?!(@mui|@testing-library|date-fns))"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // no global setupFiles added by tests here to avoid impacting other suites
  // Explicitly control which source files are collected for coverage and
  // exclude test folders and test utilities so they don't appear in reports.
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/__tests__/**",
    "!src/**/__mocks__/**",
    "!src/test-utils/**",
    "!src/test-utils/**/*",
    "!src/**/index.ts",
  ],
    coveragePathIgnorePatterns: ["/node_modules/", "<rootDir>/src/test-utils/", "<rootDir>/src/__tests__","<rootDir>/src/__mocks__/"]
};
