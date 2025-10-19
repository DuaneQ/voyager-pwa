// __mocks__/firebase-auth.js
// Provide common Firebase Auth functions as Jest mocks so test suites can
// configure return values with mockResolvedValue/mockImplementation.
const mockCurrentUser = typeof global !== 'undefined' ? global.__mockCurrentUser : null;

const onAuthStateChanged = jest.fn((callback) => {
  if (typeof callback === 'function') {
    callback(mockCurrentUser);
  }
  return () => {};
});

const getAuth = jest.fn(() => ({ currentUser: mockCurrentUser, onAuthStateChanged }));

const signInWithPopup = jest.fn();
const createUserWithEmailAndPassword = jest.fn();
const sendEmailVerification = jest.fn();
const signOut = jest.fn();
const GoogleAuthProvider = jest.fn();

module.exports = {
  onAuthStateChanged,
  getAuth,
  signInWithPopup,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  GoogleAuthProvider,
};
