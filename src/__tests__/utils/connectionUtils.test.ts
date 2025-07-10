

// Mock the firebaseConfig app so getFirestore(app) returns the right mock
jest.mock("../../environments/firebaseConfig", () => ({
  app: "mock-app"
}));

// Only one mock for firebase/firestore!
jest.mock("firebase/firestore", () => {
  const actual = jest.requireActual("firebase/firestore");
  return {
    ...actual,
    getFirestore: jest.fn(),
    doc: jest.fn((..._args) => "docRef"),
    getDoc: jest.fn(),
    updateDoc: jest.fn(),
    arrayUnion: (...args: any[]) => args,
    arrayRemove: (...args: any[]) => args,
  };
});

import { addUserToConnection, removeUserFromConnection } from "../../utils/connectionUtils";


const mockConn = {
  id: "conn1",
  users: ["userA", "userB"],
  addedUsers: [],
};


const { getDoc, updateDoc, getFirestore, doc } = require("firebase/firestore");

describe("connectionUtils", () => {

  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure getFirestore returns a dummy value so doc(getFirestore(app), ...) returns "docRef"
    getFirestore.mockReturnValue("mockDb");
    doc.mockImplementation(() => "docRef");
  });

  it("adds a user to a connection if not already present", async () => {
    getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ users: ["userA", "userB"], addedUsers: [] }) });
    await addUserToConnection("conn1", "userC", "userA");
    expect(updateDoc).toHaveBeenCalledWith(
      "docRef",
      expect.objectContaining({
        users: expect.anything(),
        addedUsers: expect.anything(),
      })
    );
    // Check that arrayUnion was called with correct args
    // (optional: if you want to spy on arrayUnion)
  });

  it("throws if user is already in chat", async () => {
    getDoc.mockResolvedValueOnce({ exists: () => true, data: () => ({ users: ["userA", "userB"], addedUsers: [] }) });
    await expect(addUserToConnection("conn1", "userB", "userA")).rejects.toThrow(/already in chat/);
  });


  it("removes a user if requesting user added them", async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        users: ["userA", "userB", "userC"],
        addedUsers: [
          { userId: "userC", addedBy: "userA" },
        ],
      }),
    });
    await removeUserFromConnection("conn1", "userC", "userA");
    expect(updateDoc).toHaveBeenCalledWith(
      "docRef",
      expect.objectContaining({
        users: expect.anything(),
        addedUsers: expect.anything(),
      })
    );
  });
  it("does not allow a user to remove the person who added them", async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        users: ["userA", "userB"],
        addedUsers: [
          { userId: "userB", addedBy: "userA" },
        ],
      }),
    });
    // userB tries to remove userA, but only userA can remove userB
    await expect(removeUserFromConnection("conn1", "userA", "userB")).rejects.toThrow(/only remove users you added/);
  });
  it("does not allow a user to remove someone they did not add", async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        users: ["userA", "userB", "userC"],
        addedUsers: [
          { userId: "userC", addedBy: "userA" },
        ],
      }),
    });
    // userB tries to remove userC, but only userA can remove userC
    await expect(removeUserFromConnection("conn1", "userC", "userB")).rejects.toThrow(/only remove users you added/);
  });

  it("throws if requesting user did not add the user", async () => {
    getDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        users: ["userA", "userB", "userC"],
        addedUsers: [
          { userId: "userC", addedBy: "userB" },
        ],
      }),
    });
    await expect(removeUserFromConnection("conn1", "userC", "userA")).rejects.toThrow(/only remove users you added/);
  });
});
