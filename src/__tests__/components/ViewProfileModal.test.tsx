import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { ViewProfileModal } from "../../components/modals/ViewProfileModal";
import { within } from '@testing-library/react';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  addDoc,
  serverTimestamp,
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
            username: "TestUser",
            bio: "Other bio",
            photos: ["https://example.com/other-photo.jpg"],
            blocked: [],
            status: "couple", // Add status field
            ratings: {
              average: 4.2,
              count: 5,
              ratedBy: {
                "current-user-123": {
                  rating: 4,
                  timestamp: 1625097600000,
                },
              },
            },
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

    // Update the doc mock to return different types based on collection
    (doc as jest.Mock).mockImplementation((_, collection, id) => {
      // Special case for connections collection
      if (collection === "connections") {
        return {
          path: `connections/${id}`,
          id: id,
        };
      }
      // Keep existing behavior for user documents
      return id === mockOtherUserId ? "mock-doc-ref-other" : "mock-doc-ref";
    });

    // Mock updateDoc to resolve successfully
    (updateDoc as jest.Mock).mockResolvedValue({});

    // Mock arrayUnion
    (arrayUnion as jest.Mock).mockImplementation((id) => ({
      __arrayUnion: id,
    }));

    // Mock collection, query, where, getDocs, and deleteDoc
    (collection as jest.Mock).mockReturnValue("mock-collection");
    (query as jest.Mock).mockReturnValue("mock-query");
    (where as jest.Mock).mockReturnValue("mock-where");
    (getDocs as jest.Mock).mockResolvedValue({
      forEach: jest.fn((callback) => {
        // Simulate a connection between the users
        callback({
          id: "mock-connection-id",
          data: () => ({
            users: [mockUserId, mockOtherUserId],
          }),
          ref: {
            path: "connections/mock-connection-id",
          },
        });
      }),
    });
    (deleteDoc as jest.Mock).mockResolvedValue(undefined);
    (addDoc as jest.Mock).mockResolvedValue({ id: "mock-violation-id" });
    (serverTimestamp as jest.Mock).mockReturnValue({
      seconds: 1625097600,
      nanoseconds: 0,
    });

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

  it("handles the complete blocking workflow including connection removal", async () => {
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
    await waitFor(() =>
      expect(screen.getByText("TestUser")).toBeInTheDocument()
    );

    // Perform block action with act()
    await act(async () => {
      fireEvent.click(screen.getByText("Block"));
    });

    await act(async () => {
      fireEvent.click(screen.getByText("Block User"));
    });

    // Verify entire blocking workflow in sequence
    await waitFor(() => {
      // Step 1: Connection query is constructed correctly
      expect(collection).toHaveBeenCalledWith(undefined, "connections");
      expect(query).toHaveBeenCalledWith("mock-collection", "mock-where");
      expect(where).toHaveBeenCalledWith("users", "array-contains", mockUserId);
      expect(getDocs).toHaveBeenCalledWith("mock-query");

      // Step 2: Connection is found and deleted
      expect(deleteDoc).toHaveBeenCalledTimes(1);
      // Update this assertion to match the mock document structure
      expect(deleteDoc).toHaveBeenCalledWith({
        path: `connections/mock-connection-id`,
        id: "mock-connection-id",
      });

      // Step 3: Both users are updated with blocked arrays
      expect(updateDoc).toHaveBeenCalledTimes(2);
      expect(updateDoc).toHaveBeenCalledWith("mock-doc-ref", {
        blocked: { __arrayUnion: mockOtherUserId },
      });
      expect(updateDoc).toHaveBeenCalledWith("mock-doc-ref-other", {
        blocked: { __arrayUnion: mockUserId },
      });

      // Step 4: Current user's profile is fetched for context update
      expect(getDoc).toHaveBeenCalledWith("mock-doc-ref");

      // Step 5: Context is updated with new profile data
      expect(mockUpdateUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          blocked: [mockOtherUserId],
        })
      );

      // Step 6: LocalStorage is updated
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "PROFILE_INFO",
        expect.any(String)
      );

      // Step 7: Modal is closed
      expect(mockOnClose).toHaveBeenCalled();

      // Step 8: Success message is shown
      expect(screen.getByText("User blocked successfully")).toBeInTheDocument();
    });
  });

  it("shows report dialog when report button is clicked", async () => {
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

    // Click the report button
    await act(async () => {
      fireEvent.click(screen.getByText("Report"));
    });

    // Check if report dialog appears - using more flexible matchers
    expect(screen.getByText("Report User")).toBeInTheDocument();
    expect(
      screen.getByText(/Please tell us why you are reporting this user/i)
    ).toBeInTheDocument();
  });

  it("handles the complete reporting workflow", async () => {
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
    await waitFor(() =>
      expect(screen.getByText("TestUser")).toBeInTheDocument()
    );

    // Open report dialog
    await act(async () => {
      fireEvent.click(screen.getByText("Report"));
    });

    // Fill out the report form - use combobox role instead of button
    await act(async () => {
      // Find select element by role "combobox"
      const selectElement = screen.getByRole("combobox", {
        name: "Reason for Report",
      });
      fireEvent.mouseDown(selectElement);
    });

    // Wait for the dropdown to appear and select an option
    await waitFor(() => {
      const listbox = document.querySelector('[role="listbox"]');
      expect(listbox).toBeInTheDocument();
    });

    // Click on the option
    await act(async () => {
      // Select by option text content
      const options = screen.getAllByRole("option");
      const inappropriateOption = options.find(
        (option) => option.textContent === "Inappropriate Behavior"
      );
      if (inappropriateOption) {
        fireEvent.click(inappropriateOption);
      }
    });

    await act(async () => {
      // Find textarea by its placeholder text
      const textareaElement = screen.getByPlaceholderText(
        /provide any additional information/i
      );
      fireEvent.change(textareaElement, {
        target: { value: "This user was rude in messages." },
      });
    });

    // Submit the report - button should be enabled now
    await act(async () => {
      const submitButton = screen.getByRole("button", {
        name: /submit report/i,
      });
      expect(submitButton).not.toHaveAttribute("disabled");
      fireEvent.click(submitButton);
    });

    // Verify the reporting workflow
    await waitFor(() => {
      // Step 1: Violation document is created in Firestore
      expect(collection).toHaveBeenCalledWith(undefined, "violations");
      expect(addDoc).toHaveBeenCalledWith(
        "mock-collection",
        expect.objectContaining({
          reportedUserId: mockOtherUserId,
          reportedByUserId: mockUserId,
          reason: "inappropriate_behavior",
          description: "This user was rude in messages.",
          status: "pending",
        })
      );

      // Step 2: Success message is shown
      expect(
        screen.getByText("Report submitted successfully")
      ).toBeInTheDocument();
    });
  });

  it("validates report form before submission", async () => {
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
    await waitFor(() =>
      expect(screen.getByText("TestUser")).toBeInTheDocument()
    );

    // Open report dialog
    await act(async () => {
      fireEvent.click(screen.getByText("Report"));
    });

    // Verify the submit button is disabled without selecting a reason
    await waitFor(() => {
      const submitButton = screen.getByRole("button", {
        name: /submit report/i,
      });
      expect(submitButton).toHaveAttribute("disabled");
    });

    // Verify no Firestore call was made
    expect(addDoc).not.toHaveBeenCalled();
  });

  it("displays the user's average rating", async () => {
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

    // Check if rating is displayed
    expect(screen.getByText("4.2 (5)")).toBeInTheDocument();
  });

  it("allows users to submit a new rating", async () => {
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
    await waitFor(() =>
      expect(screen.getByText("TestUser")).toBeInTheDocument()
    );

    // Open rating dialog by clicking on rating display
    await act(async () => {
      const ratingDisplay = screen.getByText("4.2 (5)").parentElement;
      fireEvent.click(ratingDisplay!);
    });

    // Check if dialog appears
    expect(screen.getByText("Rate TestUser")).toBeInTheDocument();

    // Select a new rating - click on the 5-star radio input within the rating dialog
    await act(async () => {
      // Use the data-testid to find the Rating component first
      const ratingComponent = screen.getByTestId("rating-input");

      // Then find the 5 Stars radio within this component using within()
      const fiveStarRadio = within(ratingComponent).getByLabelText("5 Stars");
      fireEvent.click(fiveStarRadio);
    });

    // Submit the new rating
    await act(async () => {
      fireEvent.click(screen.getByText("Submit Rating"));
    });

    // Verify Firestore update
    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith(
        "mock-doc-ref-other",
        expect.objectContaining({
          ratings: expect.objectContaining({
            average: expect.any(Number),
            count: expect.any(Number),
            ratedBy: expect.objectContaining({
              "current-user-123": expect.objectContaining({
                rating: 5,
              }),
            }),
          }),
        })
      );

      // Verify success message
      expect(
        screen.getByText("Rating submitted successfully")
      ).toBeInTheDocument();
    });
  });

  // Update the status test:
  it("displays user status correctly", async () => {
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

    // Look for the Status TextField and its value
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByDisplayValue("couple")).toBeInTheDocument();
  });
});
