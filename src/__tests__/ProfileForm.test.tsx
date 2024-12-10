import { render, screen, fireEvent } from "@testing-library/react";
import { ProfileForm } from "../components/forms/ProfileForm";
import { AlertContext } from "../Context/AlertContext";
import { auth } from "../environments/environment";
import { signOut } from "firebase/auth";

jest.mock("firebase/auth");

const mockShowAlert = jest.fn();

const renderProfileForm = () => {
  render(
    <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
      <ProfileForm />
    </AlertContext.Provider>
  );
};

describe("ProfileForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders ProfileForm component", () => {
    renderProfileForm();
    expect(screen.getByLabelText("User Bio")).toBeInTheDocument();
    expect(screen.getByLabelText("*Date of birth")).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Gender" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Sexual Orientation" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Education" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Drinking" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("combobox", { name: "Smoking" })
    ).toBeInTheDocument();
  });

  test("calls signOut and redirects to login on logout button click", async () => {
    renderProfileForm();
    fireEvent.click(screen.getByRole("img", { name: "logout" }));

    expect(signOut).toHaveBeenCalledWith(auth);
  });
});
