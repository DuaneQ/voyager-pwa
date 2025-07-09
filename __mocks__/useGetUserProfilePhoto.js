// Cypress/component test mock for useGetUserProfilePhoto
// Always returns a static avatar URL (no network)


// Robust Cypress/component test mock for useGetUserProfilePhoto
// Always returns a static avatar URL (no network), and shape matches real hook
function useGetUserProfilePhoto(userId) {
  return {
    photoUrl: '/default-profile.png',
    loading: false,
    error: null,
  };
}

module.exports = useGetUserProfilePhoto;
