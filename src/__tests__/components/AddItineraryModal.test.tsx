import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddItineraryModal from "../../components/forms/AddItineraryModal";
import { UserProfileContext } from "../../Context/UserProfileContext";
import useGetUserId from "../../hooks/useGetUserId";
import usePostItineraryToFirestore from "../../hooks/usePostItineraryToFirestore";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import { AlertContext } from "../../Context/AlertContext";
import { Itinerary } from "../../types/Itinerary";

// Mock Firestore modular SDK for pipeline (CI) compatibility
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(() => ({})),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  setDoc: jest.fn(() => Promise.resolve()),
  getFirestore: jest.fn(() => ({})),
}));

// Polyfill setImmediate for CI (Node 18+ doesn't have it by default)
if (typeof global.setImmediate === "undefined") {
  // @ts-ignore
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}

// Polyfill localStorage for CI if not present
if (typeof window !== "undefined" && typeof window.localStorage === "undefined") {
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
  });
}

// Mock dependencies
jest.mock("../../hooks/useGetUserId");
jest.mock("../../hooks/usePostItineraryToFirestore");
jest.mock("react-google-places-autocomplete", () => {
  return jest.fn().mockImplementation(({ selectProps }) => (
    <input
      data-testid="google-places-autocomplete"
      value={selectProps.value?.label || ""}
      onChange={(e) =>
        selectProps.onChange({
          label: e.target.value,
          value: e.target.value,
        })
      }
    />
  ));
});

describe("AddItineraryModal Component", () => {
  const mockUserId = "testUserId";
  const mockUserProfile = {
    username: "Test User",
    gender: "Other",
    dob: "1990-01-01",
    status: "single",
    sexualOrientation: "heterosexual", // Add this field
    blocked: [],
  };
  const mockPostItinerary = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnItineraryAdded = jest.fn();
  const mockShowAlert = jest.fn();
  const mockUpdateUserProfile = jest.fn();

  const mockItineraries: Itinerary[] = [
    {
      id: "1",
      destination: "Paris",
      startDate: "2023-12-01",
      endDate: "2023-12-10",
      description: "A trip to Paris",
      activities: ["Sightseeing", "Dining"],
      gender: "Female",
      status: "single",
      sexualOrientation: "heterosexual", // Add this field
      startDay: 0,
      endDay: 0,
      lowerRange: 18,
      upperRange: 100,
      likes: [],
      userInfo: {
        username: "Test User",
        gender: "Other",
        dob: "1990-01-01",
        uid: "testUserId",
        email: "email@user.com",
        status: "single",
        sexualOrientation: "heterosexual", // Add this field
        blocked: [],
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    window.alert = jest.fn();
    (useGetUserId as jest.Mock).mockReturnValue(mockUserId);
    (usePostItineraryToFirestore as jest.Mock).mockReturnValue({
      postItinerary: mockPostItinerary,
    });
    (GooglePlacesAutocomplete as unknown as jest.Mock).mockImplementation(
      ({ selectProps }) => (
        <input
          data-testid="google-places-autocomplete"
          value={selectProps.value?.label || ""}
          onChange={(e) =>
            selectProps.onChange({
              label: e.target.value,
              value: e.target.value,
            })
          }
        />
      )
    );
  });

  const renderWithContext = (ui: React.ReactElement) => {
    return render(
      <UserProfileContext.Provider
        value={{
          userProfile: mockUserProfile,
          updateUserProfile: mockUpdateUserProfile,
        }}
      >
        {ui}
      </UserProfileContext.Provider>
    );
  };

  test("renders the modal and allows saving an itinerary", async () => {
    // Arrange
    renderWithContext(
      <AddItineraryModal
        open={true}
        onClose={mockOnClose}
        onItineraryAdded={mockOnItineraryAdded}
        itineraries={mockItineraries}
      />
    );
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Act
    const genderDropdown = screen.getByRole("combobox", {
      name: /I am looking for a/i,
    });
    fireEvent.mouseDown(genderDropdown);
    const genderOption = await screen.findByRole("option", { name: "Female" });
    fireEvent.click(genderOption);

    // Add status selection
    const statusDropdown = screen.getByRole("combobox", {
      name: /I am looking for$/i,
    });
    fireEvent.mouseDown(statusDropdown);
    const statusOption = await screen.findByRole("option", { name: "Single" });
    fireEvent.click(statusOption);

    // Add sexual orientation selection
    const orientationDropdown = screen.getByRole("combobox", {
      name: /Sexual orientation preference/i,
    });
    fireEvent.mouseDown(orientationDropdown);
    const orientationOption = await screen.findByRole("option", { name: "Heterosexual" });
    fireEvent.click(orientationOption);

    const destinationInput = screen.getByTestId("google-places-autocomplete");
    fireEvent.change(destinationInput, { target: { value: "Paris" } });

    const startDateInput = screen.getByLabelText(/start date/i);
    fireEvent.change(startDateInput, { target: { value: today } });

    const endDateInput = screen.getByLabelText(/end date/i);
    fireEvent.change(endDateInput, { target: { value: tomorrow } });

    const descriptionInput = screen.getByLabelText(
      /provide a description of your trip/i
    );
    fireEvent.change(descriptionInput, {
      target: { value: "A trip to Paris" },
    });

    const saveButton = screen.getByRole("button", { name: /save itinerary/i });
    fireEvent.click(saveButton);

    // Assert
    await waitFor(() => expect(mockPostItinerary).toHaveBeenCalled());
    expect(mockPostItinerary).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: "Paris",
        startDate: today,
        endDate: tomorrow,
        description: "A trip to Paris",
        gender: "Female",
        status: "single",
        sexualOrientation: "heterosexual", // Add this field
        userInfo: expect.objectContaining({
          username: "Test User",
          gender: "Other",
          dob: "1990-01-01",
          uid: "testUserId",
          status: "single",
          sexualOrientation: "heterosexual", // Add this field
        }),
      })
    );
    expect(mockOnItineraryAdded).toHaveBeenCalledWith("Paris");
    expect(mockOnClose).toHaveBeenCalled();
  });

  test("displays an error if endDate is greater than the current day but less than startDate", async () => {
    // Arrange
    renderWithContext(
      <AddItineraryModal
        open={true}
        onClose={mockOnClose}
        onItineraryAdded={mockOnItineraryAdded}
        itineraries={mockItineraries}
      />
    );

    const today = new Date();
    const startDate = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000) // Two days from today
      .toISOString()
      .split("T")[0];
    const endDate = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000) // One day from today
      .toISOString()
      .split("T")[0];

    // Act
    const startDateInput = screen.getByLabelText(/start date/i);
    fireEvent.change(startDateInput, { target: { value: startDate } });

    const endDateInput = screen.getByLabelText(/end date/i);
    fireEvent.change(endDateInput, { target: { value: endDate } });

    const saveButton = screen.getByRole("button", { name: /save itinerary/i });
    fireEvent.click(saveButton);

    // Assert
    const errorMessage = screen.getAllByText(
      /End Date cannot be less than Start Date./i
    );
    expect(errorMessage).toHaveLength(1);
    expect(mockPostItinerary).not.toHaveBeenCalled();
  });

  test("displays error if start date is earlier than today", async () => {
    // Arrange
    renderWithContext(
      <AddItineraryModal
        open={true}
        onClose={mockOnClose}
        onItineraryAdded={mockOnItineraryAdded}
        itineraries={mockItineraries}
      />
    );

    const today = new Date();
    const startDate = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000) // One day earlier than today
      .toISOString()
      .split("T")[0];
    const endDate = new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000) // Two days after today
      .toISOString()
      .split("T")[0];

    // Act
    const startDateInput = screen.getByLabelText(/start date/i);
    fireEvent.change(startDateInput, { target: { value: startDate } });

    const endDateInput = screen.getByLabelText(/end date/i);
    fireEvent.change(endDateInput, { target: { value: endDate } });

    const saveButton = screen.getByRole("button", { name: /save itinerary/i });
    fireEvent.click(saveButton);

    // Assert
    const errorMessage = screen.getByText(
      /Start Date cannot be earlier than today./i
    );
    expect(errorMessage).toBeInTheDocument();
    expect(mockPostItinerary).not.toHaveBeenCalled();
  });

  test("closes the modal when the cancel button is clicked", () => {
    // Arrange
    renderWithContext(
      <AddItineraryModal
        open={true}
        onClose={mockOnClose}
        onItineraryAdded={mockOnItineraryAdded}
        itineraries={mockItineraries}
      />
    );

    // Act
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Assert
    expect(mockOnClose).toHaveBeenCalled();
  });

  test("should not allow saving an itinerary if gender or dob is missing", async () => {
    // Arrange
    const incompleteProfile = {
      ...mockUserProfile,
      gender: "",
      dob: "",
      sexualOrientation: "heterosexual", // Keep this field
    };

    render(
      <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
        <UserProfileContext.Provider
          value={{
            userProfile: incompleteProfile,
            updateUserProfile: mockUpdateUserProfile,
          }}>
          <AddItineraryModal
            open={true}
            onClose={mockOnClose}
            onItineraryAdded={mockOnItineraryAdded}
            itineraries={mockItineraries}
          />
        </UserProfileContext.Provider>
      </AlertContext.Provider>
    );

    const saveButton = screen.getByRole("button", { name: /save itinerary/i });

    // Act
    fireEvent.click(saveButton);

    // Assert
    expect(window.alert).toHaveBeenCalledWith(
      "Please complete your profile by setting your date of birth and gender before creating an itinerary."
    );
    expect(mockPostItinerary).not.toHaveBeenCalled();
    expect(mockOnItineraryAdded).not.toHaveBeenCalled();
  });

  test("displays itineraries passed as props", () => {
    // Arrange
    renderWithContext(
      <AddItineraryModal
        open={true}
        onClose={mockOnClose}
        onItineraryAdded={mockOnItineraryAdded}
        itineraries={mockItineraries}
      />
    );

    // Assert that itineraries are displayed
    mockItineraries.forEach((itinerary) => {
      expect(screen.getByText(itinerary.destination)).toBeInTheDocument();
      expect(screen.getByText(itinerary.description ?? "")).toBeInTheDocument();
    });
  });

  test("displays error if status is not selected", async () => {
    // Arrange
    renderWithContext(
      <AddItineraryModal
        open={true}
        onClose={mockOnClose}
        onItineraryAdded={mockOnItineraryAdded}
        itineraries={mockItineraries}
      />
    );

    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Act - Fill out form but skip status
    const genderDropdown = screen.getByRole("combobox", {
      name: /I am looking for a/i,
    });
    fireEvent.mouseDown(genderDropdown);
    const genderOption = await screen.findByRole("option", { name: "Female" });
    fireEvent.click(genderOption);

    const destinationInput = screen.getByTestId("google-places-autocomplete");
    fireEvent.change(destinationInput, { target: { value: "Paris" } });

    const startDateInput = screen.getByLabelText(/start date/i);
    fireEvent.change(startDateInput, { target: { value: today } });

    const endDateInput = screen.getByLabelText(/end date/i);
    fireEvent.change(endDateInput, { target: { value: tomorrow } });

    const saveButton = screen.getByRole("button", { name: /save itinerary/i });
    fireEvent.click(saveButton);

    // Assert
    expect(window.alert).toHaveBeenCalledWith("Please select a status preference.");
    expect(mockPostItinerary).not.toHaveBeenCalled();
  });

  test("displays error if sexual orientation is not selected", async () => {
    // Arrange
    renderWithContext(
      <AddItineraryModal
        open={true}
        onClose={mockOnClose}
        onItineraryAdded={mockOnItineraryAdded}
        itineraries={mockItineraries}
      />
    );

    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Act - Fill out form but skip sexual orientation
    const genderDropdown = screen.getByRole("combobox", {
      name: /I am looking for a/i,
    });
    fireEvent.mouseDown(genderDropdown);
    const genderOption = await screen.findByRole("option", { name: "Female" });
    fireEvent.click(genderOption);

    const statusDropdown = screen.getByRole("combobox", {
      name: /I am looking for$/i,
    });
    fireEvent.mouseDown(statusDropdown);
    const statusOption = await screen.findByRole("option", { name: "Single" });
    fireEvent.click(statusOption);

    const destinationInput = screen.getByTestId("google-places-autocomplete");
    fireEvent.change(destinationInput, { target: { value: "Paris" } });

    const startDateInput = screen.getByLabelText(/start date/i);
    fireEvent.change(startDateInput, { target: { value: today } });

    const endDateInput = screen.getByLabelText(/end date/i);
    fireEvent.change(endDateInput, { target: { value: tomorrow } });

    const saveButton = screen.getByRole("button", { name: /save itinerary/i });
    fireEvent.click(saveButton);

    // Assert
    expect(window.alert).toHaveBeenCalledWith("Please select a sexual orientation preference.");
    expect(mockPostItinerary).not.toHaveBeenCalled();
  });
});
