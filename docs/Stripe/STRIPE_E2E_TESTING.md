# Stripe End-to-End Testing with Stripe CLI and Firebase Cloud Functions

This guide explains how to test your Stripe-related Firebase Cloud Functions (including webhook handling and Firestore user updates) using the Stripe CLI and Stripe's test mode. This ensures your `users` collection is updated for subscription events without making real payments.

---

## 1. Switch to Stripe Test Mode

- **API Keys:**
  - Use your Stripe **test secret key** (starts with `sk_test_...`) and **test webhook secret** (starts with `whsec_...`) in your local environment.
  - **Do NOT use live keys for testing.**

### Where to update in your code
- In `functions/src/index.ts`, find the Stripe initialization:
  ```typescript
  const stripe = new Stripe('sk_live_...', { apiVersion: ... });
  ```
- **Change to your test secret key:**
  ```typescript
  const stripe = new Stripe('sk_test_YOUR_TEST_SECRET_KEY', { apiVersion: ... });
  ```
- Also update the webhook secret in the webhook handler:
  ```typescript
  event = stripe.webhooks.constructEvent(
    req.rawBody,
    sig as string,
    'whsec_YOUR_TEST_WEBHOOK_SECRET'
  );
  ```
- You can find your test keys in the Stripe Dashboard under Developers > API keys and Webhooks.

---

## 2. Deploy or Run Functions Locally

- **Local:** Use the Firebase Emulator Suite to run your functions locally:
  ```sh
  firebase emulators:start --only functions
  ```
- **Deployed:** If testing on a deployed function, use the public URL.

---

## 3. Install and Set Up Stripe CLI

- Install Stripe CLI:
  ```sh
  brew install stripe/stripe-cli/stripe
  # or see https://stripe.com/docs/stripe-cli for other OS
  ```
- Log in:
  ```sh
  stripe login
  ```

---

## 4. Forward Webhooks to Your Local Function

- Find your local webhook endpoint URL. For the emulator, it is usually:
  ```
  http://localhost:5001/YOUR_FIREBASE_PROJECT/us-central1/stripeWebhook
  ```
- Start forwarding events:
  ```sh
  stripe listen --forward-to http://localhost:5001/Mundo1-dev/us-central1/stripeWebhook
  ```
- The CLI will print a webhook signing secret. Use this as your `whsec_...` in the code above.

---

## 5. Create Test Data in Stripe

- Use your app or Stripe Dashboard to create a test customer and a test checkout session **in test mode**.
- Make sure the test customer’s email or metadata matches a user in your Firestore `users` collection.

---

## 6. Trigger Test Events

- Use the Stripe CLI to trigger events:
  ```sh
  stripe trigger checkout.session.completed
  stripe trigger customer.subscription.updated
  stripe trigger customer.subscription.deleted
  ```
- These will send real test-mode events to your webhook, using real test objects from your Stripe test account.

---

## 7. Verify Firestore Updates

- Check your Firestore `users` collection for updates to `subscriptionType`, `subscriptionEndDate`, etc.
- Use the Firebase Emulator UI or Firebase Console (if testing on deployed functions).

---

## 8. Troubleshooting

- If the user is not updated, check:
  - The event payload’s `customer` or `customer_email` matches a user in Firestore.
  - The webhook secret and API key are set to test values.
  - The function logs for errors.

---

## Summary Table
| Step | Action | Where |
|------|--------|-------|
| 1    | Set Stripe test keys | `functions/src/index.ts` |
| 2    | Run functions locally | Terminal |
| 3    | Install Stripe CLI | Terminal |
| 4    | Forward webhooks | Terminal |
| 5    | Create test data | App/Stripe Dashboard |
| 6    | Trigger events | Terminal |
| 7    | Verify Firestore | Emulator UI/Console |

---

## 9. Manual Test Scenarios Checklist

To ensure your Stripe integration is robust, perform these manual tests:

### Subscription Lifecycle
- [ ] **Subscribe (New User):**
  - Create a new user and subscribe via your app.
  - Verify Firestore updates and UI reflects “premium” status.
- [ ] **Cancel Subscription:**
  - Use “Cancel now” and “Cancel at period end” in the Stripe Dashboard.
  - Confirm Firestore updates (`subscriptionCancelled: true` for immediate, and at period end for scheduled).
- [ ] **Resubscribe:**
  - After cancellation, attempt to resubscribe via your app.
  - Confirm Firestore and UI update to active subscription.
- [ ] **Manage Subscription:**
  - Open the Stripe Portal from your app.
  - Test updating payment method, viewing invoices, and (if enabled) resubscribing.

### Stripe Events
- [ ] **Subscription Renewal:**
  - Simulate a renewal event using the Stripe CLI:
    ```sh
    stripe trigger invoice.payment_succeeded
    ```
  - Confirm Firestore `subscriptionEndDate` updates.
- [ ] **Failed Payment:**
  - Simulate a failed payment (e.g., using a test card that fails).
  - Confirm the user is notified and Firestore reflects the failed state if you handle it.
- [ ] **Webhook Failure Handling:**
  - Temporarily break your webhook (e.g., wrong secret) and confirm errors are logged and handled gracefully.

### Environment & Edge Cases
- [ ] **Test Mode vs. Live Mode:**
  - Double-check that test keys are used in test mode and live keys in production.
- [ ] **Edge Cases:**
  - Try subscribing with an existing Stripe customer ID.
  - Try canceling a subscription that’s already canceled.

---

If all these pass, your Stripe integration is robust and production-ready!

For more, see:
- [Stripe CLI docs](https://stripe.com/docs/stripe-cli)
- [Firebase Emulator docs](https://firebase.google.com/docs/emulator-suite)
