// Mock auth.currentUser for AddItineraryModal
jest.mock("../../environments/firebaseConfig", () => {
  return {
    auth: {
      get currentUser() {
        return (global as any).__mockCurrentUser;
      },
    },
  };
});

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import AddItineraryModal from "../../components/forms/AddItineraryModal";
import { UserProfileContext } from "../../Context/UserProfileContext";
import usePostItineraryToFirestore from "../../hooks/usePostItineraryToFirestore";
import useUpdateItinerary from "../../hooks/useUpdateItinerary";
import useDeleteItinerary from "../../hooks/useDeleteItinerary";
import { AlertContext } from "../../Context/AlertContext";
import { Itinerary } from "../../types/Itinerary";

// Mock Firestore modular SDK for pipeline (CI) compatibility
jest.mock("firebase/firestore", () => ({
  doc: jest.fn(() => ({})),
  getDoc: jest.fn(() => Promise.resolve({ exists: () => false, data: () => ({}) })),
  setDoc: jest.fn(() => Promise.resolve()),
  getFirestore: jest.fn(() => ({})),
}));

// Polyfill setImmediate for CI (Node 18+ doesn't have it by default)
if (typeof global.setImmediate === "undefined") {
  // @ts-ignore
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
}

// Polyfill localStorage for CI if not present
if (typeof window !== "undefined" && typeof window.localStorage === "undefined") {
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    },
    writable: true,
  });
}

// Mock dependencies
jest.mock("../../hooks/usePostItineraryToFirestore");
jest.mock("../../hooks/useUpdateItinerary");
jest.mock("../../hooks/useDeleteItinerary");
jest.mock("react-google-places-autocomplete", () => {
  return jest.fn().mockImplementation(({ selectProps }) => (
    <input
      data-testid="google-places-autocomplete"
      value={selectProps.value?.label || ""}
      onChange={(e) =>
        selectProps.onChange({
          label: e.target.value,
          value: e.target.value,
        })
      }
    />
  ));
});

describe("AddItineraryModal - Loading State", () => {
  const mockUserId = "testUserId";
  const mockUserProfile = {
    username: "Test User",
    gender: "Other",
    dob: "1990-01-01",
    status: "single",
    sexualOrientation: "heterosexual",
    blocked: [],
  };
  const mockPostItinerary = jest.fn();
  const mockUpdateItinerary = jest.fn();
  const mockDeleteItinerary = jest.fn();
  const mockOnClose = jest.fn();
  const mockOnItineraryAdded = jest.fn();
  const mockOnRefresh = jest.fn();
  const mockShowAlert = jest.fn();
  const mockUpdateUserProfile = jest.fn();

  const mockItineraries: Itinerary[] = [
    {
      id: "1",
      destination: "Paris",
      startDate: new Date(Date.now() + 3650 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      endDate: new Date(Date.now() + 3660 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      description: "A trip to Paris",
      activities: ["Sightseeing", "Dining"],
      gender: "Female",
      status: "single",
      sexualOrientation: "heterosexual",
      startDay: 0,
      endDay: 0,
      lowerRange: 18,
      upperRange: 65,
      likes: [],
      userInfo: {
        uid: mockUserId,
        username: "Test User",
        dob: "1990-01-01",
        status: "single",
        gender: "Other",
        email: "test@example.com",
        sexualOrientation: "heterosexual",
      },
    },
    {
      id: "2",
      destination: "Tokyo",
      startDate: new Date(Date.now() + 3700 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      endDate: new Date(Date.now() + 3710 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      description: "A trip to Tokyo",
      activities: ["Shopping", "Exploring"],
      gender: "Male",
      status: "single",
      sexualOrientation: "heterosexual",
      startDay: 0,
      endDay: 0,
      lowerRange: 25,
      upperRange: 40,
      likes: [],
      userInfo: {
        uid: mockUserId,
        username: "Test User",
        dob: "1990-01-01",
        status: "single",
        gender: "Other",
        email: "test@example.com",
        sexualOrientation: "heterosexual",
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).__mockCurrentUser = { uid: mockUserId };

    (usePostItineraryToFirestore as jest.Mock).mockReturnValue({
      postItinerary: mockPostItinerary,
      loading: false,
      error: null,
    });
    (useUpdateItinerary as jest.Mock).mockReturnValue({
      updateItinerary: mockUpdateItinerary,
      loading: false,
      error: null,
    });
    (useDeleteItinerary as jest.Mock).mockReturnValue({
      deleteItinerary: mockDeleteItinerary,
      loading: false,
      error: null,
    });
  });

  afterEach(() => {
    (global as any).__mockCurrentUser = undefined;
  });

  const renderModal = (isLoading = false, itineraries: Itinerary[] = mockItineraries) => {
    return render(
      <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
        <UserProfileContext.Provider
          value={{
            userProfile: mockUserProfile,
            updateUserProfile: mockUpdateUserProfile,
          }}
        >
          <AddItineraryModal
            open={true}
            onClose={mockOnClose}
            onItineraryAdded={mockOnItineraryAdded}
            onRefresh={mockOnRefresh}
            itineraries={itineraries}
            isLoading={isLoading}
          />
        </UserProfileContext.Provider>
      </AlertContext.Provider>
    );
  };

  describe("Loading Indicator", () => {
    test("should show CircularProgress when isLoading is true", async () => {
      renderModal(true, []);

      // Should show loading spinner
      await waitFor(() => {
        const progressElements = screen.getAllByRole('progressbar');
        expect(progressElements.length).toBeGreaterThan(0);
      });

      // Should NOT show "No itineraries available" message when loading
      expect(screen.queryByText("No itineraries available.")).not.toBeInTheDocument();
    });

    test("should NOT show CircularProgress when isLoading is false", async () => {
      renderModal(false, mockItineraries);

      // Should not show loading spinner
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    test("should show itinerary cards when loaded and itineraries exist", async () => {
      renderModal(false, mockItineraries);

      // Should show itinerary cards
      await waitFor(() => {
        expect(screen.getByText("Paris")).toBeInTheDocument();
        expect(screen.getByText("Tokyo")).toBeInTheDocument();
      });
    });

    test("should show 'No itineraries available' when loaded with empty array", async () => {
      renderModal(false, []);

      // Should show empty state message
      await waitFor(() => {
        expect(screen.getByText("No itineraries available.")).toBeInTheDocument();
      });

      // Should not show loading spinner
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    test("should default to isLoading=false when prop is not provided", async () => {
      render(
        <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
          <UserProfileContext.Provider
            value={{
              userProfile: mockUserProfile,
              updateUserProfile: mockUpdateUserProfile,
            }}
          >
            <AddItineraryModal
              open={true}
              onClose={mockOnClose}
              onItineraryAdded={mockOnItineraryAdded}
              onRefresh={mockOnRefresh}
              itineraries={mockItineraries}
              // isLoading prop not provided - should default to false
            />
          </UserProfileContext.Provider>
        </AlertContext.Provider>
      );

      // Should show itineraries, not loading spinner
      await waitFor(() => {
        expect(screen.getByText("Paris")).toBeInTheDocument();
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    test("should transition from loading to loaded state", async () => {
      const { rerender } = renderModal(true, []);

      // Initially loading
      await waitFor(() => {
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
      });

      // Rerender with loaded state
      rerender(
        <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
          <UserProfileContext.Provider
            value={{
              userProfile: mockUserProfile,
              updateUserProfile: mockUpdateUserProfile,
            }}
          >
            <AddItineraryModal
              open={true}
              onClose={mockOnClose}
              onItineraryAdded={mockOnItineraryAdded}
              onRefresh={mockOnRefresh}
              itineraries={mockItineraries}
              isLoading={false}
            />
          </UserProfileContext.Provider>
        </AlertContext.Provider>
      );

      // Should now show itineraries
      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        expect(screen.getByText("Paris")).toBeInTheDocument();
        expect(screen.getByText("Tokyo")).toBeInTheDocument();
      });
    });

    test("should have proper accessibility attributes on loading spinner", async () => {
      renderModal(true, []);

      await waitFor(() => {
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toBeInTheDocument();
        // MUI CircularProgress has proper ARIA attributes
        expect(progressBar).toHaveAttribute('role', 'progressbar');
      });
    });

    test("should show Your Itineraries heading regardless of loading state", async () => {
      const { rerender } = renderModal(true, []);

      // Heading should be present when loading
      expect(screen.getByText("Your Itineraries")).toBeInTheDocument();

      // Heading should still be present when loaded
      rerender(
        <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
          <UserProfileContext.Provider
            value={{
              userProfile: mockUserProfile,
              updateUserProfile: mockUpdateUserProfile,
            }}
          >
            <AddItineraryModal
              open={true}
              onClose={mockOnClose}
              onItineraryAdded={mockOnItineraryAdded}
              onRefresh={mockOnRefresh}
              itineraries={mockItineraries}
              isLoading={false}
            />
          </UserProfileContext.Provider>
        </AlertContext.Provider>
      );

      expect(screen.getByText("Your Itineraries")).toBeInTheDocument();
    });
  });
});
