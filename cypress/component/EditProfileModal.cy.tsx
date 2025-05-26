/// <reference types="cypress" />

import React from "react";
import { EditProfileModal } from "../../src/components/forms/EditProfileModal";
import { UserProfileContext } from "../../src/Context/UserProfileContext";
import { AlertContext } from "../../src/Context/AlertContext";

// Declare stubs in outer scope
let mockShowAlert: Cypress.Agent<sinon.SinonStub>;
let mockSetUserDbData: Cypress.Agent<sinon.SinonStub>;
let mockSetUserStorageData: Cypress.Agent<sinon.SinonStub>;
let mockClose: Cypress.Agent<sinon.SinonStub>;

// Mock user profile data
const mockUserProfile = {
  bio: "Test bio",
  dob: "1990-01-01",
  gender: "Male",
  sexo: "Heterosexual",
  edu: "GED",
  drinking: "Occasionally",
  smoking: "Never",
};

// Test context provider with real state
function TestProvider({ children, profile = mockUserProfile }) {
  const [userProfile, setUserProfile] = React.useState(profile);
  const updateUserProfile = (newProfile: typeof userProfile) =>
    setUserProfile(newProfile);

  return (
    <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
      <UserProfileContext.Provider value={{ userProfile, updateUserProfile }}>
        {children}
      </UserProfileContext.Provider>
    </AlertContext.Provider>
  );
}

// Mount helper
function mountModal(profile = mockUserProfile) {
  cy.mount(
    <TestProvider profile={profile}>
      <EditProfileModal show={true} close={mockClose} />
    </TestProvider>
  );
}

describe("<EditProfileModal />", () => {
  beforeEach(() => {
    // Create fresh stubs for each test
    mockShowAlert = cy.stub();
    mockSetUserDbData = cy.stub();
    mockSetUserStorageData = cy.stub();
    mockClose = cy.stub();

    // Mock the hooks BEFORE importing the component (Cypress runs all code in describe/beforeEach)
    cy.stub(
      require("../../src/hooks/usePostUserProfileToDb"),
      "default"
    ).returns(() => ({
      setUserDbData: mockSetUserDbData,
    }));
    cy.stub(
      require("../../src/hooks/usePostUserProfileToStorage"),
      "default"
    ).returns(() => ({
      setUserStorageData: mockSetUserStorageData,
    }));
  });

  it("renders all fields and buttons", () => {
    mountModal();
    cy.contains("Edit Profile").should("be.visible");
    cy.get('textarea[name="bio"]').should("have.value", mockUserProfile.bio);
    cy.get('input[name="dob"]').should("have.value", mockUserProfile.dob);
    cy.get('input[name="gender"]').should("have.value", mockUserProfile.gender);
    cy.get('input[name="sexo"]').should("have.value", mockUserProfile.sexo);
    cy.get('input[name="edu"]').should("have.value", mockUserProfile.edu);
    cy.get('input[name="drinking"]').should(
      "have.value",
      mockUserProfile.drinking
    );
    cy.get('input[name="smoking"]').should(
      "have.value",
      mockUserProfile.smoking
    );
    cy.contains("button", "Cancel").should("exist");
    cy.contains("button", "Save").should("exist");
  });

  it("allows editing the bio field", () => {
    mountModal();
    cy.get('textarea[name="bio"]').clear().type("New bio");
    cy.get('textarea[name="bio"]').should("have.value", "New bio");
  });

  it("allows changing the gender", () => {
    mountModal();
    cy.get('input[name="gender"]').parent().click();
    cy.get('[role="option"]').contains("Female").click();
    cy.get('input[name="gender"]').should("have.value", "Female");
  });

  it("shows an alert if user is under 18", () => {
    const underageProfile = { ...mockUserProfile, dob: "2010-01-01" };
    mountModal(underageProfile);
    cy.contains("button", "Save").click();
    cy.wrap(mockShowAlert).should(
      "have.been.calledWith",
      "error",
      "You must be over 18 years old or older."
    );
    cy.wrap(mockSetUserDbData).should("not.have.been.called");
    cy.wrap(mockSetUserStorageData).should("not.have.been.called");
  });

  it("calls close when Cancel is clicked", () => {
    mountModal();
    cy.contains("button", "Cancel").click();
    cy.wrap(mockClose).should("have.been.called");
  });

  it("allows changing all dropdowns and saves", () => {
    mountModal();
    // Gender
    cy.get('input[name="gender"]').parent().click();
    cy.get('[role="option"]').contains("Female").click();
    cy.get('input[name="gender"]').should("have.value", "Female");
    // Sexual Orientation
    cy.get('input[name="sexo"]').parent().click();
    cy.get('[role="option"]').contains("Homosexual").click();
    cy.get('input[name="sexo"]').should("have.value", "Homosexual");
    // Education
    cy.get('input[name="edu"]').parent().click();
    cy.get('[role="option"]').contains("Other").click();
    cy.get('input[name="edu"]').should("have.value", "Other");
    // Drinking
    cy.get('input[name="drinking"]').parent().click();
    cy.get('[role="option"]').contains("Never").click();
    cy.get('input[name="drinking"]').should("have.value", "Never");
    // Smoking
    cy.get('input[name="smoking"]').parent().click();
    cy.get('[role="option"]').contains("Never").click();
    cy.get('input[name="smoking"]').should("have.value", "Never");
    // Save
    cy.contains("button", "Save").click();
  });
});
