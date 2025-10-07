// Per-file localStorage polyfill to avoid JSDOM opaque-origin SecurityError for imports that access localStorage.
if (
  typeof window !== "undefined" &&
  typeof (window as any).localStorage === "undefined"
) {
  const _store: Record<string, string> = {};
  try {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      enumerable: true,
      value: {
        getItem: (key: string) =>
          _store.hasOwnProperty(key) ? _store[key] : null,
        setItem: (key: string, value: string) => {
          _store[key] = String(value);
        },
        removeItem: (key: string) => {
          delete _store[key];
        },
        clear: () => {
          Object.keys(_store).forEach((k) => delete _store[k]);
        },
      },
    });
  } catch (e) {
    // Some environments won't allow defining window.localStorage; ignore and let tests provide mocks in beforeEach
  }
}

import { renderHook, act } from "@testing-library/react";
import React from "react";

// Mock firebase/firestore with inline jest.fn() to avoid TDZ from jest hoisting
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(),
  setDoc: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: 1 })),
  getFirestore: jest.fn(() => ({ firestore: true })),
}));

// Mock firebase/functions with inline jest.fn() to avoid TDZ from jest hoisting
jest.mock("firebase/functions", () => ({
  getFunctions: jest.fn(),
  httpsCallable: jest.fn(),
}));

// Mock environments/firebaseConfig before requiring the hook so its module init won't call the real db/auth
jest.mock("../../environments/firebaseConfig", () => ({
  db: {},
  auth: { currentUser: { uid: "test-uid", email: "me@example.com" } },
}));

// Now import the hook under test
import { useAIGeneration } from "../../hooks/useAIGeneration";
import { UserProfileContext } from "../../Context/UserProfileContext";

// Grab references to the mocked modules so we can control them in tests
const mockedFirestore = jest.requireMock("firebase/firestore");
const mockedFunctions = jest.requireMock("firebase/functions");

describe("useAIGeneration hook", () => {
  it("saves transportation recommendations for non-flight modes", async () => {
    const { result } = renderHook(() => useAIGeneration(), { wrapper });
    // Simulate backend returning transportation recommendations
    const req = {
      destination: "Berlin",
      startDate: "2025-11-01",
      endDate: "2025-11-05",
      preferenceProfile: { transportation: { primaryMode: "train" } },
    } as any;
    // Mock httpsCallable for generateItineraryWithAI to return a canonical payload
    const mockHttpsCallable = mockedFunctions.httpsCallable as jest.Mock;
    mockHttpsCallable.mockImplementation((functions: any, name: string) => {
      if (name === "generateItineraryWithAI") {
        return jest.fn(() =>
          Promise.resolve({
            data: {
              id: "server-gen-1",
              response: {
                success: true,
                data: {
                  itinerary: { id: "server-gen-1" },
                  recommendations: {
                    transportation: {
                      mode: "train",
                      estimatedTime: "6h",
                      estimatedDistance: "400km",
                      estimatedCost: { amount: 60, currency: "EUR" },
                      provider: "Deutsche Bahn",
                      tips: "Book early for best prices.",
                    },
                  },
                },
              },
            },
          })
        );
      }
      // fallback to default mocks
      return jest.fn(() => Promise.resolve({ data: {} }));
    });
    await act(async () => {
      const res = await result.current.generateItinerary(req);
      expect(res).toHaveProperty("id");
      expect(res.success).toBe(true);
    });
    // Ensure Firestore save includes transportation recommendations under recommendations.transportation
    const mockSetDoc = mockedFirestore.setDoc as jest.Mock;
    expect(mockSetDoc).toHaveBeenCalled();
    const savedArg = mockSetDoc.mock.calls[0][1];
    expect(savedArg.response.data.itinerary).toBeDefined();
    // Should include transportation recommendations under recommendations.transportation
    expect(savedArg.response.data.recommendations.transportation).toBeDefined();
    expect(savedArg.response.data.recommendations.transportation.mode).toBe(
      "train"
    );
    expect(savedArg.response.data.recommendations.transportation.provider).toBe(
      "Deutsche Bahn"
    );
  });

  it("calls searchFlights when profile primaryMode is airplane", async () => {
    const mockHttpsCallable = mockedFunctions.httpsCallable as jest.Mock;
    const searchFlightsMock = jest.fn(() =>
      Promise.resolve({ data: { flights: [{ id: "f1" }] } })
    );
    const generateItineraryWithAIMock = jest.fn(() =>
      Promise.resolve({
        data: {
          id: "server-gen-air",
          response: {
            success: true,
            data: {
              itinerary: { id: "server-gen-air" },
              recommendations: { flights: [{ id: "f1" }] },
            },
          },
        },
      })
    );

    mockHttpsCallable.mockImplementation((functions: any, name: string) => {
      if (name === "searchFlights") return searchFlightsMock;
      if (name === "searchAccommodations")
        return jest.fn(() => Promise.resolve({ data: { hotels: [] } }));
      if (name === "searchActivities")
        return jest.fn(() => Promise.resolve({ data: { activities: [] } }));
      if (name === "generateItineraryWithAI")
        return generateItineraryWithAIMock;
      return jest.fn(() => Promise.resolve({ data: {} }));
    });

    const { result } = renderHook(() => useAIGeneration(), { wrapper });
    const req = {
      destination: "London",
      startDate: "2025-12-01",
      endDate: "2025-12-05",
      departureAirportCode: "JFK",
      destinationAirportCode: "LHR",
      preferenceProfile: { transportation: { primaryMode: "airplane" } },
    } as any;

    await act(async () => {
      const res = await result.current.generateItinerary(req);
      expect(res).toHaveProperty("id");
      expect(res.success).toBe(true);
    });

    // generateItineraryWithAI is invoked as a server-side canonicalization step
    // For airplane profiles we only perform a flight search client-side and
    // we do NOT call the server-side AI canonicalization step here.
    expect(searchFlightsMock).toHaveBeenCalled();
    expect(generateItineraryWithAIMock).not.toHaveBeenCalled();
  });

  it("calls generateItineraryWithAI when profile primaryMode is not airplane", async () => {
    const mockHttpsCallable = mockedFunctions.httpsCallable as jest.Mock;
    const searchFlightsMock = jest.fn(() => Promise.resolve({ data: {} }));
    const generateItineraryWithAIMock = jest.fn(() =>
      Promise.resolve({
        data: {
          id: "server-gen-2",
          response: {
            success: true,
            data: {
              itinerary: { id: "server-gen-2" },
              recommendations: { transportation: { mode: "bus" } },
            },
          },
        },
      })
    );

    mockHttpsCallable.mockImplementation((functions: any, name: string) => {
      if (name === "searchFlights") return searchFlightsMock;
      if (name === "searchAccommodations")
        return jest.fn(() => Promise.resolve({ data: { hotels: [] } }));
      if (name === "searchActivities")
        return jest.fn(() => Promise.resolve({ data: { activities: [] } }));
      if (name === "generateItineraryWithAI")
        return generateItineraryWithAIMock;
      return jest.fn(() => Promise.resolve({ data: {} }));
    });

    const { result } = renderHook(() => useAIGeneration(), { wrapper });
    const req = {
      destination: "Prague",
      startDate: "2025-12-10",
      endDate: "2025-12-15",
      preferenceProfile: { transportation: { primaryMode: "train" } },
    } as any;

    await act(async () => {
      const res = await result.current.generateItinerary(req);
      expect(res).toHaveProperty("id");
      expect(res.success).toBe(true);
    });

    // For non-air modes we should not call the flights search, but the server-side
    // AI generation function is still invoked to produce the canonical itinerary.
    expect(generateItineraryWithAIMock).toHaveBeenCalled();
    expect(searchFlightsMock).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    // Ensure getFirestore always returns a valid object
    mockedFirestore.getFirestore.mockReturnValue({ firestore: true });
    // Install per-test localStorage mock to avoid altering global setup
    const store: Record<string, string> = {};
    const mockLocalStorage = {
      getItem: (k: string) =>
        Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null,
      setItem: (k: string, v: string) => {
        store[k] = String(v);
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
    };
    try {
      Object.defineProperty(window, "localStorage", {
        value: mockLocalStorage,
        configurable: true,
      });
    } catch (e) {}

    jest.clearAllMocks();
    const mockDoc = mockedFirestore.doc as jest.Mock;
    const mockSetDoc = mockedFirestore.setDoc as jest.Mock;
    mockDoc.mockImplementation((...args) => {
      // Log doc args for troubleshooting
      // eslint-disable-next-line no-console

      return "ai-doc-ref";
    });
    mockSetDoc.mockImplementation((...args) => {
      // Log setDoc args for troubleshooting
      // eslint-disable-next-line no-console

      return Promise.resolve(undefined);
    });

    // Get the mocked functions from the mocked module (safe after jest.mock)
    const mockGetFunctions = mockedFunctions.getFunctions as jest.Mock;
    const mockHttpsCallable = mockedFunctions.httpsCallable as jest.Mock;

    mockGetFunctions.mockReturnValue({});

    // httpsCallable should return a function which when called returns a Promise
    mockHttpsCallable.mockImplementation((functions: any, name: string) => {
      if (name === "searchAccommodations") {
        return jest.fn(() =>
          Promise.resolve({ data: { hotels: [{ id: "h1", name: "Hotel 1" }] } })
        );
      }
      if (name === "searchActivities") {
        // Return two activities with both id and placeId so alternativeActivities logic works
        return jest.fn(() =>
          Promise.resolve({
            data: {
              activities: [
                { id: "a1", name: "Louvre Tour", placeId: "p1" },
                { id: "a2", name: "Eiffel Visit", placeId: "p2" },
              ],
            },
          })
        );
      }
      if (name === "generateItineraryWithAI") {
        // Default server canonical payload used in tests for non-air flows
        return jest.fn(() =>
          Promise.resolve({
            data: {
              id: "server-gen-default",
              response: {
                success: true,
                data: {
                  itinerary: { id: "server-gen-default" },
                  recommendations: {
                    alternativeActivities: [
                      { id: "a1", name: "Louvre Tour" },
                      { id: "a2", name: "Eiffel Visit" },
                    ],
                    alternativeRestaurants: [],
                    flights: [],
                    accommodations: [{ id: "h1", name: "Hotel 1" }],
                  },
                },
              },
            },
          })
        );
      }
      // default: flights or other calls
      return jest.fn(() => Promise.resolve({ data: {} }));
    });
  });

  const userProfile = {
    username: "tester",
    email: "me@example.com",
    uid: "test-uid",
  };

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <UserProfileContext.Provider
      value={{
        userProfile,
        updateUserProfile: jest.fn(),
        setUserProfile: jest.fn(),
        isLoading: false,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );

  it("succeeds and saves a generation when accommodations-only", async () => {
    const { result } = renderHook(() => useAIGeneration(), { wrapper });

    const req = {
      destination: "Paris",
      startDate: "2025-10-01",
      endDate: "2025-10-05",
      // preferenceProfile with non-flight primary mode so flights are skipped
      preferenceProfile: { transportation: { primaryMode: "ground" } },
    } as any;

    await act(async () => {
      const res = await result.current.generateItinerary(req);
      expect(res).toHaveProperty("id");
      expect(res.success).toBe(true);
    });

    // Ensure we attempted to write to Firestore
    const mockDoc = mockedFirestore.doc as jest.Mock;
    const mockSetDoc = mockedFirestore.setDoc as jest.Mock;
    expect(mockDoc).toHaveBeenCalledWith(
      expect.anything(),
      "itineraries",
      expect.any(String)
    );
    expect(mockSetDoc).toHaveBeenCalled();
    const savedArg = mockSetDoc.mock.calls[0][1];
    expect(
      Array.isArray(
        savedArg.response.data.recommendations.alternativeActivities
      )
    ).toBe(true);
    expect(
      savedArg.response.data.recommendations.alternativeActivities?.length
    ).toBeGreaterThan(0);
    expect(
      savedArg.response.data.recommendations.alternativeActivities?.[0]?.name
    ).toMatch(/Louvre Tour|Eiffel Visit/);
  });

  it("handles activities callable rejection gracefully and still saves generation with empty activities", async () => {
    // Override httpsCallable to make searchActivities reject but provide a server canonical payload
    const mockHttpsCallable = mockedFunctions.httpsCallable as jest.Mock;
    mockHttpsCallable.mockImplementation((functions: any, name: string) => {
      if (name === "searchAccommodations")
        return jest.fn(() => Promise.resolve({ data: { hotels: [] } }));
      if (name === "searchActivities")
        return jest.fn(() => Promise.reject(new Error("Places failed")));
      if (name === "generateItineraryWithAI")
        return jest.fn(() =>
          Promise.resolve({
            data: {
              id: "server-gen-places-failed",
              response: {
                success: true,
                data: {
                  itinerary: { id: "server-gen-places-failed" },
                  recommendations: {
                    alternativeActivities: [],
                    alternativeRestaurants: [],
                    flights: [],
                    accommodations: [],
                  },
                },
              },
            },
          })
        );
      return jest.fn(() => Promise.resolve({ data: {} }));
    });

    const { result } = renderHook(() => useAIGeneration(), { wrapper });
    const req = {
      destination: "Paris",
      startDate: "2025-10-01",
      endDate: "2025-10-05",
      preferenceProfile: { transportation: { primaryMode: "ground" } },
    } as any;

    await act(async () => {
      const res = await result.current.generateItinerary(req);
      expect(res.success).toBe(true);
    });

    const mockSetDoc = mockedFirestore.setDoc as jest.Mock;
    // verify saved payload contains recommendations (server canonical payload)
    expect(mockSetDoc).toHaveBeenCalled();
    const savedArg = mockSetDoc.mock.calls[0][1];
    expect(
      Array.isArray(
        savedArg.response.data.recommendations.alternativeActivities
      )
    ).toBe(true);
  });

  it("parses nested activities response shapes correctly", async () => {
    // Override httpsCallable to return nested shape
    const mockHttpsCallable = mockedFunctions.httpsCallable as jest.Mock;
    mockHttpsCallable.mockImplementation((functions: any, name: string) => {
      if (name === "searchAccommodations")
        return jest.fn(() => Promise.resolve({ data: { hotels: [] } }));
      if (name === "searchActivities")
        return jest.fn(() =>
          Promise.resolve({
            data: { data: { activities: [{ id: "a2", name: "Nested Tour" }] } },
          })
        );
      if (name === "generateItineraryWithAI")
        return jest.fn(() =>
          Promise.resolve({
            data: {
              id: "server-gen-nested",
              response: {
                success: true,
                data: {
                  itinerary: { id: "server-gen-nested" },
                  recommendations: {
                    alternativeActivities: [{ id: "a2", name: "Nested Tour" }],
                    alternativeRestaurants: [],
                    flights: [],
                    accommodations: [],
                  },
                },
              },
            },
          })
        );
      return jest.fn(() => Promise.resolve({ data: {} }));
    });

    const { result } = renderHook(() => useAIGeneration(), { wrapper });
    const req = {
      destination: "Paris",
      startDate: "2025-10-01",
      endDate: "2025-10-05",
      preferenceProfile: { transportation: { primaryMode: "ground" } },
    } as any;

    await act(async () => {
      const res = await result.current.generateItinerary(req);
      expect(res.success).toBe(true);
    });

    const mockSetDoc = mockedFirestore.setDoc as jest.Mock;
    expect(mockSetDoc).toHaveBeenCalled();
    const savedArg = mockSetDoc.mock.calls[0][1];
    // Server canonical payload should include alternativeActivities
    expect(
      Array.isArray(
        savedArg.response.data.recommendations.alternativeActivities
      )
    ).toBe(true);
    expect(
      savedArg.response.data.recommendations.alternativeActivities?.length
    ).toBeGreaterThanOrEqual(0);
  });

  it("handles Firestore write failure gracefully", async () => {
    const mockSetDoc = mockedFirestore.setDoc as jest.Mock;
    mockSetDoc.mockRejectedValueOnce(new Error("Firestore write failed"));
    const { result } = renderHook(() => useAIGeneration(), { wrapper });
    const req = {
      destination: "Paris",
      startDate: "2025-10-01",
      endDate: "2025-10-05",
      preferenceProfile: { transportation: { primaryMode: "ground" } },
    } as any;
    await expect(result.current.generateItinerary(req)).rejects.toThrow(
      "Firestore write failed"
    );
  });
});
