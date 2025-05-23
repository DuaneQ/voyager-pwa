import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { ProfileForm } from "../../components/forms/ProfileForm";
import { UserProfileContext } from "../../Context/UserProfileContext";
import { AlertContext } from "../../Context/AlertContext";
import { auth } from "../../environments/firebaseConfig";
import { signOut, onAuthStateChanged } from "firebase/auth";

jest.mock("firebase/auth", () => ({
  signOut: jest.fn(),
  getAuth: jest.fn(() => ({})),
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
    delete window.location; // Delete the existing `window.location` object
    window.location = { href: "" }; // Mock `window.location.href`
    (onAuthStateChanged as jest.Mock).mockImplementation((auth, callback) => {
      // Call the callback with a mock user object
      callback({ uid: "12345" });

      // Return a mock unsubscribe function
      return jest.fn();
    });
  });

  test("should render the profile form with user details", () => {
    renderComponent();

    // Assert that user details are displayed
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

    // Assert that the modal is opened by checking for a unique element inside the modal
    const modalHeading = screen.getByRole("heading", { name: /edit profile/i });
    expect(modalHeading).toBeInTheDocument();
  });

  test("should log out the user when the logout button is clicked", async () => {
    renderComponent();

    const logoutButton = screen.getByRole("button", { name: /logout/i });
    fireEvent.click(logoutButton);

    // Assert that signOut is called
    await waitFor(() => {
      expect(signOut).toHaveBeenCalledWith(auth);
    });

    // Assert that the user is redirected to the login page
    expect(window.location.href).toBe("/login");
  });
});
