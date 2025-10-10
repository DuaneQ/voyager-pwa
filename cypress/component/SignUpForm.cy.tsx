/// <reference types="cypress" />

import React from 'react';
// Delay importing SignUpForm until after global polyfills to avoid React not defined in some icon modules
let SignUpForm: any;
import { AlertContext } from '../../src/Context/AlertContext';
import { MemoryRouter } from 'react-router-dom';

function TestProvider({ children }: { children: React.ReactNode }) {
  const mockShowAlert = cy.stub();
  return (
    <MemoryRouter>
      <AlertContext.Provider value={{ showAlert: mockShowAlert as any }}>
        {children}
      </AlertContext.Provider>
    </MemoryRouter>
  );
}

describe('<SignUpForm /> - google signup guard', () => {
  beforeEach(() => {
    cy.stub(require('firebase/auth'), 'signInWithPopup').resolves({ user: { uid: 'u1', email: 'alice@example.com', displayName: 'Alice' } } as any);
  });

  it('prevents creating a users doc when an existing profile with the email exists', () => {
    // Make getDocs return a non-empty snapshot to simulate existing profile
    cy.stub(require('firebase/firestore'), 'getDocs').resolves({ empty: false, docs: [{ id: 'u-exist' }] } as any);

    // Spy on setDoc to ensure it is NOT called
    const setDocStub = cy.stub(require('firebase/firestore'), 'setDoc').resolves();

  // Make sure React is globally available (some icon modules rely on global React)
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  if (!window.React) window.React = require('react');
  // Import SignUpForm dynamically to ensure React is in scope for icon modules
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  SignUpForm = require('../../src/components/forms/SignUpForm').default;
    cy.mount(
      <TestProvider>
        <SignUpForm />
      </TestProvider>
    );

    cy.get('[data-testid="google-signup-button"]').click();

    // wait a short moment and assert setDoc was not called
    cy.wait(200);
    cy.wrap(null).then(() => {
      expect(setDocStub).not.to.have.been.called;
    });
  });
});
