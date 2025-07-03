// ***********************************************************
// This example support/component.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import "./commands";

// Mock process.env for component tests - this fixes the "process is not defined" error
beforeEach(() => {
  cy.window().then((win) => {
    // Mock process.env in the browser environment
    (win as any).process = {
      env: {
        NODE_ENV: "test",
        REACT_APP_FIREBASE_API_KEY: Cypress.env("REACT_APP_FIREBASE_API_KEY") || "test-api-key",
        REACT_APP_FIREBASE_AUTH_DOMAIN: Cypress.env("REACT_APP_FIREBASE_AUTH_DOMAIN") || "test-project.firebaseapp.com",
        REACT_APP_FIREBASE_PROJECT_ID: Cypress.env("REACT_APP_FIREBASE_PROJECT_ID") || "test-project",
        REACT_APP_FIREBASE_STORAGE_BUCKET: Cypress.env("REACT_APP_FIREBASE_STORAGE_BUCKET") || "test-project.appspot.com",
        REACT_APP_FIREBASE_MESSAGING_SENDER_ID: Cypress.env("REACT_APP_FIREBASE_MESSAGING_SENDER_ID") || "123456789",
        REACT_APP_FIREBASE_APP_ID: Cypress.env("REACT_APP_FIREBASE_APP_ID") || "1:123456789:web:test-app-id",
        REACT_APP_FIREBASE_MEASUREMENT_ID: Cypress.env("REACT_APP_FIREBASE_MEASUREMENT_ID") || "G-TEST123",
        REACT_APP_GOOGLE_PLACES_API_KEY: Cypress.env("REACT_APP_GOOGLE_PLACES_API_KEY") || "test-places-key",
        REACT_APP_VAPID_KEY: Cypress.env("REACT_APP_VAPID_KEY") || "test-vapid-key",
      },
    };
  });
});

// Mock Firebase modules to prevent real Firebase calls during tests
beforeEach(() => {
  cy.intercept("POST", "**/firebase.googleapis.com/**", { statusCode: 200, body: {} });
  cy.intercept("GET", "**/firebase.googleapis.com/**", { statusCode: 200, body: {} });
  cy.intercept("POST", "**/firestore.googleapis.com/**", { statusCode: 200, body: {} });
  cy.intercept("GET", "**/firestore.googleapis.com/**", { statusCode: 200, body: {} });
});
