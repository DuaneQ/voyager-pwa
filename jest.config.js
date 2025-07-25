module.exports = {
  transform: {
    "^.+\\.(js|jsx|ts|tsx)$": "babel-jest",
  },
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "identity-obj-proxy",
  },
  testEnvironment: "jsdom",
  transformIgnorePatterns: ["node_modules/(?!(@mui|@testing-library|date-fns))"],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
};
