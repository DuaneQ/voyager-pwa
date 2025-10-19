import { renderHook } from "@testing-library/react";
import useGetItinerariesFromFirestore from "../../hooks/useGetItinerariesFromFirestore";
import useGetUserId from "../../hooks/useGetUserId";
import { act, waitFor } from '@testing-library/react';

jest.mock('firebase/functions');
jest.mock('../../hooks/useGetUserId');
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
    (global as any).__mock_httpsCallable_listItinerariesForUser = undefined;
    (global as any).__mockHttpsCallableReturn = undefined;
    // Ensure resilient httpsCallable shim is reapplied after clearAllMocks
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      // Load the canonical helper from src/testUtils (not the file under __tests__)
      const install = require('../../testUtils/installRpcShim').default;
      install();
    } catch (e) {}
  });

  test("should fetch itineraries successfully via RPC", async () => {
    // Arrange: Provide RPC response
    const rpcHandler = jest.fn().mockResolvedValue({ data: { success: true, data: mockItineraries } });
    (global as any).__mock_httpsCallable_listItinerariesForUser = rpcHandler;

    // Mock localStorage to return a valid user
    const userCredentials = { user: { uid: mockUserId } };
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => (key === 'USER_CREDENTIALS' ? JSON.stringify(userCredentials) : null),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      },
      writable: true,
    });

    const { result } = renderHook(() => useGetItinerariesFromFirestore());

    // Act
    const itineraries = await result.current.fetchItineraries();

    // Assert RPC called and data returned
    expect(rpcHandler).toHaveBeenCalledWith({ userId: mockUserId });
    expect(itineraries).toEqual(mockItineraries);

  // Restore window.localStorage to default by clearing the property (test harness will reapply the default shim)
  try { delete (window as any).localStorage; } catch (e) {}
  });

  test('returns error and empty array when user is unauthenticated', async () => {
    // Ensure no USER_CREDENTIALS and no auth currentUser
    // setupTests may have replaced localStorage with an in-memory shim; avoid spying on prototype
    Object.defineProperty(window, 'localStorage', {
      value: { getItem: () => null, setItem: jest.fn(), removeItem: jest.fn(), clear: jest.fn() },
      writable: true,
    });
    jest.doMock('firebase/auth', () => ({ getAuth: () => ({ currentUser: null }) }));
    // make sure useGetUserId returns null
    (useGetUserId as jest.Mock).mockReturnValue(null);

    const { result } = renderHook(() => useGetItinerariesFromFirestore());

    let itineraries: any;
    await act(async () => { itineraries = await result.current.fetchItineraries(); });

    expect(itineraries).toEqual([]);
    await waitFor(() => expect(result.current.error).toMatch(/User not authenticated/));

    try { delete (window as any).localStorage; } catch (e) {}
  });

  test('returns error when RPC fails', async () => {
    const rpcHandler = jest.fn().mockRejectedValue(new Error('boom'));
    (global as any).__mock_httpsCallable_listItinerariesForUser = rpcHandler;

    // Ensure localStorage has credentials
    const userCredentials = { user: { uid: mockUserId } };
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => (key === 'USER_CREDENTIALS' ? JSON.stringify(userCredentials) : null),
        setItem: jest.fn(), removeItem: jest.fn(), clear: jest.fn()
      },
      writable: true,
    });

    const { result } = renderHook(() => useGetItinerariesFromFirestore());

    let itineraries: any = [];
    await act(async () => {
      try {
        itineraries = await result.current.fetchItineraries();
      } catch (e) {
        // hook intentionally re-throws after setting error; swallow so we can assert state
        itineraries = [];
      }
    });

    expect(itineraries).toEqual([]);
  // The hook surfaces the RPC error message; accept either the RPC message or the generic fallback
  await waitFor(() => expect(result.current.error).toMatch(/Failed to fetch itineraries|boom/));

    try { delete (window as any).localStorage; } catch (e) {}
  });
});
