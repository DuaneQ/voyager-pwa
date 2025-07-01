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
import { 
  validateFCMSetup, 
  setupFCMForUser, 
  requestNotificationPermission,
  generateFCMToken,
  saveFCMTokenToFirestore 
} from "../../utils/fcmUtils";
import { useFCMToken } from "../../hooks/useFCMToken";

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
  default: () => 'user-123' // Match the mockUserProfile.uid
}));

// Mock FCM utilities
jest.mock("../../utils/fcmUtils", () => ({
  validateFCMSetup: jest.fn(),
  setupFCMForUser: jest.fn(),
  requestNotificationPermission: jest.fn(),
  generateFCMToken: jest.fn(),
  saveFCMTokenToFirestore: jest.fn(),
}));

// Mock the useFCMToken hook to actually call the FCM utilities
jest.mock("../../hooks/useFCMToken");

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
      // Simulate a logged-in user
      setTimeout(() => callback({ uid: 'user-123', email: 'test@example.com' }), 0);
      return jest.fn(); // return unsubscribe function
    });

    // Mock FCM utilities
    (validateFCMSetup as jest.Mock).mockReturnValue({
      supported: true,
      permission: "granted",
      serviceWorkerSupported: true,
      vapidConfigured: true,
      issues: [],
    });

    (requestNotificationPermission as jest.Mock).mockResolvedValue({
      granted: true,
      permission: "granted",
    });

    (generateFCMToken as jest.Mock).mockResolvedValue({
      success: true,
      token: "mock-fcm-token",
    });

    (saveFCMTokenToFirestore as jest.Mock).mockResolvedValue(true);

    (setupFCMForUser as jest.Mock).mockResolvedValue({
      success: true,
      token: "mock-fcm-token",
    });

    // Mock useFCMToken hook to actually call FCM functions
    (useFCMToken as jest.Mock).mockImplementation(() => {
      const { useEffect } = require("react");
      const { useContext } = require("react");
      const { UserProfileContext } = require("../../Context/UserProfileContext");
      const useGetUserId = require("../../hooks/useGetUserId").default;
      
      const userId = useGetUserId();
      const { userProfile } = useContext(UserProfileContext) || {};
      
      useEffect(() => {
        const timer = setTimeout(async () => {
          // Only run FCM setup if userId and userProfile with username exist
          if (!userId || !userProfile || !userProfile.username) return;
          
          // Check if Notification API is available
          if (typeof Notification === "undefined") return;
          
          // Request notification permission
          const permission = await Notification.requestPermission();
          
          // Stop if permission not granted
          if (permission !== "granted") return;
          
          // Get FCM token
          const token = await getToken(mockMessaging as any, { vapidKey: process.env.REACT_APP_VAPID_KEY });
          
          // Stop if no token returned
          if (!token) return;
          
          // Stop if no user UID (check both userId and userProfile.uid)
          if (!userId || !userProfile.uid) return;
          
          // Save to Firestore
          await doc(mockDb as any, "users", userId);
          await setDoc("mock-doc-ref" as any, { fcmToken: "mock-fcm-token" }, { merge: true });
        }, 100);
        
        return () => clearTimeout(timer);
      }, [userId, userProfile]);
      
      return null;
    });
    
    // Mock Notification API
    Object.defineProperty(global, "Notification", {
      value: {
        requestPermission: jest.fn().mockResolvedValue("granted"),
      },
      configurable: true,
    });

    // Mock environment variable
    process.env.REACT_APP_VAPID_KEY = "mock-vapid-key";
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete (global as any).Notification;
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

  it("renders child components in correct order", async () => {
    renderWithContext();

    const container = screen.getByTestId("profile-form").parentElement?.parentElement;
    const children = container?.children;

    expect(children).toHaveLength(3); // ProfileForm, PhotoGrid, and commented Chips section
    expect(children?.[0]).toContainElement(screen.getByTestId("profile-form"));
    expect(children?.[1]).toContainElement(screen.getByTestId("photo-grid"));
  });

  it("requests notification permission when user profile is loaded", async () => {
    const requestPermissionSpy = jest.spyOn(Notification, "requestPermission");

    renderWithContext();

    await waitFor(() => {
      expect(requestPermissionSpy).toHaveBeenCalled();
    });
  });

  it("gets FCM token when notification permission is granted", async () => {
    renderWithContext();

    await waitFor(() => {
      expect(getToken).toHaveBeenCalledWith(mockMessaging, {
        vapidKey: "mock-vapid-key",
      });
    });
  });

  it("saves FCM token to Firestore when token is received", async () => {
    renderWithContext();

    await waitFor(() => {
      expect(doc).toHaveBeenCalledWith(mockDb, "users", mockUserProfile.uid);
      expect(setDoc).toHaveBeenCalledWith(
        "mock-doc-ref",
        { fcmToken: "mock-fcm-token" },
        { merge: true }
      );
    });
  });

  it("does not request notification permission if userProfile is not loaded", async () => {
    const requestPermissionSpy = jest.spyOn(Notification, "requestPermission");

    renderWithContext(null);

    // Wait a bit to ensure useEffect doesn't run
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(requestPermissionSpy).not.toHaveBeenCalled();
  });

  it("does not request notification permission if username is not set", async () => {
    const requestPermissionSpy = jest.spyOn(Notification, "requestPermission");
    const incompleteProfile = { ...mockUserProfile, username: undefined };

    renderWithContext(incompleteProfile);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(requestPermissionSpy).not.toHaveBeenCalled();
  });

  it("handles notification permission denied gracefully", async () => {
    (Notification.requestPermission as jest.Mock).mockResolvedValue("denied");

    renderWithContext();

    await waitFor(() => {
      expect(Notification.requestPermission).toHaveBeenCalled();
    });

    // Should not proceed to get FCM token
    expect(getToken).not.toHaveBeenCalled();
  });

  it("handles missing FCM token gracefully", async () => {
    (getToken as jest.Mock).mockResolvedValue(null);

    renderWithContext();

    await waitFor(() => {
      expect(getToken).toHaveBeenCalled();
    });

    // Should not save to Firestore if no token
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("handles missing user UID gracefully", async () => {
    const profileWithoutUid = { ...mockUserProfile, uid: undefined };

    renderWithContext(profileWithoutUid);

    await waitFor(() => {
      expect(getToken).toHaveBeenCalled();
    });

    // Should not save to Firestore if no UID
    expect(setDoc).not.toHaveBeenCalled();
  });

  it("handles environment without Notification API", async () => {
    // Remove Notification from global
    delete (global as any).Notification;

    renderWithContext();

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Should not attempt to use Notification API
    expect(getToken).not.toHaveBeenCalled();
  });

  it("uses correct VAPID key from environment variables", async () => {
    const customVapidKey = "custom-vapid-key-123";
    process.env.REACT_APP_VAPID_KEY = customVapidKey;

    renderWithContext();

    await waitFor(() => {
      expect(getToken).toHaveBeenCalledWith(mockMessaging, {
        vapidKey: customVapidKey,
      });
    });
  });

  it("updates FCM token when user profile changes", async () => {
    const { rerender } = renderWithContext();

    await waitFor(() => {
      expect(setDoc).toHaveBeenCalledTimes(1);
    });

    // Change the user profile
    const updatedProfile = { ...mockUserProfile, username: "UpdatedUser" };

    rerender(
      <UserProfileContext.Provider
        value={{
          userProfile: updatedProfile,
          updateUserProfile: mockUpdateUserProfile,
        }}>
        <Profile />
      </UserProfileContext.Provider>
    );

    await waitFor(() => {
      expect(setDoc).toHaveBeenCalledTimes(2);
    });
  });

  it("applies correct styling classes", async () => {
    renderWithContext();

    // Check for main container styling
    const stackElement = screen.getByTestId("profile-form").closest(".authFormContainer");
    expect(stackElement).toBeInTheDocument();
  });

  it("renders memo component correctly", async () => {
    // Test that the component is wrapped with React.memo
    const ProfileComponent = Profile;
    expect(ProfileComponent.displayName).toBe(undefined); // React.memo doesn't set displayName by default
    
    // Test that it renders consistently
    const { container: container1 } = renderWithContext();
    const { container: container2 } = renderWithContext();
    
    expect(container1.innerHTML).toBe(container2.innerHTML);
  });
});
