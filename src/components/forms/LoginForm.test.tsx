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
    await user.type(emailElement, "in@valid.com");
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

  test.skip("Button was called with form values", async () => {
    const consoleSpy = jest.spyOn(console, "log");
    render(
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    ); //Arrange
    const emailElement = screen.getByTestId("email");
    const passwordElement = screen.getByTestId("password");
    const submit = screen.getByTestId("login-button");

    //Act
    await user.type(emailElement, "test@example.com");
    await user.type(passwordElement, "1234567890");
    fireEvent.click(submit);

    //Assert
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Submitted", {
        email: "test@example.com",
        password: "1234567890",
      });
    });

    consoleSpy.mockRestore();
  });
});