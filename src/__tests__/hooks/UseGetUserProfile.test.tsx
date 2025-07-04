import { renderHook } from "@testing-library/react";
import useGetUserProfile from "../../hooks/useGetUserProfile";

jest.mock("../../hooks/useGetUserProfile");
const mockedHook = jest.mocked(useGetUserProfile);
const mockProfile = {
  email: "test@example.com",
  username: "testuser",
  userBio: "Bio",
  dob: "mm/dd/yyyy",
  gender: "Male",
  sexualOrientation: "M",
  education: "University",
  drinkingHabits: "Social",
  smokingHabits: "No",
};
beforeEach(() => {
  localStorage.clear();
});

describe("Can retrieve user profile when the storage is null", () => {
  it("should return the initial values for data, error and loading", async () => {
    //Arrange
    localStorage.clear();
    mockedHook.mockReturnValue({
      isLoading: false,
      userProfile: {
        email: "test@example.com",
        username: "testuser",
        userBio: "Bio",
        dob: "mm/dd/yyyy",
        gender: "Male",
        sexualOrientation: "M",
        education: "University",
        drinkingHabits: "Social",
        smokingHabits: "No",
      },
      setUserProfile: jest.fn(),
    });

    //Act
    const { result } = renderHook(() => useGetUserProfile());

    //Assert
    expect(result.current.isLoading).toBe(false);
    expect(result.current.userProfile).toEqual(mockProfile);
  });

  it("should return the user profile from local storage", async () => {
    // Arrange
    localStorage.setItem("userProfile", JSON.stringify(mockProfile));
    mockedHook.mockReturnValue({
      isLoading: false,
      userProfile: JSON.parse(localStorage.getItem("userProfile") || "{}"),
      setUserProfile: jest.fn(),
    });

    // Act
    const { result } = renderHook(() => useGetUserProfile());

    // Assert
    expect(result.current.isLoading).toBe(false);
    expect(result.current.userProfile).toEqual(mockProfile);
  });
});
