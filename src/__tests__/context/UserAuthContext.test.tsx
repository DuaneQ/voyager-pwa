import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Context, UserAuthContextProvider } from "../../Context/UserAuthContext";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useNavigate } from "react-router-dom";

// Mock dependencies
jest.mock("firebase/auth");
jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
}));
jest.mock("react-loader-spinner", () => ({
  RotatingLines: () => <div data-testid="loading-spinner">Loading...</div>,
}));

// Test component to consume the context
const TestConsumer = () => {
  const { user, setUser } = React.useContext(Context);
  return (
    <div>
      <div data-testid="user-value">{user ? JSON.stringify(user) : "no user"}</div>
      <button 
        data-testid="set-user-button"
        onClick={() => setUser({ uid: "test-uid", email: "test@example.com", emailVerified: true })}
      >
        Set User Manually
      </button>
    </div>
  );
};

describe("UserAuthContextProvider", () => {
  // Mock implementation setup
  const mockNavigate = jest.fn();
  const mockUnsubscribe = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
    useNavigate.mockReturnValue(mockNavigate);
    getAuth.mockReturnValue({ /* mock auth object */ });
    onAuthStateChanged.mockReturnValue(mockUnsubscribe);
  });

  it("shows loading spinner initially", () => {
    // Don't trigger the auth callback immediately
    render(
      <UserAuthContextProvider>
        <TestConsumer />
      </UserAuthContextProvider>
    );
    
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("user-value")).not.toBeInTheDocument();
  });

  it("sets user correctly when user is authenticated with verified email", async () => {
    // Mock authenticated user
    const mockUser = { uid: "123", email: "user@example.com", emailVerified: true };
    
    // Trigger the callback immediately with a verified user
    onAuthStateChanged.mockImplementation((auth, callback) => {
      setTimeout(() => callback(mockUser), 0);
      return mockUnsubscribe;
    });
    
    render(
      <UserAuthContextProvider>
        <TestConsumer />
      </UserAuthContextProvider>
    );
    
    // Wait for loading state to resolve
    await waitFor(() => {
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
    });
    
    // Check user value
    expect(screen.getByTestId("user-value").textContent).toContain("user@example.com");
  });

  it("sets user to null when email is not verified", async () => {
    // Mock unverified user
    const mockUser = { uid: "123", email: "unverified@example.com", emailVerified: false };
    
    onAuthStateChanged.mockImplementation((auth, callback) => {
      setTimeout(() => callback(mockUser), 0);
      return mockUnsubscribe;
    });
    
    render(
      <UserAuthContextProvider>
        <TestConsumer />
      </UserAuthContextProvider>
    );
    
    // Wait for loading state to resolve
    await waitFor(() => {
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
    });
    
    // Should be null (displayed as "no user")
    expect(screen.getByTestId("user-value").textContent).toBe("no user");
  });

  it("sets user to null when not authenticated", async () => {
    // Mock no user (null)
    onAuthStateChanged.mockImplementation((auth, callback) => {
      setTimeout(() => callback(null), 0);
      return mockUnsubscribe;
    });
    
    render(
      <UserAuthContextProvider>
        <TestConsumer />
      </UserAuthContextProvider>
    );
    
    // Wait for loading state to resolve
    await waitFor(() => {
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
    });
    
    // Should be null (displayed as "no user")
    expect(screen.getByTestId("user-value").textContent).toBe("no user");
  });

  it("provides a working setUser function", async () => {
    // Start with no user
    onAuthStateChanged.mockImplementation((auth, callback) => {
      setTimeout(() => callback(null), 0);
      return mockUnsubscribe;
    });
    
    render(
      <UserAuthContextProvider>
        <TestConsumer />
      </UserAuthContextProvider>
    );
    
    // Wait for loading state to resolve
    await waitFor(() => {
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
    });
    
    // Initial state - no user
    expect(screen.getByTestId("user-value").textContent).toBe("no user");
    
    // Manually set user using context function
    userEvent.click(screen.getByTestId("set-user-button"));
    
    // User should be updated
    expect(screen.getByTestId("user-value").textContent).toContain("test@example.com");
  });

  it("unsubscribes from auth on unmount", async () => {
    onAuthStateChanged.mockImplementation((auth, callback) => {
      setTimeout(() => callback(null), 0);
      return mockUnsubscribe;
    });
    
    const { unmount } = render(
      <UserAuthContextProvider>
        <TestConsumer />
      </UserAuthContextProvider>
    );
    
    // Wait for loading state to resolve
    await waitFor(() => {
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
    });
    
    // Unmount component
    unmount();
    
    // Verify unsubscribe was called
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});