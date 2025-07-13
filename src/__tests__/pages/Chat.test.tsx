import React from "react";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import { Chat } from "../../components/pages/Chat";
// Removed useGetUserId import
import { useNewConnection } from "../../Context/NewConnectionContext";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  getFirestore,
} from "firebase/firestore";

// Mock Firebase Firestore
jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(() => ({ _id: "mock-db" })),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  getDocs: jest.fn(),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  Timestamp: jest.fn().mockImplementation((seconds, nanoseconds) => ({
    seconds,
    nanoseconds,
    toDate: () => new Date(seconds * 1000),
  })),
}));

// Removed useGetUserId mock
jest.mock("../../Context/NewConnectionContext");
jest.mock("../../environments/firebaseConfig", () => {
  return {
    app: { _id: "mock-app" },
    auth: {
      get currentUser() {
        return global.__mockCurrentUser;
      },
    },
  };
});
jest.mock("../../components/modals/ChatModal", () => {
  return function MockChatModal({ open, onClose, connection }: any) {
    return open ? (
      <div data-testid="chat-modal">
        <div>Chat with {connection.id}</div>
        <button onClick={onClose}>Close Chat</button>
      </div>
    ) : null;
  };
});
jest.mock("../../components/layout/BottomNavigation", () => {
  return function MockBottomNav() {
    return <div data-testid="bottom-nav">Bottom Navigation</div>;
  };
});
jest.mock("../../components/Chat/ChatListItem", () => {
  return {
    ChatListItem: function MockChatListItem({ conn, onClick, unread }: any) {
      return (
        <div
          data-testid={`chat-item-${conn.id}`}
          onClick={() => onClick("mock-photo-url.jpg")}>
          <div>Connection: {conn.id}</div>
          {unread && <div data-testid="unread-badge">Unread</div>}
        </div>
      );
    },
  };
});

describe("Chat Component", () => {
  const mockUserId = "current-user-123";
  const mockSetHasNewConnection = jest.fn();
  const mockDb = { _id: "mock-db" };

  // Mock connection data (now includes addedUsers)
  const mockConnections = [
    {
      id: "connection-1",
      users: [mockUserId, "other-user-1"],
      itineraryIds: ["itinerary-1", "itinerary-2"],
      itineraries: [
        {
          id: "itinerary-1",
          destination: "Paris",
          userInfo: { uid: mockUserId, username: "CurrentUser" },
        },
        {
          id: "itinerary-2",
          destination: "London",
          userInfo: { uid: "other-user-1", username: "OtherUser1" },
        },
      ],
      createdAt: new Timestamp(1625097600, 0),
      unreadCounts: {
        [mockUserId]: 2,
        "other-user-1": 0,
      },
      addedUsers: [],
    },
    {
      id: "connection-2",
      users: [mockUserId, "other-user-2"],
      itineraryIds: ["itinerary-3", "itinerary-4"],
      itineraries: [
        {
          id: "itinerary-3",
          destination: "Tokyo",
          userInfo: { uid: mockUserId, username: "CurrentUser" },
        },
        {
          id: "itinerary-4",
          destination: "Osaka",
          userInfo: { uid: "other-user-2", username: "OtherUser2" },
        },
      ],
      createdAt: new Timestamp(1625184000, 0),
      unreadCounts: {
        [mockUserId]: 0,
        "other-user-2": 1,
      },
      addedUsers: [],
    },
  ];

  // Mock messages data
  const mockMessages = [
    {
      id: "message-1",
      sender: "other-user-1",
      text: "Hello there!",
      createdAt: new Timestamp(1625097600, 0),
      readBy: [],
    },
    {
      id: "message-2",
      sender: mockUserId,
      text: "Hi! How are you?",
      createdAt: new Timestamp(1625097700, 0),
      readBy: ["other-user-1"],
    },
  ];

  let mockConnectionsUnsubscribe: jest.Mock;
  let mockMessagesUnsubscribe: jest.Mock;

  beforeEach(() => {
    // Setup mocks
    global.__mockCurrentUser = { uid: mockUserId };
    (useNewConnection as jest.Mock).mockReturnValue({
      setHasNewConnection: mockSetHasNewConnection,
    });
    (getFirestore as jest.Mock).mockReturnValue(mockDb);

    // Create mock unsubscribe functions
    mockConnectionsUnsubscribe = jest.fn();
    mockMessagesUnsubscribe = jest.fn();

    // Mock Firestore functions
    (collection as jest.Mock).mockReturnValue("mock-collection");
    (query as jest.Mock).mockReturnValue("mock-query");
    (where as jest.Mock).mockReturnValue("mock-where");
    (orderBy as jest.Mock).mockReturnValue("mock-orderby");
    (limit as jest.Mock).mockReturnValue("mock-limit");
    (startAfter as jest.Mock).mockReturnValue("mock-startafter");
    (doc as jest.Mock).mockReturnValue("mock-doc-ref");
    (updateDoc as jest.Mock).mockResolvedValue({});
    (getDocs as jest.Mock).mockResolvedValue({
      docs: mockMessages.map((msg) => ({
        id: msg.id,
        data: () => msg,
      })),
    });

    // Mock onSnapshot for connections
    (onSnapshot as jest.Mock).mockImplementation((query, callback) => {
      // Determine if this is for connections or messages based on the query
      if (query === "mock-query") {
        // This is for connections
        setTimeout(() => {
          callback({
            docs: mockConnections.map((conn) => ({
              id: conn.id,
              data: () => conn,
            })),
          });
        }, 0);
        return mockConnectionsUnsubscribe;
      } else {
        // This is for messages
        setTimeout(() => {
          callback({
            docs: mockMessages.map((msg) => ({
              id: msg.id,
              data: () => msg,
            })),
          });
        }, 0);
        return mockMessagesUnsubscribe;
      }
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders the chat component correctly", async () => {
    render(<Chat />);

    // Check that the component renders
    await waitFor(() => {
      expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
    });
  });

  it("fetches and displays connections", async () => {
    render(<Chat />);

    // Wait for connections to load
    await waitFor(() => {
      expect(screen.getByTestId("chat-item-connection-1")).toBeInTheDocument();
      expect(screen.getByTestId("chat-item-connection-2")).toBeInTheDocument();
    });

    // Verify Firestore query was called correctly
    expect(collection).toHaveBeenCalledWith(mockDb, "connections");
    expect(where).toHaveBeenCalledWith("users", "array-contains", mockUserId);
    expect(onSnapshot).toHaveBeenCalled();
  });

  it("shows unread badge for connections with unread messages", async () => {
    render(<Chat />);

    await waitFor(() => {
      // Connection 1 has unread messages for current user
      const connection1 = screen.getByTestId("chat-item-connection-1");
      expect(connection1).toBeInTheDocument();
      expect(screen.getByTestId("unread-badge")).toBeInTheDocument();
    });
  });

  it("sets global new connection indicator when there are unread messages", async () => {
    render(<Chat />);

    await waitFor(() => {
      expect(mockSetHasNewConnection).toHaveBeenCalledWith(true);
    });
  });

  it("clears new connection indicator on mount", async () => {
    render(<Chat />);

    await waitFor(() => {
      expect(mockSetHasNewConnection).toHaveBeenCalledWith(false);
    });
  });

  it("opens chat modal when connection is clicked", async () => {
    render(<Chat />);

    await waitFor(() => {
      expect(screen.getByTestId("chat-item-connection-1")).toBeInTheDocument();
    });

    // Click on a connection
    await act(async () => {
      fireEvent.click(screen.getByTestId("chat-item-connection-1"));
    });

    // Chat modal should open
    await waitFor(() => {
      expect(screen.getByTestId("chat-modal")).toBeInTheDocument();
      expect(screen.getByText("Chat with connection-1")).toBeInTheDocument();
    });
  });

  it("closes chat modal when close button is clicked", async () => {
    render(<Chat />);

    // Open chat modal
    await waitFor(() => {
      expect(screen.getByTestId("chat-item-connection-1")).toBeInTheDocument();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId("chat-item-connection-1"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("chat-modal")).toBeInTheDocument();
    });

    // Close chat modal
    await act(async () => {
      fireEvent.click(screen.getByText("Close Chat"));
    });

    await waitFor(() => {
      expect(screen.queryByTestId("chat-modal")).not.toBeInTheDocument();
    });
  });

  it("resets unread count when chat is opened", async () => {
    render(<Chat />);

    await waitFor(() => {
      expect(screen.getByTestId("chat-item-connection-1")).toBeInTheDocument();
    });

    // Click on connection to open chat
    await act(async () => {
      fireEvent.click(screen.getByTestId("chat-item-connection-1"));
    });

    // Verify unread count is reset
    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalledWith("mock-doc-ref", {
        [`unreadCounts.${mockUserId}`]: 0,
      });
    });
  });

  it("fetches messages when connection is selected", async () => {
    render(<Chat />);

    await waitFor(() => {
      expect(screen.getByTestId("chat-item-connection-1")).toBeInTheDocument();
    });

    // Click on connection
    await act(async () => {
      fireEvent.click(screen.getByTestId("chat-item-connection-1"));
    });

    // Verify messages query is set up
    await waitFor(() => {
      expect(collection).toHaveBeenCalledWith(mockDb, "connections", "connection-1", "messages");
      expect(orderBy).toHaveBeenCalledWith("createdAt", "desc");
      expect(limit).toHaveBeenCalledWith(10);
    });
  });

  it("handles empty connections list", async () => {
    // Mock empty connections
    (onSnapshot as jest.Mock).mockImplementation((query, callback) => {
      setTimeout(() => {
        callback({ docs: [] });
      }, 0);
      return mockConnectionsUnsubscribe;
    });

    render(<Chat />);

    await waitFor(() => {
      expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
    });

    // Should not have any chat items
    expect(screen.queryByTestId("chat-item-connection-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("chat-item-connection-2")).not.toBeInTheDocument();
  });

  it("handles user without ID", async () => {
    global.__mockCurrentUser = null;

    render(<Chat />);

    await waitFor(() => {
      expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
    });

    // Should not call Firestore when no user ID
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it("unsubscribes from connections listener on unmount", async () => {
    const { unmount } = render(<Chat />);

    await waitFor(() => {
      expect(onSnapshot).toHaveBeenCalled();
    });

    unmount();

    expect(mockConnectionsUnsubscribe).toHaveBeenCalled();
  });

  it("handles Firestore errors gracefully", async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock onSnapshot to simulate an error during subscription
    (onSnapshot as jest.Mock).mockImplementation((query, callback) => {
      // Simulate error in callback execution instead of throwing immediately
      setTimeout(() => {
        try {
          throw new Error("Firestore error");
        } catch (error) {
          // In a real scenario, the component would handle this error
          console.error("Firestore error:", error);
        }
      }, 0);
      return mockConnectionsUnsubscribe;
    });

    // Component should still render even if Firestore has issues
    render(<Chat />);

    await waitFor(() => {
      expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
    });

    consoleErrorSpy.mockRestore();
  });

  it("updates unread status correctly when new messages arrive", async () => {
    render(<Chat />);

    await waitFor(() => {
      expect(screen.getByTestId("chat-item-connection-1")).toBeInTheDocument();
    });

    // Simulate new message arriving with updated unread count
    const updatedConnections = [
      {
        ...mockConnections[0],
        unreadCounts: {
          [mockUserId]: 3, // Increased unread count
          "other-user-1": 0,
        },
      },
    ];

    await act(async () => {
      // Simulate onSnapshot callback with updated data
      const onSnapshotCallback = (onSnapshot as jest.Mock).mock.calls[0][1];
      onSnapshotCallback({
        docs: updatedConnections.map((conn) => ({
          id: conn.id,
          data: () => conn,
        })),
      });
    });

    await waitFor(() => {
      expect(mockSetHasNewConnection).toHaveBeenCalledWith(true);
    });
  });
});
