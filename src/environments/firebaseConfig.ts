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
  projectId: "mundo1-1",
  appId: "1:533074391000:web:2ef7404546e97f4aa2ccad",
  databaseURL: "https://mundo1-1.firebaseio.com",
  storageBucket: "mundo1-1.appspot.com",
  locationId: "us-central",
  apiKey: "AIzaSyBzRHcKiuCj7vvqJxGDELs2zEXQ0QvQhbk",
  authDomain: "mundo1-1.firebaseapp.com",
  messagingSenderId: "533074391000",
};

// Use dev config only if running on localhost
const isLocalhost =
  typeof window !== "undefined" && window.location.hostname === "localhost";
const firebaseConfig = isLocalhost ? devConfig : prodConfig;

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const getMessagingInstance = () => {
  if (typeof window !== "undefined") {
    const { getMessaging } = require("firebase/messaging");
    return getMessaging(app);
  }
  return null;
};
