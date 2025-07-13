import { useEffect } from "react";
import { auth } from "../environments/firebaseConfig";
import { setupFCMForUser, validateFCMSetup } from "../utils/fcmUtils";

export const useFCMToken = () => {
  const userId = typeof auth !== 'undefined' && auth.currentUser ? auth.currentUser.uid : null; // Get UID from Firebase Auth

  useEffect(() => {
    // Add a small delay to ensure userId is loaded
    const timer = setTimeout(async () => {
      // We only need userId from Firebase Auth to proceed
      if (!userId) {
        console.log("FCM: Waiting for user ID...");
        return;
      }

      console.log("FCM: Setting up for user:", userId);

      // Validate FCM setup first
      const validation = validateFCMSetup();
      console.log("FCM: Setup validation:", validation);

      if (validation.issues.length > 0) {
        console.warn("FCM: Setup issues detected:", validation.issues);
      }

      if (!validation.supported) {
        console.log("FCM: Not supported in this environment");
        return;
      }

      // Setup FCM for the user
      const result = await setupFCMForUser(userId);
      
      if (result.success) {
        console.log("FCM: Setup completed successfully");
      } else {
        console.error("FCM: Setup failed:", result.error);
      }
    }, 1000); // 1 second delay

    return () => clearTimeout(timer);
  }, [userId]);

  return null;
};
