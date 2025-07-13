// __mocks__/firebase-auth.js
export const onAuthStateChanged = jest.fn((auth, callback) => {
  // Immediately call the callback with the current user
  callback(global.__mockCurrentUser);
  // Return a no-op unsubscribe function
  return () => {};
});
export const getAuth = jest.fn(() => ({ currentUser: global.__mockCurrentUser }));
