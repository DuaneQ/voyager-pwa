// Shared Firestore mock for all import paths
const mockConnections = [
  {
    id: "conn1",
    users: ["user1", "user2"],
    itineraryIds: ["it1", "it2"],
    itineraries: [
      {
        id: "it1",
        userInfo: {
          uid: "user1",
          username: "Alice",
          gender: "female",
          dob: "1990-01-01",
          email: "alice@example.com",
          status: "active",
          sexualOrientation: "straight",
          blocked: [],
        },
        destination: "Paris",
        startDate: "2025-07-01",
        endDate: "2025-07-10",
        description: "Trip to Paris",
        activities: ["sightseeing"],
        lowerRange: 20,
        upperRange: 40,
      },
      {
        id: "it2",
        userInfo: {
          uid: "user2",
          username: "Bob",
          gender: "male",
          dob: "1992-02-02",
          email: "bob@example.com",
          status: "active",
          sexualOrientation: "straight",
          blocked: [],
        },
        destination: "London",
        startDate: "2025-08-01",
        endDate: "2025-08-10",
        description: "Trip to London",
        activities: ["museums"],
        lowerRange: 22,
        upperRange: 35,
      },
    ],
    createdAt: { toDate: () => new Date() },
    unreadCounts: { user1: 1, user2: 0 },
    // Always include addedUsers for robust group chat logic
    addedUsers: [
      { userId: "user2", addedBy: "user1" },
      { userId: "user1", addedBy: "user1" },
    ],
  },
];
const mockMessages = [
  {
    id: "msg1",
    sender: "user1",
    text: "Hello!",
    imageUrl: "",
    createdAt: { toDate: () => new Date() },
    readBy: ["user1"],
  },
];
function propagate(obj, fallbackType) {
  if (!obj || typeof obj !== 'object') return { path: fallbackType, _collectionType: fallbackType };
  return {
    ...obj,
    path: obj.path || fallbackType,
    _collectionType: obj._collectionType || fallbackType,
  };
}
const firestoreMock = {
  getFirestore: jest.fn(() => ({})),
  collection: jest.fn((...args) => {
    const path = args.join("/");
    return { path, _collectionType: args[args.length - 1] };
  }),
  query: jest.fn((...args) => {
    let base = args[0];
    let path = base && base.path ? base.path : (base && base._collectionType ? base._collectionType : "");
    let _collectionType = base && base._collectionType ? base._collectionType : undefined;
    for (const a of args) {
      if (a && typeof a === "object" && a.path) path = a.path;
      if (a && typeof a === "object" && a._collectionType) _collectionType = a._collectionType;
    }
    return { path, _collectionType };
  }),
  where: jest.fn((q, ...args) => propagate(q, "connections")),
  orderBy: jest.fn((q, ...args) => propagate(q, "messages")),
  limit: jest.fn((q, ...args) => propagate(q, "messages")),
  onSnapshot: jest.fn((q, cb) => {
    const path = q?.path || q?._queryName || (Array.isArray(q) && q[0]);
    const type = q?._collectionType || (path && path.includes("messages") ? "messages" : path && path.includes("connections") ? "connections" : undefined);
    Promise.resolve().then(() => {
      if (type === "connections" || (path && path.includes("connections"))) {
        cb({ docs: mockConnections.map((c) => ({ id: c.id, data: () => c })) });
      } else if (type === "messages" || (path && path.includes("messages"))) {
        cb({ docs: mockMessages.map((m) => ({ id: m.id, data: () => m })) });
      } else {
        cb({ docs: [] });
      }
    });
    // Always return a function for unsubscribe
    return () => {};
  }),
  doc: jest.fn(() => ({})),
  updateDoc: jest.fn().mockResolvedValue(),
  getDocs: jest.fn().mockResolvedValue({
    docs: mockMessages.map((m) => ({ id: m.id, data: () => m })),
  }),
};
// Also export mockConnections for test debug
module.exports = Object.assign({}, firestoreMock, { mockConnections });
