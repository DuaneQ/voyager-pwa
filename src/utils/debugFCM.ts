// Enhanced FCM debugging utility for real device testing
import { validateFCMSetup, generateFCMToken, saveFCMTokenToFirestore, getDeviceInfo } from "./fcmUtils";
import { getAuth } from "firebase/auth";
import { app } from "../environments/firebaseConfig";

/**
 * Comprehensive FCM debugging for real devices
 */
export const debugFCMOnDevice = async () => {
  console.log("=== FCM Device Debug Report ===");
  
  // 1. Environment check
  console.log("1. Environment Check:");
  console.log("- User Agent:", navigator.userAgent);
  console.log("- Platform:", navigator.platform);
  console.log("- Online:", navigator.onLine);
  console.log("- HTTPS:", window.location.protocol === 'https:');
  console.log("- Service Worker Support:", 'serviceWorker' in navigator);
  console.log("- Notification Support:", 'Notification' in window);
  
  // 2. Permission status
  console.log("\n2. Permission Status:");
  console.log("- Current Permission:", Notification.permission);
  
  // 3. Configuration check
  console.log("\n3. Configuration Check:");
  console.log("- VAPID Key Present:", !!process.env.REACT_APP_VAPID_KEY);
  console.log("- VAPID Key Length:", process.env.REACT_APP_VAPID_KEY?.length || 0);
  
  // 4. User authentication
  console.log("\n4. User Authentication:");
  const auth = getAuth(app);
  const currentUser = auth.currentUser;
  console.log("- User Logged In:", !!currentUser);
  console.log("- User ID:", currentUser?.uid || "Not authenticated");
  
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
  
  // 6. FCM Setup validation
  console.log("\n6. FCM Setup Validation:");
  const validation = validateFCMSetup();
  console.log("- Setup Valid:", validation.supported);
  console.log("- Issues:", validation.issues);
  
  // 7. Token generation test
  console.log("\n7. Token Generation Test:");
  try {
    const tokenResult = await generateFCMToken();
    console.log("- Token Generation Success:", tokenResult.success);
    if (tokenResult.success && tokenResult.token) {
      console.log("- Token Preview:", `${tokenResult.token.substring(0, 20)}...`);
      console.log("- Token Length:", tokenResult.token.length);
      
      // 8. Save to Firestore test
      if (currentUser?.uid) {
        console.log("\n8. Firestore Save Test:");
        const saveResult = await saveFCMTokenToFirestore(currentUser.uid, tokenResult.token);
        console.log("- Save Success:", saveResult);
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
  console.log("- Device Info:", deviceInfo);
  
  console.log("\n=== End FCM Debug Report ===");
  
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
