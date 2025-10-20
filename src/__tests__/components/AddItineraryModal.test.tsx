// Mock auth.currentUser for AddItineraryModal
jest.mock("../../environments/firebaseConfig", () => {
  return {
    auth: {
      get currentUser() {
        return global.__mockCurrentUser;
      },
    },
  };
});
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddItineraryModal from "../../components/forms/AddItineraryModal";
import { UserProfileContext } from "../../Context/UserProfileContext";
import usePostItineraryToFirestore from "../../hooks/usePostItineraryToFirestore";
import useUpdateItinerary from "../../hooks/useUpdateItinerary";
import useDeleteItinerary from "../../hooks/useDeleteItinerary";
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
jest.mock("../../hooks/usePostItineraryToFirestore");
jest.mock("../../hooks/useUpdateItinerary");
jest.mock("../../hooks/useDeleteItinerary");
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
  const mockUpdateItinerary = jest.fn();
  const mockDeleteItinerary = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnItineraryAdded = jest.fn();
  const mockOnRefresh = jest.fn();
  const mockShowAlert = jest.fn();
  const mockUpdateUserProfile = jest.fn();

  const mockItineraries: Itinerary[] = [
    {
      id: "1",
      destination: "Paris",
      startDate: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 10 years from today
      endDate: new Date(Date.now() + 3660 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // 10 years + 10 days from today
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
    global.__mockCurrentUser = { uid: mockUserId };
    (usePostItineraryToFirestore as jest.Mock).mockReturnValue({
      postItinerary: mockPostItinerary,
    });
    (useUpdateItinerary as jest.Mock).mockReturnValue({
      updateItinerary: mockUpdateItinerary,
    });
    (useDeleteItinerary as jest.Mock).mockReturnValue({
      deleteItinerary: mockDeleteItinerary,
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
        onRefresh={mockOnRefresh}
        itineraries={mockItineraries}
      />
    );
    // Use future dates to avoid validation issues
    const futureStart = new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // 10 years from today
    const futureEnd = new Date(Date.now() + 3660 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // 10 years + 10 days from today

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
    fireEvent.change(startDateInput, { target: { value: futureStart } });

    const endDateInput = screen.getByLabelText(/end date/i);
    fireEvent.change(endDateInput, { target: { value: futureEnd } });

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
        startDate: futureStart,
        endDate: futureEnd,
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
        onRefresh={mockOnRefresh}
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
        onRefresh={mockOnRefresh}
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
        onRefresh={mockOnRefresh}
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
        onRefresh={mockOnRefresh}
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
        onRefresh={mockOnRefresh}
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
        onRefresh={mockOnRefresh}
        itineraries={mockItineraries}
      />
    );

    // Use future dates to avoid validation issues
    const futureStart = new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // 10 years from today
    const futureEnd = new Date(Date.now() + 3660 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // 10 years + 10 days from today

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
    fireEvent.change(startDateInput, { target: { value: futureStart } });

    const endDateInput = screen.getByLabelText(/end date/i);
    fireEvent.change(endDateInput, { target: { value: futureEnd } });

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
        onRefresh={mockOnRefresh}
        itineraries={mockItineraries}
      />
    );

    // Use future dates to avoid validation issues
    const futureStart = new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // 10 years from today
    const futureEnd = new Date(Date.now() + 3660 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // 10 years + 10 days from today

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
    fireEvent.change(startDateInput, { target: { value: futureStart } });

    const endDateInput = screen.getByLabelText(/end date/i);
    fireEvent.change(endDateInput, { target: { value: futureEnd } });

    const saveButton = screen.getByRole("button", { name: /save itinerary/i });
    fireEvent.click(saveButton);

    // Assert
    expect(window.alert).toHaveBeenCalledWith("Please select a sexual orientation preference.");
    expect(mockPostItinerary).not.toHaveBeenCalled();
  });

  // New tests for edit and delete functionality
  test("should display edit and delete buttons for existing itineraries", () => {
    renderWithContext(
      <AddItineraryModal
        open={true}
        onClose={mockOnClose}
        onItineraryAdded={mockOnItineraryAdded}
        onRefresh={mockOnRefresh}
        itineraries={mockItineraries}
      />
    );

    // Check that edit and delete buttons are present for each itinerary
    expect(screen.getAllByLabelText(/edit itinerary/i)).toHaveLength(mockItineraries.length);
    expect(screen.getAllByLabelText(/delete itinerary/i)).toHaveLength(mockItineraries.length);
  });

  test("should enter edit mode when edit button is clicked", async () => {
    renderWithContext(
      <AddItineraryModal
        open={true}
        onClose={mockOnClose}
        onItineraryAdded={mockOnItineraryAdded}
        onRefresh={mockOnRefresh}
        itineraries={mockItineraries}
      />
    );

    // Click edit button for first itinerary
    const editButtons = screen.getAllByLabelText(/edit itinerary/i);
    fireEvent.click(editButtons[0]);

    // Check that modal title changes to edit mode
    expect(screen.getByText("Edit Itinerary")).toBeInTheDocument();
    
    // Check that save button changes to update
    expect(screen.getByRole("button", { name: /update itinerary/i })).toBeInTheDocument();
    
    // Check that form is populated with existing data
    const destinationInput = screen.getByTestId("google-places-autocomplete");
    expect(destinationInput).toHaveValue(mockItineraries[0].destination);
  });

  test("should update itinerary when in edit mode", async () => {
    renderWithContext(
      <AddItineraryModal
        open={true}
        onClose={mockOnClose}
        onItineraryAdded={mockOnItineraryAdded}
        onRefresh={mockOnRefresh}
        itineraries={mockItineraries}
      />
    );

    // Enter edit mode
    const editButtons = screen.getAllByLabelText(/edit itinerary/i);
    fireEvent.click(editButtons[0]);

    // Modify the destination
    const destinationInput = screen.getByTestId("google-places-autocomplete");
    fireEvent.change(destinationInput, { target: { value: "Rome" } });

    // Fill out other required fields to ensure validation passes
    // Use dates further in the future to avoid conflicts with the mock itinerary's future dates
    const futureStart = new Date(Date.now() + 3670 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // 10 years + 20 days from today
    const futureEnd = new Date(Date.now() + 3680 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // 10 years + 30 days from today

    // First set the end date to a future date, then set start date to avoid validation errors
    const endDateInput = screen.getByLabelText(/end date/i);
    fireEvent.change(endDateInput, { target: { value: futureEnd } });

    const startDateInput = screen.getByLabelText(/start date/i);
    fireEvent.change(startDateInput, { target: { value: futureStart } });

    // Select required dropdowns - these should already be populated in edit mode
    // Since the mock itinerary already has gender: "Female", status: "single", sexualOrientation: "heterosexual"
    // we don't need to set them again, just verify the form can be submitted

    // Click update button
    const updateButton = screen.getByRole("button", { name: /update itinerary/i });
    fireEvent.click(updateButton);

    // Assert update was called
    await waitFor(() => {
      expect(mockUpdateItinerary).toHaveBeenCalledWith(
        mockItineraries[0].id,
        expect.objectContaining({
          destination: "Rome"
        })
      );
    });
  });

  test("should show delete confirmation dialog when delete button is clicked", () => {
    renderWithContext(
      <AddItineraryModal
        open={true}
        onClose={mockOnClose}
        onItineraryAdded={mockOnItineraryAdded}
        onRefresh={mockOnRefresh}
        itineraries={mockItineraries}
      />
    );

    // Click delete button for first itinerary
    const deleteButtons = screen.getAllByLabelText(/delete itinerary/i);
    fireEvent.click(deleteButtons[0]);

    // Check that delete dialog appears
    expect(screen.getByText("Delete Itinerary?")).toBeInTheDocument();
    expect(screen.getByText(/are you sure you want to delete this itinerary/i)).toBeInTheDocument();
    expect(screen.getByText(`"${mockItineraries[0].destination}"`)).toBeInTheDocument();
    
    // Check that delete and cancel buttons are present
    expect(screen.getByRole("button", { name: /delete$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  test("should delete itinerary when confirmed", async () => {
    renderWithContext(
      <AddItineraryModal
        open={true}
        onClose={mockOnClose}
        onItineraryAdded={mockOnItineraryAdded}
        onRefresh={mockOnRefresh}
        itineraries={mockItineraries}
      />
    );

    // Click delete button
    const deleteButtons = screen.getAllByLabelText(/delete itinerary/i);
    fireEvent.click(deleteButtons[0]);

    // Confirm deletion
    const confirmDeleteButton = screen.getByRole("button", { name: /delete$/i });
    fireEvent.click(confirmDeleteButton);

    // Assert delete was called
    await waitFor(() => {
      expect(mockDeleteItinerary).toHaveBeenCalledWith(mockItineraries[0].id);
    });
  });

  test("should cancel deletion when cancel button is clicked", async () => {
    renderWithContext(
      <AddItineraryModal
        open={true}
        onClose={mockOnClose}
        onItineraryAdded={mockOnItineraryAdded}
        onRefresh={mockOnRefresh}
        itineraries={mockItineraries}
      />
    );

    // Click delete button
    const deleteButtons = screen.getAllByLabelText(/delete itinerary/i);
    fireEvent.click(deleteButtons[0]);

    // Cancel deletion
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Wait for dialog to close, then check that dialog is closed and delete was not called
    await waitFor(() => {
      expect(screen.queryByText("Delete Itinerary?")).not.toBeInTheDocument();
    });
    expect(mockDeleteItinerary).not.toHaveBeenCalled();
  });

  test("should cancel edit mode and reset form", () => {
    renderWithContext(
      <AddItineraryModal
        open={true}
        onClose={mockOnClose}
        onItineraryAdded={mockOnItineraryAdded}
        onRefresh={mockOnRefresh}
        itineraries={mockItineraries}
      />
    );

    // Enter edit mode
    const editButtons = screen.getAllByLabelText(/edit itinerary/i);
    fireEvent.click(editButtons[0]);

    // Verify we're in edit mode
    expect(screen.getByText("Edit Itinerary")).toBeInTheDocument();

    // Click cancel
    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Verify we're back to add mode
    expect(screen.getByText("Add New Itinerary")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save itinerary/i })).toBeInTheDocument();
  });

  test("should handle update itinerary errors gracefully", async () => {
    // Mock update to throw an error
    mockUpdateItinerary.mockRejectedValueOnce(new Error("Update failed"));

    renderWithContext(
      <AddItineraryModal
        open={true}
        onClose={mockOnClose}
        onItineraryAdded={mockOnItineraryAdded}
        onRefresh={mockOnRefresh}
        itineraries={mockItineraries}
      />
    );

    // Enter edit mode and fill form
    const editButtons = screen.getAllByLabelText(/edit itinerary/i);
    fireEvent.click(editButtons[0]);

    // Set the destination (required field)
    const destinationInput = screen.getByTestId("google-places-autocomplete");
    fireEvent.change(destinationInput, { target: { value: "Paris" } });

    // Fill required fields with dates that won't trigger validation errors
    // Use dates further in the future to avoid conflicts with the mock itinerary's future dates
    const futureStart = new Date(Date.now() + 3690 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // 10 years + 40 days from today
    const futureEnd = new Date(Date.now() + 3700 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]; // 10 years + 50 days from today

    // First set the end date to a future date, then set start date to avoid validation errors
    const endDateInput = screen.getByLabelText(/end date/i);
    fireEvent.change(endDateInput, { target: { value: futureEnd } });

    const startDateInput = screen.getByLabelText(/start date/i);
    fireEvent.change(startDateInput, { target: { value: futureStart } });

    // Note: The dropdown fields (gender, status, orientation) should already be populated 
    // from the existing itinerary data when editing, so we don't need to manually set them
    // unless the test specifically needs to change their values

    // Try to update
    const updateButton = screen.getByRole("button", { name: /update itinerary/i });
    fireEvent.click(updateButton);

    // Assert error alert is shown
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("An error occurred while updating the itinerary. Please try again.");
    });
  });

  test("should handle delete itinerary errors gracefully", async () => {
    // Mock delete to throw an error
    mockDeleteItinerary.mockRejectedValueOnce(new Error("Delete failed"));

    renderWithContext(
      <AddItineraryModal
        open={true}
        onClose={mockOnClose}
        onItineraryAdded={mockOnItineraryAdded}
        onRefresh={mockOnRefresh}
        itineraries={mockItineraries}
      />
    );

    // Click delete button and confirm
    const deleteButtons = screen.getAllByLabelText(/delete itinerary/i);
    fireEvent.click(deleteButtons[0]);

    const confirmDeleteButton = screen.getByRole("button", { name: /delete$/i });
    fireEvent.click(confirmDeleteButton);

    // Assert error alert is shown
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith("An error occurred while deleting the itinerary. Please try again.");
    });
  });
});
