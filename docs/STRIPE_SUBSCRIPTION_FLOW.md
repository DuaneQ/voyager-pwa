# Stripe Subscription Flow (Upgrade to Premium)

## 1. User Clicks "Upgrade" Button
- **Location:** `Search.tsx` (or any component using `SubscriptionCard`)
- **Action:**
  - User clicks the "Upgrade" button.
  - The app immediately redirects the user to the Stripe Checkout URL:
    - `https://buy.stripe.com/5kQdR983e2Lhcom2HagIo00`
  - This is handled by setting `window.location.href` in the `handleSubscribe` function in `SubscriptionCard.tsx`.

## 2. Stripe Checkout
- **Action:**
  - User completes payment on Stripe's hosted checkout page.
  - On success, Stripe redirects the user to a return URL (configured in Stripe dashboard or Checkout session):
    - **Production:** `https://travalpass.com/search`
    - **Development:** `http://localhost:3000/search` (if configured in Stripe)

## 3. Stripe Webhook (Backend)
- **Location:** `functions/src/index.ts` (Firebase Cloud Functions)
- **Action:**
  - Stripe sends a webhook event (e.g., `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`) to your backend endpoint:
    - `https://us-central1-mundo1-dev.cloudfunctions.net/stripeWebhook` (or your project's deployed webhook URL)
    - Example: `stripeWebhook = functions.https.onRequest(app)`
  - The webhook handler verifies the event and updates the user's subscription status in Firestore:
    - Looks up the user by Stripe customer ID.
    - Updates the `users/{uid}` document with fields like `subscriptionType`, `subscriptionEndDate`, etc.

## 4. User Profile Update
- **Location:** Firestore `users` collection
- **Action:**
  - After successful payment and webhook processing, the user's document is updated:
    - `subscriptionType: 'premium'`
    - `subscriptionEndDate: <date>`
    - `subscriptionCancelled: false`
  - The app reads this data to unlock premium features.

## 5. Managing Subscription (Stripe Portal)
- **Action:**
  - User clicks "Manage" (if already premium).
  - Calls the Firebase function `createStripePortalSession` (see `functions/src/createStripePortalSession.ts`).
  - The function returns a Stripe Billing Portal URL and redirects the user there.
  - User can manage/cancel their subscription in the portal.
  - On changes, Stripe sends webhook events to update Firestore.

---