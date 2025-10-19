import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from 'firebase/functions';
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

// Only treat localhost and loopback as emulator hosts by default.
// Hosted preview channels (mundo1-dev.web.app, etc.) will use the deployed
// production functions unless you explicitly opt into the emulator with
// localStorage.setItem('USE_FUNCTIONS_EMULATOR','1') in the browser.
const devHosts = [
  "localhost",
  "127.0.0.1",
];

// Detect Firebase preview channels (e.g., mundo1-dev--pr52-*.web.app)
const isDevPreview =
  typeof window !== "undefined" &&
  window.location.hostname.includes("mundo1-dev-");

const isDevHost = typeof window !== "undefined" && devHosts.includes(window.location.hostname);


// Check if we're in Cypress
const isCypress = typeof window !== "undefined" && (window as any).Cypress;

// Always use dev config for Cypress, otherwise use environment detection
const firebaseConfig = isCypress || isDevHost ? devConfig : prodConfig;


export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Firestore instance with offline persistence
export const db = getFirestore(app);

// Export a Functions instance and connect to the emulator in dev
// Always use deployed Cloud Functions (production/staging). Do NOT connect to
// the local emulator from this runtime; remove any emulator wiring to ensure
// client calls go to the production/staging functions.
// Explicitly bind to the functions region used by our Cloud Functions
// deployments. This avoids the client SDK selecting a different host/region
// which can result in CORS/preflight failures when the request hits an
// unexpected endpoint.
export const functions = getFunctions(app, 'us-central1');

// Detect Safari browser
const isSafari = typeof window !== "undefined" && typeof navigator !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Only enable persistence in the browser (not in Node.js or test environments)
// Skip persistence on Safari in development to avoid CORS issues
if (typeof window !== "undefined" && !window.Cypress && process.env.NODE_ENV !== "test" && !(isSafari && isDevHost)) {
  import("firebase/firestore").then(({ enableIndexedDbPersistence }) => {
    if (typeof enableIndexedDbPersistence === "function") {
      enableIndexedDbPersistence(db, {
        forceOwnership: false // Allow multiple tabs and prevent Safari CORS issues
      })
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
            // For Safari CORS issues, we'll continue without persistence
            console.warn("[Firestore] Continuing without offline persistence");
          }
        });
    }
  });
} else if (isSafari && isDevHost) {
  console.log("[Firestore] Skipping offline persistence on Safari in development to avoid CORS issues");
}

export const getMessagingInstance = () => {
  // Enhanced browser support detection with safe navigation
  const isIOS = typeof window !== "undefined" && typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = typeof window !== "undefined" && typeof navigator !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isWebView = typeof window !== "undefined" && typeof navigator !== "undefined" && navigator.userAgent.includes('wv');
  
  // Don't initialize messaging on unsupported browsers
  // Type assertion for window.chrome which may not exist on all browsers
  const hasChrome = typeof window !== "undefined" && !!(window as any).chrome;
  if (isIOS || (isSafari && typeof window !== "undefined" && !hasChrome) || isWebView || isCypress) {
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

// DEV HELPER: expose common Firebase instances to window for manual token/debugging.
// ONLY enable in non-production and browser environments. Remove before shipping.
if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__FIREBASE__ = { auth, functions, db, app };
    // small helper to retrieve id token quickly
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__getIdToken = async (forceRefresh = true) => {
      const user = (window as any).__FIREBASE__.auth.currentUser;
      if (!user) throw new Error('No user signed in');
      return user.getIdToken(forceRefresh);
    };
    console.log('[DEV] Exposed __FIREBASE__ and __getIdToken() on window for debugging');
  } catch (e) {
    // ignore failures in weird environments
  }
}
