import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { Search } from "../../components/pages/Search";
import useGetItinerariesFromFirestore from "../../hooks/useGetItinerariesFromFirestore";
import useGetUserProfile from "../../hooks/useGetUserProfile";
import { UserProfileContext } from "../../Context/UserProfileContext";
import useGetUserId from "../../hooks/useGetUserId";
import useSearchItineraries from "../../hooks/useSearchItineraries";
import * as firestore from "firebase/firestore";
import { NewConnectionProvider } from "../../Context/NewConnectionContext";

// Mock dependencies
jest.mock("../../hooks/useGetItinerariesFromFirestore");
jest.mock("../../hooks/useGetUserProfile");
jest.mock("../../hooks/useGetUserId");
jest.mock("../../hooks/useSearchItineraries");
jest.mock("firebase/firestore", () => ({
  ...jest.requireActual("firebase/firestore"),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  addDoc: jest.fn(),
  collection: jest.fn(),
  getDoc: jest.fn(),
}));

jest.mock("react-google-places-autocomplete", () => () => (
  <div data-testid="mock-google-places-autocomplete" />
));

// Mock window.alert for jsdom
beforeAll(() => {
  window.alert = jest.fn();
});

describe("Search Component", () => {
  const mockFetchItineraries = jest.fn();
  const mockUserProfile = { username: "Test User", gender: "Other" };
  const mockUserId = "testUserId";
  const mockSearchItineraries = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useGetItinerariesFromFirestore as jest.Mock).mockReturnValue({
      fetchItineraries: mockFetchItineraries,
    });
    (useGetUserProfile as jest.Mock).mockReturnValue({});
    (useGetUserId as jest.Mock).mockReturnValue(mockUserId);
    (useSearchItineraries as jest.Mock).mockReturnValue({
      matchingItineraries: [],
      searchItineraries: mockSearchItineraries,
    });
    (firestore.collection as jest.Mock).mockReturnValue("mockCollection");
    (firestore.updateDoc as jest.Mock).mockResolvedValue(undefined);
    (firestore.addDoc as jest.Mock).mockResolvedValue(undefined);

    // Always return a snapshot with a .data() method
    (firestore.getDoc as jest.Mock).mockResolvedValue({
      data: () => ({
        id: "1",
        destination: "Paris",
        likes: [],
      }),
    });
  });

  const renderWithContext = (ui: React.ReactElement) => {
    return render(
      <NewConnectionProvider>
        <UserProfileContext.Provider
          value={{
            userProfile: mockUserProfile,
            updateUserProfile: jest.fn(),
          }}>
          {ui}
        </UserProfileContext.Provider>
      </NewConnectionProvider>
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

    // Wait for dropdown to appear
    const dropdown = await screen.findByRole("combobox");
    expect(dropdown).toBeInTheDocument();
  });

  test("opens AddItineraryModal when the Add Itinerary button is clicked", async () => {
    // Arrange
    mockFetchItineraries.mockResolvedValue([]);

    // Act
    renderWithContext(<Search />);

    // Assert
    const addButton = await screen.findByRole("button", {
      name: /add itinerary/i,
    });
    expect(addButton).toBeInTheDocument();
    fireEvent.click(addButton);

    const modalHeading = await screen.findByRole("heading", {
      name: /Add New Itinerary/i,
    });
    expect(modalHeading).toBeInTheDocument();
  });

  test("creates a connection when there is a mutual like", async () => {
    // Arrange
    const myItinerary = {
      id: "1",
      destination: "Paris",
      likes: ["otherUserId"],
    };
    const otherItinerary = {
      id: "2",
      destination: "London",
      userInfo: { uid: "otherUserId" },
    };
    mockFetchItineraries.mockResolvedValue([myItinerary]);
    (useSearchItineraries as jest.Mock).mockReturnValue({
      matchingItineraries: [otherItinerary],
      searchItineraries: mockSearchItineraries,
    });

    // Mock doc to return objects with id property for connection creation
    (firestore.doc as jest.Mock).mockImplementation((db, collection, id) => ({
      id,
    }));

    // Mock getDoc to return the correct likes array
    (firestore.getDoc as jest.Mock).mockResolvedValue({
      data: () => myItinerary,
    });

    renderWithContext(<Search />);

    // Wait for itineraries to load
    await waitFor(() => expect(mockFetchItineraries).toHaveBeenCalled());

    // Select itinerary
    const select = await screen.findByRole("combobox");
    fireEvent.mouseDown(select);

    // Select the first itinerary
    const option = await screen.findByText("Paris");
    fireEvent.click(option);

    // Simulate Like button click
    const likeButtons = await screen.findAllByRole("button", { name: /like/i });
    const likeButton = likeButtons.find(
      (btn) => btn.getAttribute("aria-label") === "Like"
    );
    expect(likeButton).toBeTruthy();
    fireEvent.click(likeButton!);

    // Assert Firestore addDoc called for connection
    await waitFor(() => {
      expect(firestore.addDoc).toHaveBeenCalledWith(
        "mockCollection",
        expect.objectContaining({
          users: expect.arrayContaining([mockUserId, "otherUserId"]),
          itineraryIds: expect.arrayContaining(["1", "2"]),
        })
      );
    });
  });

  test("does not create a connection if there is no mutual like", async () => {
    // Arrange
    const myItinerary = {
      id: "1",
      destination: "Paris",
      likes: [],
    };
    const otherItinerary = {
      id: "2",
      destination: "London",
      userInfo: { uid: "otherUserId" },
    };
    mockFetchItineraries.mockResolvedValue([myItinerary]);
    (useSearchItineraries as jest.Mock).mockReturnValue({
      matchingItineraries: [otherItinerary],
      searchItineraries: mockSearchItineraries,
    });

    // Mock doc to return objects with id property for connection creation
    (firestore.doc as jest.Mock).mockImplementation((db, collection, id) => ({
      id,
    }));

    // Mock getDoc to return the correct likes array
    (firestore.getDoc as jest.Mock).mockResolvedValue({
      data: () => myItinerary,
    });

    renderWithContext(<Search />);

    // Wait for itineraries to load
    await waitFor(() => expect(mockFetchItineraries).toHaveBeenCalled());

    // Select itinerary
    const select = await screen.findByRole("combobox");
    fireEvent.mouseDown(select);

    // Select the first itinerary
    const option = await screen.findByText("Paris");
    fireEvent.click(option);

    // Simulate Like button click
    const likeButtons = await screen.findAllByRole("button", { name: /like/i });
    const likeButton = likeButtons.find(
      (btn) => btn.getAttribute("aria-label") === "Like"
    );
    expect(likeButton).toBeTruthy();
    fireEvent.click(likeButton!);

    // Assert Firestore addDoc NOT called for connection
    await waitFor(() => {
      expect(firestore.addDoc).not.toHaveBeenCalled();
    });
  });

  test("updates likes on itinerary when liked", async () => {
    // Arrange
    const myItinerary = {
      id: "1",
      destination: "Paris",
      likes: [],
    };
    const otherItinerary = {
      id: "2",
      destination: "London",
      userInfo: { uid: "otherUserId" },
    };
    mockFetchItineraries.mockResolvedValue([myItinerary]);
    (useSearchItineraries as jest.Mock).mockReturnValue({
      matchingItineraries: [otherItinerary],
      searchItineraries: mockSearchItineraries,
    });

    // For updateDoc, doc should return a string
    (firestore.doc as jest.Mock).mockReturnValue("mockDoc");

    renderWithContext(<Search />);

    // Wait for itineraries to load
    await waitFor(() => expect(mockFetchItineraries).toHaveBeenCalled());

    // Select itinerary
    const select = await screen.findByRole("combobox");
    fireEvent.mouseDown(select);

    // Select the first itinerary
    const option = await screen.findByText("Paris");
    fireEvent.click(option);

    // Simulate Like button click
    const likeButtons = await screen.findAllByRole("button", { name: /like/i });
    const likeButton = likeButtons.find(
      (btn) => btn.getAttribute("aria-label") === "Like"
    );
    expect(likeButton).toBeTruthy();
    fireEvent.click(likeButton!);

    // Assert Firestore updateDoc called for likes
    await waitFor(() => {
      expect(firestore.updateDoc).toHaveBeenCalledWith(
        "mockDoc",
        expect.objectContaining({
          likes: expect.anything(),
        })
      );
    });
  });
});
