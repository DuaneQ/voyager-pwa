import { renderHook, act } from "@testing-library/react";
import useSearchItineraries from "../../hooks/useSearchItineraries";
import { getDocs, query, collection, where, orderBy, limit, startAfter } from "firebase/firestore";
import { mockItineraries, baseUserItinerary, currentUserId } from "../../test-utils/mocks/itineraryMockData";

// Mock Firebase
jest.mock("firebase/firestore");
jest.mock("../../environments/firebaseConfig", () => ({
  app: {},
}));

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe("useSearchItineraries - Real-Time Search (No Cache)", () => {
  const mockGetDocs = getDocs as jest.Mock;
  const mockQuery = query as jest.Mock;
  const mockCollection = collection as jest.Mock;
  const mockWhere = where as jest.Mock;
  const mockOrderBy = orderBy as jest.Mock;
  const mockLimit = limit as jest.Mock;
  const mockStartAfter = startAfter as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();

    // Setup Firebase mocks
    mockQuery.mockImplementation((...args) => ({ _query: args }));
    mockCollection.mockReturnValue({ _collection: "itineraries" });
    mockWhere.mockImplementation((field, operator, value) => ({ _where: { field, operator, value } }));
    mockOrderBy.mockImplementation((field, direction) => ({ _orderBy: { field, direction } }));
    mockLimit.mockImplementation((count) => ({ _limit: count }));
    mockStartAfter.mockImplementation((doc) => ({ _startAfter: doc }));
  });

  const setupFirestoreMock = (returnedItineraries: any[]) => {
    const mockDocs = returnedItineraries.map((itinerary, index) => ({
      id: itinerary.id,
      data: () => itinerary,
    }));

    mockGetDocs.mockResolvedValue({
      docs: mockDocs,
    });
  };

  describe("Real-Time Search Behavior", () => {
    test("should always query Firestore directly (no cache)", async () => {
      setupFirestoreMock([mockItineraries[0]]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      // Should always call Firestore in real-time approach
      expect(mockGetDocs).toHaveBeenCalledTimes(1);
      expect(result.current.matchingItineraries).toHaveLength(1);
    });

    test("should fetch batches of itineraries (PAGE_SIZE = 10) to handle user exclusion", async () => {
      setupFirestoreMock([mockItineraries[0]]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      // Verify limit is set to 50 for batch fetching to handle user exclusion
      expect(mockLimit).toHaveBeenCalledWith(50);
    });

    test("should load next itinerary when getNextItinerary is called", async () => {
      // Make the initial Firestore response a full PAGE_SIZE raw batch so the hook
      // sets hasMore=true (it bases hasMore on raw snapshot length === PAGE_SIZE).
      // Only the first doc will pass client-side filters (others are from current user)
      const firstBatch = Array.from({ length: 50 }, (_, i) => {
        if (i === 0) {
          return {
            ...mockItineraries[0],
            id: mockItineraries[0].id,
            userInfo: { ...mockItineraries[0].userInfo, uid: 'other-user' }
          };
        }
        return {
          ...mockItineraries[0],
          id: `itinerary-${i}`,
          userInfo: { ...mockItineraries[0].userInfo, uid: currentUserId }
        };
      });

      setupFirestoreMock(firstBatch);

      const { result } = renderHook(() => useSearchItineraries());

      // Initial search - filtered results small, hasMore true because raw PAGE_SIZE
      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      expect(result.current.matchingItineraries).toHaveLength(1);
      const initialCalls = mockGetDocs.mock.calls.length;

      // Setup for next itinerary (next page returns a valid result)
      setupFirestoreMock([mockItineraries[1]]);

      await act(async () => {
        await result.current.getNextItinerary();
      });

      // Should fetch next itinerary (at least one more call)
      expect(mockGetDocs.mock.calls.length).toBeGreaterThan(initialCalls);
    });

    test("should replace current results with new single result", async () => {
      // Make the initial response a PAGE_SIZE raw batch with only one valid result
      const firstBatch = Array.from({ length: 50 }, (_, i) => {
        if (i === 0) {
          return {
            ...mockItineraries[0],
            id: mockItineraries[0].id,
            userInfo: { ...mockItineraries[0].userInfo, uid: 'other-user' }
          };
        }
        return {
          ...mockItineraries[0],
          id: `itinerary-${i}`,
          userInfo: { ...mockItineraries[0].userInfo, uid: currentUserId }
        };
      });

      setupFirestoreMock(firstBatch);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      expect(result.current.matchingItineraries).toHaveLength(1);
      expect(result.current.matchingItineraries[0].id).toBe(mockItineraries[0].id);

      // Next page returns a new valid itinerary
      setupFirestoreMock([mockItineraries[3]]); // itinerary-4 has overlapping dates

      await act(async () => {
        await result.current.loadNextItinerary();
      });

      // After loading next itinerary the current matching should be the newly loaded one
      expect(result.current.matchingItineraries).toHaveLength(1);
      expect(result.current.matchingItineraries[0].id).toBe(mockItineraries[3].id);
    });
  });

  describe("Basic Filtering Tests", () => {
    test("should exclude current user's own itineraries", async () => {
      setupFirestoreMock([mockItineraries[0], mockItineraries[7]]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      const ownItinerary = result.current.matchingItineraries.find(
        (itinerary) => itinerary.id === "itinerary-8"
      );
      expect(ownItinerary).toBeUndefined();

      expect(result.current.matchingItineraries.every(
        (itinerary) => itinerary.userInfo?.uid !== currentUserId
      )).toBe(true);
    });

    test("should exclude viewed itineraries from localStorage", async () => {
      mockLocalStorage.setItem("VIEWED_ITINERARIES", JSON.stringify(["itinerary-1"]));

      setupFirestoreMock([mockItineraries[0]]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      const viewedItinerary = result.current.matchingItineraries.find(
        (itinerary) => itinerary.id === "itinerary-1"
      );

      expect(viewedItinerary).toBeUndefined();
    });
  });

  describe("Date Overlap Tests", () => {
    test("should include itineraries with overlapping dates", async () => {
      setupFirestoreMock([mockItineraries[9]]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      expect(result.current.matchingItineraries).toHaveLength(1);
      expect(result.current.matchingItineraries[0].id).toBe("itinerary-10");
    });

    test("should exclude itineraries with no date overlap", async () => {
      setupFirestoreMock([mockItineraries[2]]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      expect(result.current.matchingItineraries).toHaveLength(0);
    });
  });

  describe("Error Handling Tests", () => {
    test("should handle Firestore errors gracefully", async () => {
      mockGetDocs.mockRejectedValue(new Error("Firestore error"));

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      expect(result.current.error).toBe("Failed to search itineraries. Please try again later.");
      expect(result.current.matchingItineraries).toHaveLength(0);
    });

    test("should handle load next itinerary errors gracefully", async () => {
      // First search should indicate more pages so that loadNextItinerary will try to fetch
      const firstBatch = Array.from({ length: 50 }, (_, i) => {
        if (i === 0) {
          return {
            ...mockItineraries[0],
            id: mockItineraries[0].id,
            userInfo: { ...mockItineraries[0].userInfo, uid: 'other-user' }
          };
        }
        return {
          ...mockItineraries[0],
          id: `itinerary-${i}`,
          userInfo: { ...mockItineraries[0].userInfo, uid: currentUserId }
        };
      });

      setupFirestoreMock(firstBatch);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      expect(result.current.matchingItineraries).toHaveLength(1);

      // Next fetch fails
      mockGetDocs.mockRejectedValue(new Error("Next itinerary error"));

      await act(async () => {
        await result.current.loadNextItinerary();
      });

      expect(result.current.error).toBe("Failed to load more itineraries.");
    });
  });

  describe("Loading States", () => {
    test("should show loading state during search", async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockGetDocs.mockReturnValue(promise);

      const { result } = renderHook(() => useSearchItineraries());

      act(() => {
        result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      expect(result.current.loading).toBe(true);

      await act(async () => {
        resolvePromise!({ docs: [] });
      });

      expect(result.current.loading).toBe(false);
    });
  });

  describe("hasMore State", () => {
    test("should set hasMore to true initially even when no results returned", async () => {
      // An empty raw snapshot means no more pages, so hasMore should be false
      setupFirestoreMock([]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      expect(result.current.hasMore).toBe(false);
    });

    test("should set hasMore to true when results are returned", async () => {
      // A single returned document (less than PAGE_SIZE) means hasMore should be false
      setupFirestoreMock([mockItineraries[0]]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      expect(result.current.hasMore).toBe(false);
    });
  });

  describe("Query Constraint Tests", () => {
    test("should include proper query constraints", async () => {
      setupFirestoreMock([mockItineraries[0]]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      // Verify basic constraints are applied
      expect(mockWhere).toHaveBeenCalledWith("destination", "==", baseUserItinerary.destination);
      expect(mockWhere).toHaveBeenCalledWith("endDay", ">=", expect.any(Number));
      expect(mockOrderBy).toHaveBeenCalledWith("endDay");
      expect(mockLimit).toHaveBeenCalledWith(50);
    });

    test("should skip filters when preferences are 'No Preference'", async () => {
      const noPreferenceItinerary = {
        ...baseUserItinerary,
        gender: "No Preference",
        status: "No Preference", 
        sexualOrientation: "No Preference",
        userInfo: {
          ...baseUserItinerary.userInfo,
          status: "No Preference",
        },
      };

      setupFirestoreMock([mockItineraries[0]]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(noPreferenceItinerary as any, currentUserId);
      });

      // Should not add preference-based filters
      expect(mockWhere).not.toHaveBeenCalledWith("userInfo.gender", "==", "No Preference");
      expect(mockWhere).not.toHaveBeenCalledWith("userInfo.status", "==", "No Preference");
      expect(mockWhere).not.toHaveBeenCalledWith("userInfo.sexualOrientation", "==", "No Preference");
    });
  });
});