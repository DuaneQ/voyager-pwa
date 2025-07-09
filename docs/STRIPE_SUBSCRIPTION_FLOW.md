# Stripe Subscription Flow (Upgrade to Premium)

## 1. User Initiates Subscription (Upgrade)
- **Location:** `Search.tsx` (or any component using `SubscriptionCard`)
- **Action:**
  - User clicks the "Upgrade" button.
  - The app calls the Firebase Callable Function `createStripeCheckoutSession`.
  - The backend function:
    - Verifies the user is authenticated.
    - Looks up the user in Firestore.
    - If the user does not have a Stripe customer ID, creates one and saves it to Firestore.
    - Creates a Stripe Checkout Session for a subscription, attaching the user's UID as metadata.
    - Returns the session URL.
  - The frontend redirects the user to the returned Stripe Checkout Session URL.

## 2. Stripe Checkout
- **Action:**
  - User completes payment on Stripe's hosted checkout page.
  - On success, Stripe redirects the user to a return URL (configured in the Checkout Session):
    - **Production:** `https://travalpass.com/search?checkout=success`
    - **Development:** `http://localhost:3000/search?checkout=success` (if configured in Stripe)

## 3. Stripe Webhook (Backend)
- **Location:** `functions/src/index.ts` (Firebase Cloud Functions)
- **Action:**
  - Stripe sends a webhook event (e.g., `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`) to your backend endpoint:
    - `https://us-central1-mundo1-dev.cloudfunctions.net/stripeWebhook` (or your project's deployed webhook URL)
  - The webhook handler verifies the event and updates the user's subscription status in Firestore:
    - Uses the `metadata.uid` from the session to look up the user.
    - Updates the `users/{uid}` document with fields like `subscriptionType`, `subscriptionStartDate`, `subscriptionEndDate`, `subscriptionCancelled`, and `stripeCustomerId`.

## 4. User Profile Update
- **Location:** Firestore `users` collection
- **Action:**
  - After successful payment and webhook processing, the user's document is updated:
    - `subscriptionType: 'premium'`
    - `subscriptionStartDate: <date>`
    - `subscriptionEndDate: <date>`
    - `subscriptionCancelled: false`
    - `stripeCustomerId: <id>`
  - The app reads this data to unlock premium features for the user.

## 5. Managing Subscription (Stripe Portal)
- **Action:**
  - User clicks "Manage" (if already premium).
  - The app calls the Firebase Callable Function `createStripePortalSession`.
  - The backend function:
    - Verifies the user is authenticated.
    - Looks up the user's `stripeCustomerId` in Firestore.
    - Creates a Stripe Billing Portal session and returns the portal URL.
  - The frontend redirects the user to the Stripe Billing Portal.
  - User can manage/cancel their subscription in the portal.
  - On changes, Stripe sends webhook events to update Firestore.

---

# Stripe Subscription Cancellation Flow

## 1. User Initiates Cancellation
- User clicks "Manage" and is redirected to the Stripe Billing Portal.
- User cancels their subscription in the portal.

## 2. Stripe Webhook (Backend)
- Stripe sends a `customer.subscription.deleted` event to your webhook endpoint.
- The webhook handler:
  - Looks up the user by `stripeCustomerId` (from the event).
  - Updates the user's Firestore document:
    - Sets `subscriptionCancelled: true`.
    - (Optionally) keeps `subscriptionType: 'premium'` until the end of the billing period, or downgrades immediately based on your business logic.

## 3. App Reacts to Cancellation
- The app reads the updated user profile from Firestore.
- If `subscriptionCancelled: true`, the UI can show a warning or downgrade the user after the billing period ends.

---

# Summary
- All subscription creation and management is now handled securely via server-side functions.
- User identity is always linked via UID and Stripe customer ID.
- Webhooks ensure Firestore is always up to date with Stripe events.
- The app UI reflects the user's current subscription status in real time.