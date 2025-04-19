import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import SignInForm from "../../components/forms/SignInForm";
import { AlertContext } from "../../Context/AlertContext";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => ({})), // Mock getAuth to return an empty object
  signInWithEmailAndPassword: jest.fn(),
  signInWithPopup: jest.fn(),
  GoogleAuthProvider: jest.fn(),
}));

describe("SignInForm", () => {
  const mockShowAlert = jest.fn();

  const renderComponent = () => {
    return render(
      <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
        <BrowserRouter>
          <SignInForm />
        </BrowserRouter>
      </AlertContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete window.location; // Delete the existing `window.location` object
    window.location = { href: "" }; // Mock `window.location.href`
  });

  test("should render the form with email and password fields", () => {
    renderComponent();

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByTestId("email-signin-button")).toBeInTheDocument(); // Use test id
  });

  test("should show an error alert if email or password is missing", async () => {
    renderComponent();

    const signInButton = screen.getByTestId("email-signin-button"); // Use test id
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        "Error",
        "Please enter your email and password."
      );
    });
  });

  test("should show an alert if email is not verified", async () => {
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({
      user: {
        emailVerified: false,
        reload: jest.fn(),
      },
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });

    const signInButton = screen.getByTestId("email-signin-button"); // Use test id
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        "Email not verified",
        "Your email has not been verified. Please check your inbox or spam folder, or click the link below to resend another verification email."
      );
    });
  });

  test("should navigate to the home page if email is verified", async () => {
    const mockReload = jest.fn();
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValueOnce({
      user: {
        emailVerified: true,
        reload: mockReload,
      },
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "password123" },
    });

    const signInButton = screen.getByTestId("email-signin-button"); // Use test id
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(mockReload).toHaveBeenCalled();
      expect(window.location.href).toBe("/");
    });
  });

  test("should show an error alert if signInWithEmailAndPassword fails", async () => {
    (signInWithEmailAndPassword as jest.Mock).mockRejectedValueOnce({
      message: "Invalid email or password",
    });

    renderComponent();

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "wrongpassword" },
    });

    const signInButton = screen.getByTestId("email-signin-button"); // Use test id
    fireEvent.click(signInButton);

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        "Error",
        "An unknown error occurred."
      );
    });
  });

  test("should disable the Google Sign In button while submitting", async () => {
    (signInWithPopup as jest.Mock).mockResolvedValueOnce({
      user: { email: "test@example.com", emailVerified: true },
    });

    renderComponent();

    const googleSignInButton = screen.getByTestId("google-signin-button"); // Use test id
    fireEvent.click(googleSignInButton);

    // Assert that the button is disabled during submission
    expect(googleSignInButton).toBeDisabled();

    await waitFor(() => {
      expect(googleSignInButton).not.toBeDisabled();
    });
  });

  test("should call Firebase Google sign-in", async () => {
    const mockProvider = {}; // Mock GoogleAuthProvider instance
    (signInWithPopup as jest.Mock).mockResolvedValueOnce({
      user: { email: "test@example.com", emailVerified: true },
    });
    (GoogleAuthProvider as jest.Mock).mockImplementation(() => mockProvider);

    renderComponent();

    const googleSignInButton = screen.getByTestId("google-signin-button"); // Use test id
    fireEvent.click(googleSignInButton);

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalledWith(
        expect.any(Object),
        mockProvider
      );
    });
  });

  test("should show an error alert if Google sign-in fails", async () => {
    (signInWithPopup as jest.Mock).mockRejectedValueOnce({
      message: "Google sign-in failed",
    });

    renderComponent();

    const googleSignInButton = screen.getByTestId("google-signin-button"); // Use test id
    fireEvent.click(googleSignInButton);

    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        "Error",
        "An unknown error occurred."
      );
    });
  });
});
