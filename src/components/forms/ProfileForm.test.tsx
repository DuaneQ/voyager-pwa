import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AlertContext, AlertProvider } from "../../Context/AlertContext";
import { ReactNode } from "react";
import { ProfileForm } from "./ProfileForm";

const mockShowAlert = jest.fn();

const MockAlertProvider = ({ children }: { children: ReactNode }) => (
  <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
    {children}
  </AlertContext.Provider>
);

describe("ProfileForm", () => {
  test.only("Renders the form fields correctly", () => {
    render(
      <MockAlertProvider>
        <MemoryRouter>
          <ProfileForm />
        </MemoryRouter>
      </MockAlertProvider>
    );
    expect(screen.getByTestId("userBio")).toBeInTheDocument();
    expect(screen.getByTestId("dob")).toBeInTheDocument();
    expect(screen.getByTestId("gender")).toBeInTheDocument();
    expect(screen.getByTestId("education")).toBeInTheDocument();
    expect(screen.getByTestId("drinkingHabits")).toBeInTheDocument();
    expect(screen.getByTestId("smokingHabits")).toBeInTheDocument();
  });
});
