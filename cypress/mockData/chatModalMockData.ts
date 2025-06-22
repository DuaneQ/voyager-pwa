export const mockConnection = {
  id: "conn1",
  users: ["userA", "userB"],
  itineraryIds: [],
  itineraries: [],
  createdAt: { seconds: 123, nanoseconds: 0 },
  // Add the unreadCounts property as required by your Chat logic
  unreadCounts: {
    userA: 2, // Example: userA has 2 unread messages
    userB: 0, // Example: userB has no unread messages
  },
};

export const mockMessages = [
  {
    id: "msg1",
    sender: "user1",
    text: "Hello Bob!",
    createdAt: { toDate: () => new Date("2024-01-02T10:00:00Z") },
    readBy: ["user1"],
  },
  {
    id: "msg2",
    sender: "user2",
    text: "Hi Alice!",
    createdAt: { toDate: () => new Date("2024-01-02T10:01:00Z") },
    readBy: ["user2"],
  },
];
