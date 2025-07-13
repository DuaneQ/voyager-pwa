importScripts(
  "https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js"
);

// Initialize Firebase in the service worker by passing in only the messagingSenderId
firebase.initializeApp({
  projectId: "mundo1-1",
  appId: "1:533074391000:web:2ef7404546e97f4aa2ccad",
  databaseURL: "https://mundo1-1.firebaseio.com",
  storageBucket: "mundo1-1.appspot.com",
  locationId: "us-central",
  apiKey: "AIzaSyBzRHcKiuCj7vvqJxGDELs2zEXQ0QvQhbk",
  authDomain: "mundo1-1.firebaseapp.com",
  messagingSenderId: "533074391000",
});

// Retrieve an instance of Firebase Messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function (payload) {
  // Customize notification here
  const notificationTitle = payload.notification.title || "TravalPass";
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/ic-like.png", 
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
