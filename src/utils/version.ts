// Version utility to help track deployments
export const APP_VERSION = process.env.REACT_APP_VERSION || process.env.npm_package_version || '1.1.0';
export const BUILD_TIME = process.env.REACT_APP_BUILD_TIME || new Date().toISOString();

// For debugging - you can display this in your app
export const getVersionInfo = () => ({
  version: APP_VERSION,
  buildTime: BUILD_TIME,
  userAgent: navigator.userAgent,
  serviceWorkerSupported: 'serviceWorker' in navigator
});

// Version info is available via getVersionInfo(); avoid noisy console logging in production
