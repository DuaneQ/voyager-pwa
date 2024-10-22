import React, { act } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RegisterForm } from "./RegisterForm";
import user from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AlertContext, AlertProvider } from "../../Context/AlertContext";

const mockShowAlert = jest.fn();

import { ReactNode } from "react";

const MockAlertProvider = ({ children }: { children: ReactNode }) => (
  <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
    {children}
  </AlertContext.Provider>
);

describe("RegisterForm", () => {
  it("renders the form fields correctly", () => {
    render(
      <MockAlertProvider>
        <MemoryRouter>
          <RegisterForm />
        </MemoryRouter>
      </MockAlertProvider>
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

  test.skip("Button was called with form values", async () => {
    const consoleSpy = jest.spyOn(console, "log");
    render(
      <AlertProvider>
        <MemoryRouter>
          <RegisterForm />
        </MemoryRouter>
      </AlertProvider>
    ); //Arrange
    const emailElement = screen.getByTestId("email");
    const passwordElement = screen.getByTestId("password");
    const submit = screen.getByTestId("register-button");
    const bio = screen.getByTestId("userBio");
    const dob = screen.getByTestId("dob");
    const gender = screen.getByTestId("gender");
    const education = screen.getByTestId("education");
    const drinking = screen.getByTestId("drinkingHabits");
    const smoking = screen.getByTestId("smokingHabits");
    const username = screen.getByTestId("username");

    //Act
    await user.type(emailElement, "test@example.com");
    await user.type(passwordElement, "1234567890");
    await user.type(bio, "this is my bio");
    await user.type(username, "username");
    await user.type(
      dob,
      new Date(new Date().setFullYear(new Date().getFullYear() - 18))
        .toISOString()
        .split("T")[0]
    );

    expect(gender).toBeInTheDocument();
    fireEvent.change(gender, { target: { name: "Female" } });

    expect(education).toBeInTheDocument();
    fireEvent.change(education, { target: { name: "Other" } });

    expect(drinking).toBeInTheDocument();
    fireEvent.change(drinking, { target: { name: "Never" } });

    expect(smoking).toBeInTheDocument();
    fireEvent.change(smoking, { target: { name: "Occasionally" } });
    screen.debug();
    expect(smoking).toHaveValue("Occasionally");

    expect(gender).toHaveValue("Female");
    expect(education).toHaveValue("Other");
    expect(drinking).toHaveValue("Never");
    expect(submit).toBeEnabled();

    // fireEvent.click(submit);

    // //Assert
    // await waitFor(() => {
    //   expect(consoleSpy).toHaveBeenCalledWith("Submitted", {
    //     email: "test@example.com",
    //     password: "1234567890",
    //     userBio: "this is my bio",
    //     username: "username",
    //     dob: new Date(new Date().setFullYear(new Date().getFullYear() - 18))
    //       .toISOString()
    //       .split("T")[0],
    //     education: "Other",
    //     gender: "Female",
    //     drinkingHabits: "Never",
    //     smokingHabits: "Occasionally",
    //   });
    // });

    // consoleSpy.mockRestore();
  });
});
