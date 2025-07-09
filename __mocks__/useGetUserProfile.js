// Cypress/component test mock for useGetUserProfile
module.exports = function useGetUserProfile() {
  return {
    userProfile: {
      username: 'Test User',
      gender: 'Male',
      dob: '1990-01-01',
      status: 'single',
      sexualOrientation: 'heterosexual',
      email: 'test@example.com',
      uid: 'testUserId',
      blocked: [],
    },
    loading: false,
    error: null,
  };
};
