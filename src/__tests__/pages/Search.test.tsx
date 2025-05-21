import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { Search } from "../../components/pages/Search";
import useGetItinerariesFromFirestore from "../../hooks/useGetItinerariesFromFirestore";
import useGetUserProfile from "../../hooks/useGetUserProfile";
import { UserProfileContext } from "../../Context/UserProfileContext";

// Mock dependencies
jest.mock("../../hooks/useGetItinerariesFromFirestore");
jest.mock("../../hooks/useGetUserProfile");
jest.mock("react-google-places-autocomplete", () => () => (
  <div data-testid="mock-google-places-autocomplete" />
));

describe("Search Component", () => {
  const mockFetchItineraries = jest.fn();
  const mockUserProfile = { username: "Test User", gender: "Other" };

  beforeEach(() => {
    jest.clearAllMocks();
    (useGetItinerariesFromFirestore as jest.Mock).mockReturnValue({
      fetchItineraries: mockFetchItineraries,
    });
    (useGetUserProfile as jest.Mock).mockReturnValue({});
  });

  const renderWithContext = (ui: React.ReactElement) => {
    return render(
      <UserProfileContext.Provider
        value={{
          userProfile: mockUserProfile,
          updateUserProfile: jest.fn(),
        }}>
        {ui}
      </UserProfileContext.Provider>
    );
  };

  test("renders itineraries in the dropdown when fetched successfully", async () => {
    // Arrange
    mockFetchItineraries.mockResolvedValue([
      { id: "1", destination: "Paris" },
      { id: "2", destination: "New York" },
    ]);

    // Act
    renderWithContext(<Search />);

    // Assert
    await waitFor(() => expect(mockFetchItineraries).toHaveBeenCalled());

    const dropdown = screen.getByRole("combobox"); // Ensure your dropdown has the correct role
    expect(dropdown).toBeInTheDocument();
  });
  test("opens AddItineraryModal when the Add Itinerary button is clicked", async () => {
    // Arrange
    mockFetchItineraries.mockResolvedValue([]);

    // Act
    renderWithContext(<Search />);

    // Assert
    const addButton = screen.getByRole("button", { name: /add itinerary/i });
    expect(addButton).toBeInTheDocument();
    addButton.click();
    screen.debug();
    const modalHeading = await screen.findByRole("heading", {
      name: /Add New Itinerary/i,
    });
    expect(modalHeading).toBeInTheDocument();
  });
});
