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

const prodConfig = {
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL,
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
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

const firebaseConfig = isDevHost ? devConfig : prodConfig;

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const getMessagingInstance = () => {
  if (typeof window !== "undefined") {
    const { getMessaging } = require("firebase/messaging");
    return getMessaging(app);
  }
  return null;
};
