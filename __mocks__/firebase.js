// Cypress/component test mock for firebase/app and firebase/storage
module.exports = {
  initializeApp: () => ({}),
  storage: () => ({
    ref: () => ({
      child: () => ({
        getDownloadURL: () => Promise.resolve(''),
        put: () => Promise.resolve(),
      }),
    }),
  }),
};
