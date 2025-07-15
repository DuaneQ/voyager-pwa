// Enhanced FCM debugging utility for real device testing
import { validateFCMSetup, generateFCMToken, saveFCMTokenToFirestore, getDeviceInfo } from "./fcmUtils";
import { getAuth } from "firebase/auth";
import { app } from "../environments/firebaseConfig";

/**
 * Comprehensive FCM debugging for real devices
 */
export const debugFCMOnDevice = async () => {

  const auth = getAuth(app);
  const currentUser = auth.currentUser;
  
  // 5. Service Worker status
  console.log("\n5. Service Worker Status:");
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log("- Active Registrations:", registrations.length);
    registrations.forEach((reg, index) => {
      console.log(`  [${index}] Scope: ${reg.scope}`);
      console.log(`  [${index}] State: ${reg.active?.state || 'inactive'}`);
    });
    
    // Check for Firebase messaging service worker specifically
    const firebaseSW = registrations.find(reg => 
      reg.scope.includes('firebase-messaging') || 
      reg.active?.scriptURL.includes('firebase-messaging')
    );
    console.log("- Firebase Messaging SW Found:", !!firebaseSW);
  } catch (error) {
    console.error("- Service Worker Check Error:", error);
  }

  const validation = validateFCMSetup();

  try {
    const tokenResult = await generateFCMToken();
    console.log("- Token Generation Success:", tokenResult.success);
    if (tokenResult.success && tokenResult.token) {
      
      // 8. Save to Firestore test
      if (currentUser?.uid) {
        console.log("\n8. Firestore Save Test:");
        const saveResult = await saveFCMTokenToFirestore(currentUser.uid, tokenResult.token);
      }
    } else {
      console.log("- Token Generation Error:", tokenResult.error);
    }
  } catch (error) {
    console.error("- Token Generation Error:", error);
  }
  
  // 9. Device info
  console.log("\n9. Device Information:");
  const deviceInfo = getDeviceInfo();

  
  return {
    environment: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      online: navigator.onLine,
      https: window.location.protocol === 'https:',
      serviceWorkerSupport: 'serviceWorker' in navigator,
      notificationSupport: 'Notification' in window,
    },
    permission: Notification.permission,
    configuration: {
      vapidKeyPresent: !!process.env.REACT_APP_VAPID_KEY,
      vapidKeyLength: process.env.REACT_APP_VAPID_KEY?.length || 0,
    },
    user: {
      loggedIn: !!currentUser,
      userId: currentUser?.uid || null,
    },
    validation,
  };
};

/**
 * Quick test function for browser console
 */
export const testFCM = () => {
  console.log("Running FCM test...");
  return debugFCMOnDevice();
};

/**
 * Legacy function for backward compatibility
 */
export const debugAndSaveFCMToken = async () => {
  console.log("Legacy debugAndSaveFCMToken called - redirecting to enhanced version");
  return debugFCMOnDevice();
};

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testFCM = testFCM;
  (window as any).debugFCMOnDevice = debugFCMOnDevice;
}
