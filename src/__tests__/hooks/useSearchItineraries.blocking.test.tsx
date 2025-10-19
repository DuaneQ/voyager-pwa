import { renderHook, act } from "@testing-library/react";
import useSearchItineraries from "../../hooks/useSearchItineraries";
import { mockItineraries, baseUserItinerary, currentUserId } from "../../test-utils/mocks/itineraryMockData";

// Mock Functions RPC
jest.mock('firebase/functions');

// Defensive shim: ensure the auto-mocked httpsCallable consults per-RPC global
// handlers (tests set global.__mock_httpsCallable_<name>). This avoids
// dependence on internal mock implementation details and jest hoisting.
{
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mockedFunctions = require('firebase/functions');
  const httpsCallable = mockedFunctions && mockedFunctions.httpsCallable;
  if (httpsCallable && typeof httpsCallable.mockImplementation === 'function') {
    httpsCallable.mockImplementation((functions: any, name: string) => {
      return async (payload: any) => {
        const handlerKey = `__mock_httpsCallable_${name}`;
        if ((global as any)[handlerKey] && typeof (global as any)[handlerKey] === 'function') {
          return (global as any)[handlerKey](payload);
        }
        if ((global as any).__mockHttpsCallableReturn) return (global as any).__mockHttpsCallableReturn;
        return { data: { success: true, data: [] } };
      };
    });
  }
}
jest.mock("../../environments/firebaseConfig", () => ({
  app: {},
  functions: {}, // Mock functions instance so the hook can use it
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

describe("useSearchItineraries - Blocking Feature", () => {
  let rpcHandler: jest.Mock<any, any>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    (global as any).__mock_httpsCallable_searchItineraries = undefined;
    (global as any).__mockHttpsCallableReturn = undefined;
    rpcHandler = jest.fn();
    // Re-apply defensive httpsCallable shim after clearAllMocks so the
    // mockImplementation is present for this test run (jest.clearAllMocks
    // removes mock implementations set at module load time).
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mockedFunctions = require('firebase/functions');
      const httpsCallable = mockedFunctions && mockedFunctions.httpsCallable;
      if (httpsCallable && typeof httpsCallable.mockImplementation === 'function') {
        httpsCallable.mockImplementation((functions: any, name: string) => {
          return async (payload: any) => {
            const handlerKey = `__mock_httpsCallable_${name}`;
            if ((global as any)[handlerKey] && typeof (global as any)[handlerKey] === 'function') {
              return (global as any)[handlerKey](payload);
            }
            if ((global as any).__mockHttpsCallableReturn) return (global as any).__mockHttpsCallableReturn;
            return { data: { success: true, data: [] } };
          };
        });
      }
    } catch (e) {
      // ignore
    }
  });

  const setupRPCMock = (returnedItineraries: any[]) => {
    rpcHandler.mockResolvedValue({ data: { success: true, data: returnedItineraries } });
    (global as any).__mock_httpsCallable_searchItineraries = rpcHandler;
  };

  describe("Blocked Users Filtering", () => {
    test("should pass empty blockedUserIds when user has no blocked users", async () => {
      setupRPCMock([mockItineraries[0]]);

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      // Should pass empty array for blockedUserIds when none are blocked
      expect(rpcHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          blockedUserIds: [],
        })
      );
    });

    test("should pass blockedUserIds from currentUserItinerary.userInfo.blocked", async () => {
      setupRPCMock([mockItineraries[0]]);

      const itineraryWithBlocked = {
        ...baseUserItinerary,
        userInfo: {
          ...baseUserItinerary.userInfo,
          blocked: ['user-1', 'user-2', 'user-3'],
        },
      };

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(itineraryWithBlocked, currentUserId);
      });

      // Should pass blockedUserIds to RPC
      expect(rpcHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          blockedUserIds: ['user-1', 'user-2', 'user-3'],
        })
      );
    });

    test("should handle single blocked user", async () => {
      setupRPCMock([mockItineraries[0]]);

      const itineraryWithOneBlocked = {
        ...baseUserItinerary,
        userInfo: {
          ...baseUserItinerary.userInfo,
          blocked: ['user-5'],
        },
      };

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(itineraryWithOneBlocked, currentUserId);
      });

      // Should pass single blocked user
      expect(rpcHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          blockedUserIds: ['user-5'],
        })
      );
    });

    test("should handle undefined blocked array gracefully", async () => {
      setupRPCMock([mockItineraries[0]]);

      const itineraryWithoutBlocked = {
        ...baseUserItinerary,
        userInfo: {
          ...baseUserItinerary.userInfo,
          // blocked field is undefined
        },
      };

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(itineraryWithoutBlocked, currentUserId);
      });

      // Should pass empty array when blocked is undefined
      expect(rpcHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          blockedUserIds: [],
        })
      );
    });

    test("should include currentUserId in RPC call for bidirectional blocking", async () => {
      setupRPCMock([mockItineraries[0]]);

      const itineraryWithBlocked = {
        ...baseUserItinerary,
        userInfo: {
          ...baseUserItinerary.userInfo,
          blocked: ['user-7'],
        },
      };

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(itineraryWithBlocked, currentUserId);
      });

      // Should pass currentUserId for bidirectional blocking check
      expect(rpcHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          currentUserId: currentUserId,
        })
      );
    });

    test("should pass blockedUserIds even with other filters", async () => {
      setupRPCMock([mockItineraries[0]]);

      const itineraryWithBlockedAndFilters = {
        ...baseUserItinerary,
        userInfo: {
          ...baseUserItinerary.userInfo,
          blocked: ['user-10', 'user-11'],
        },
        gender: 'Female',
        sexualOrientation: 'heterosexual',
        status: 'single',
      };

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(itineraryWithBlockedAndFilters, currentUserId);
      });

      // Should pass both blockedUserIds and other filters
      expect(rpcHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          blockedUserIds: ['user-10', 'user-11'],
          gender: 'Female',
          sexualOrientation: 'heterosexual',
        })
      );
    });

    test("should handle large blocked list", async () => {
      setupRPCMock([mockItineraries[0]]);

      const largeBlockedList = Array.from({ length: 50 }, (_, i) => `blocked-user-${i}`);
      const itineraryWithManyBlocked = {
        ...baseUserItinerary,
        userInfo: {
          ...baseUserItinerary.userInfo,
          blocked: largeBlockedList,
        },
      };

      const { result } = renderHook(() => useSearchItineraries());

      await act(async () => {
        await result.current.searchItineraries(itineraryWithManyBlocked, currentUserId);
      });

      // Should pass all 50 blocked users
      expect(rpcHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          blockedUserIds: largeBlockedList,
        })
      );
    });

    test("should update blockedUserIds when currentUserItinerary changes", async () => {
      setupRPCMock([mockItineraries[0]]);

      const { result } = renderHook(() => useSearchItineraries());

      // First search with no blocked users
      await act(async () => {
        await result.current.searchItineraries(baseUserItinerary, currentUserId);
      });

      expect(rpcHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          blockedUserIds: [],
        })
      );

      // Second search with blocked users
      const itineraryWithBlocked = {
        ...baseUserItinerary,
        userInfo: {
          ...baseUserItinerary.userInfo,
          blocked: ['user-4'],
        },
      };

      await act(async () => {
        await result.current.searchItineraries(itineraryWithBlocked, currentUserId);
      });

      expect(rpcHandler).toHaveBeenLastCalledWith(
        expect.objectContaining({
          blockedUserIds: ['user-4'],
        })
      );
    });
  });
});
