/// <reference types="cypress" />

import React from "react";
import AddItineraryModal from "../../src/components/forms/AddItineraryModal";
import { UserProfileContext } from "../../src/Context/UserProfileContext";
import { AlertContext } from "../../src/Context/AlertContext";
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { BrowserRouter } from 'react-router-dom';


let mockShowAlert: any;
let mockOnClose: any;
let mockOnItineraryAdded: any;
let mockOnRefresh: any;
let postItineraryStub: any;

const mockUserProfile = {
  username: "Test User",
  gender: "Male",
  dob: "1990-01-01",
  status: "single",
  sexualOrientation: "heterosexual",
  email: "test@example.com",
  uid: "testUserId",
  blocked: [],
};

const mockItineraries = [
  {
    id: "1",
    destination: "Paris",
    startDate: "2023-12-01",
    endDate: "2023-12-10",
    description: "A trip to Paris",
    activities: ["Sightseeing", "Dining"],
    gender: "Female",
    status: "single",
    sexualOrientation: "heterosexual",
    startDay: 0,
    endDay: 0,
    lowerRange: 18,
    upperRange: 100,
    likes: [],
    userInfo: {
      username: "Test User",
      gender: "Male",
      dob: "1990-01-01",
      uid: "testUserId",
      email: "test@example.com",
      status: "single",
      sexualOrientation: "heterosexual",
      blocked: [],
    },
  },
];

function TestProvider({ children, profile = mockUserProfile }: { children: React.ReactNode; profile?: any }) {
  const [userProfile, setUserProfile] = React.useState(profile);
  const updateUserProfile = (newProfile: typeof userProfile) => setUserProfile(newProfile);
  return (
    <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
      <UserProfileContext.Provider value={{ userProfile, updateUserProfile }}>
        {children}
      </UserProfileContext.Provider>
    </AlertContext.Provider>
  );
}



describe("<AddItineraryModal />", () => {
  beforeEach(() => {
    mockShowAlert = cy.stub();
    mockOnClose = cy.stub();
    mockOnItineraryAdded = cy.stub();
    mockOnRefresh = cy.stub();
    if (!postItineraryStub) {
      postItineraryStub = cy.stub().callsFake((...args) => {
        return Promise.resolve();
      });
    }
    // Mock the hook used in AddItineraryModal
    cy.stub(
      require("../../src/hooks/usePostItineraryToFirestore"),
      "default"
    ).returns(() => ({
      postItinerary: postItineraryStub,
    }));

    // Mock useGetUserProfilePhoto to prevent Firebase Storage calls
    cy.stub(
      require("../../src/hooks/useGetUserProfilePhoto"),
      "useGetUserProfilePhoto"
    ).callsFake(() => '/default-profile.png');

    // Optionally, mock default export if used as default
    if (require("../../src/hooks/useGetUserProfilePhoto").default) {
      cy.stub(
        require("../../src/hooks/useGetUserProfilePhoto"),
        "default"
      ).callsFake(() => '/default-profile.png');
    }

    // Optionally: handle uncaught exceptions for known issues
    cy.on('uncaught:exception', (err) => {
      if (err.message && err.message.includes('process is not defined')) {
        return false;
      }
    });
  });

  it("renders the modal and all main fields", () => {
    const theme = createTheme();

    cy.mount(
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <TestProvider>
            <AddItineraryModal
              open={true}
              onClose={mockOnClose}
              onItineraryAdded={mockOnItineraryAdded}
              onRefresh={mockOnRefresh}
              itineraries={mockItineraries}
            />
          </TestProvider>
        </BrowserRouter>
      </ThemeProvider>
    );

  // wait for modal heading to render and animations to settle
  cy.contains("Add New Itinerary", { timeout: 10000 }).should("be.visible");
  // Check for the react-select input and its placeholder (increase timeout)
  cy.get('input[id^="react-select"]', { timeout: 10000 }).should('exist');
  cy.get('input[placeholder="Search for a city..."]', { timeout: 10000 }).should('exist');
    cy.get('input[type="date"]').should("have.length", 2);
    cy.get('textarea').should("exist");
    cy.contains("Save Itinerary").should("exist");
    cy.contains("Cancel").should("exist");
  });

  it("calls onClose when Cancel is clicked", () => {
    const theme = createTheme();

    cy.mount(
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <TestProvider>
            <AddItineraryModal
              open={true}
              onClose={mockOnClose}
              onItineraryAdded={mockOnItineraryAdded}
              onRefresh={mockOnRefresh}
              itineraries={mockItineraries}
            />
          </TestProvider>
        </BrowserRouter>
      </ThemeProvider>
    );

  cy.contains("Add New Itinerary", { timeout: 10000 }).should("be.visible");
  cy.contains("Cancel").click();
    cy.wrap(mockOnClose).should("have.been.called");
  });

  it("shows validation error if required fields are missing", () => {
    const theme = createTheme();

    cy.mount(
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          <TestProvider>
            <AddItineraryModal
              open={true}
              onClose={mockOnClose}
              onItineraryAdded={mockOnItineraryAdded}
              onRefresh={mockOnRefresh}
              itineraries={mockItineraries}
            />
          </TestProvider>
        </BrowserRouter>
      </ThemeProvider>
    );

  cy.contains("Add New Itinerary", { timeout: 10000 }).should("be.visible");
  cy.contains("Save Itinerary").click();
    cy.on('window:alert', (txt) => {
      expect(txt).to.match(/required|complete your profile/i);
    });
  });
});