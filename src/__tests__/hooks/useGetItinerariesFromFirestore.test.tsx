import { renderHook } from "@testing-library/react";
import useGetItinerariesFromFirestore from "../../hooks/useGetItinerariesFromFirestore";
import useGetUserId from "../../hooks/useGetUserId";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { act, waitFor } from '@testing-library/react';

// Mock dependencies
jest.mock("firebase/firestore");
jest.mock("../../hooks/useGetUserId");
jest.mock('firebase/auth', () => ({ getAuth: () => ({ currentUser: null }) }));

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

    // Mock localStorage to return a valid user
    const userCredentials = { user: { uid: mockUserId } };
    jest.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation((key) => {
      if (key === "USER_CREDENTIALS") return JSON.stringify(userCredentials);
      return null;
    });

    const { result } = renderHook(() => useGetItinerariesFromFirestore());

    // Act
    const itineraries = await result.current.fetchItineraries();

    // Assert
    expect(getFirestore).toHaveBeenCalled();
    expect(collection).toHaveBeenCalledWith({}, `itineraries`);
    expect(getDocs).toHaveBeenCalled();
    expect(itineraries).toEqual(mockItineraries);

    // Restore localStorage mock
    (window.localStorage.getItem as jest.Mock).mockRestore?.();
  });

  test('returns error and empty array when user is unauthenticated', async () => {
    // Ensure no USER_CREDENTIALS and no auth currentUser
    jest.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation(() => null);
    jest.doMock('firebase/auth', () => ({ getAuth: () => ({ currentUser: null }) }));
    // make sure useGetUserId returns null
    (useGetUserId as jest.Mock).mockReturnValue(null);

  const { result } = renderHook(() => useGetItinerariesFromFirestore());

  let itineraries: any;
  await act(async () => { itineraries = await result.current.fetchItineraries(); });

  expect(itineraries).toEqual([]);
  await waitFor(() => expect(result.current.error).toMatch(/User not authenticated/));

  (window.localStorage.getItem as jest.Mock).mockRestore?.();
  });

  test('returns empty array and sets error when getDocs throws', async () => {
    const mockGetDocs = jest.fn().mockRejectedValue(new Error('boom'));
    (getFirestore as jest.Mock).mockReturnValue({});
    (collection as jest.Mock).mockReturnValue({});
    (getDocs as jest.Mock).mockImplementation(mockGetDocs);

    // Ensure localStorage has credentials
    const userCredentials = { user: { uid: mockUserId } };
    jest.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation((key) => {
      if (key === 'USER_CREDENTIALS') return JSON.stringify(userCredentials);
      return null;
    });

  const { result } = renderHook(() => useGetItinerariesFromFirestore());

  let itineraries: any;
  await act(async () => { itineraries = await result.current.fetchItineraries(); });

  expect(itineraries).toEqual([]);
  await waitFor(() => expect(result.current.error).toMatch(/Failed to fetch itineraries/));

  (window.localStorage.getItem as jest.Mock).mockRestore?.();
  });
});
