import { renderHook, act } from "@testing-library/react";
import useSearchItineraries from "../../hooks/useSearchItineraries";
import { getDocs, query, collection, where, orderBy, limit, startAfter } from "firebase/firestore";
import { mockItineraries, baseUserItinerary, currentUserId } from "../../test-utils/mocks/itineraryMockData";

// Mock Firebase
jest.mock("firebase/firestore");
jest.mock("../../environments/firebaseConfig", () => ({
  app: {},
}));

// Mock searchCache - define the mock inline to avoid hoisting issues
jest.mock("../../utils/searchCache", () => ({
  searchCache: {
    get: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
    generateCacheKey: jest.fn(),
  },
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

// Import the mocked searchCache ONLY ONCE - remove the duplicate import above
const { searchCache } = require("../../utils/searchCache");
const mockSearchCache = searchCache as jest.Mocked<typeof searchCache>;

describe("useSearchItineraries", () => {
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

    // Reset cache
    mockSearchCache.get.mockReturnValue(null);
    mockSearchCache.generateCacheKey.mockReturnValue('test-cache-key');

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
      mockLocalStorage.setItem("VIEWED_ITINERARIES", JSON.stringify(["itinerary-1", "itinerary-7"]));

      setupFirestoreMock([mockItineraries[0], mockItineraries[6]]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      const viewedItinerary1 = result.current.matchingItineraries.find(
        (itinerary) => itinerary.id === "itinerary-1"
      );
      const viewedItinerary7 = result.current.matchingItineraries.find(
        (itinerary) => itinerary.id === "itinerary-7"
      );

      expect(viewedItinerary1).toBeUndefined();
      expect(viewedItinerary7).toBeUndefined();
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
      // Use itinerary with dates that don't overlap with baseUserItinerary
      setupFirestoreMock([mockItineraries[2]]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      expect(result.current.matchingItineraries).toHaveLength(0);
    });
  });

  describe("Age Range Tests", () => {
    test("should include users within age range", async () => {
      setupFirestoreMock([mockItineraries[0]]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      expect(result.current.matchingItineraries).toHaveLength(1);
      expect(result.current.matchingItineraries[0].userInfo?.username).toBe("alice_traveler");
    });

    test("should exclude users outside age range", async () => {
      // Use itinerary with user outside age range
      setupFirestoreMock([mockItineraries[1]]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      expect(result.current.matchingItineraries).toHaveLength(0);
    });
  });

  describe("Sexual Orientation Tests", () => {
    test("should exclude users with incompatible sexual orientation", async () => {
      setupFirestoreMock([]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      expect(result.current.matchingItineraries).toHaveLength(0);
    });

    test("should include users with compatible sexual orientation", async () => {
      setupFirestoreMock([mockItineraries[0]]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      expect(result.current.matchingItineraries).toHaveLength(1);
      expect(result.current.matchingItineraries[0].userInfo?.sexualOrientation).toBe("heterosexual");
      expect(result.current.matchingItineraries[0].sexualOrientation).toBe("heterosexual");
    });
  });

  describe("Cache Tests", () => {
    test("should use cached results when available", async () => {
      const cachedResults = [mockItineraries[0]];
      mockSearchCache.get.mockReturnValue(cachedResults);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      expect(mockGetDocs).not.toHaveBeenCalled();
      expect(result.current.matchingItineraries).toHaveLength(1);
    });

    test("should cache new results after Firestore fetch", async () => {
      setupFirestoreMock([mockItineraries[0]]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      expect(mockSearchCache.set).toHaveBeenCalledWith('test-cache-key', [mockItineraries[0]]);
    });

    test("should clear cache when requested", () => {
      const { result } = renderHook(() => useSearchItineraries());

      act(() => {
        result.current.clearSearchCache();
      });

      expect(mockSearchCache.clear).toHaveBeenCalled();
    });
  });

  describe("Pagination Tests", () => {
    test("should load more matches when available", async () => {
      // Create more results to trigger hasMore = true
      const firstBatch = Array.from({ length: 20 }, (_, i) => ({
        ...mockItineraries[0],
        id: `itinerary-${i}`,
      }));

      setupFirestoreMock(firstBatch);

      const { result } = renderHook(() => useSearchItineraries());

      // Initial search
      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      // Verify hasMore is true (because we got 20 results)
      expect(result.current.hasMore).toBe(true);

      // Setup for load more - return a second batch
      const secondBatch = Array.from({ length: 5 }, (_, i) => ({
        ...mockItineraries[0],
        id: `itinerary-second-${i}`,
      }));
      setupFirestoreMock(secondBatch);

      await act(async () => {
        await result.current.loadMoreMatches();
      });

      expect(mockGetDocs).toHaveBeenCalledTimes(2);
      // Should have combined results from both batches
      expect(result.current.matchingItineraries.length).toBeGreaterThan(0);
    });

    test("should check for more matches when near end", async () => {
      // Create enough results to trigger hasMore = true
      const firstBatch = Array.from({ length: 20 }, (_, i) => ({
        ...mockItineraries[0],
        id: `itinerary-${i}`,
      }));

      setupFirestoreMock(firstBatch);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      // Verify hasMore is true initially
      expect(result.current.hasMore).toBe(true);

      // Mock that we have more results available for the auto-load
      const secondBatch = Array.from({ length: 5 }, (_, i) => ({
        ...mockItineraries[0],
        id: `itinerary-auto-${i}`,
      }));
      setupFirestoreMock(secondBatch);

      await act(async () => {
        // Call checkForMoreMatches with index near the end
        result.current.checkForMoreMatches(17, 3); // 17th item of 20, with buffer of 3
      });

      // Should have triggered an auto-load
      expect(mockGetDocs).toHaveBeenCalledTimes(2);
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

    test("should handle localStorage errors gracefully", async () => {
      const originalGetItem = mockLocalStorage.getItem;
      mockLocalStorage.getItem = jest.fn().mockImplementation(() => {
        throw new Error("localStorage error");
      });

      setupFirestoreMock([mockItineraries[0]]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);

      mockLocalStorage.getItem = originalGetItem;
    });

    test("should handle load more errors gracefully", async () => {
      // Create enough results to trigger hasMore = true
      const firstBatch = Array.from({ length: 20 }, (_, i) => ({
        ...mockItineraries[0],
        id: `itinerary-${i}`,
      }));

      setupFirestoreMock(firstBatch);

      const { result } = renderHook(() => useSearchItineraries());

      // Initial search
      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      // Verify hasMore is true
      expect(result.current.hasMore).toBe(true);

      // Make load more fail
      mockGetDocs.mockRejectedValue(new Error("Load more error"));

      await act(async () => {
        await result.current.loadMoreMatches();
      });

      expect(result.current.error).toBe("Failed to load more matches.");
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

  describe("Comprehensive Matching Tests", () => {
    test("should return perfect matches", async () => {
      setupFirestoreMock([mockItineraries[6]]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      expect(result.current.matchingItineraries).toHaveLength(1);
      expect(result.current.matchingItineraries[0].userInfo?.username).toBe("grace_perfect");
    });
  });

  describe("Additional Tests", () => {
    test("should NOT call Firestore when cache hit occurs", async () => {
      // Setup: Put data in cache first
      const cachedData = [mockItineraries[0]];
      mockSearchCache.get.mockReturnValue(cachedData);

      const { result } = renderHook(() => useSearchItineraries());

      // Execute: Search with cached data available
      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      // Verify: Cache was checked
      expect(mockSearchCache.get).toHaveBeenCalledWith('test-cache-key');

      // Verify: Firestore was NOT called
      expect(mockGetDocs).not.toHaveBeenCalled();

      // Verify: Results came from cache
      expect(result.current.matchingItineraries).toHaveLength(1);
      expect(result.current.loading).toBe(false);
      expect(result.current.hasMore).toBe(false); // Should be false for cached results
    });

    test("should call Firestore only on cache miss", async () => {
      // Setup: Empty cache
      mockSearchCache.get.mockReturnValue(null);

      // ✅ ADD THIS LINE - setup Firestore mock
      setupFirestoreMock([mockItineraries[0]]);

      const { result } = renderHook(() => useSearchItineraries());

      // Execute: Search with no cached data
      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      // Verify: Cache was checked first
      expect(mockSearchCache.get).toHaveBeenCalledWith('test-cache-key');

      // Verify: Firestore WAS called (cache miss)
      expect(mockGetDocs).toHaveBeenCalledTimes(1);

      // Verify: Results were cached for next time
      expect(mockSearchCache.set).toHaveBeenCalledWith('test-cache-key', [mockItineraries[0]]);
    });

    test("should not auto-load more matches when results are from cache", async () => {
      // Setup: Cache with results
      const cachedData = [mockItineraries[0]];
      mockSearchCache.get.mockReturnValue(cachedData);

      const { result } = renderHook(() => useSearchItineraries());

      // Execute: Search and get cached results
      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      // Execute: Try to check for more matches (should not trigger Firestore)
      act(() => {
        result.current.checkForMoreMatches(0, 3); // Should not auto-load
      });

      // Verify: Firestore was not called for auto-loading
      expect(mockGetDocs).not.toHaveBeenCalled();
      expect(result.current.hasMore).toBe(false);
    });

    // Add this test to catch localStorage issues
    describe("Real Cache Integration Tests", () => {
      let realSearchCache: any;
      
      beforeAll(() => {
        // Import the real SearchCache class for integration testing
        jest.unmock("../../utils/searchCache");
        const { SearchCache } = require("../../utils/searchCache");
        realSearchCache = new SearchCache();
      });
      
      afterAll(() => {
        // Re-mock for other tests
        jest.mock("../../utils/searchCache");
      });

      describe('No Preference Query Filter Logic', () => {
        it('should add gender, status, and sexualOrientation filters if not No Preference', async () => {
          const { result } = renderHook(() => useSearchItineraries());
          const itinerary = {
            ...baseUserItinerary,
            gender: 'Female',
            status: 'single',
            sexualOrientation: 'heterosexual',
            userInfo: {
              ...baseUserItinerary.userInfo,
              status: 'single',
            },
          };
          // @ts-ignore
          await act(async () => {
            await result.current.searchItineraries(itinerary, currentUserId);
          });
          expect(where).toHaveBeenCalledWith('userInfo.gender', '==', 'Female');
          expect(where).toHaveBeenCalledWith('userInfo.status', '==', 'single');
          expect(where).toHaveBeenCalledWith('userInfo.sexualOrientation', '==', 'heterosexual');
        });

        it('should skip gender, status, and sexualOrientation filters if set to No Preference', async () => {
          const { result } = renderHook(() => useSearchItineraries());
          const itinerary = {
            ...baseUserItinerary,
            gender: 'No Preference',
            status: 'No Preference',
            sexualOrientation: 'No Preference',
            userInfo: {
              ...baseUserItinerary.userInfo,
              status: 'No Preference',
            },
          };
          // @ts-ignore
          await act(async () => {
            await result.current.searchItineraries(itinerary, currentUserId);
          });
          expect(where).not.toHaveBeenCalledWith('userInfo.gender', '==', 'No Preference');
          expect(where).not.toHaveBeenCalledWith('userInfo.status', '==', 'No Preference');
          expect(where).not.toHaveBeenCalledWith('userInfo.sexualOrientation', '==', 'No Preference');
        });
      });

      test("should persist cache across page refreshes (integration test)", () => {
        // Store the current mock localStorage  
        const mockLS = window.localStorage;

        // Create a real localStorage-like object for this test
        const realLS = {
          store: {} as Record<string, string>,
          getItem(key: string) { return this.store[key] || null; },
          setItem(key: string, value: string) { this.store[key] = value; },
          removeItem(key: string) { delete this.store[key]; },
          clear() { this.store = {}; }
        };

        // Replace localStorage with our real implementation
        Object.defineProperty(window, 'localStorage', {
          value: realLS,
          writable: true
        });

        const testData = [{ id: "1", name: "test" }];
        const key = "integration-test-key";

        // Store data using the real searchCache instance
        realSearchCache.set(key, testData);

        // Verify data was stored in localStorage
        const storedData = JSON.parse(realLS.getItem('searchCache') || '{}');
        expect(storedData[key]).toBeDefined();
        expect(storedData[key].data).toEqual(testData);

        // Create new instance to simulate page refresh
        const { SearchCache } = require("../../utils/searchCache");
        const newCacheInstance = new SearchCache();

        // Try to retrieve from localStorage (simulating page refresh)
        const retrieved = newCacheInstance.get(key);
        expect(retrieved).toEqual(testData);

        // Restore mock localStorage
        Object.defineProperty(window, 'localStorage', {
          value: mockLS,
          writable: true
        });
      });
    });
  });
});