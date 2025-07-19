import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock ALL modules FIRST, before any imports
jest.mock("../../environments/firebaseConfig", () => {
  return {
    app: {
      name: "[DEFAULT]",
      options: {},
      automaticDataCollectionEnabled: false,
    },
    auth: {
      get currentUser() {
        return global.__mockCurrentUser;
      },
    },
  };
});

jest.mock("firebase/storage", () => ({
  getStorage: jest.fn(() => ({})),
  ref: jest.fn(),
  getDownloadURL: jest.fn(() => Promise.resolve("/default-profile.png")),
  uploadBytes: jest.fn(),
}));

// Mock Firebase Firestore with inline mock functions
jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  arrayUnion: jest.fn(),
  addDoc: jest.fn(),
  collection: jest.fn(),
  serverTimestamp: jest.fn(),
  getDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  getDocs: jest.fn(),
}));

// Replace the hook mocks with controllable versions
let mockFetchItineraries = jest.fn();
let mockSearchItineraries = jest.fn();
let mockCheckForMoreMatches = jest.fn();
let mockLoadMoreMatches = jest.fn();
let mockClearSearchCache = jest.fn();
let mockMatchingItineraries: any[] = [];

jest.mock("../../hooks/useGetItinerariesFromFirestore", () => ({
  __esModule: true,
  default: () => ({
    fetchItineraries: mockFetchItineraries,
  }),
}));

jest.mock("../../hooks/useSearchItineraries", () => ({
  __esModule: true,
  default: () => ({
    matchingItineraries: mockMatchingItineraries,
    searchItineraries: mockSearchItineraries,
    loading: false,
    error: null,
    hasMore: true,
    loadMoreMatches: mockLoadMoreMatches,
    checkForMoreMatches: mockCheckForMoreMatches,
    clearSearchCache: mockClearSearchCache,
  }),
}));

// Removed useGetUserId mock

jest.mock("../../hooks/useGetUserProfile", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../../hooks/useGetUserProfilePhoto", () => ({
  useGetUserProfilePhoto: jest.fn(() => ({
    photoURL: "/default-profile.png",
    loading: false,
    error: null,
  })),
}));

jest.mock("../../utils/searchCache", () => ({
  searchCache: {
    generateCacheKey: jest.fn(),
    get: jest.fn(() => null),
    set: jest.fn(),
    clear: jest.fn(),
    cleanup: jest.fn(),
    getStats: jest.fn(() => ({ memorySize: 0, localStorageSize: 0, totalKeys: 0 })),
  },
}));

// Mock the BetaBanner component
jest.mock("../../components/utilities/BetaBanner", () => ({
  BetaBanner: () => <div data-testid="beta-banner">Beta Banner</div>,
}));

// Mock the ItineraryCard component
jest.mock("../../components/forms/ItineraryCard", () => ({
  __esModule: true,
  default: ({ itinerary, onLike, onDislike }: any) => (
    <div data-testid="itinerary-card">
      <div>{itinerary.destination}</div>
      <button onClick={() => onLike(itinerary)}>Like</button>
      <button onClick={() => onDislike(itinerary)}>Dislike</button>
    </div>
  ),
}));

// Mock the AddItineraryModal component
jest.mock("../../components/forms/AddItineraryModal", () => ({
  __esModule: true,
  default: ({ open, onClose, onItineraryAdded }: any) => (
    open ? (
      <div data-testid="add-itinerary-modal">
        <button onClick={onClose}>Close Modal</button>
        <button onClick={() => onItineraryAdded("New Destination")}>Save Itinerary</button>
      </div>
    ) : null
  ),
}));

// Mock the NewConnectionContext
jest.mock("../../Context/NewConnectionContext", () => ({
  useNewConnection: () => ({
    setHasNewConnection: jest.fn(),
  }),
  NewConnectionProvider: ({ children }: any) => <div>{children}</div>,
}));

// Now import components and get the mocked functions
import { Search } from "../../components/pages/Search";
import { UserProfileContext } from "../../Context/UserProfileContext";
import { 
  doc, 
  updateDoc, 
  arrayUnion, 
  addDoc, 
  collection, 
  serverTimestamp, 
  getDoc 
} from "firebase/firestore";

// Type the mocked functions
const mockDoc = doc as jest.Mock;
const mockUpdateDoc = updateDoc as jest.Mock;
const mockArrayUnion = arrayUnion as jest.Mock;
const mockAddDoc = addDoc as jest.Mock;
const mockCollection = collection as jest.Mock;
const mockServerTimestamp = serverTimestamp as jest.Mock;
const mockGetDoc = getDoc as jest.Mock;


const mockItineraries = [
  {
    id: "itinerary-1",
    destination: "Paris",
    startDate: "2024-01-01",
    endDate: "2024-01-10",
    userInfo: { uid: "user1", email: "user1@example.com" },
  },
  {
    id: "itinerary-2",
    destination: "London",
    startDate: "2024-02-01",
    endDate: "2024-02-10",
    userInfo: { uid: "user2", email: "user2@example.com" },
  },
];

const mockMatchingItinerary = {
  id: "matching-1",
  destination: "Paris",
  startDate: "2024-01-15",
  endDate: "2024-01-20",
  userInfo: { uid: "other-user", email: "other@example.com" },
};


import { UserProfile } from "../../types/UserProfile";

describe("Search Component", () => {
  const mockUserProfile: UserProfile = {
    username: "testuser",
    email: "test@example.com",
    uid: "current-user-id",
    photos: {
      profile: "",
    },
  };

  const mockSetHasNewConnection = jest.fn();

  const renderWithContext = (userProfile = mockUserProfile) => {
    return render(
      <MemoryRouter>
        <UserProfileContext.Provider
          value={{
            userProfile,
            updateUserProfile: jest.fn(),
            showAlert: jest.fn(),
          }}
        >
          <Search />
        </UserProfileContext.Provider>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.__mockCurrentUser = { uid: "current-user-id" };

    // Reset all mocks to default values
    mockFetchItineraries.mockResolvedValue(mockItineraries);
    mockSearchItineraries.mockResolvedValue(undefined);
    mockCheckForMoreMatches.mockImplementation(() => {});
    mockLoadMoreMatches.mockResolvedValue(undefined);
    mockClearSearchCache.mockImplementation(() => {});
    mockDoc.mockReturnValue({ id: "mock-doc" });
    mockUpdateDoc.mockResolvedValue(undefined);
    mockArrayUnion.mockReturnValue(["mock-array-union"]);
    mockAddDoc.mockResolvedValue({ id: "new-connection" });
    mockCollection.mockReturnValue({ id: "connections" });
    mockServerTimestamp.mockReturnValue("mock-timestamp");
    mockGetDoc.mockResolvedValue({
      data: () => ({
        likes: [],
        userInfo: { email: "test@example.com" },
      }),
    });

    // Mock localStorage
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn(() => null),
        setItem: jest.fn(),
        clear: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });

    // Mock alert
    window.alert = jest.fn();

    // Suppress console output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("renders without crashing", async () => {
    renderWithContext();
    
    await waitFor(() => {
      expect(screen.getByText("Add Itinerary")).toBeInTheDocument();
    });
  });

  test("opens and closes AddItineraryModal", async () => {
    renderWithContext();

    await waitFor(() => {
      expect(screen.getByText("Add Itinerary")).toBeInTheDocument();
    });

    const addButton = screen.getByText("Add Itinerary");
    fireEvent.click(addButton);

    expect(screen.getByTestId("add-itinerary-modal")).toBeInTheDocument();

    const closeButton = screen.getByText("Close Modal");
    fireEvent.click(closeButton);

    expect(screen.queryByTestId("add-itinerary-modal")).not.toBeInTheDocument();
  });

  test("calls checkForMoreMatches when component mounts", async () => {
    renderWithContext();

    await waitFor(() => {
      expect(mockCheckForMoreMatches).toHaveBeenCalled();
    });
  });

  test("calls fetchItineraries on component mount", async () => {
    renderWithContext();

    await waitFor(() => {
      expect(mockFetchItineraries).toHaveBeenCalled();
    });
  });

  test("displays loading state when no itineraries exist", async () => {
    mockFetchItineraries.mockResolvedValueOnce([]);

    renderWithContext();

    await waitFor(() => {
      expect(
        screen.getByText(/After completing your profile/)
      ).toBeInTheDocument();
    });
  });

  test("shows itineraries in dropdown when loaded", async () => {
    renderWithContext();

    await waitFor(() => {
      expect(mockFetchItineraries).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    fireEvent.mouseDown(select);

    await waitFor(() => {
      expect(screen.getByText(/Paris/)).toBeInTheDocument();
      expect(screen.getByText(/London/)).toBeInTheDocument();
    });
  });

  test("calls searchItineraries when an itinerary is selected", async () => {
    renderWithContext();

    await waitFor(() => {
      expect(mockFetchItineraries).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    fireEvent.mouseDown(select);

    await waitFor(() => {
      expect(screen.getByText(/Paris/)).toBeInTheDocument();
    });

    const parisOption = screen.getByText(/Paris/);
    fireEvent.click(parisOption);

    expect(mockSearchItineraries).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "itinerary-1",
        destination: "Paris",
      }),
      "current-user-id"
    );
  });

  test("handles itinerary fetch error", async () => {
    mockFetchItineraries.mockRejectedValueOnce(new Error("Fetch error"));

    renderWithContext();

    // Component should still render even if fetch fails
    await waitFor(() => {
      expect(screen.getByText("Add Itinerary")).toBeInTheDocument();
    });
  });

  test("handles localStorage errors gracefully", async () => {
    const mockSetItem = jest.fn(() => {
      throw new Error("localStorage error");
    });

    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn(() => "[]"),
        setItem: mockSetItem,
        clear: jest.fn(),
        removeItem: jest.fn(),
      },
      writable: true,
    });

    // This should NOT throw an error
    expect(() => {
      renderWithContext();
    }).not.toThrow();

    // Component should still render
    await waitFor(() => {
      expect(screen.getByText("Add Itinerary")).toBeInTheDocument();
    });
  });

  test("displays matching itinerary card", async () => {
    // Set the matching itineraries before rendering
    mockMatchingItineraries.length = 0;
    mockMatchingItineraries.push(mockMatchingItinerary);
    
    renderWithContext();

    await waitFor(() => {
      expect(screen.getByTestId("itinerary-card")).toBeInTheDocument();
      expect(screen.getByText("Paris")).toBeInTheDocument();
    });
  });

  test("handles like action on itinerary", async () => {
    // Set the matching itineraries before rendering
    mockMatchingItineraries.length = 0;
    mockMatchingItineraries.push(mockMatchingItinerary);

    renderWithContext();

    await waitFor(() => {
      expect(screen.getByTestId("itinerary-card")).toBeInTheDocument();
    });

    const likeButton = screen.getByText("Like");
    
    await act(async () => {
      fireEvent.click(likeButton);
    });

    expect(mockUpdateDoc).toHaveBeenCalled();
    expect(mockArrayUnion).toHaveBeenCalledWith("current-user-id");
  });

  test("handles dislike action on itinerary", async () => {
    // Set the matching itineraries before rendering
    mockMatchingItineraries.length = 0;
    mockMatchingItineraries.push(mockMatchingItinerary);

    renderWithContext();

    await waitFor(() => {
      expect(screen.getByTestId("itinerary-card")).toBeInTheDocument();
    });

    const dislikeButton = screen.getByText("Dislike");
    
    await act(async () => {
      fireEvent.click(dislikeButton);
    });

    // Verify localStorage was updated to track viewed itinerary
    expect(window.localStorage.setItem).toHaveBeenCalled();
  });
});
