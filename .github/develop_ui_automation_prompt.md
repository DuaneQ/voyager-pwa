# UI Automation Prompt (Cypress E2E & Component Tests)

Purpose

This prompt instructs an agent or developer to write Cypress-based UI automation tests for the Voyager PWA, including E2E flows and component-level interaction tests.

Requirements

- Cover critical user flows: authentication, AI itinerary generation modal, itinerary creation flow, and video upload.
- Stub external services (Firebase Auth, Firestore, OpenAI, cloud functions) to keep tests deterministic.
- Provide test plan, Cypress specs, and setup instructions for local runs and CI.

Agent Instructions

1. Identify the user flow to test and list success criteria and edge cases.
2. For E2E flows, create Cypress specs under `cypress/e2e/` that:
   - Use `cy.intercept()` to stub API endpoints and functions.
   - Use custom commands (e.g., `cy.loginStub()`) to bypass real auth where appropriate.
   - Keep tests idempotent and isolated.
3. For component-level tests, use Cypress component testing or RTL where appropriate.
4. Provide commands to run tests locally and in CI, and include recommended timeouts for slow CI environments.

Reference files (fixtures & memory)

- Agent memory: `prompts/agent_memory.json` (read/write persistent metadata about runs and tasks)
- Fixtures to use for stubs:
  - `tests/fixtures/openai/sample-completion.json`
  - `tests/fixtures/places/textsearch-cancun.json`
  - `tests/fixtures/serpapi/sample-flights.json`

Stubbing guidance

- Auth: Add `cypress/support/commands.js` entries for `loginStub()` and `logoutStub()` that stub Firebase Auth state and tokens.
- Firestore: Use `cy.intercept()` on functions endpoints or mock the client used by the app to return fixture data.
- OpenAI and functions: Intercept function callable endpoints on the emulator or stub network responses to return expected data.

Cypress E2E example (AI generation):

```javascript
describe('AI generation flow', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.loginStub();
  });

  it('generates itinerary and displays result', () => {
    cy.intercept('POST', '/__/functions/v1/projects/*/locations/*/functions/generateItinerary', {
      statusCode: 200,
      body: { success: true, data: { /* generated itinerary */ } }
    });

    cy.get('[data-testid=ai-generate-button]').click();
    cy.get('[data-testid=ai-progress]').should('exist');
    cy.get('[data-testid=itinerary-result]').should('contain', 'Day 1');
  });
});
```

Support commands template (`cypress/support/commands.js`):

```javascript
Cypress.Commands.add('loginStub', () => {
  // stub localStorage, cookies, or the Firebase SDK used by the app
  window.localStorage.setItem('auth', JSON.stringify({ uid: 'test-user' }));
});
```

Verification commands

```bash
# Run all Cypress tests headless
npx cypress run

# Open Cypress Test Runner
npx cypress open
```

Deliverables

- Cypress specs under `cypress/e2e/` with clear file names.
- Any custom commands under `cypress/support/`.
- A short PR body describing the test stubs and how to run them locally.

Example agent request

"Write a Cypress E2E spec that tests the AI itinerary generation modal flow, stubbing the generateItinerary function and the OpenAI client responses."
