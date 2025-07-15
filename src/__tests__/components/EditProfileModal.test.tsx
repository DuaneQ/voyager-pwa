import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

  // Use values that should match the actual constants
  const mockUserProfile = {
    bio: "Test bio",
    dob: "1990-01-01",
    gender: "Male",
    sexualOrientation: "heterosexual",
    status: "single",
    edu: "High School",
    drinking: "Never",
    smoking: "Never",
    username: "TestUser",
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
    
    // Wait for the component to fully load
    await waitFor(() => {
      expect(screen.getByDisplayValue(mockUserProfile.bio)).toBeInTheDocument();
    });

    // Simply click save without changing anything to test the basic functionality
    const saveButton = screen.getByText("Save");
    fireEvent.click(saveButton);

    // Assert - Check that the functions were called
    await waitFor(() => {
      expect(mockSetUserStorageData).toHaveBeenCalled();
    });

    // The profile should be saved with the existing values
    const expectedProfile = expect.objectContaining({
      bio: mockUserProfile.bio,
      dob: mockUserProfile.dob,
      gender: mockUserProfile.gender,
      sexualOrientation: mockUserProfile.sexualOrientation,
      status: mockUserProfile.status,
      edu: mockUserProfile.edu,
      drinking: mockUserProfile.drinking,
      smoking: mockUserProfile.smoking,
      username: mockUserProfile.username,
    });

    expect(mockSetUserStorageData).toHaveBeenCalledWith(expectedProfile);
    expect(mockSetUserDbData).toHaveBeenCalledWith(expectedProfile);
    expect(mockUpdateUserProfile).toHaveBeenCalledWith(expectedProfile);
    expect(mockClose).toHaveBeenCalled();
  });

  test("should handle basic form field changes", async () => {
    renderComponent();

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByDisplayValue(mockUserProfile.bio)).toBeInTheDocument();
    });

    // Change bio field
    const bioField = screen.getByLabelText(/user bio/i);
    fireEvent.change(bioField, { target: { value: "Updated bio text" } });

    // Change date field
    const dobField = screen.getByLabelText(/date of birth/i);
    fireEvent.change(dobField, { target: { value: "1985-05-15" } });

    // Verify fields updated
    expect(screen.getByDisplayValue("Updated bio text")).toBeInTheDocument();
    expect(screen.getByDisplayValue("1985-05-15")).toBeInTheDocument();

    // Submit the form
    const saveButton = screen.getByText("Save");
    fireEvent.click(saveButton);

    // Verify the updated data was saved
    await waitFor(() => {
      expect(mockSetUserStorageData).toHaveBeenCalled();
    });

    const expectedProfile = expect.objectContaining({
      bio: "Updated bio text",
      dob: "1985-05-15",
    });

    expect(mockSetUserStorageData).toHaveBeenCalledWith(expectedProfile);
  });

  test("should handle dropdown selection correctly", async () => {
    renderComponent();

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByDisplayValue(mockUserProfile.bio)).toBeInTheDocument();
    });

    // Test gender dropdown
    const genderDropdown = screen.getByRole("combobox", { name: /gender/i });
    fireEvent.mouseDown(genderDropdown);
    
    // Wait for options to appear and select Female
    const femaleOption = await screen.findByRole("option", { name: "Female" });
    fireEvent.click(femaleOption);

    // Submit the form
    const saveButton = screen.getByText("Save");
    fireEvent.click(saveButton);

    // Verify the changes were saved
    await waitFor(() => {
      expect(mockSetUserStorageData).toHaveBeenCalled();
    });

    const expectedProfile = expect.objectContaining({
      gender: "Female",
    });

    expect(mockSetUserStorageData).toHaveBeenCalledWith(expectedProfile);
  });

  test("should not call any hooks when cancel is clicked", async () => {
    renderComponent();

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    // Act
    const cancelButton = screen.getByText("Cancel");
    fireEvent.click(cancelButton);

    // Assert
    expect(mockSetUserStorageData).not.toHaveBeenCalled();
    expect(mockSetUserDbData).not.toHaveBeenCalled();
    expect(mockUpdateUserProfile).not.toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
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
          <EditProfileModal show={true} close={mockClose} />
        </UserProfileContext.Provider>
      </AlertContext.Provider>
    );

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByDisplayValue(underageProfile.dob)).toBeInTheDocument();
    });

    // Simulate form submission
    const saveButton = screen.getByText("Save");
    fireEvent.click(saveButton);

    // Verify that the alert is shown
    await waitFor(() => {
      expect(mockShowAlert).toHaveBeenCalledWith(
        "error",
        "You must be over 18 years old or older."
      );
    });

    // Verify that setUserStorageData and setUserDbData are not called
    expect(mockSetUserStorageData).not.toHaveBeenCalled();
    expect(mockSetUserDbData).not.toHaveBeenCalled();
  });

  test("should populate form fields with existing user profile data", async () => {
    renderComponent();

    // Wait for the form to be populated
    await waitFor(() => {
      expect(screen.getByDisplayValue(mockUserProfile.bio)).toBeInTheDocument();
      expect(screen.getByDisplayValue(mockUserProfile.dob)).toBeInTheDocument();
    });

    // Check that form fields are populated with existing data
    expect(screen.getByDisplayValue(mockUserProfile.bio)).toBeInTheDocument();
    expect(screen.getByDisplayValue(mockUserProfile.dob)).toBeInTheDocument();
    
    // For dropdowns, verify they exist and can be opened
    const genderDropdown = screen.getByRole("combobox", { name: /gender/i });
    expect(genderDropdown).toBeInTheDocument();
    
    // Open the dropdown to verify it works
    fireEvent.mouseDown(genderDropdown);
    
    // Check that Male option exists
    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Male" })).toBeInTheDocument();
    });
  });

  test("should show modal when show prop is true", () => {
    renderComponent();
    
    // Check that the modal is rendered
    expect(screen.getByText("Edit Profile")).toBeInTheDocument();
    expect(screen.getByText("Save")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();
  });

  test("should display required field indicators", () => {
    renderComponent();
    
    // Fix: Use getAllByText since Material-UI creates multiple elements with the same text
    const dateLabels = screen.getAllByText("*Date of birth");
    expect(dateLabels.length).toBeGreaterThan(0);
    expect(dateLabels[0]).toBeInTheDocument();
  });

  test("should handle username field changes", async () => {
    renderComponent();

    // Wait for form to load
    await waitFor(() => {
      expect(screen.getByDisplayValue(mockUserProfile.username)).toBeInTheDocument();
    });

    // Change username field
    const usernameField = screen.getByLabelText(/username/i);
    fireEvent.change(usernameField, { target: { value: "NewUsername" } });

    // Verify field updated
    expect(screen.getByDisplayValue("NewUsername")).toBeInTheDocument();

    // Submit the form
    const saveButton = screen.getByText("Save");
    fireEvent.click(saveButton);

    // Verify the updated data was saved
    await waitFor(() => {
      expect(mockSetUserStorageData).toHaveBeenCalled();
    });

    const expectedProfile = expect.objectContaining({
      username: "NewUsername",
    });

    expect(mockSetUserStorageData).toHaveBeenCalledWith(expectedProfile);
  });
});
