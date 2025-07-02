import { renderHook } from "@testing-library/react";
import useGetItinerariesFromFirestore from "../../hooks/useGetItinerariesFromFirestore";
import useGetUserId from "../../hooks/useGetUserId";
import { getFirestore, collection, getDocs } from "firebase/firestore";

// Mock dependencies
jest.mock("firebase/firestore");
jest.mock("../../hooks/useGetUserId");

describe("useGetItinerariesFromFirestore", () => {
  const mockUserId = "testUserId";
  const mockItineraries = [
    { id: "1", destination: "Paris" },
    { id: "2", destination: "New York" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (useGetUserId as jest.Mock).mockReturnValue(mockUserId);
  });

  test("should fetch itineraries successfully", async () => {
    // Arrange
    const mockGetDocs = jest.fn().mockResolvedValue({
      docs: mockItineraries.map((itinerary) => ({
        id: itinerary.id,
        data: () => ({ destination: itinerary.destination }),
      })),
    });

    (getFirestore as jest.Mock).mockReturnValue({});
    (collection as jest.Mock).mockReturnValue({});
    (getDocs as jest.Mock).mockImplementation(mockGetDocs);

    const { result } = renderHook(() => useGetItinerariesFromFirestore());

    // Act
    const itineraries = await result.current.fetchItineraries();

    // Assert
    expect(getFirestore).toHaveBeenCalled();
    expect(collection).toHaveBeenCalledWith({}, `itineraries`);
    expect(getDocs).toHaveBeenCalled();
    expect(itineraries).toEqual(mockItineraries);
  });
});
