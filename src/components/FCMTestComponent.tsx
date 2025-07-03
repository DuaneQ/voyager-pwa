import React, { useEffect, useState } from 'react';

const FCMTestComponent: React.FC = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkBrowserSupport();
  }, []);

  const checkBrowserSupport = async () => {
    try {
      // Check if browser supports necessary APIs
      if (!('serviceWorker' in navigator)) {
        throw new Error('Service Worker not supported');
      }

      if (!('Notification' in window)) {
        throw new Error('Notifications not supported');
      }

      if (!('PushManager' in window)) {
        throw new Error('Push messaging not supported');
      }

      // Check if Firebase Messaging is supported
      const { isSupported: messagingSupported } = await import('firebase/messaging');
      const supported = await messagingSupported();
      
      if (!supported) {
        throw new Error('Firebase Messaging not supported in this browser');
      }

      setIsSupported(true);
    } catch (err) {
      console.warn('FCM not supported:', err);
      setError(err instanceof Error ? err.message : 'FCM not supported');
      setIsSupported(false);
    }
  };

  const initializeMessaging = async () => {
    if (!isSupported) return;

    try {
      const { getMessaging, getToken } = await import('firebase/messaging');
      const messaging = getMessaging();
      
      // Request notification permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Notification permission denied');
      }

      const token = await getToken(messaging, {
        vapidKey: process.env.REACT_APP_VAPID_KEY
      });

      console.log('FCM Token:', token);
    } catch (err) {
      console.error('Error initializing messaging:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize messaging');
    }
  };

  if (!isSupported) {
    return (
      <div className="fcm-test-component">
        <p>Push notifications are not supported in this browser.</p>
        {error && <p className="error">Error: {error}</p>}
      </div>
    );
  }

  return (
    <div className="fcm-test-component">
      <button onClick={initializeMessaging}>
        Enable Push Notifications
      </button>
    </div>
  );
};

export default FCMTestComponent;