
// Robust Cypress/component test mock for firebase/auth
module.exports = {
  getAuth: () => ({}),
  signInWithEmailAndPassword: () => Promise.resolve({ user: {} }),
  signOut: () => Promise.resolve(),
  onAuthStateChanged: (auth, cb) => cb(null),
  sendEmailVerification: () => Promise.resolve(),
};
