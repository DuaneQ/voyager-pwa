import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { LoginForm } from "./LoginForm";
import user from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

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

  test.skip("Email and password form values change on submit", async () => {
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    );

    // Fill out the form
    const emailElement = screen.getByTestId("email");
    const passwordElement = screen.getByTestId("password");
    const submit = screen.getByTestId("login-button");

    user.type(emailElement, "test@example.com");
    user.type(passwordElement, "12345678901");

    // Submit the form
    fireEvent.click(submit);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("test@example.com")).toBeInTheDocument();
      expect(screen.getByText("12345678901")).toBeInTheDocument();
    });
  });
});
