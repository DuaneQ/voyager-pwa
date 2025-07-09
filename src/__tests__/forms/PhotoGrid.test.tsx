import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PhotoGrid } from "../../components/forms/PhotoGrid";
import { UserProfileContext } from "../../Context/UserProfileContext";

const mockUpdateUserProfile = jest.fn();
const mockSetUserDbData = jest.fn();
const mockSetUserStorageData = jest.fn();
const mockUploadImage = jest.fn();

jest.mock("../../hooks/useUploadImage", () => ({
  __esModule: true,
  default: () => ({
    uploadImage: mockUploadImage,
  }),
}));

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


import { UserProfile } from "../../types/UserProfile";

describe("PhotoGrid Component", () => {
  const mockUserProfile: UserProfile = {
    uid: "12345",
    username: "TestUser",
    bio: "This is a test bio",
    dob: "1990-01-01",
    gender: "Male",
    sexualOrientation: "Heterosexual",
    edu: "GED",
    drinking: "Occasionally",
    smoking: "Never",
    photos: {
      slot1: "",
      slot2: "",
      slot3: "",
      slot4: "",
    },
  };

  const renderComponent = () =>
    render(
      <UserProfileContext.Provider
        value={{
          userProfile: mockUserProfile,
          updateUserProfile: mockUpdateUserProfile,
        }}>
        <PhotoGrid />
      </UserProfileContext.Provider>
    );

  test("should render 4 photo placeholders when no photos are available", () => {
    // Arrange
    renderComponent();

    // Act
    const placeholders = screen.getAllByAltText(/Profile Placeholder/i);

    // Assert
    expect(placeholders).toHaveLength(4);
    placeholders.forEach((placeholder) => {
      expect(placeholder).toHaveAttribute(
        "src",
        expect.stringContaining("imagePH.png")
      );
    });
  });

  test("should open the menu when a placeholder is clicked", () => {
    // Arrange
    renderComponent();

    // Act
    const placeholders = screen.getAllByAltText(/Profile Placeholder/i);
    fireEvent.click(placeholders[0]);

    // Assert
    const uploadMenuItem = screen.getByText("Upload Pic");
    expect(uploadMenuItem).toBeInTheDocument();
  });

  test("should handle file upload and update the user profile", async () => {
    // Arrange
    mockUploadImage.mockResolvedValue("uploaded-image-url");
    renderComponent();

    // Act
    const placeholders = screen.getAllByAltText(/Profile Placeholder/i);
    fireEvent.click(placeholders[0]);
    const uploadMenuItem = screen.getByText("Upload Pic");
    fireEvent.click(uploadMenuItem);
    const fileInput = screen.getByTestId("file-input");
    const file = new File(["dummy content"], "example.png", {
      type: "image/png",
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Assert
    await waitFor(() => {
      expect(mockUploadImage).toHaveBeenCalledWith(file, "slot1");
      expect(mockUpdateUserProfile).toHaveBeenCalledWith({
        ...mockUserProfile,
        photos: {
          ...mockUserProfile.photos,
          slot1: "uploaded-image-url",
        },
      });
      expect(mockSetUserDbData).toHaveBeenCalledWith({
        ...mockUserProfile,
        photos: {
          ...mockUserProfile.photos,
          slot1: "uploaded-image-url",
        },
      });
      expect(mockSetUserStorageData).toHaveBeenCalledWith({
        ...mockUserProfile,
        photos: {
          ...mockUserProfile.photos,
          slot1: "uploaded-image-url",
        },
      });
    });
  });

  test("should handle photo deletion and update the user profile", async () => {
    // Arrange
    renderComponent();

    // Act
    const placeholders = screen.getAllByAltText(/Profile Placeholder/i);
    fireEvent.click(placeholders[0]);
    const deleteMenuItem = screen.getByText("Delete Pic");
    fireEvent.click(deleteMenuItem);

    // Assert
    await waitFor(() => {
      expect(mockUpdateUserProfile).toHaveBeenCalledWith({
        ...mockUserProfile,
        photos: {
          ...mockUserProfile.photos,
          slot1: "",
        },
      });
      expect(mockSetUserDbData).toHaveBeenCalledWith({
        ...mockUserProfile,
        photos: {
          ...mockUserProfile.photos,
          slot1: "",
        },
      });
      expect(mockSetUserStorageData).toHaveBeenCalledWith({
        ...mockUserProfile,
        photos: {
          ...mockUserProfile.photos,
          slot1: "",
        },
      });
    });
  });

  test("should close the menu when 'Cancel' is clicked", async () => {
    // Arrange
    renderComponent();

    // Act
    const placeholders = screen.getAllByAltText(/Profile Placeholder/i);
    fireEvent.click(placeholders[0]);
    const cancelMenuItem = screen.getByText("Cancel");
    fireEvent.click(cancelMenuItem);

    // Assert
    await waitFor(() => {
      expect(screen.queryByText("Upload Pic")).not.toBeInTheDocument();
    });
  });
});
