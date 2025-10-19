import { renderHook } from "@testing-library/react";
import usePostItineraryToFirestore from "../../hooks/usePostItineraryToFirestore";
import useGetUserId from "../../hooks/useGetUserId";

jest.mock("firebase/functions");
jest.mock("../../hooks/useGetUserId");

// Ensure httpsCallable returns a callable function that consults global handlers
// This mirrors the manual mock in __mocks__/firebase-functions.js and prevents
// tests from seeing `fn is not a function` when the module is auto-mocked.
const { httpsCallable } = require('firebase/functions');
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
    (global as any).__mock_httpsCallable_createItinerary = undefined;
    (global as any).__mockHttpsCallableReturn = undefined;
    // Re-apply httpsCallable mockImplementation after clearAllMocks so it
    // always returns a callable that consults module __rpcMocks and globals.
    try {
      const mf: any = require('firebase/functions');
      if (mf && mf.httpsCallable && typeof mf.httpsCallable.mockImplementation === 'function') {
        mf.httpsCallable.mockImplementation((functions: any, name: string) => {
          // Prefer module-level registration
          try {
            if (mf.__rpcMocks && typeof mf.__rpcMocks[name] === 'function') return mf.__rpcMocks[name];
          } catch (e) {}
          // Fallback to global handler
          const handlerKey = `__mock_httpsCallable_${name}`;
          if ((global as any)[handlerKey] && typeof (global as any)[handlerKey] === 'function') {
            return (global as any)[handlerKey];
          }
          return async (payload: any) => ({ data: { success: true, data: [] } });
        });
      }
    } catch (e) {}
  });

  afterAll(() => {
    console.error = originalError;
  });

  test("should post an itinerary successfully via RPC", async () => {
    // Arrange
    const rpcHandler = jest.fn().mockResolvedValue({ data: { success: true, data: { id: 'it-123' } } });
    (global as any).__mock_httpsCallable_createItinerary = rpcHandler;
    // Also register on the module-level rpcMocks to ensure the manual mock
    // returns a callable even if mockImplementation was cleared by jest.
    const mockedFunctions: any = require('firebase/functions');
    mockedFunctions.__rpcMocks = mockedFunctions.__rpcMocks || {};
    mockedFunctions.__rpcMocks.createItinerary = rpcHandler;

    // Debug: inspect the mocked httpsCallable and registered rpcMocks
    // eslint-disable-next-line no-console
    console.log('DEBUG httpsCallable type:', typeof require('firebase/functions').httpsCallable);
    // eslint-disable-next-line no-console
    console.log('DEBUG rpcMock for createItinerary:', require('firebase/functions').__rpcMocks && typeof require('firebase/functions').__rpcMocks.createItinerary);
    try {
      const mf = require('firebase/functions');
      // eslint-disable-next-line no-console
      console.log('DEBUG httpsCallable source:', mf.httpsCallable && mf.httpsCallable.toString && mf.httpsCallable.toString().slice(0,200));
      // eslint-disable-next-line no-console
      console.log('DEBUG module rpcMocks keys:', mf.__rpcMocks && Object.keys(mf.__rpcMocks));
      // eslint-disable-next-line no-console
      console.log('DEBUG module rpcMock createItinerary value typeof:', mf.__rpcMocks && typeof mf.__rpcMocks.createItinerary);
      const maybeFn = mf.httpsCallable(mf.getFunctions(), 'createItinerary');
      // eslint-disable-next-line no-console
      console.log('DEBUG result of calling httpsCallable:', typeof maybeFn, maybeFn && (maybeFn.name || maybeFn.toString && maybeFn.toString().slice(0,100)));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('DEBUG calling httpsCallable threw', e && (e as any).message);
    }
  const { result } = renderHook(() => usePostItineraryToFirestore());

    // Act
    await result.current.postItinerary(mockItinerary as any);

    // Assert
    expect(rpcHandler).toHaveBeenCalledWith({ itinerary: { ...mockItinerary, userId: mockUserId } });
  });

  test("should throw an error if user is not authenticated", async () => {
    // Arrange
    (useGetUserId as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => usePostItineraryToFirestore());

    // Act & Assert
    await expect(result.current.postItinerary(mockItinerary as any)).rejects.toThrow(
      "User not authenticated"
    );
  });

  test("should throw an error if RPC fails", async () => {
    // Arrange
    const mockError = new Error("Failed to post itinerary");
    const rpcHandler = jest.fn().mockRejectedValue(mockError);
    (global as any).__mock_httpsCallable_createItinerary = rpcHandler;
    const mockedFunctionsFail: any = require('firebase/functions');
    mockedFunctionsFail.__rpcMocks = mockedFunctionsFail.__rpcMocks || {};
    mockedFunctionsFail.__rpcMocks.createItinerary = rpcHandler;

    // Debug: inspect the mocked httpsCallable and registered rpcMocks
    // eslint-disable-next-line no-console
    console.log('DEBUG httpsCallable type (fail):', typeof require('firebase/functions').httpsCallable);
    // eslint-disable-next-line no-console
    console.log('DEBUG rpcMock for createItinerary (fail):', require('firebase/functions').__rpcMocks && typeof require('firebase/functions').__rpcMocks.createItinerary);
    try {
      const mf = require('firebase/functions');
      // eslint-disable-next-line no-console
      console.log('DEBUG httpsCallable source (fail):', mf.httpsCallable && mf.httpsCallable.toString && mf.httpsCallable.toString().slice(0,200));
      // eslint-disable-next-line no-console
      console.log('DEBUG module rpcMocks keys (fail):', mf.__rpcMocks && Object.keys(mf.__rpcMocks));
      const maybeFnFail = mf.httpsCallable(mf.getFunctions(), 'createItinerary');
      // eslint-disable-next-line no-console
      console.log('DEBUG result of calling httpsCallable (fail):', typeof maybeFnFail, maybeFnFail && (maybeFnFail.name || maybeFnFail.toString && maybeFnFail.toString().slice(0,100)));
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('DEBUG calling httpsCallable (fail) threw', e && (e as any).message);
    }
  const { result } = renderHook(() => usePostItineraryToFirestore());

    // Act & Assert
    await expect(result.current.postItinerary(mockItinerary as any)).rejects.toThrow(
      "Failed to post itinerary"
    );
    expect(rpcHandler).toHaveBeenCalled();
  });
});
