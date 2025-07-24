# FCM (Firebase Cloud Messaging) Testing Guide

This guide explains how to test push notifications in production using the FCMTestComponent.

## Overview

The FCMTestComponent is a temporary debugging component designed to test Firebase Cloud Messaging (FCM) functionality in production environments. It provides an interface to:

- Request notification permissions
- Generate FCM tokens
- Test notification delivery
- Debug FCM setup issues

## Location

The component is located at: `src/debug/FCMTestComponent.tsx`

## How to Use in Production

### 1. Temporarily Add to Your App

Add the component to any page where you want to test notifications:

```tsx
// In any component file (e.g., Profile.tsx, Dashboard.tsx, etc.)
import { FCMTestComponent } from '../debug/FCMTestComponent';

// Add inside your JSX return statement:
return (
  <div>
    {/* Your existing content */}
    
    {/* Temporary FCM Testing - REMOVE BEFORE PRODUCTION RELEASE */}
    {process.env.NODE_ENV === 'development' && <FCMTestComponent />}
  </div>
);
```

### 2. Test Notification Flow

1. **Load the page** with the FCMTestComponent
2. **Click "Request Permission"** - This will ask for notification permissions
3. **Click "Get FCM Token"** - This will generate a unique token for the device
4. **Copy the token** that appears in the results
5. **Use the token** to send test notifications from Firebase Console or your backend

### 3. Send Test Notifications

#### Option A: Firebase Console
1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Enter message details
4. In "Target" section, select "FCM registration token"
5. Paste the token from step 4 above
6. Send the message

#### Option B: Backend/Postman
```bash
curl -X POST https://fcm.googleapis.com/fcm/send \
  -H "Authorization: key=YOUR_SERVER_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "PASTE_TOKEN_HERE",
    "notification": {
      "title": "Test Notification",
      "body": "Testing FCM from production"
    }
  }'
```

### 4. Verify Setup

The component will show test results for:
- ✅ **Permission Status**: Whether notifications are allowed
- ✅ **Service Worker**: Whether FCM service worker is registered
- ✅ **Token Generation**: Whether FCM tokens can be created
- ✅ **Token Saving**: Whether tokens are saved to Firestore

## Troubleshooting

### Common Issues

1. **"Permission denied"**
   - User clicked "Block" on notification prompt
   - Clear browser data and try again
   - Check browser notification settings

2. **"Service worker not found"**
   - Ensure `public/firebase-messaging-sw.js` exists
   - Check browser dev tools → Application → Service Workers

3. **"Token not generated"**
   - Check VAPID key configuration
   - Verify Firebase project settings
   - Check network connectivity

4. **"Token not saved to Firestore"**
   - Check Firestore security rules
   - Verify user authentication
   - Check browser dev tools for errors

### Debug Steps

1. **Open browser dev tools** (F12)
2. **Check Console tab** for errors
3. **Check Network tab** for failed requests
4. **Check Application tab** → Service Workers for SW status

## Environment Variables Required

Ensure these are set in your environment:

```env
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_VAPID_KEY=your_vapid_key
```

## Security Notes

⚠️ **IMPORTANT**: 
- Only use this component in development/staging environments
- Remove before production deployment
- Never commit sensitive tokens or keys to version control
- The component should be wrapped in `process.env.NODE_ENV === 'development'` checks

## Service Worker File

Ensure you have the FCM service worker at `public/firebase-messaging-sw.js`:

```javascript
// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
```

## Cleanup

After testing is complete:

1. **Remove the import** from your component
2. **Remove the JSX** that renders FCMTestComponent
3. **Keep the file** at `src/debug/FCMTestComponent.tsx` for future testing needs
4. **Commit your changes** without the temporary test code

## Production Testing Checklist

- [ ] Notifications work on desktop Chrome
- [ ] Notifications work on mobile Chrome
- [ ] Notifications work on desktop Firefox
- [ ] Notifications work on mobile Safari (iOS 16.4+)
- [ ] Background notifications work when app is closed
- [ ] Token refresh works correctly
- [ ] Notification permissions persist across sessions
- [ ] Unsubscribe functionality works
- [ ] Notification clicks open the correct app page

## Need Help?

If you encounter issues:
1. Check the browser console for errors
2. Verify Firebase project configuration
3. Test with a minimal notification payload first
4. Compare with working examples in the codebase