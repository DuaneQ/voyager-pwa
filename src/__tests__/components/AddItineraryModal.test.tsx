import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AddItineraryModal from "../../components/forms/AddItineraryModal";
import { UserProfileContext } from "../../Context/UserProfileContext";
import useGetUserId from "../../hooks/useGetUserId";
import usePostItineraryToFirestore from "../../hooks/usePostItineraryToFirestore";
import GooglePlacesAutocomplete from "react-google-places-autocomplete";
import { AlertContext } from "../../Context/AlertContext";

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
  };
  const mockPostItinerary = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnItineraryAdded = jest.fn();
  const mockShowAlert = jest.fn();
  const mockUpdateUserProfile = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
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
      <UserProfileContext.Provider value={{ userProfile: mockUserProfile }}>
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
        userInfo: expect.objectContaining({
          username: "Test User",
          gender: "Other",
          dob: "1990-01-01",
          uid: "testUserId",
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
    const incompleteProfile = { ...mockUserProfile, gender: "", dob: "" };

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
          />
        </UserProfileContext.Provider>
      </AlertContext.Provider>
    );

    const saveButton = screen.getByRole("button", { name: /save itinerary/i });

    // Act
    fireEvent.click(saveButton);

    // Assert
    expect(mockPostItinerary).not.toHaveBeenCalled();
    expect(mockOnItineraryAdded).not.toHaveBeenCalled();
  });
});
