import React from 'react';
import { screen, fireEvent, waitFor, render } from "@testing-library/react";
import SignUpForm from "../../components/forms/SignUpForm";
import { BrowserRouter as Router } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";
import { AlertContext } from "../../Context/AlertContext";

jest.mock("firebase/auth");

const mockShowAlert = jest.fn();

jest.mock("../../environments/firebaseConfig", () => {
  const mockAuth = {};
  return {
    auth: mockAuth,
  };
});

const renderComponent = () => {
  return render(
    <Router>
      <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
        <SignUpForm />
      </AlertContext.Provider>
    </Router>
  );
};

describe("SignUpForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows error when username is less than 2 characters", () => {
    // Arrange
    renderComponent();
    const usernameInput = screen.getByPlaceholderText("Username");

    // Act
    fireEvent.change(usernameInput, { target: { value: "a" } });
    fireEvent.blur(usernameInput);

    // Assert
    expect(
      screen.getByText(/Username must be greater than 2 characters./i)
    ).toBeInTheDocument();
  });

  test("shows error when email is invalid", () => {
    // Arrange
    renderComponent();
    const emailInput = screen.getByPlaceholderText("your@email.com");

    // Act
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.blur(emailInput);

    // Assert
    expect(
      screen.getByText(/Please enter a valid email./i)
    ).toBeInTheDocument();
  });

  test("shows error when password is less than 10 characters", () => {
    // Arrange
    renderComponent();
    const passwordInput = screen.getByPlaceholderText("Enter your password");

    // Act
    fireEvent.change(passwordInput, { target: { value: "short" } });
    fireEvent.blur(passwordInput);

    // Assert
    expect(
      screen.getByText(/Please enter a password of 10 characters or more./i)
    ).toBeInTheDocument();
  });

  test("shows error when passwords do not match", async () => {
    // Arrange
    renderComponent();
    const passwordInput = screen.getByPlaceholderText("Enter your password");
    const confirmPasswordInput = screen.getByPlaceholderText(
      "Confirm your password"
    );

    // Act
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "different123" },
    });
    fireEvent.submit(screen.getByTestId("email-signup-button"));

    // Assert
    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        "Error",
        "The passwords you entered do not match. Please make sure both fields have the same password."
      );
    });
  });

  test("shows error when required fields are empty", async () => {
    // Arrange
    renderComponent();

    // Act
    fireEvent.submit(screen.getByTestId("email-signup-button"));

    // Assert
    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        "Error",
        "Please fill out all of the fields."
      );
    });
  });

  test("disables the Sign Up button while submitting", async () => {
    // Arrange
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: { email: "test@example.com" },
    });
    renderComponent();
    const usernameInput = screen.getByPlaceholderText("Username");
    const emailInput = screen.getByPlaceholderText("your@email.com");
    const passwordInput = screen.getByPlaceholderText("Enter your password");
    const confirmPasswordInput = screen.getByPlaceholderText(
      "Confirm your password"
    );
    const signUpButton = screen.getByTestId("email-signup-button");

    // Act
    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "password123" },
    });
    fireEvent.click(signUpButton);

    // Assert
    await waitFor(() => {
      expect(signUpButton).toBeDisabled();
    });

    await waitFor(() => {
      expect(signUpButton).not.toBeDisabled();
    });
  });

  test("calls Firebase sign-up with email and password", async () => {
    // Arrange
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: { email: "test@example.com" },
    });
    renderComponent();
    const usernameInput = screen.getByPlaceholderText("Username");
    const emailInput = screen.getByPlaceholderText("your@email.com");
    const passwordInput = screen.getByPlaceholderText("Enter your password");
    const confirmPasswordInput = screen.getByPlaceholderText(
      "Confirm your password"
    );
    const signUpButton = screen.getByTestId("email-signup-button");

    // Act
    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "password123" },
    });
    fireEvent.click(signUpButton);

    // Assert
    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.any(Object), // The auth object
        "test@example.com",
        "password123"
      );
    });
  });

  test("disables the Google Sign Up button while submitting", async () => {
    // Arrange
    (signInWithPopup as jest.Mock).mockResolvedValue({
      user: { email: "test@example.com" },
    });
    renderComponent();
    const googleSignUpButton = screen.getByTestId("google-signup-button");

    // Act
    fireEvent.click(googleSignUpButton);

    // Assert
    expect(googleSignUpButton).toBeDisabled();
    await waitFor(() => {
      expect(googleSignUpButton).not.toBeDisabled();
    });
  });

  test("calls Firebase Google sign-up", async () => {
    // Arrange
    const mockProvider = {}; // Mock GoogleAuthProvider instance
    (signInWithPopup as jest.Mock).mockResolvedValue({
      user: { email: "test@example.com" },
    });
    (GoogleAuthProvider as jest.Mock).mockImplementation(() => mockProvider);
    renderComponent();
    const googleSignUpButton = screen.getByTestId("google-signup-button");

    // Act
    fireEvent.click(googleSignUpButton);

    // Assert
    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalledWith(
        expect.any(Object),
        mockProvider
      );
    });
  });
});
