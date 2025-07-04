import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProfilePhoto } from "../../components/forms/ProfilePhoto";
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

describe("ProfilePhoto Component", () => {
  const mockUserProfile = {
    uid: "12345",
    username: "TestUser",
    bio: "This is a test bio",
    dob: "1990-01-01",
    gender: "Male",
    sexualOrientation: "Heterosexual",
    edu: "GED",
    drinking: "Occasionally",
    smoking: "Never",
    photos: ["", "", "", "", ""],
  };

  const renderComponent = () =>
    render(
      <UserProfileContext.Provider
        value={{
          userProfile: mockUserProfile,
          updateUserProfile: mockUpdateUserProfile,
        }}>
        <ProfilePhoto />
      </UserProfileContext.Provider>
    );

  test("should render the profile placeholder image when no photo is available", () => {
    // Arrange
    renderComponent();

    // Act
    const imgElement = screen.getByAltText("Profile Placeholder");

    // Assert
    expect(imgElement).toBeInTheDocument();
    expect(imgElement).toHaveAttribute(
      "src",
      expect.stringContaining("imagePH.png")
    );
  });

  test("should open the menu when the image is clicked", () => {
    // Arrange
    renderComponent();

    // Act
    const imgElement = screen.getByAltText("Profile Placeholder");
    fireEvent.click(imgElement);

    // Assert
    const uploadMenuItem = screen.getByText("Upload Pic");
    expect(uploadMenuItem).toBeInTheDocument();
  });

  test("should call handleDeletePic and update the user profile when 'Delete Pic' is clicked", () => {
    // Arrange
    renderComponent();

    // Act
    const imgElement = screen.getByAltText("Profile Placeholder");
    fireEvent.click(imgElement);
    const deleteMenuItem = screen.getByText("Delete Pic");
    fireEvent.click(deleteMenuItem);

    // Assert
    expect(mockUpdateUserProfile).toHaveBeenCalledWith({
      ...mockUserProfile,
      photos: ["", "", "", "", ""],
    });
    expect(mockSetUserDbData).toHaveBeenCalledWith({
      ...mockUserProfile,
      photos: ["", "", "", "", ""],
    });
    expect(mockSetUserStorageData).toHaveBeenCalledWith({
      ...mockUserProfile,
      photos: ["", "", "", "", ""],
    });
  });

  test("should handle file upload and update the user profile", async () => {
    // Arrange
    mockUploadImage.mockResolvedValue("uploaded-image-url");
    renderComponent();

    // Act
    const imgElement = screen.getByAltText("Profile Placeholder");
    fireEvent.click(imgElement);
    const uploadMenuItem = screen.getByText("Upload Pic");
    fireEvent.click(uploadMenuItem);
    const fileInput = screen.getByTestId("file-input");
    const file = new File(["dummy content"], "example.png", {
      type: "image/png",
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Assert
    await waitFor(() => {
      expect(mockUploadImage).toHaveBeenCalledWith(file, 4);
      expect(mockUpdateUserProfile).toHaveBeenCalledWith({
        ...mockUserProfile,
        photos: ["", "", "", "", "uploaded-image-url"],
      });
      expect(mockSetUserDbData).toHaveBeenCalledWith({
        ...mockUserProfile,
        photos: ["", "", "", "", "uploaded-image-url"],
      });
      expect(mockSetUserStorageData).toHaveBeenCalledWith({
        ...mockUserProfile,
        photos: ["", "", "", "", "uploaded-image-url"],
      });
    });
  });

  test("should close the menu when 'Cancel' is clicked", async () => {
    // Arrange
    renderComponent();

    // Act
    const imgElement = screen.getByAltText("Profile Placeholder");
    fireEvent.click(imgElement);
    expect(screen.getByText("Upload Pic")).toBeInTheDocument();
    const cancelMenuItem = screen.getByText("Cancel");
    fireEvent.click(cancelMenuItem);

    // Assert
    await waitFor(() => {
      expect(screen.queryByText("Upload Pic")).not.toBeInTheDocument();
    });
  });
});
