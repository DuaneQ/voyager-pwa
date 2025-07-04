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

// Mock user profile data - updated to match new component structure
const mockUserProfile = {
  bio: "Test bio",
  dob: "1990-01-01",
  gender: "Male",
  sexualOrientation: "Heterosexual", // Changed from sexo to sexualOrientation
  edu: "GED",
  drinking: "Occasionally",
  smoking: "Never",
  status: "Single", // Added status field
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

    // Mock the hooks BEFORE importing the component
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
    cy.get('input[name="status"]').should("have.value", mockUserProfile.status);
    cy.get('input[name="gender"]').should("have.value", mockUserProfile.gender);
    cy.get('input[name="sexualOrientation"]').should("have.value", mockUserProfile.sexualOrientation); // Updated field name
    cy.get('input[name="edu"]').should("have.value", mockUserProfile.edu);
    cy.get('input[name="drinking"]').should("have.value", mockUserProfile.drinking);
    cy.get('input[name="smoking"]').should("have.value", mockUserProfile.smoking);
    cy.contains("button", "Cancel").should("exist");
    cy.contains("button", "Save").should("exist");
  });

  it("allows editing the bio field", () => {
    mountModal();
    
    // Method that works reliably with Material-UI
    cy.get('textarea[name="bio"]')
      .should("have.value", "Test bio") // Verify initial state
      .focus()
      .invoke('val', '') // Clear using JavaScript - most reliable
      .trigger('input') // Trigger input event for React
      .type("New bio")
      .should("have.value", "New bio");
  });

  it("allows changing the status", () => {
    mountModal();
    cy.get('input[name="status"]').parent().click();
    cy.get('[role="option"]').contains("Single").click();
    cy.get('input[name="status"]').should("have.value", "single"); // Note: lowercase as per component
  });

  it("allows changing the gender", () => {
    mountModal();
    cy.get('input[name="gender"]').parent().click();
    cy.get('[role="option"]').contains("Female").click();
    cy.get('input[name="gender"]').should("have.value", "Female");
  });

  it("allows changing the sexual orientation", () => {
    mountModal();
    cy.get('input[name="sexualOrientation"]').parent().click();
    cy.get('[role="option"]').contains("Homosexual").click();
    cy.get('input[name="sexualOrientation"]').should("have.value", "homosexual"); // Note: lowercase as per component
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
    
    // Status
    cy.get('input[name="status"]').parent().click();
    cy.get('[role="option"]').contains("Couple").click();
    cy.get('input[name="status"]').should("have.value", "couple");

    // Gender
    cy.get('input[name="gender"]').parent().click();
    cy.get('[role="option"]').contains("Female").click();
    cy.get('input[name="gender"]').should("have.value", "Female");
    
    // Sexual Orientation (updated field name)
    cy.get('input[name="sexualOrientation"]').parent().click();
    cy.get('[role="option"]').contains("Homosexual").click();
    cy.get('input[name="sexualOrientation"]').should("have.value", "homosexual");
    
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
