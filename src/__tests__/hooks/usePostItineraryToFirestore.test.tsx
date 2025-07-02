import { renderHook } from "@testing-library/react";
import usePostItineraryToFirestore from "../../hooks/usePostItineraryToFirestore";
import useGetUserId from "../../hooks/useGetUserId";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { app } from "../../environments/firebaseConfig";

// Mock dependencies
jest.mock("firebase/firestore");
jest.mock("../../hooks/useGetUserId");

describe("usePostItineraryToFirestore", () => {
  const originalError = console.error;
  const mockUserId = "testUserId";
  const mockItinerary = {
    destination: "Paris",
    startDate: "2025-05-01",
    endDate: "2025-05-10",
    description: "A trip to Paris",
    activities: ["Eiffel Tower", "Louvre Museum"],
    gender: "Any",
    startDay: 1,
    endDay: 10,
    lowerRange: 18,
    upperRange: 50,
    likes: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useGetUserId as jest.Mock).mockReturnValue(mockUserId);
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  test("should post an itinerary successfully", async () => {
    // Arrange
    const mockAddDoc = jest.fn().mockResolvedValue({});
    (getFirestore as jest.Mock).mockReturnValue({});
    (collection as jest.Mock).mockReturnValue({});
    (addDoc as jest.Mock).mockImplementation(mockAddDoc);

    const { result } = renderHook(() => usePostItineraryToFirestore());

    // Act
    await result.current.postItinerary(mockItinerary);

    // Assert
    expect(getFirestore).toHaveBeenCalledWith(app);
    expect(collection).toHaveBeenCalledWith({}, `itineraries`);
    expect(addDoc).toHaveBeenCalledWith({}, mockItinerary);
  });

  test("should throw an error if user is not authenticated", async () => {
    // Arrange
    (useGetUserId as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => usePostItineraryToFirestore());

    // Act & Assert
    await expect(result.current.postItinerary(mockItinerary)).rejects.toThrow(
      "User not authenticated"
    );
    expect(getFirestore).not.toHaveBeenCalled();
    expect(collection).not.toHaveBeenCalled();
    expect(addDoc).not.toHaveBeenCalled();
  });

  test("should throw an error if posting itinerary fails", async () => {
    // Arrange
    const mockError = new Error("Failed to post itinerary");
    (getFirestore as jest.Mock).mockReturnValue({});
    (collection as jest.Mock).mockReturnValue({});
    (addDoc as jest.Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => usePostItineraryToFirestore());

    // Act & Assert
    await expect(result.current.postItinerary(mockItinerary)).rejects.toThrow(
      "Failed to post itinerary"
    );
    expect(getFirestore).toHaveBeenCalledWith(app);
    expect(collection).toHaveBeenCalledWith({}, `itineraries`);
    expect(addDoc).toHaveBeenCalledWith({}, mockItinerary);
  });
});
