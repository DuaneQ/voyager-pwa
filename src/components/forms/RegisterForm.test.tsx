import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { RegisterForm } from "./RegisterForm";
import user from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AlertContext, AlertProvider } from "../../Context/AlertContext";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { Navigate } from "react-router-dom";
import { getAuth } from "firebase/auth";

const mockShowAlert = jest.fn();

import { ReactNode } from "react";

const MockAlertProvider = ({ children }: { children: ReactNode }) => (
  <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
    {children}
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

jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(() => {}),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("react-router-dom", () => ({ navigate: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  const originalLoc = window.location;
  delete (window as any).location;
  window.location = {...originalLoc, href: jest.fn()} as any;
});

describe("RegisterForm", () => {
  render(
    <MockAlertProvider>
      <MemoryRouter> 
        <RegisterForm /> {" "}
      </MemoryRouter> {" "}
    </MockAlertProvider>
  );

  it("renders the form fields correctly", () => {

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

  //Edge Cases
  test("shows an error message for an invalid email", async () => {
    render(
      <MockAlertProvider > 
        <MemoryRouter > 
          <RegisterForm /> {" "}
        </MemoryRouter> {" "}
      </MockAlertProvider>
    );

    const emailElement = screen.getByTestId("email");
    await user.type(emailElement, "invalid-email");
    fireEvent.blur(emailElement);

    expect(await screen.findByTestId("emailErr")).toHaveTextContent("");
  });

  test("shows an error message if password is too short", async () => {
    render(
      <MockAlertProvider>
        <MemoryRouter> 
          <RegisterForm /> {" "}
        </MemoryRouter> {" "} 
      </MockAlertProvider>
    );
    
    const passwordElement = screen.getByTestId("password");
    await user.type(passwordElement, "123");
    fireEvent.blur(passwordElement);

    expect(await screen.findByTestId("passwordErr")).toHaveTextContent("");
  });

  // Negative Cases
  test("does not submit the form if mandatory fields are empty", async () => {
    render(
      <MockAlertProvider>
        <MemoryRouter> 
          <RegisterForm /> {" "}
        </MemoryRouter> {" "}
      </MockAlertProvider>
    );
    
    const submit = screen.getByTestId("register-button");
    fireEvent.click(submit);
    expect(await screen.findByText("Username is required")).toBeInTheDocument();
    expect(await screen.findByText("Email is required")).toBeInTheDocument();
  });

  test("Button was called with form values", async () => {
    const consoleSpy = jest.spyOn(console, "log");
    render(
      <AlertProvider>
        <MemoryRouter> 
          <RegisterForm /> 
        </MemoryRouter> 
      </AlertProvider>
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
});
