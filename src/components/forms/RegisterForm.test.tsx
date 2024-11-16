import React, { act } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RegisterForm } from "./RegisterForm";
import user from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AlertContext, AlertProvider } from "../../Context/AlertContext";

const mockShowAlert = jest.fn();

import { ReactNode } from "react";
import userEvent from "@testing-library/user-event";

const MockAlertProvider = ({ children }: { children: ReactNode }) => (
  <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
    {children}
  </AlertContext.Provider>
);

describe("RegisterForm", () => {
  test("renders the form fields correctly", () => {
    render(
      <MockAlertProvider>
        <MemoryRouter>
          <RegisterForm />
        </MemoryRouter>
      </MockAlertProvider>
    );

    expect(screen.getByPlaceholderText("*Username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("*Email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("*Password")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("*Password")).toBeInTheDocument();
    expect(screen.getByLabelText("User Bio")).toBeInTheDocument();
    expect(screen.getByLabelText("*Date of birth")).toBeInTheDocument();
    expect(screen.getByLabelText("*Gender")).toBeInTheDocument();
    expect(screen.getByLabelText("*Education Level")).toBeInTheDocument();
    expect(screen.getByLabelText("*Drinking Frequency")).toBeInTheDocument();
    expect(screen.getByLabelText("*Smoking Frequency")).toBeInTheDocument();
  });

  test.skip("shows alert when DOB is less than 18 years", async () => {
    render(
      <MockAlertProvider>
        <MemoryRouter>
          <RegisterForm />
        </MemoryRouter>
      </MockAlertProvider>
    );

    // Arrange
    const emailElement = screen.getByTestId("email");
    const passwordElement = screen.getByTestId("password");
    const confirmPasswordElement = screen.getByTestId("confirm");
    const submit = screen.getByTestId("register-button");
    const bio = screen.getByTestId("userBio");
    const dob = screen.getByTestId("dob");
    const gender = screen.getByTestId("gender");
    const education = screen.getByTestId("education");
    const drinking = screen.getByTestId("drinkingHabits");
    const smoking = screen.getByTestId("smokingHabits");
    const username = screen.getByTestId("username");

    // Act
    userEvent.type(emailElement, "test@example.com");
    userEvent.type(passwordElement, "1234567890");
    userEvent.type(confirmPasswordElement, "1234567890");
    userEvent.type(bio, "this is my bio");
    userEvent.type(username, "username");
    userEvent.type(
      dob,
      new Date(new Date().setFullYear(new Date().getFullYear() - 17))
        .toISOString()
        .split("T")[0]
    );
    userEvent.type(gender, "Female");
    userEvent.type(education, "Other");
    userEvent.type(drinking, "Never");
    userEvent.type(smoking, "Occasionally");

    fireEvent.click(submit);

    //Assert
    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        "Error",
        "Users must be 18 or older."
      );
    });
  });

  test.skip("Button was called with form values", async () => {
    render(
      <AlertProvider>
        <MemoryRouter>
          <RegisterForm />
        </MemoryRouter>
      </AlertProvider>
    );

    //Arrange
    const emailElement = screen.getByPlaceholderText("*Email");
    const passwordElement = screen.getByPlaceholderText("*Password");
    const submit = screen.getByTestId("register-button");
    const bio = screen.getByLabelText("User Bio");
    const dob = screen.getByLabelText("*Date of birth");
    const gender = screen.getByLabelText("*Gender");
    const education = screen.getByLabelText("*Education Level");
    const drinking = screen.getByLabelText("*Drinking Frequency");
    const smoking = screen.getByLabelText("*Smoking Frequency");
    const username = screen.getByPlaceholderText("*Username");

    //Act
    userEvent.type(emailElement, "test@example.com");
    userEvent.type(passwordElement, "1234567890");
    userEvent.type(bio, "this is my bio");
    userEvent.type(username, "username");
    userEvent.type(
      dob,
      new Date(new Date().setFullYear(new Date().getFullYear() - 18))
        .toISOString()
        .split("T")[0]
    );

    userEvent.type(gender, "Female");
    userEvent.type(education, "Other");
    userEvent.type(drinking, "Never");
    userEvent.type(smoking, "Never");
    fireEvent.click(submit);

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("reg-form")).toHaveFormValues({
        email: "test@example.com",
        password: "1234567890",
        username: "username",
        userBio: "this is my bio",
        gender: "Female",
        education: "Other",
        drinkingHabits: "Never",
        smokingHabits: "Occasionally",
      });
    });
  });

  test.skip("shows alert when DOB is less than 18 years", async () => {
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
    const submit = screen.getByTestId("register-button");
    const bio = screen.getByTestId("userBio");
    const dob = screen.getByTestId("dob");
    const gender = screen.getByTestId("gender");
    const education = screen.getByTestId("education");
    const drinking = screen.getByTestId("drinkingHabits");
    const smoking = screen.getByTestId("smokingHabits");
    const username = screen.getByTestId("username");

    //Act
    userEvent.type(emailElement, "test@example.com");
    userEvent.type(passwordElement, "1234567890");
    userEvent.type(bio, "this is my bio");
    userEvent.type(username, "username");
    userEvent.type(
      dob,
      new Date(new Date().setFullYear(new Date().getFullYear() - 17))
        .toISOString()
        .split("T")[0]
    );

    userEvent.type(gender, "Female");
    userEvent.type(education, "Other");
    userEvent.type(drinking, "Never");
    userEvent.type(smoking, "Occasionally");

    fireEvent.click(submit);

    // Assert
    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        "Error",
        "Users must be 18 or older."
      );
    });
  });
});
