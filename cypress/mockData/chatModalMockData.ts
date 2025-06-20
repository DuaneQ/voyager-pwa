export const mockConnection = {
  id: "conn1",
  users: ["user1", "user2"],
  itineraryIds: ["it1", "it2"],
  itineraries: [
    {
      id: "it1",
      destination: "Rome",
      startDate: "2024-01-01",
      endDate: "2024-01-10",
      description: "Rome trip",
      userInfo: {
        username: "Alice",
        uid: "user1",
        gender: "Female",
        dob: "1990-01-01",
      },
    },
    {
      id: "it2",
      destination: "Paris",
      startDate: "2024-02-01",
      endDate: "2024-02-10",
      description: "Paris trip",
      userInfo: {
        username: "Bob",
        uid: "user2",
        gender: "Male",
        dob: "1992-02-02",
      },
    },
  ],
  createdAt: "2024-01-01T00:00:00Z",
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
