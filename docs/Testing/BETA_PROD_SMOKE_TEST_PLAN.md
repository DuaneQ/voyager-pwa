# Voyager PWA Beta Production Smoke Test Plan

## Purpose
This document outlines a manual smoke test plan for the Voyager PWA production release. It covers all major, critical user journeys to ensure the core functionality is working as expected before releasing to all users.

---

## 1. User Authentication
- [ ] **Sign Up**: Register a new user with Google and email/password.
- [ ] **Login**: Log in with existing credentials (Google and email/password).
- [ ] **Password Reset**: Request and complete a password reset.
- [ ] **Logout**: Log out and verify session ends.
- [ ] **Resend Email Verification**: Request verification email and confirm receipt.

## 2. Profile Management
- [ ] **View Profile**: Access and view user profile details.
- [ ] **Edit Profile**: Update profile fields (bio, gender, status, sexual orientation, education, drinking, smoking, DOB).
- [ ] **Profile Photo**: Upload/change profile photo and verify display.

## 3. Itinerary Management
- [ ] **Create Itinerary**: Add a new itinerary with all required fields.
- [ ] **Edit Itinerary**: Edit an existing itinerary.
- [ ] **Delete Itinerary**: Delete an itinerary and verify removal.
- [ ] **View Itineraries**: View list of own itineraries.

## 4. Search & Matching
- [ ] **Search for Matches**: Use search to find matching itineraries.
- [ ] **Apply Filters**: Filter search results by gender, status, sexual orientation, and date range.
- [ ] **Like/Pass**: Like or pass on itineraries and verify UI updates.
- [ ] **Daily Limit**: Reach daily free usage limit and verify premium prompt.

## 5. Chat & Connections
- [ ] **Start Chat**: Initiate chat with a matched user.
- [ ] **Send/Receive Messages**: Send and receive messages in real time.
- [ ] **Add/Remove Users**: Add or remove users from group chat.
- [ ] **Unread Badge**: Verify unread message badge in bottom navigation.
- [ ] **Profile from Chat**: View user profile from chat modal.

## 6. Premium Subscription
- [ ] **Upgrade to Premium**: Complete Stripe payment and unlock premium features.
- [ ] **Usage Tracking**: Verify unlimited usage after upgrade.
- [ ] **Billing Portal**: Access Stripe billing portal from profile.

## 7. Notifications
- [ ] **Push Notifications**: Receive FCM push notifications for new matches and messages (test on supported devices).
- [ ] **Foreground Notifications**: Receive in-app notifications while app is open.

## 8. PWA & Offline Support
- [ ] **Install PWA**: Install app on mobile/desktop.
- [ ] **Offline Mode**: Use app offline (view cached data, create itinerary, send message) and verify sync when back online.
- [ ] **Service Worker**: Confirm app loads with service worker enabled.

## 9. Navigation & UI
- [ ] **Bottom Navigation**: Switch between Search, Chat, and Profile tabs.
- [ ] **Responsive Design**: Verify layout on mobile and desktop.
- [ ] **Feedback Button**: Submit feedback from floating button.

## 10. Security & Access Control
- [ ] **Protected Routes**: Ensure unauthenticated users cannot access protected pages.
- [ ] **Data Privacy**: Verify users cannot access or modify other users' data.

---

## Smoke Test Instructions
1. Use both desktop and mobile browsers.
2. Test with at least two user accounts (one premium, one free).
3. Use incognito/private mode to verify session handling.
4. Log all issues found with steps to reproduce.

---

**Release Owner:**
- Name: ______________________
- Date: ______________________
- Version: ___________________

---

**Sign-off:**
- [ ] All critical user journeys have passed smoke testing.
- [ ] Ready for production release.
