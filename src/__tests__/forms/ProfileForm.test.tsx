import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ProfileForm } from "../../components/forms/ProfileForm";
import { UserProfileContext } from "../../Context/UserProfileContext";
import { AlertContext } from "../../Context/AlertContext";
import { auth } from "../../environments/firebaseConfig";
import { signOut, onAuthStateChanged, getAuth } from "firebase/auth";

// Mock the firebase config module to provide mock Firebase objects
jest.mock("../../environments/firebaseConfig", () => ({
  app: {}, // Mock Firebase app
  auth: {
    currentUser: { uid: "test-uid" }
  },
  db: {}, // Mock Firestore
  storage: {}, // Mock Storage
  getMessagingInstance: jest.fn()
}));

// Mock the useTravelPreferences hook
jest.mock("../../hooks/useTravelPreferences", () => ({
  useTravelPreferences: () => ({
    preferences: null,
    loading: false,
    error: null,
    loadPreferences: jest.fn(),
    savePreferences: jest.fn(),
    createProfile: jest.fn(),
    updateProfile: jest.fn(),
    deleteProfile: jest.fn(),
    getDefaultProfile: jest.fn(),
    resetError: jest.fn(),
  })
}));

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock("firebase/firestore", () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  getDocs: jest.fn().mockResolvedValue({ docs: [] }),
  where: jest.fn(),
  query: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn().mockResolvedValue({ exists: () => false }),
}));

jest.mock("firebase/storage", () => ({
  getStorage: jest.fn(() => ({})),
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
}));

jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(() => ({})),
}));

describe("ProfileForm", () => {
  const mockUserProfile = {
    username: "TestUser",
    bio: "This is a test bio",
    dob: "1990-01-01",
    gender: "Male",
    sexualOrientation: "Heterosexual",
    edu: "GED",
    drinking: "Occasionally",
    smoking: "Never",
    status: "single", // Add status field
  };

  const mockUpdateUserProfile = jest.fn();
  const mockShowAlert = jest.fn();

  const renderComponent = () => {
    return render(
      <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
        <UserProfileContext.Provider
          value={{
            userProfile: mockUserProfile,
            updateUserProfile: mockUpdateUserProfile,
          }}>
          <BrowserRouter>
            <ProfileForm />
          </BrowserRouter>
        </UserProfileContext.Provider>
      </AlertContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock window.location.assign to prevent jsdom navigation error
    Object.defineProperty(window, "location", {
      value: {
        ...window.location,
        assign: jest.fn(),
      },
      writable: true,
    });

    // Mock localStorage for USER_CREDENTIALS
    Storage.prototype.getItem = jest.fn((key) => {
      if (key === "USER_CREDENTIALS") {
        return JSON.stringify({ user: { uid: "test-uid" } });
      }
      return null;
    });

    (onAuthStateChanged as jest.Mock).mockImplementation((auth, callback) => {
      callback({ uid: "test-uid" });
      return jest.fn();
    });
  });

  test("should render the profile form with user details", () => {
    renderComponent();
    expect(screen.getByText("TestUser")).toBeInTheDocument();
    expect(screen.getByText("This is a test bio")).toBeInTheDocument();
    expect(screen.getByText("36")).toBeInTheDocument();
    expect(screen.getByText("Male")).toBeInTheDocument();
    expect(screen.getByText("Heterosexual")).toBeInTheDocument();
    expect(screen.getByText("GED")).toBeInTheDocument();
    expect(screen.getByText("Occasionally")).toBeInTheDocument();
    // Use getAllByText for "Never" since it appears multiple times (smoking field + activity sliders)
    expect(screen.getAllByText("Never").length).toBeGreaterThan(0);
    expect(screen.getByText("single")).toBeInTheDocument();
  });

  test("should open the EditProfileModal when 'Edit Profile' menu item is clicked", () => {
    renderComponent();
    // Click the menu icon button first
    const menuButton = screen.getByRole("button", { name: /more options/i });
    fireEvent.click(menuButton);

    // Now click the Edit Profile menu item
    const editProfileMenuItem = screen.getByRole("menuitem", { name: /edit profile/i });
    fireEvent.click(editProfileMenuItem);
    
    const modalHeading = screen.getByRole("heading", { name: /edit profile/i });
    expect(modalHeading).toBeInTheDocument();
  });

  test("should log out the user when the logout menu item is clicked", async () => {
    renderComponent();
    // Click the menu icon button first
    const menuButton = screen.getByRole("button", { name: /more options/i });
    fireEvent.click(menuButton);

    // Now click the logout menu item
    const logoutMenuItem = screen.getByRole("menuitem", { name: /logout/i });
    fireEvent.click(logoutMenuItem);

    await waitFor(() => {
      expect(signOut).toHaveBeenCalledWith(auth);
    });
  });
});
