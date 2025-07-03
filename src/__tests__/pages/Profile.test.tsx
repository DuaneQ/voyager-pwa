import React from "react";
import {
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import { Profile } from "../../components/pages/Profile";
import { UserProfileContext } from "../../Context/UserProfileContext";
import { getMessaging, getToken } from "firebase/messaging";
import { doc, getFirestore, setDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

// Mock Firebase messaging and firestore
jest.mock("firebase/messaging");
jest.mock("firebase/firestore");
jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(),
  onAuthStateChanged: jest.fn()
}));
jest.mock("../../environments/firebaseConfig", () => ({
  app: {},
}));

// Mock hooks
jest.mock("../../hooks/useGetUserId", () => ({
  __esModule: true,
  default: () => 'user-123'
}));

// Mock the useFCMToken hook
jest.mock("../../hooks/useFCMToken", () => ({
  useFCMToken: jest.fn()
}));

// Mock child components
jest.mock("../../components/forms/ProfileForm", () => {
  return {
    ProfileForm: function MockProfileForm() {
      return <div data-testid="profile-form">Profile Form</div>;
    },
  };
});

jest.mock("../../components/forms/PhotoGrid", () => {
  return {
    PhotoGrid: function MockPhotoGrid() {
      return <div data-testid="photo-grid">Photo Grid</div>;
    },
  };
});

// Add mock for Notification API
Object.defineProperty(window, 'Notification', {
  value: {
    permission: 'default',
    requestPermission: jest.fn().mockResolvedValue('granted'),
  },
  writable: true,
});

describe("Profile Component", () => {
  const mockUserProfile = {
    uid: "user-123",
    username: "TestUser",
    email: "test@example.com",
    bio: "Test bio",
    photos: ["photo1.jpg", "photo2.jpg"],
    dob: "1990-01-01",
    gender: "Male",
  };

  const mockUpdateUserProfile = jest.fn();
  const mockMessaging = { app: "mock-app" };
  const mockDb = { _id: "mock-db" };

  beforeEach(() => {
    // Mock Firebase functions
    (getMessaging as jest.Mock).mockReturnValue(mockMessaging);
    (getFirestore as jest.Mock).mockReturnValue(mockDb);
    (doc as jest.Mock).mockReturnValue("mock-doc-ref");
    (setDoc as jest.Mock).mockResolvedValue({});
    (getToken as jest.Mock).mockResolvedValue("mock-fcm-token");

    // Mock Firebase Auth
    (getAuth as jest.Mock).mockReturnValue({});
    (onAuthStateChanged as jest.Mock).mockImplementation((auth, callback) => {
      setTimeout(() => callback({ uid: 'user-123', email: 'test@example.com' }), 0);
      return jest.fn();
    });

    // Mock environment variable
    process.env.REACT_APP_VAPID_KEY = "mock-vapid-key";
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.REACT_APP_VAPID_KEY;
  });

  const renderWithContext = (userProfile: any = mockUserProfile) => {
    return render(
      <UserProfileContext.Provider
        value={{
          userProfile,
          updateUserProfile: mockUpdateUserProfile,
        }}>
        <Profile />
      </UserProfileContext.Provider>
    );
  };

  it("renders the profile page correctly", async () => {
    renderWithContext();

    expect(screen.getByTestId("profile-form")).toBeInTheDocument();
    expect(screen.getByTestId("photo-grid")).toBeInTheDocument();
  });

  test("renders child components in correct order", () => {
    renderWithContext();

    // Use the existing class instead of data-testid
    const container = document.querySelector(".authFormContainer");
    const children = container?.children;

    // Updated to expect 3 children (2 components + 1 empty Box)
    expect(children).toHaveLength(3);

    // ProfileForm is first (index 0)
    expect(children?.[0]).toContainElement(screen.getByTestId("profile-form"));
    
    // PhotoGrid is second (index 1)
    expect(children?.[1]).toContainElement(screen.getByTestId("photo-grid"));
    
    // Empty Box is third (index 2)
    expect(children?.[2]).toBeEmptyDOMElement();
  });

  it("handles environment without Notification API", () => {
    // Temporarily remove Notification API
    const originalNotification = window.Notification;
    delete (window as any).Notification;

    try {
      renderWithContext();
      
      // Should render without crashing
      expect(screen.getByTestId("profile-form")).toBeInTheDocument();
      expect(screen.getByTestId("photo-grid")).toBeInTheDocument();
      
    } finally {
      // Restore Notification API
      window.Notification = originalNotification;
    }
  });

  it("applies correct styling classes", async () => {
    renderWithContext();

    // Check for main container styling
    const stackElement = screen.getByTestId("profile-form").closest(".authFormContainer");
    expect(stackElement).toBeInTheDocument();
  });

  it("renders memo component correctly", async () => {
    // Test that it renders consistently
    const { container: container1 } = renderWithContext();
    const { container: container2 } = renderWithContext();
    
    expect(container1.innerHTML).toBe(container2.innerHTML);
  });

  // Simplified FCM-related tests since we're mocking useFCMToken
  it("calls useFCMToken hook", () => {
    const { useFCMToken } = require("../../hooks/useFCMToken");
    renderWithContext();
    expect(useFCMToken).toHaveBeenCalled();
  });
});
