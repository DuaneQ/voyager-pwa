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

// Patch process.env for Cypress component test browser context (for AddItineraryModal etc)
if (typeof window !== 'undefined' && !window.process) {
  // @ts-ignore
  window.process = { env: {} };
}
if (typeof window !== 'undefined' && window.process && !window.process.env.REACT_APP_GOOGLE_PLACES_API_KEY) {
  window.process.env.REACT_APP_GOOGLE_PLACES_API_KEY = "test-google-places-api-key";
}

// Import commands.js using ES2015 syntax:
import "./commands";

// Use the correct import for your Cypress version
import { mount } from "cypress/react";

// Augment the Cypress namespace
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add("mount", mount);

// Example use:
// cy.mount(<MyComponent />)
