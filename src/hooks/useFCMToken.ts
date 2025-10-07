import { useEffect } from "react";
import { auth } from "../environments/firebaseConfig";
import { setupFCMForUser, validateFCMSetup, isFCMSupported } from "../utils/fcmUtils";

export const useFCMToken = () => {
  const userId = typeof auth !== 'undefined' && auth.currentUser ? auth.currentUser.uid : null; // Get UID from Firebase Auth

  useEffect(() => {
    // Early exit if FCM is not supported
    if (!isFCMSupported()) {
  // FCM not supported in this browser environment
      return;
    }

    // Add a small delay to ensure userId is loaded
    const timer = setTimeout(async () => {
      // We only need userId from Firebase Auth to proceed
      if (!userId) {
        return;
      }

      // Validate FCM setup first
      const validation = validateFCMSetup();

      if (validation.issues.length > 0) {
        console.warn("FCM: Setup issues detected:", validation.issues);
      }

      if (!validation.supported) {
  // FCM not supported in this environment
        return;
      }

      // Setup FCM for the user
      const result = await setupFCMForUser(userId);
      
      if (result.success) {
  // FCM setup completed
      } else {
        console.error("FCM: Setup failed:", result.error);
      }
    }, 1000); // 1 second delay

    return () => clearTimeout(timer);
  }, [userId]);

  return null;
};
