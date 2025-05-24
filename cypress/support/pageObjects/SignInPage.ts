export class SignInPage {
  visit() {
    cy.visit("/login");
  }

  getEmailInput() {
    return cy.get('input[name="email"]');
  }

  getPasswordInput() {
    return cy.get('input[name="password"]');
  }

  getEmailSignInButton() {
    return cy.get('[data-testid="email-signin-button"]');
  }

  getGoogleSignInButton() {
    return cy.get('[data-testid="google-signin-button"]');
  }

  getForgotPasswordLink() {
    return cy.get('a[href="/reset"]');
  }

  getResendEmailLink() {
    return cy.get('a[href="/ResendEmail"]');
  }

  fillEmail(email: string) {
    this.getEmailInput().clear().type(email);
  }

  fillPassword(password: string) {
    this.getPasswordInput().clear().type(password);
  }

  submit() {
    this.getEmailSignInButton().click();
  }

  signInWithGoogle() {
    this.getGoogleSignInButton().click();
  }
}
