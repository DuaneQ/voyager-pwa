import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

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
  databaseURL: typeof process !== 'undefined' ? process.env?.REACT_APP_FIREBASE_DATABASE_URL : '',
  apiKey: typeof process !== 'undefined' ? process.env?.REACT_APP_FIREBASE_API_KEY : '',
  authDomain: typeof process !== 'undefined' ? process.env?.REACT_APP_FIREBASE_AUTH_DOMAIN : '',
  projectId: typeof process !== 'undefined' ? process.env?.REACT_APP_FIREBASE_PROJECT_ID : '',
  storageBucket: typeof process !== 'undefined' ? process.env?.REACT_APP_FIREBASE_STORAGE_BUCKET : '',
  messagingSenderId: typeof process !== 'undefined' ? process.env?.REACT_APP_FIREBASE_MESSAGING_SENDER_ID : '',
  appId: typeof process !== 'undefined' ? process.env?.REACT_APP_FIREBASE_APP_ID : '',
  locationId: "us-central",
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

console.log("=== FIREBASE CONFIG DEBUG ===");
console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("REACT_APP_FIREBASE_API_KEY:", process.env.REACT_APP_FIREBASE_API_KEY);
console.log("REACT_APP_FIREBASE_AUTH_DOMAIN:", process.env.REACT_APP_FIREBASE_AUTH_DOMAIN);
console.log("REACT_APP_FIREBASE_PROJECT_ID:", process.env.REACT_APP_FIREBASE_PROJECT_ID);
console.log("REACT_APP_FIREBASE_STORAGE_BUCKET:", process.env.REACT_APP_FIREBASE_STORAGE_BUCKET);
console.log("REACT_APP_FIREBASE_MESSAGING_SENDER_ID:", process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID);
console.log("REACT_APP_FIREBASE_APP_ID:", process.env.REACT_APP_FIREBASE_APP_ID);
console.log("REACT_APP_FIREBASE_MEASUREMENT_ID:", process.env.REACT_APP_FIREBASE_MEASUREMENT_ID);
console.log("firebaseConfig:", firebaseConfig);

export const getMessagingInstance = () => {
  if (typeof window !== "undefined" && !isCypress) {
    const { getMessaging } = require("firebase/messaging");
    return getMessaging(app);
  }
  return null;
};
