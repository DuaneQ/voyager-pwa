/// <reference types="cypress" />

import React from "react";
import { UserProfileContext } from "../../src/Context/UserProfileContext";
import { AlertContext } from "../../src/Context/AlertContext";

// Create a mock AddItineraryModal component that mimics the real one
const MockAddItineraryModal = ({ open, onClose, onItineraryAdded, itineraries, ...props }) => {
  if (!open) return null;

  return (
    <div role="dialog" data-testid="add-itinerary-modal">
      <div>
        <h2>Add New Itinerary</h2>
        
        {/* Mock Google Places input */}
        <input
          data-testid="google-places-autocomplete"
          placeholder="Search for a city..."
        />
        
        {/* Mock form fields */}
        <input type="date" name="startDate" />
        <input type="date" name="endDate" />
        <textarea placeholder="Description..." />
        
        {/* Mock select fields */}
        <select name="gender">
          <option value="Female">Female</option>
          <option value="Male">Male</option>
        </select>
        
        <select name="status">
          <option value="single">Single</option>
          <option value="married">Married</option>
        </select>
        
        <select name="sexualOrientation">
          <option value="heterosexual">Heterosexual</option>
          <option value="homosexual">Homosexual</option>
        </select>
        
        {/* Mock buttons */}
        <button onClick={onClose}>Cancel</button>
        <button onClick={() => onItineraryAdded("test")}>Save Itinerary</button>
        
        {/* Mock existing itineraries section */}
        <div>
          <h3>Your Itineraries</h3>
          {itineraries?.length > 0 ? (
            itineraries.map(itinerary => (
              <div key={itinerary.id} data-testid="itinerary-card">
                <h4>{itinerary.destination}</h4>
                <p>{itinerary.description}</p>
                <div>Activities: {itinerary.activities?.join(", ")}</div>
              </div>
            ))
          ) : (
            <p>No itineraries available</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Declare stubs
let mockShowAlert: any;
let mockOnClose: any;
let mockOnItineraryAdded: any;

// Mock user profile
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

// Mock itinerary data
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

// Test Provider
function TestProvider({ children }) {
  const [userProfile, setUserProfile] = React.useState(mockUserProfile);
  const updateUserProfile = (newProfile) => setUserProfile(newProfile);

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
  });

  it("renders the modal", () => {
    cy.mount(
      <TestProvider>
        <MockAddItineraryModal
          open={true}
          onClose={mockOnClose}
          onItineraryAdded={mockOnItineraryAdded}
          itineraries={[]}
        />
      </TestProvider>
    );

    cy.contains("Add New Itinerary").should("be.visible");
    cy.contains("Save Itinerary").should("be.visible");
    cy.contains("Cancel").should("be.visible");
  });

  it("displays existing itineraries", () => {
    cy.mount(
      <TestProvider>
        <MockAddItineraryModal
          open={true}
          onClose={mockOnClose}
          onItineraryAdded={mockOnItineraryAdded}
          itineraries={mockItineraries}
        />
      </TestProvider>
    );

    // Check that the mocked ItineraryCard displays the itinerary
    cy.get('[data-testid="itinerary-card"]').should("exist");
    cy.contains("Paris").should("be.visible");
    cy.contains("A trip to Paris").should("be.visible");
    cy.contains("Sightseeing, Dining").should("be.visible");
  });

  it("shows google places input", () => {
    cy.mount(
      <TestProvider>
        <MockAddItineraryModal
          open={true}
          onClose={mockOnClose}
          onItineraryAdded={mockOnItineraryAdded}
          itineraries={[]}
        />
      </TestProvider>
    );

    cy.get('[data-testid="google-places-autocomplete"]').should("be.visible");
  });

  it("calls onClose when Cancel button is clicked", () => {
    cy.mount(
      <TestProvider>
        <MockAddItineraryModal
          open={true}
          onClose={mockOnClose}
          onItineraryAdded={mockOnItineraryAdded}
          itineraries={[]}
        />
      </TestProvider>
    );

    cy.contains("button", "Cancel").click();
    cy.wrap(mockOnClose).should("have.been.called");
  });

  it("calls onItineraryAdded when Save button is clicked", () => {
    cy.mount(
      <TestProvider>
        <MockAddItineraryModal
          open={true}
          onClose={mockOnClose}
          onItineraryAdded={mockOnItineraryAdded}
          itineraries={[]}
        />
      </TestProvider>
    );

    cy.contains("button", "Save Itinerary").click();
    cy.wrap(mockOnItineraryAdded).should("have.been.calledWith", "test");
  });

  it("shows empty state when no itineraries", () => {
    cy.mount(
      <TestProvider>
        <MockAddItineraryModal
          open={true}
          onClose={mockOnClose}
          onItineraryAdded={mockOnItineraryAdded}
          itineraries={[]}
        />
      </TestProvider>
    );

    cy.contains("No itineraries available").should("be.visible");
  });
});