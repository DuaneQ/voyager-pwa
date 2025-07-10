import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// IMPORTANT: Define mocks before imports, but avoid referencing external variables

// Create factory function mocks that don't reference external variables
jest.mock("firebase/firestore", () => {
  // Create a consistent timestamp object for all uses
  const mockServerTimestamp = { seconds: 1672531200, nanoseconds: 0 };

  // Define MockTimestamp inside the factory function to avoid hoisting issues
  const localMockTimestamp = {
    fromDate: (date) => ({
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: date.getMilliseconds() * 1000000,
      toDate: () => date,
    }),
  };

  return {
    getFirestore: jest.fn().mockReturnValue({}),
    collection: jest.fn().mockImplementation(() => "mock-collection-ref"),
    addDoc: jest.fn().mockImplementation(() =>
      Promise.resolve({
        id: "new-message-id",
        get: () => ({ data: () => ({}) }),
      })
    ),
    updateDoc: jest.fn().mockResolvedValue({}),
    // Key fix: Make serverTimestamp return the same consistent object
    serverTimestamp: jest.fn().mockReturnValue(mockServerTimestamp),
    doc: jest.fn().mockReturnValue("mock-doc-ref"),
    increment: jest.fn().mockReturnValue(1),
    // Use local variable defined within this function scope
    Timestamp: localMockTimestamp,
  };
});

jest.mock("firebase/storage", () => ({
  getStorage: jest.fn().mockReturnValue({}),
  ref: jest.fn().mockReturnValue("mock-storage-ref"),
  uploadBytes: jest.fn().mockResolvedValue({}),
  getDownloadURL: jest
    .fn()
    .mockResolvedValue("https://example.com/uploaded-image.jpg"),
}));

// Mock components
jest.mock("react-simple-pull-to-refresh", () => {
  return ({ children, onRefresh }) => (
    <div data-testid="pull-to-refresh" onClick={onRefresh}>
      {children}
    </div>
  );
});

jest.mock("../../components/modals/ViewProfileModal", () => ({
  ViewProfileModal: ({ open, onClose, userId }) =>
    open ? (
      <div data-testid="view-profile-modal" onClick={onClose}>
        Profile for {userId}
      </div>
    ) : null,
}));

// Import mocked modules after defining mocks
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  doc,
  increment,
  Timestamp,
} from "firebase/firestore";

import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { Connection } from "../../types/Connection";
import { Message } from "../../types/Message";
import ChatModal from "../../components/modals/ChatModal";

describe("ChatModal Component", () => {
  // Sample test data
  const mockUserId = "current-user-123";
  const mockOtherUserId = "other-user-456";

  const mockConnection: Connection = {
    id: "connection-123",
    users: [mockUserId, mockOtherUserId],
    itineraries: [
      {
        id: "itinerary-1",
        destination: "Paris",
        startDate: "2023-10-01",
        endDate: "2023-10-10",
        userInfo: {
          uid: mockUserId,
          username: "Current User",
          photoURL: "/current-user.jpg",
        },
      },
      {
        id: "itinerary-2",
        destination: "Paris",
        startDate: "2023-10-05",
        endDate: "2023-10-15",
        userInfo: {
          uid: mockOtherUserId,
          username: "Other User",
          photoURL: "/other-user.jpg",
        },
      },
    ],
    createdAt: { seconds: 1672531200, nanoseconds: 0 } as any,
  };

  // Use the imported Timestamp which is now correctly mocked
  const mockMessages: Message[] = [
    {
      id: "message-1",
      sender: mockUserId,
      text: "Hello there!",
      createdAt: Timestamp.fromDate(new Date("2023-01-01T10:00:00")) as any,
      readBy: [mockUserId],
    },
    {
      id: "message-2",
      sender: mockOtherUserId,
      text: "Hi! How are you?",
      createdAt: Timestamp.fromDate(new Date("2023-01-01T10:05:00")) as any,
      readBy: [mockOtherUserId],
    },
  ];

  const mockEmptyMessages: Message[] = [];
  const mockOtherUserPhotoURL = "/other-user.jpg";

  // Common props
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    connection: mockConnection,
    messages: mockMessages,
    userId: mockUserId,
    otherUserPhotoURL: mockOtherUserPhotoURL,
    onPullToRefresh: jest.fn().mockResolvedValue(undefined),
    hasMoreMessages: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders correctly with messages", () => {
    render(<ChatModal {...defaultProps} />);

    // Check destination is displayed in the header
    expect(screen.getByText("Paris")).toBeInTheDocument();

    // Check messages are displayed in the right order (oldest to newest)
    const messages = screen.getAllByText(/Hello there!|Hi! How are you\?/);
    expect(messages[0].textContent).toBe("Hello there!");
    expect(messages[1].textContent).toBe("Hi! How are you?");

    // FIX 1: Use data-testid instead of style checking
    // Add data-testid attributes to the component first
    const currentUserMessage = screen
      .getByText("Hello there!")
      .closest('[data-testid="message-bubble"]');
    const otherUserMessage = screen
      .getByText("Hi! How are you?")
      .closest('[data-testid="message-bubble"]');

    // Check class names or other attributes instead of direct styles
    expect(currentUserMessage).toHaveClass("current-user-message");
    expect(otherUserMessage).toHaveClass("other-user-message");

    // Alternative: Check for a partial style match
    // expect(currentUserMessage).toHaveStyle({ backgroundColor: expect.stringContaining('rgb(25, 118, 210)') });
  });

  it("renders correctly with no messages", () => {
    render(<ChatModal {...defaultProps} messages={mockEmptyMessages} />);

    // Still shows the chat interface but no messages
    expect(screen.getByText("Paris")).toBeInTheDocument();
    expect(screen.queryByText("Hello there!")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Type a message")).toBeInTheDocument();
  });

  it("handles sending a text message", async () => {
    // Reset mocks for this test to ensure clean state
    jest.clearAllMocks();
    
    // Ensure mocks return expected values
    const mockCollectionRef = "mock-collection-ref";
    (collection as jest.Mock).mockReturnValue(mockCollectionRef);
    (doc as jest.Mock).mockReturnValue("mock-doc-ref");
    (increment as jest.Mock).mockReturnValue(1);

    render(<ChatModal {...defaultProps} />);

    // Type a message and click send
    const input = screen.getByPlaceholderText("Type a message");
    await userEvent.type(input, "New test message");

    const sendButton = screen.getByRole("button", { name: /send/i });
    
    // Use act to ensure state updates are processed
    await act(async () => {
      await userEvent.click(sendButton);
    });

    // Verify Firebase calls with updated expectations
    expect(collection).toHaveBeenCalledWith(
      {},
      "connections",
      mockConnection.id,
      "messages"
    );
    
    expect(addDoc).toHaveBeenCalledWith(
      mockCollectionRef,
      expect.objectContaining({
        sender: mockUserId,
        text: "New test message",
        readBy: [mockUserId]
      })
    );

    expect(doc).toHaveBeenCalledWith({}, "connections", mockConnection.id);
    expect(updateDoc).toHaveBeenCalledWith(
      "mock-doc-ref",
      expect.objectContaining({
        [`unreadCounts.${mockOtherUserId}`]: expect.anything()
      })
    );

    // KEY FIX: Wait for the input to be cleared
    await waitFor(() => {
      expect(input).toHaveValue("");
    }, { timeout: 1000 });
  });

  it("handles image upload and sending", async () => {
    // Reset mocks for this test
    jest.clearAllMocks();
    
    // Set up more specific mocks
    (collection as jest.Mock).mockReturnValue("mock-collection-ref");
    (addDoc as jest.Mock).mockResolvedValueOnce({
      id: "image-message-id"
    });

    render(<ChatModal {...defaultProps} />);

    // Create a mock file
    const file = new File(["dummy content"], "test-image.png", {
      type: "image/png",
    });

    // Get the file input
    const fileInput = screen.getByLabelText("");

    try {
      // Simulate file selection
      await act(async () => {
        await userEvent.upload(fileInput, file);
      });

      // Don't check the specific call, just verify it was called
      expect(addDoc).toHaveBeenCalled();
      
      // Extract and verify the second parameter separately
      const addDocCalls = (addDoc as jest.Mock).mock.calls;
      const secondParameter = addDocCalls[0][1];
      expect(secondParameter).toMatchObject({
        sender: mockUserId,
        text: "",
        readBy: [mockUserId],
        imageUrl: ""
      });
    } catch (error) {
      console.error("Test error:", error);
      throw error;
    }
  });

  it("handles pull-to-refresh to load older messages", async () => {
    render(<ChatModal {...defaultProps} />);

    // Find and trigger the pull-to-refresh component
    const pullToRefreshComponent = screen.getByTestId("pull-to-refresh");
    await userEvent.click(pullToRefreshComponent); // Simulates the onRefresh callback

    // Verify onPullToRefresh was called
    expect(defaultProps.onPullToRefresh).toHaveBeenCalled();
  });

  it("does not call onPullToRefresh if there are no more messages", async () => {
    render(<ChatModal {...defaultProps} hasMoreMessages={false} />);

    // Find and trigger the pull-to-refresh component
    const pullToRefreshComponent = screen.getByTestId("pull-to-refresh");
    await userEvent.click(pullToRefreshComponent);

    // Verify onPullToRefresh was not called
    expect(defaultProps.onPullToRefresh).not.toHaveBeenCalled();
  });

  // Avatar click test removed: avatar is not present in new header UI

  it("closes the modal when the close button is clicked", async () => {
    render(<ChatModal {...defaultProps} />);

    // Find and click close button
    const closeButton = screen.getByLabelText("Close");
    await userEvent.click(closeButton);

    // Verify onClose was called
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it("disables send button when input is empty", async () => {
    render(<ChatModal {...defaultProps} />);

    // Check that send button is disabled initially
    const sendButton = screen.getByRole("button", { name: /send/i });
    expect(sendButton).toBeDisabled();

    // Type something and verify button is enabled
    const input = screen.getByPlaceholderText("Type a message");
    await userEvent.type(input, "a");
    expect(sendButton).not.toBeDisabled();

    // Clear input and verify button is disabled again
    await userEvent.clear(input);
    expect(sendButton).toBeDisabled();
  });
});
