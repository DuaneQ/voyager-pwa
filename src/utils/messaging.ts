export const initializeMessaging = async () => {
  try {
    // Check browser support first
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      console.warn('Browser does not support push notifications');
      return null;
    }

    // Dynamic import to avoid loading in unsupported browsers
    const { getMessaging, isSupported } = await import('firebase/messaging');
    
    const supported = await isSupported();
    if (!supported) {
      console.warn('Firebase Messaging not supported');
      return null;
    }

    return getMessaging();
  } catch (error) {
    console.error('Failed to initialize messaging:', error);
    return null;
  }
};