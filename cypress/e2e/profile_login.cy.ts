import { SignInPage } from "../support/pageObjects/SignInPage";
import { ProfilePage } from "../support/pageObjects/ProfilePage";

const signIn = new SignInPage();
const profile = new ProfilePage();

describe("Login and navigate to Profile page", () => {
  it("logs in and displays profile info", () => {
    // Visit the sign-in page
    signIn.visit();

    // Fill in credentials and submit
    signIn.fillEmail("duaneqhodges@gmail.com");
    signIn.fillPassword("1234567890");
    signIn.submit();

  // Assert profile elements are visible
  cy.contains("Big D").should("be.visible");
});
});
