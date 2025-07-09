// Cypress/component test mock for firebase/storage
module.exports = {
  getStorage: () => ({}),
  ref: () => ({
    child: () => ({
      getDownloadURL: () => Promise.resolve(''),
      put: () => Promise.resolve(),
    }),
  }),
};
