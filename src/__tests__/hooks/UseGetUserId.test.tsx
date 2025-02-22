import { renderHook } from "@testing-library/react";
import { useAuthState } from "react-firebase-hooks/auth";
import { getAuth } from "firebase/auth";

jest.mock("firebase/compat/app");

// Mock Firebase auth and useAuthState hook
jest.mock("firebase/auth", () => ({
  getAuth: jest.fn(),
  onAuthStateChanged: jest.fn(),
}));

jest.mock("react-firebase-hooks/auth", () => ({
  useAuthState: jest.fn(),
}));

// Component or hook that uses useAuthState
const useGetUserId = () => {
  const [user]: any = useAuthState(getAuth());
  return user?.uid;
};

describe("useGetUserId", () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("should return userId from localStorage if it exists", () => {
    //Arrange
    localStorage.setItem("USER_CREDENTIALS", "test-user-id");

    (useAuthState as jest.Mock).mockReturnValue([
      { uid: "test-user-id" },
      false,
      undefined,
    ]);

    //Act
    const { result } = renderHook(() => useGetUserId());

    //Assert
    expect(result.current).toBe("test-user-id");
  });

  it("should return userId from firebase auth if not in localStorage", async () => {
    //Arrange
    const mockUser = { uid: "test-user-id", email: "test@example.com" };
    (useAuthState as jest.Mock).mockReturnValue([mockUser, false, null]);

    //Act
    const { result } = renderHook(() => useGetUserId());

    //Assert
    expect(result.current).toBe("test-user-id");
  });

  it("should return null if no user is authenticated", () => {
    //Arrange
    (useAuthState as jest.Mock).mockReturnValue([null, false, undefined]);

    //Act
    const { result } = renderHook(() => useGetUserId());

    //Assert
    expect(result.current).toBeUndefined();
  });
});
