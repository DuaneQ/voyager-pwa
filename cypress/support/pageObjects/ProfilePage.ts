export class ProfilePage {
  visit() {
    cy.visit("/profile");
  }

  getUsername() {
    return cy.contains("h2, .MuiTypography-root", /TestUser|username/i);
  }

  getBio() {
    return cy.get('textarea[name="bio"]');
  }

  getDob() {
    return cy.get('input[name="dob"]');
  }

  getGender() {
    return cy.get('input[name="gender"]');
  }

  getSexo() {
    return cy.get('input[name="sexo"]');
  }

  getEdu() {
    return cy.get('input[name="edu"]');
  }

  getDrinking() {
    return cy.get('input[name="drinking"]');
  }

  getSmoking() {
    return cy.get('input[name="smoking"]');
  }

  getEditProfileButton() {
    return cy.contains("button", /edit profile/i);
  }

  getLogoutButton() {
    return cy.get('button[aria-label="logout"], button').contains(/logout/i);
  }

  openEditProfileModal() {
    this.getEditProfileButton().click();
  }

  logout() {
    this.getLogoutButton().click();
  }
}
