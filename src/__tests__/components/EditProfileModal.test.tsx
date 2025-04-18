import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { EditProfileModal } from "../../components/forms/EditProfileModal";
import { UserProfileContext } from "../../Context/UserProfileContext";
import { AlertContext } from "../../Context/AlertContext";

const mockSetUserDbData = jest.fn();
const mockSetUserStorageData = jest.fn();

jest.mock("../../hooks/usePostUserProfileToDb", () => ({
  __esModule: true,
  default: () => ({
    setUserDbData: mockSetUserDbData,
  }),
}));

jest.mock("../../hooks/usePostUserProfileToStorage", () => ({
  __esModule: true,
  default: () => ({
    setUserStorageData: mockSetUserStorageData,
  }),
}));

describe("EditProfileModal", () => {
  const mockUpdateUserProfile = jest.fn();
  const mockShowAlert = jest.fn();
  const mockClose = jest.fn();

  const mockUserProfile = {
    bio: "Test bio",
    dob: "1990-01-01",
    gender: "Male",
    sexo: "Heterosexual",
    edu: "GED",
    drinking: "Occasionally",
    smoking: "Never",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
        <UserProfileContext.Provider
          value={{
            userProfile: mockUserProfile,
            updateUserProfile: mockUpdateUserProfile,
          }}>
          <EditProfileModal show={true} close={mockClose} />
        </UserProfileContext.Provider>
      </AlertContext.Provider>
    );
  };

  test("should call setUserStorageData and setUserDbData with correct data on submit", async () => {
    renderComponent();
    //Arrange
    const genderDropdown = screen.getByRole("combobox", { name: /gender/i });
    const sexoDropdown = screen.getByRole("combobox", {
      name: /sexual orientation/i,
    });
    const drinkingDropdown = screen.getByRole("combobox", {
      name: /drinking/i,
    });
    const eduDropdown = screen.getByRole("combobox", { name: /education/i });
    const smokingDropdown = screen.getByRole("combobox", { name: /smoking/i });

    // Act
    fireEvent.change(screen.getByLabelText(/bio/i), {
      target: { value: mockUserProfile.bio },
    });
    fireEvent.change(screen.getByLabelText(/date of birth/i), {
      target: { value: mockUserProfile.dob },
    });
    fireEvent.mouseDown(genderDropdown);
    const genderOption = await screen.findByRole("option", { name: "Female" });
    fireEvent.click(genderOption);
    fireEvent.mouseDown(sexoDropdown);
    const sexoOption = await screen.findByRole("option", {
      name: mockUserProfile.sexo,
    });
    fireEvent.click(sexoOption);
    fireEvent.mouseDown(eduDropdown);
    const eduOption = await screen.findByRole("option", {
      name: mockUserProfile.edu,
    });
    fireEvent.click(eduOption);
    fireEvent.mouseDown(drinkingDropdown);
    const drinkingOption = await screen.findByRole("option", {
      name: mockUserProfile.drinking,
    });
    fireEvent.click(drinkingOption);
    fireEvent.mouseDown(smokingDropdown);
    const smokingOption = await screen.findByRole("option", {
      name: mockUserProfile.smoking,
    });
    fireEvent.click(smokingOption);

    const saveButton = screen.getByText("Save");
    fireEvent.click(saveButton);

    // Assert
    expect(mockSetUserStorageData).toHaveBeenCalledWith(mockUserProfile);
    expect(mockSetUserDbData).toHaveBeenCalledWith(mockUserProfile);
    expect(mockUpdateUserProfile).toHaveBeenCalledWith(mockUserProfile);
  });

  test("should not call any hooks when cancel is clicked", () => {
    renderComponent();

    // Act
    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    // Assert
    expect(mockSetUserStorageData).not.toHaveBeenCalled();
    expect(mockSetUserDbData).not.toHaveBeenCalled();
    expect(mockUpdateUserProfile).not.toHaveBeenCalled();
  });
  test("should show an alert if the user is under 18", async () => {
    const underageProfile = { ...mockUserProfile, dob: "2010-01-01" };

    render(
      <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
        <UserProfileContext.Provider
          value={{
            userProfile: underageProfile,
            updateUserProfile: mockUpdateUserProfile,
          }}>
          <EditProfileModal
            show={true}
            close={mockClose}
            setUserDbData={mockSetUserDbData}
            setUserStorageData={mockSetUserStorageData}
          />
        </UserProfileContext.Provider>
      </AlertContext.Provider>
    );

    // Simulate form submission
    const saveButton = screen.getByText("Save");
    fireEvent.click(saveButton);

    // Verify that the alert is shown
    expect(mockShowAlert).toHaveBeenCalledWith(
      "error",
      "You must be over 18 years old or older."
    );

    // Verify that setUserStorageData and setUserDbData are not called
    expect(mockSetUserStorageData).not.toHaveBeenCalled();
    expect(mockSetUserDbData).not.toHaveBeenCalled();
  });
});
