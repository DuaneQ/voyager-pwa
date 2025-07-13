// Utility functions for FCM token management and validation
import { getMessaging, getToken, deleteToken, onMessage } from "firebase/messaging";
import { doc, getFirestore, setDoc } from "firebase/firestore";
import { app } from "../environments/firebaseConfig";

export interface FCMTokenResult {
  success: boolean;
  token?: string;
  error?: string;
}

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  timestamp: string;
  language: string;
  online: boolean;
}

/**
 * Get device information for token metadata
 */
export const getDeviceInfo = (): DeviceInfo => ({
  userAgent: navigator.userAgent,
  platform: navigator.platform,
  timestamp: new Date().toISOString(),
  language: navigator.language,
  online: navigator.onLine,
});

/**
 * Check if FCM is supported in current environment
 */
export const isFCMSupported = (): boolean => {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof window.Notification !== "undefined"
  );
};

/**
 * Request notification permission with detailed feedback
 */
export const requestNotificationPermission = async (): Promise<{
  granted: boolean;
  permission: NotificationPermission;
}> => {
  if (typeof window.Notification === "undefined") {
    return { granted: false, permission: "denied" };
  }
  const permission = await Notification.requestPermission();
  return {
    granted: permission === "granted",
    permission,
  };
};

/**
 * Generate and validate FCM token
 */
export const generateFCMToken = async (): Promise<FCMTokenResult> => {
  try {
    if (!isFCMSupported()) {
      return {
        success: false,
        error: "FCM not supported in this environment",
      };
    }

    // Check VAPID key
    if (!process.env.REACT_APP_VAPID_KEY) {
      return {
        success: false,
        error: "VAPID key not configured",
      };
    }

    // Request permission first
    const { granted } = await requestNotificationPermission();
    if (!granted) {
      return {
        success: false,
        error: "Notification permission not granted",
      };
    }

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready;

    // Register Firebase messaging service worker explicitly
    const swRegistration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
      { scope: "/" }
    );

    // Get messaging instance
    const messaging = getMessaging(app);

    // Generate token
    const token = await getToken(messaging, {
      vapidKey: process.env.REACT_APP_VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (!token) {
      return {
        success: false,
        error: "Failed to generate FCM token",
      };
    }

    return {
      success: true,
      token,
    };
  } catch (error) {
    console.error("Error generating FCM token:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

/**
 * Save FCM token to Firestore with metadata
 */
export const saveFCMTokenToFirestore = async (
  userId: string,
  token: string
): Promise<boolean> => {
  try {
    const db = getFirestore(app);
    const userRef = doc(db, "users", userId);

    await setDoc(
      userRef,
      {
        fcmToken: token,
        lastTokenUpdate: new Date().toISOString(),
        deviceInfo: getDeviceInfo(),
        tokenValidated: true,
      },
      { merge: true }
    );

    return true;
  } catch (error) {
    console.error("Error saving FCM token to Firestore:", error);
    return false;
  }
};

/**
 * Setup FCM token for a user
 */
export const setupFCMForUser = async (userId: string): Promise<FCMTokenResult> => {
  if (!userId) {
    return {
      success: false,
      error: "User ID is required",
    };
  }
  const tokenResult = await generateFCMToken();
  if (!tokenResult.success || !tokenResult.token) {
    return tokenResult;
  }

  const saved = await saveFCMTokenToFirestore(userId, tokenResult.token);
  if (!saved) {
    return {
      success: false,
      error: "Failed to save token to Firestore",
    };
  }

  // Setup foreground message listener
  try {
    const messaging = getMessaging(app);
    onMessage(messaging, (payload) => {
      
      if (payload.notification) {
        // Show notification if app is in foreground
        new Notification(payload.notification.title || "New Message", {
          body: payload.notification.body,
          icon: "/ic-like.png",
          tag: "fcm-message", // Prevent duplicate notifications
        });
      }
    });
  } catch (error) {
    console.error("Error setting up foreground message listener:", error);
  }

  return tokenResult;
};

/**
 * Refresh FCM token (useful when token becomes invalid)
 */
export const refreshFCMToken = async (userId: string): Promise<FCMTokenResult> => {
  try {
    // Delete existing token first
    const messaging = getMessaging(app);
    await deleteToken(messaging);
    
    // Generate new token
    return await setupFCMForUser(userId);
  } catch (error) {
    console.error("Error refreshing FCM token:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to refresh token",
    };
  }
};

/**
 * Validate current FCM setup
 */
export const validateFCMSetup = (): {
  supported: boolean;
  permission: NotificationPermission;
  serviceWorkerSupported: boolean;
  vapidConfigured: boolean;
  issues: string[];
} => {
  const issues: string[] = [];
  
  const supported = isFCMSupported();
  if (!supported) issues.push("FCM not supported in this environment");
  
  const serviceWorkerSupported = "serviceWorker" in navigator;
  if (!serviceWorkerSupported) issues.push("Service workers not supported");
  
  let permission: NotificationPermission = 'default';
  if (typeof Notification !== 'undefined') {
    permission = Notification.permission;
    if (permission !== 'granted') issues.push(`Notification permission: ${permission}`);
  } else {
    issues.push('Notification API not available');
  }
  
  const vapidConfigured = !!process.env.REACT_APP_VAPID_KEY;
  if (!vapidConfigured) issues.push("VAPID key not configured");
  
  return {
    supported,
    permission,
    serviceWorkerSupported,
    vapidConfigured,
    issues,
  };
};
