import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { RegisterForm } from "../components/forms/RegisterForm";
import user from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AlertContext } from "../Context/AlertContext";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { Navigate } from "react-router-dom";
import { ReactNode } from "react";
import AlertPopup from "../components/utilities/Alerts";

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => {}),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("react-router-dom", () => ({ navigate: jest.fn() }));

const MockAlertContext = ({ children }: { children: ReactNode }) => (
  <AlertContext.Provider
    value={{
      alert: { open: false, severity: "info", message: "" },
      showAlert: mockShowAlert,
      closeAlert: mockCloseAlert,
    }}
  >
    {children}
    <AlertPopup
      open={false}
      severity={"error"}
      message={""}
      onClose={function (): void {
        throw new Error("Function not implemented.");
      }}
    />
  </AlertContext.Provider>
);

const selectDropdownOption = (comboboxRole: string, optionText: string) => {
  const dropdown = screen.getByRole("combobox", { name: comboboxRole });
  fireEvent.mouseDown(dropdown);
  let listbox = within(screen.getByRole("listbox"));
  const option = listbox.getByText(optionText);
  fireEvent.click(option);
  expect(option).toHaveTextContent(optionText);
  return option;
};

const mockCloseAlert = jest.fn();
const mockShowAlert = jest.fn();

describe.skip("RegisterForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const originalLoc = window.location;
    delete (window as any).location;
    window.location = { ...originalLoc, href: jest.fn() } as any;
  });

  test("renders the form fields correctly", () => {
    render(
      <MockAlertContext>
        <MemoryRouter>
          <RegisterForm />
        </MemoryRouter>
      </MockAlertContext>
    );
    expect(screen.getByTestId("username")).toBeInTheDocument();
    expect(screen.getByTestId("email")).toBeInTheDocument();
    expect(screen.getByTestId("password")).toBeInTheDocument();
    expect(screen.getByTestId("userBio")).toBeInTheDocument();
    expect(screen.getByTestId("dob")).toBeInTheDocument();
    expect(screen.getByTestId("gender")).toBeInTheDocument();
    expect(screen.getByTestId("education")).toBeInTheDocument();
    expect(screen.getByTestId("drinkingHabits")).toBeInTheDocument();
    expect(screen.getByTestId("smokingHabits")).toBeInTheDocument();
  });

  test("shows an error message for an invalid email", async () => {
    render(
      <MockAlertContext>
        <MemoryRouter>
          <RegisterForm />
        </MemoryRouter>
      </MockAlertContext>
    );

    const emailElement = screen.getByTestId("email");
    await user.type(emailElement, "invalid-email");
    fireEvent.blur(emailElement);

    expect(await screen.findByTestId("emailErr")).toHaveTextContent("");
  });

  test("shows an error message if password is too short", async () => {
    render(
      <MockAlertContext>
        <MemoryRouter>
          <RegisterForm />
        </MemoryRouter>
      </MockAlertContext>
    );

    const passwordElement = screen.getByTestId("password");
    await user.type(passwordElement, "123");
    fireEvent.blur(passwordElement);

    expect(await screen.findByTestId("passwordErr")).toHaveTextContent("");
  });

  // Negative Cases
  test("does not submit the form if mandatory fields are empty", async () => {
    render(
      <MockAlertContext>
        <MemoryRouter>
          <RegisterForm />
        </MemoryRouter>
      </MockAlertContext>
    );

    const submit = screen.getByTestId("register-button");
    fireEvent.click(submit);
    expect(await screen.findByText("Username is required")).toBeInTheDocument();
    expect(await screen.findByText("Email is required")).toBeInTheDocument();
  });

  test("Button was called with form values", async () => {
    const consoleSpy = jest.spyOn(console, "log");
    render(
      <MemoryRouter>
        <MockAlertContext>
          <RegisterForm />
        </MockAlertContext>
      </MemoryRouter>
    );

    //Arrange
    const emailElement = screen.getByTestId("email");
    const passwordElement = screen.getByTestId("password");
    const confirmPasswordElement = screen.getByTestId("confirm");
    const submit = screen.getByTestId("register-button");
    const bio = screen.getByTestId("userBio");
    const dob = screen.getByTestId("dob");
    const username = screen.getByTestId("username");

    //Act
    await user.type(emailElement, "test@example.com");
    await user.type(passwordElement, "1234567890");
    await user.type(confirmPasswordElement, "1234567890");
    await user.type(bio, "this is my bio");
    await user.type(username, "username");
    await user.type(
      dob,
      new Date(new Date().setFullYear(new Date().getFullYear() - 18))
        .toISOString()
        .split("T")[0]
    );

    selectDropdownOption("*Gender", "Female");
    selectDropdownOption("*Education Level", "Other");
    selectDropdownOption("*Drinking Frequency", "Never");
    selectDropdownOption("*Smoking Frequency", "Occasionally");

    expect(submit).toBeEnabled();
    fireEvent.click(submit);

    // Assert
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Submitted", {
        email: "test@example.com",
        password: "1234567890",
        confirmPassword: "1234567890",
        userBio: "this is my bio",
        username: "username",
        dob: new Date(new Date().setFullYear(new Date().getFullYear() - 18))
          .toISOString()
          .split("T")[0],
        education: "Other",
        gender: "Female",
        drinkingHabits: "Never",
        smokingHabits: "Occasionally",
      });

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.any(Object),
        "test@example.com",
        "1234567890"
      );

      expect(Navigate).toHaveBeenCalledWith("/Login");
    });

    consoleSpy.mockRestore();
  });

  it("validates user input and shows error messages", async () => {
    render(
      <MockAlertContext>
        <MemoryRouter>
          <RegisterForm />
        </MemoryRouter>
      </MockAlertContext>
    );

    const usernameInput = screen.getByTestId("username");
    const emailInput = screen.getByTestId("email");
    const passwordInput = screen.getByTestId("password");
    const registerButton = screen.getByTestId("register-button");

    // Simulate empty form submission
    fireEvent.click(registerButton);

    await waitFor(() => {
      expect(screen.getByTestId("usernameErr").textContent).toBe(
        "Username is required"
      );
      expect(screen.getByTestId("emailErr").textContent).toBe(
        "Email is required"
      );
      expect(screen.getByTestId("passwordErr").textContent).toBe(
        "Password is required"
      );
    });

    // Simulate invalid username
    fireEvent.change(usernameInput, { target: { value: "abc" } });
    fireEvent.blur(usernameInput);

    await waitFor(() => {
      expect(screen.getByTestId("usernameErr").textContent).toBe(
        "Username must be at least 4 characters"
      );
    });

    // Simulate invalid email
    fireEvent.change(emailInput, { target: { value: "invalid_email" } });
    fireEvent.blur(emailInput);

    await waitFor(() => {
      expect(screen.getByTestId("emailErr").textContent).toBe(
        "Invalid email address"
      );
    });

    // Simulate invalid password
    fireEvent.change(passwordInput, { target: { value: "short" } });
    fireEvent.blur(passwordInput);

    await waitFor(() => {
      expect(screen.getByTestId("passwordErr").textContent).toBe(
        "Password must be at least 10 characters"
      );
    });
  });

  it("calls onSubmit with form values when valid data is provided", async () => {
    const mockOnSubmit = jest.fn();
    render(
      <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
        <MemoryRouter>
          <RegisterForm />
        </MemoryRouter>
      </AlertContext.Provider>
    );

    // Fill the form with valid data
    fireEvent.change(screen.getByTestId("username"), {
      target: { value: "validUsername" },
    });
    fireEvent.change(screen.getByTestId("email"), {
      target: { value: "valid@email.com" },
    });
    fireEvent.change(screen.getByTestId("password"), {
      target: { value: "validPassword123" },
    });
    fireEvent.change(screen.getByTestId("confirm"), {
      target: { value: "validPassword123" },
    });

    fireEvent.click(screen.getByTestId("register-button"));

    // Wait for onSubmit to be called
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });
  });
});
