/// <reference types="cypress" />
// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

// Custom command to accept terms and bypass terms acceptance flow
Cypress.Commands.add('acceptTerms', () => {
  // Use the real user ID consistently across all mocks
  const realUserId = 'Yxu8nkH9ewXqyzCZIcYt824IbRw2';
  
  cy.log(`Setting terms acceptance for user: ${realUserId}`);
  
  // First, set up localStorage values for client-side
  cy.window().then((win) => {
    // Set localStorage to bypass terms acceptance in UI
    win.localStorage.setItem('TERMS_ACCEPTED', JSON.stringify({
      hasAccepted: true,
      version: '1.0.0',
      timestamp: Date.now()
    }));
    
    // Also bypass any potential caching in the app
    win.localStorage.setItem(`terms_acceptance_${realUserId}`, JSON.stringify({
      hasAcceptedTerms: true,
      termsVersion: '1.0.0',
      acceptanceDate: new Date().toISOString()
    }));
  });
  
  // Better intercept for GetDocument requests (checking terms)
  cy.intercept('POST', '**/firestore.googleapis.com/google.firestore.v1.Firestore/GetDocument', (req) => {
    if (req.body && req.body.toString().includes(`users/${realUserId}`)) {
      req.reply({
        statusCode: 200,
        body: {
          document: {
            name: `projects/mundo1-dev/databases/(default)/documents/users/${realUserId}`,
            fields: {
              displayName: { stringValue: 'Test User' },
              email: { stringValue: 'travaltestuser@gmail.com' },
              termsAcceptance: {
                mapValue: {
                  fields: {
                    hasAcceptedTerms: { booleanValue: true },
                    termsVersion: { stringValue: "1.0.0" },
                    acceptanceDate: { timestampValue: new Date().toISOString() }
                  }
                }
              }
            },
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
          }
        }
      });
    }
  }).as('termsDocGet');
  
  // Intercept any terms acceptance updates
  cy.intercept('POST', '**/firestore.googleapis.com/**', (req) => {
    if (req.body && req.body.toString().includes('users') && req.body.toString().includes('termsAcceptance')) {
      req.reply({
        statusCode: 200,
        body: {
          documents: [{
            name: `projects/mundo1-dev/databases/(default)/documents/users/${realUserId}`,
            fields: {
              termsAcceptance: {
                mapValue: {
                  fields: {
                    hasAcceptedTerms: { booleanValue: true },
                    termsVersion: { stringValue: "1.0.0" },
                    acceptanceDate: { timestampValue: new Date().toISOString() }
                  }
                }
              }
            }
          }]
        }
      });
    }
  }).as('termsUpdate');
  
  // Wait for stability (important!)
  cy.wait(100);
});

declare global {
  namespace Cypress {
    interface Chainable {
      acceptTerms(): Chainable<void>;
      // login(email: string, password: string): Chainable<void>;
      // drag(subject: string, options?: Partial<TypeOptions>): Chainable<Element>;
      // dismiss(subject: string, options?: Partial<TypeOptions>): Chainable<Element>;
      // visit(originalFn: CommandOriginalFn, url: string, options: Partial<VisitOptions>): Chainable<Element>;
    }
  }
}

export {};