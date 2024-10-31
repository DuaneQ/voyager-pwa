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

describe("Login Form", () => {
  test("Null password renders error", async () => {
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
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

  test("Both elements required error rendered", async () => {
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
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

  test("Email and password form values change on submit", async () => {
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
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
