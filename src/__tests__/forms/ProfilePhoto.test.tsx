import { render, screen, fireEvent } from "@testing-library/react";
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
        photos: [""],
    };

    const renderComponent = () =>
        render(
            <UserProfileContext.Provider
                value={{
                    userProfile: mockUserProfile,
                    updateUserProfile: mockUpdateUserProfile,
                }}
            >
                <ProfilePhoto />
            </UserProfileContext.Provider>
        );

    it("should render the profile placeholder image when no photo is available", () => {
        //Arrange
        renderComponent();

        //Act
        const imgElement = screen.getByAltText("Profile Placeholder");

        //Assert
        expect(imgElement).toBeInTheDocument();
        expect(imgElement).toHaveAttribute("src", expect.stringContaining("imagePH.png"));
    });

    it("should open the menu when the image is clicked", () => {
        //Arrange
        renderComponent();
        const imgElement = screen.getByAltText("Profile Placeholder");

        //Act
        fireEvent.click(imgElement);
        const uploadMenuItem = screen.getByText("Upload Pic");

        //Assert
        expect(uploadMenuItem).toBeInTheDocument();
    });

    it("should call handleDeletePic and update the user profile when 'Delete Pic' is clicked", () => {
        //Arrange
        renderComponent();
        const imgElement = screen.getByAltText("Profile Placeholder");

        //Act
        fireEvent.click(imgElement);
        const deleteMenuItem = screen.getByText("Delete Pic");
        fireEvent.click(deleteMenuItem);

        //Assert
        expect(mockUpdateUserProfile).toHaveBeenCalledWith({
            photos: [""],
        });
        expect(mockSetUserDbData).toHaveBeenCalledWith({
            photos: [""],
        });
        expect(mockSetUserStorageData).toHaveBeenCalledWith({
            photos: [""],
        });
    });

    it("should handle file upload and update the user profile", async () => {
        //Arrange
        mockUploadImage.mockResolvedValue("uploaded-image-url");
        renderComponent();
        const imgElement = screen.getByAltText("Profile Placeholder");

        //Act
        fireEvent.click(imgElement);
        const uploadMenuItem = screen.getByText("Upload Pic");
        fireEvent.click(uploadMenuItem);
        const fileInput = screen.getByTestId("file-input");
        const file = new File(["dummy content"], "example.png", { type: "image/png" });
        fireEvent.change(fileInput, { target: { files: [file] } });
    
        //Assert
        expect(mockUploadImage).toHaveBeenCalledWith(file, 0);
    });
});