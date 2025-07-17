import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// App Check import temporarily removed for emergency hotfix
// import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";

const devConfig = {
  apiKey: "AIzaSyCbckV9cMuKUM4ZnvYDJZUvfukshsZfvM0",
  authDomain: "mundo1-dev.firebaseapp.com",
  projectId: "mundo1-dev",
  storageBucket: "mundo1-dev.firebasestorage.app",
  messagingSenderId: "296095212837",
  appId: "1:296095212837:web:6fd8f831e3d7f642f726cc",
  measurementId: "G-ZNYVKS2SBF",
};

// Safely access process.env only if process exists
const prodConfig = {
  apiKey: "AIzaSyBzRHcKiuCj7vvqJxGDELs2zEXQ0QvQhbk",
  authDomain: "mundo1-1.firebaseapp.com",
  databaseURL: "https://mundo1-1.firebaseio.com",
  projectId: "mundo1-1",
  storageBucket: "mundo1-1.appspot.com",
  messagingSenderId: "533074391000",
  appId: "1:533074391000:web:2ef7404546e97f4aa2ccad",
  measurementId: "G-P99K8KRBYJ"
};

const devHosts = [
  "localhost",
  "127.0.0.1",
  "mundo1-dev.web.app",
  "mundo1-dev.firebaseapp.com",
];

// Detect Firebase preview channels (e.g., mundo1-dev--pr52-*.web.app)
const isDevPreview =
  typeof window !== "undefined" &&
  window.location.hostname.includes("mundo1-dev-");

const isDevHost =
  typeof window !== "undefined" &&
  (devHosts.includes(window.location.hostname) || isDevPreview);

// Check if we're in Cypress
const isCypress = typeof window !== "undefined" && (window as any).Cypress;

// Always use dev config for Cypress, otherwise use environment detection
const firebaseConfig = isCypress || isDevHost ? devConfig : prodConfig;


export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Firestore instance with offline persistence
export const db = getFirestore(app);

// Only enable persistence in the browser (not in Node.js or test environments)
if (typeof window !== "undefined" && !window.Cypress && process.env.NODE_ENV !== "test") {
  import("firebase/firestore").then(({ enableIndexedDbPersistence }) => {
    if (typeof enableIndexedDbPersistence === "function") {
      enableIndexedDbPersistence(db)
        .then(() => {
          if (process.env.NODE_ENV !== "production") {
          }
        })
        .catch((err) => {
          if (err.code === "failed-precondition") {
            console.warn("[Firestore] Persistence failed: Multiple tabs open");
          } else if (err.code === "unimplemented") {
            console.warn("[Firestore] Persistence is not available in this browser");
          } else {
            console.error("[Firestore] Error enabling persistence:", err);
          }
        });
    }
  });
}

export const getMessagingInstance = () => {
  // Enhanced browser support detection
  const isIOS = typeof window !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = typeof window !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isWebView = typeof window !== "undefined" && window.navigator.userAgent.includes('wv');
  
  // Don't initialize messaging on unsupported browsers
  // Type assertion for window.chrome which may not exist on all browsers
  const hasChrome = typeof window !== "undefined" && !!(window as any).chrome;
  if (isIOS || (isSafari && typeof window !== "undefined" && !hasChrome) || isWebView || isCypress) {
    console.log("FCM: Messaging not supported in this browser environment");
    return null;
  }
  
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    try {
      const { getMessaging } = require("firebase/messaging");
      return getMessaging(app);
    } catch (error) {
      console.warn("FCM: Failed to initialize messaging:", error);
      return null;
    }
  }
  return null;
};
