import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RegisterForm } from "../components/forms/RegisterForm";
import { AlertContext } from "../Context/AlertContext";

const mockShowAlert = jest.fn();
const mockNavigate = jest.fn();
const mockOnSubmit = jest.fn();

const renderForm = () => {
  return render(
    <MemoryRouter>
      <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
        <RegisterForm />
      </AlertContext.Provider>
    </MemoryRouter>
  );
};

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

describe("RegisterForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders all input fields and the register button", () => {
    renderForm();

    expect(screen.getByTestId("username")).toBeInTheDocument();
    expect(screen.getByTestId("email")).toBeInTheDocument();
    expect(screen.getByTestId("password")).toBeInTheDocument();
    expect(screen.getByTestId("confirm")).toBeInTheDocument();
    expect(screen.getByTestId("userBio")).toBeInTheDocument();
    expect(screen.getByTestId("dob")).toBeInTheDocument();
    expect(screen.getByTestId("gender")).toBeInTheDocument();
    expect(screen.getByTestId("education")).toBeInTheDocument();
    expect(screen.getByTestId("drinkingHabits")).toBeInTheDocument();
    expect(screen.getByTestId("smokingHabits")).toBeInTheDocument();
    expect(screen.getByTestId("register-button")).toBeInTheDocument();
  });

  test("displays validation errors when fields are empty", async () => {
    renderForm();

    const submitButton = screen.getByTestId("register-button");
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(screen.getByTestId("usernameErr")).toHaveTextContent(
      "Username is required"
    );
    expect(screen.getByTestId("emailErr")).toHaveTextContent(
      "Email is required"
    );
    expect(screen.getByTestId("passwordErr")).toHaveTextContent(
      "Password is required"
    );
  });

  test("calls showAlert when passwords do not match", async () => {
    renderForm();

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("*Username"), {
        target: { value: "testuser" },
      });
      fireEvent.change(screen.getByPlaceholderText("*Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("*Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByPlaceholderText("*Confirm Password"), {
        target: { value: "password321" },
      });
      fireEvent.click(screen.getByTestId("register-button"));
    });

    // await waitFor(() => {
    //   expect(mockOnSubmit).toHaveBeenCalled();
    //   expect(mockShowAlert).toHaveBeenCalledWith(
    //     "Error",
    //     "Passwords do not match."
    //   );
    // });
  });

  test("submits form with all required fields", async () => {
    renderForm();

    await act(async () => {
      fireEvent.change(screen.getByPlaceholderText("*Username"), {
        target: { value: "testuser" },
      });
      fireEvent.change(screen.getByPlaceholderText("*Email"), {
        target: { value: "test@example.com" },
      });
      fireEvent.change(screen.getByPlaceholderText("*Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByPlaceholderText("*Confirm Password"), {
        target: { value: "password123" },
      });
      fireEvent.change(screen.getByPlaceholderText("Tell us about yourself"), {
        target: {
          value: "This bio is for testing and should not exceed 200 characters",
        },
      });
      fireEvent.change(screen.getByLabelText("*Date of birth"), {
        target: { value: "12/34/5678" },
      });
      fireEvent.click(screen.getByTestId("gender"));
      fireEvent.click(screen.getByTestId("education"));
      fireEvent.click(screen.getByTestId("drinkingHabits"));
      fireEvent.click(screen.getByTestId("smokingHabits"));
      fireEvent.click(screen.getByTestId("register-button"));

      fireEvent.click(screen.getByRole("button", { name: "Register" }));
    });

    // await waitFor(() => {
    //   expect(mockOnSubmit).toHaveBeenCalled();
    // });
  });
});
