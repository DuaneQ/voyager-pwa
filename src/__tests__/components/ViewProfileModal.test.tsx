import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ViewProfileModal } from "../../components/modals/ViewProfileModal";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import useGetUserId from "../../hooks/useGetUserId";
import { UserProfileContext } from "../../Context/UserProfileContext";

// Mock Firebase and hooks
jest.mock("firebase/firestore");
jest.mock("../../hooks/useGetUserId");
jest.mock("../../environments/firebaseConfig", () => ({
  app: {},
}));

describe("ViewProfileModal Component", () => {
  const mockUserId = "current-user-123";
  const mockOtherUserId = "other-user-456";
  const mockUpdateUserProfile = jest.fn();

  // Mock localStorage
  let localStorageMock = {};

  beforeEach(() => {
    // Setup mocks
    (useGetUserId as jest.Mock).mockReturnValue(mockUserId);

    // Mock getDoc to return profile data
    (getDoc as jest.Mock).mockImplementation((ref) => {
      // Different response based on which user we're fetching
      if (ref === "mock-doc-ref-other") {
        return Promise.resolve({
          exists: () => true,
          data: () => ({
            username: "TestUser", // Changed from 'OtherUser' to match test expectations
            bio: "Other bio",
            photos: ["https://example.com/other-photo.jpg"],
            blocked: [],
          }),
        });
      } else {
        // Return current user data with updated blocked array after blocking
        return Promise.resolve({
          exists: () => true,
          data: () => ({
            username: "CurrentUser",
            bio: "Current bio",
            photos: ["https://example.com/photo.jpg"],
            blocked: [mockOtherUserId],
          }),
        });
      }
    });

    // Mock doc to return different references based on the user
    (doc as jest.Mock).mockImplementation((_, __, userId) => {
      return userId === mockOtherUserId ? "mock-doc-ref-other" : "mock-doc-ref";
    });

    // Mock updateDoc to resolve successfully
    (updateDoc as jest.Mock).mockResolvedValue({});

    // Mock arrayUnion
    (arrayUnion as jest.Mock).mockImplementation((id) => ({
      __arrayUnion: id,
    }));

    // Setup localStorage mock
    localStorageMock = {};
    Storage.prototype.setItem = jest.fn((key, value) => {
      localStorageMock[key] = value;
    });
    Storage.prototype.getItem = jest.fn((key) => localStorageMock[key] || null);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the profile modal correctly", async () => {
    render(
      <UserProfileContext.Provider
        value={{ userProfile: {}, updateUserProfile: mockUpdateUserProfile }}>
        <ViewProfileModal
          open={true}
          onClose={() => {}}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText("TestUser")).toBeInTheDocument();
    });

    expect(screen.getByText("Block")).toBeInTheDocument();
  });

  it("shows block confirmation dialog when block button is clicked", async () => {
    render(
      <UserProfileContext.Provider
        value={{ userProfile: {}, updateUserProfile: mockUpdateUserProfile }}>
        <ViewProfileModal
          open={true}
          onClose={() => {}}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    // Wait for profile to load
    await waitFor(() => {
      expect(screen.getByText("TestUser")).toBeInTheDocument();
    });

    // Click the block button
    fireEvent.click(screen.getByText("Block"));

    // Check if confirmation dialog appears
    expect(screen.getByText("Block this user?")).toBeInTheDocument();
  });

  it("blocks user when confirmed", async () => {
    const mockOnClose = jest.fn();
    render(
      <UserProfileContext.Provider
        value={{ userProfile: {}, updateUserProfile: mockUpdateUserProfile }}>
        <ViewProfileModal
          open={true}
          onClose={mockOnClose}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    // Wait for profile to load
    await waitFor(() => {
      expect(screen.getByText("TestUser")).toBeInTheDocument();
    });

    // Click the block button
    fireEvent.click(screen.getByText("Block"));

    // Click confirm in the dialog
    fireEvent.click(screen.getByText("Block User"));

    // Check if updateDoc was called for both users
    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledTimes(2);

      // Check that doc was called with both users' IDs
      const docCalls = (doc as jest.Mock).mock.calls;
      const userIds = docCalls.map((call) => call[2]); // Extract the userId parameter

      expect(userIds).toContain(mockUserId);
      expect(userIds).toContain(mockOtherUserId);

      // Check updateDoc calls without assuming order
      expect(updateDoc).toHaveBeenCalledWith("mock-doc-ref", {
        blocked: { __arrayUnion: mockOtherUserId },
      });

      expect(updateDoc).toHaveBeenCalledWith("mock-doc-ref-other", {
        blocked: { __arrayUnion: mockUserId },
      });

      // Check if modal was closed
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it("blocks user and updates context and localStorage when confirmed", async () => {
    const mockOnClose = jest.fn();

    // Render with mocked context
    render(
      <UserProfileContext.Provider
        value={{ userProfile: {}, updateUserProfile: mockUpdateUserProfile }}>
        <ViewProfileModal
          open={true}
          onClose={mockOnClose}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    // Wait for other user's profile to load
    await waitFor(() => {
      expect(getDoc).toHaveBeenCalledWith("mock-doc-ref-other");
    });

    // Click the block button
    const blockButton = screen.getByText("Block");
    fireEvent.click(blockButton);

    // Confirm blocking in dialog
    const confirmButton = screen.getByText("Block User");
    fireEvent.click(confirmButton);

    // Verify Firebase update calls
    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledTimes(2);

      // Check first call (current user)
      expect(updateDoc).toHaveBeenCalledWith("mock-doc-ref", {
        blocked: { __arrayUnion: mockOtherUserId },
      });

      // Check second call (other user)
      expect(updateDoc).toHaveBeenCalledWith("mock-doc-ref-other", {
        blocked: { __arrayUnion: mockUserId },
      });
    });

    // Verify context was updated with the new profile data
    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith({
        username: "CurrentUser",
        bio: "Current bio",
        photos: ["https://example.com/photo.jpg"],
        blocked: [mockOtherUserId],
      });
    });

    // Verify localStorage was updated
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "PROFILE_INFO",
        JSON.stringify({
          username: "CurrentUser",
          bio: "Current bio",
          photos: ["https://example.com/photo.jpg"],
          blocked: [mockOtherUserId],
        })
      );
    });

    // Verify modal was closed
    expect(mockOnClose).toHaveBeenCalled();
  });

  it("blocks user and updates context and localStorage when confirmed", async () => {
    const mockOnClose = jest.fn();

    // Render with mocked context
    render(
      <UserProfileContext.Provider
        value={{ userProfile: {}, updateUserProfile: mockUpdateUserProfile }}>
        <ViewProfileModal
          open={true}
          onClose={mockOnClose}
          userId={mockOtherUserId}
        />
      </UserProfileContext.Provider>
    );

    // Wait for other user's profile to load
    await waitFor(() => {
      expect(getDoc).toHaveBeenCalledWith("mock-doc-ref-other");
    });

    // Click the block button
    const blockButton = screen.getByText("Block");
    fireEvent.click(blockButton);

    // Confirm blocking in dialog
    const confirmButton = screen.getByText("Block User");
    fireEvent.click(confirmButton);

    // Verify Firebase update calls
    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledTimes(2);

      // Check first call (current user)
      expect(updateDoc).toHaveBeenCalledWith("mock-doc-ref", {
        blocked: { __arrayUnion: mockOtherUserId },
      });

      // Check second call (other user)
      expect(updateDoc).toHaveBeenCalledWith("mock-doc-ref-other", {
        blocked: { __arrayUnion: mockUserId },
      });
    });

    // Verify context was updated with the new profile data
    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith({
        username: "CurrentUser",
        bio: "Current bio",
        photos: ["https://example.com/photo.jpg"],
        blocked: [mockOtherUserId],
      });
    });

    // Verify localStorage was updated
    await waitFor(() => {
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "PROFILE_INFO",
        JSON.stringify({
          username: "CurrentUser",
          bio: "Current bio",
          photos: ["https://example.com/photo.jpg"],
          blocked: [mockOtherUserId],
        })
      );
    });

    // Verify modal was closed
    expect(mockOnClose).toHaveBeenCalled();
  });
});
