// Global Firebase mocks that can be imported by other tests

export const mockFirebaseApp = {
  name: "[DEFAULT]",
  options: {},
  automaticDataCollectionEnabled: false,
};

export const mockFirestoreFunctions = {
  getFirestore: jest.fn(() => ({})),
  doc: jest.fn(),
  updateDoc: jest.fn(),
  arrayUnion: jest.fn(),
  addDoc: jest.fn(),
  collection: jest.fn(),
  serverTimestamp: jest.fn(),
  getDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  startAfter: jest.fn(),
  getDocs: jest.fn(),
};

export const mockStorageFunctions = {
  getStorage: jest.fn(() => ({})),
  ref: jest.fn(),
  getDownloadURL: jest.fn(() => Promise.resolve("/default-profile.png")),
  uploadBytes: jest.fn(),
};

export const setupFirebaseMocks = () => {
  jest.mock("firebase/firestore", () => mockFirestoreFunctions);
  jest.mock("firebase/storage", () => mockStorageFunctions);
  jest.mock("../../environments/firebaseConfig", () => ({
    app: mockFirebaseApp,
    db: {},
  }));
};