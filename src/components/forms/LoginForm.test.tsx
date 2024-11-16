import {
  fireEvent,
  getByTestId,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { LoginForm } from "./LoginForm";
import user from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { AlertContext, AlertProvider } from "../../Context/AlertContext";
import { ReactNode } from "react";

const mockShowAlert = jest.fn();
const MockAlertProvider = ({ children }: { children: ReactNode }) => (
  <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
    {children}
  </AlertContext.Provider>
);

describe("Login Form", () => {
  test.only("Null password renders error", async () => {
    render(
      <MockAlertProvider>
        <MemoryRouter>
          <LoginForm />
        </MemoryRouter>
      </MockAlertProvider>
    ); //Arrange
    const emailElement = screen.getByTestId("email");
    const submit = screen.getByTestId("login-button");

    //Act
    user.type(emailElement, "in@valid.com");
    fireEvent.click(submit);

    //Assert
    await waitFor(() => {
      expect(screen.getByText("Password is required")).toBeInTheDocument();
    });
  });

  test.only("Both elements required error rendered", async () => {
    render(
      <MockAlertProvider>
        <MemoryRouter>
          <LoginForm />
        </MemoryRouter>
      </MockAlertProvider>
    ); //Arrange
    const submit = screen.getByTestId("login-button");

    //Act
    fireEvent.click(submit);

    //Assert
    await waitFor(() => {
      expect(screen.getByText("Email is required")).toBeInTheDocument();
      expect(screen.getByText("Password is required")).toBeInTheDocument();
    });
  });

  test.only("Email and password form values change on submit", async () => {
    render(
      <MockAlertProvider>
        <MemoryRouter>
          <LoginForm />
        </MemoryRouter>
      </MockAlertProvider>
    );

    // Fill out the form
    const emailElement = screen.getByTestId("email");
    const passwordElement = screen.getByTestId("password");

    userEvent.type(emailElement, "test@example.com");
    userEvent.type(passwordElement, "12345678901");

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("login-form")).toHaveFormValues({
        email: "test@example.com",
        password: "12345678901",
      });
    });
  });
});
