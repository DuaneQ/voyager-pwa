import { screen, fireEvent, waitFor, render } from "@testing-library/react";
import SignUpForm from "../../components/forms/SignUpForm";
import { BrowserRouter as Router } from "react-router-dom";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { AlertContext } from "../../Context/AlertContext";

jest.mock("firebase/auth");

const mockShowAlert = jest.fn();

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
    renderComponent();
    const usernameInput = screen.getByLabelText(/Username/i);
    fireEvent.change(usernameInput, { target: { value: "a" } });
    fireEvent.blur(usernameInput);
    expect(
      screen.getByText(/Username must be greater than 2 characters./i)
    ).toBeInTheDocument();
  });

  test("shows error when email is invalid", () => {
    renderComponent();
    const emailInput = screen.getByLabelText(/Email/i);
    fireEvent.change(emailInput, { target: { value: "invalid-email" } });
    fireEvent.blur(emailInput);
    expect(
      screen.getByText(/Please enter a valid email./i)
    ).toBeInTheDocument();
  });

  test("shows error when password is less than 10 characters", () => {
    renderComponent();
    const passwordInput = screen.getByPlaceholderText("Enter your password");
    fireEvent.change(passwordInput, { target: { value: "short" } });
    fireEvent.blur(passwordInput);
    expect(
      screen.getByText(/Please enter a password of 10 characters or more./i)
    ).toBeInTheDocument();
  });

  test("shows error when passwords do not match", async () => {
    renderComponent();
    const passwordInput = screen.getByPlaceholderText("Enter your password");
    const confirmPasswordInput = screen.getByPlaceholderText(
      "Confirm your password"
    );
    fireEvent.change(passwordInput, { target: { value: "password123" } });
    fireEvent.change(confirmPasswordInput, {
      target: { value: "different123" },
    });
    fireEvent.submit(screen.getByRole("button", { name: /Sign up/i }));
    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        "Error",
        "The passwords you entered do not match. Please make sure both fields have the same password."
      );
    });
  });

  test("shows error when fields are empty", async () => {
    renderComponent();
    fireEvent.submit(screen.getByRole("button", { name: /Sign up/i }));
    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        "Error",
        "Please fill out all of the fields."
      );
    });
  });
  
  test("Verify input field values match the user input on submit", async () => {
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: { email: "test@example.com" },
    });
    renderComponent();
    const usernameInput = screen.getByLabelText(/Username/i);
    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByPlaceholderText("Enter your password");
    const confirmPasswordInput = screen.getByPlaceholderText(
      "Confirm your password"
    );
    fireEvent.change(usernameInput, { target: { value: "testuser" } });
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "1111111111" } });
    fireEvent.change(confirmPasswordInput, { target: { value: "1111111111" } });
    fireEvent.submit(screen.getByRole("button", { name: /Sign up/i }));
    await waitFor(() => {
      expect(usernameInput).toHaveValue("testuser");
      expect(emailInput).toHaveValue("test@example.com");
      expect(passwordInput).toHaveValue("1111111111");
      expect(confirmPasswordInput).toHaveValue("1111111111");
    });
  });
});
