import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ProfileForm } from "../../components/forms/ProfileForm";
import { UserProfileContext } from "../../Context/UserProfileContext";
import { AlertContext } from "../../Context/AlertContext";
import { auth } from "../../environments/firebaseConfig";
import { signOut, onAuthStateChanged, getAuth } from "firebase/auth";

// Mock firebase/auth
jest.mock("firebase/auth", () => ({
  signOut: jest.fn(),
  getAuth: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

describe("ProfileForm", () => {
  const mockUserProfile = {
    username: "TestUser",
    bio: "This is a test bio",
    dob: "1990-01-01",
    gender: "Male",
    sexo: "Heterosexual",
    edu: "GED",
    drinking: "Occasionally",
    smoking: "Never",
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

    // Mock Firebase Auth currentUser
    const mockAuth = { currentUser: { uid: "test-uid" } };
    (getAuth as jest.Mock).mockReturnValue(mockAuth);

    (onAuthStateChanged as jest.Mock).mockImplementation((auth, callback) => {
      callback({ uid: "test-uid" });
      return jest.fn();
    });
  });

  test("should render the profile form with user details", () => {
    renderComponent();
    expect(screen.getByText("TestUser")).toBeInTheDocument();
    expect(screen.getByDisplayValue("This is a test bio")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1990-01-01")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Male")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Heterosexual")).toBeInTheDocument();
    expect(screen.getByDisplayValue("GED")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Occasionally")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Never")).toBeInTheDocument();
  });

  test("should open the EditProfileModal when 'Edit Profile' button is clicked", () => {
    renderComponent();
    const editProfileButton = screen.getByRole("button", {
      name: /edit profile/i,
    });
    fireEvent.click(editProfileButton);
    const modalHeading = screen.getByRole("heading", { name: /edit profile/i });
    expect(modalHeading).toBeInTheDocument();
  });

  test("should log out the user when the logout button is clicked", async () => {
    renderComponent();
    const logoutButton = screen.getByRole("button", { name: /logout/i });
    fireEvent.click(logoutButton);
    await waitFor(() => {
      expect(signOut).toHaveBeenCalledWith(auth);
    });
  });
});
