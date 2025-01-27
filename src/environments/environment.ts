// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// This file can be replaced during build by using the `fileReplacements` array.
// `ng build --prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const firebaseConfig = {
  projectId: "mundo1-1",
  appId: "1:533074391000:web:2ef7404546e97f4aa2ccad",
  databaseURL: "https://mundo1-1.firebaseio.com",
  storageBucket: "mundo1-1.appspot.com",
  locationId: "us-central",
  apiKey: "AIzaSyBzRHcKiuCj7vvqJxGDELs2zEXQ0QvQhbk",
  authDomain: "mundo1-1.firebaseapp.com",
  messagingSenderId: "533074391000",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export { app };
