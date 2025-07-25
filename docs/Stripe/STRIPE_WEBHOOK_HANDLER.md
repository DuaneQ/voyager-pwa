# Stripe Webhook Handler Documentation (`functions/src/index.ts`)

This document provides a detailed explanation of all Stripe-related code in the `index.ts` backend file, focusing on the webhook handler and its logic for managing subscriptions, user upgrades, renewals, and cancellations.

---

## Overview

The Stripe webhook handler is implemented as an Express route, exported as a Firebase HTTPS function named `stripeWebhook`. It processes incoming Stripe webhook events to keep Firestore user documents in sync with Stripe subscription status.

**Key responsibilities:**
- Verifies Stripe webhook signatures for security.
- Handles subscription creation, renewal, and cancellation events.
- Updates Firestore user documents with subscription status, dates, and customer IDs.
- Provides detailed logging and error handling for troubleshooting.

---

## Webhook Route Setup

```ts
const app = express();
app.post("/", bodyParser.raw({ type: "application/json" }), async (req: any, res: any) => { ... });
export const stripeWebhook = functions.https.onRequest(app);
```
- The webhook endpoint is set up as an Express app with a single POST route.
- The raw body parser is used to allow Stripe signature verification.

---

## Signature Verification

```ts
const sig = req.headers["stripe-signature"];
let event: Stripe.Event;
try {
  event = stripe.webhooks.constructEvent(
    req.rawBody,
    sig as string,
    'whsec_...'
  );
  console.log(`[STRIPE WEBHOOK] Event received: ${event.type}`);
} catch (err: any) {
  console.error("[STRIPE WEBHOOK] Signature verification failed.", err.message, ...);
  return res.status(400).send(`Webhook Error: ${err.message}`);
}
```
- The handler verifies the Stripe signature using the secret.
- If verification fails, it logs the error and returns a 400 error.

---

## Event Handling Logic

The handler uses conditional statements to process different event types:

### 1. `checkout.session.completed`
- **When:** A user completes a Stripe Checkout for a subscription.
- **Logic:**
  - Extracts the session, user UID, and Stripe customer ID.
  - Determines the subscription start and end dates (fetches from Stripe if needed).
  - Updates the Firestore user document:
    - `stripeCustomerId`
    - `subscriptionType: 'premium'`
    - `subscriptionStartDate`
    - `subscriptionEndDate`
    - `subscriptionCancelled: false`
  - If UID is not present, attempts to find the user by email.
  - Logs all actions and errors.

### 2. `customer.subscription.updated`
- **When:** A subscription is renewed, upgraded, downgraded, or otherwise changed (e.g., billing period renewed).
- **Logic:**
  - Extracts the subscription object, customer ID, and new period start/end dates.
  - Finds the user by `stripeCustomerId` (or by email as fallback).
  - Updates the Firestore user document:
    - `subscriptionType: 'premium'`
    - `subscriptionStartDate` (if present)
    - `subscriptionEndDate` (if present)
    - `subscriptionCancelled: false`
  - Logs all actions and errors.

### 3. `customer.subscription.deleted`
- **When:** A subscription is canceled (by user or Stripe).
- **Logic:**
  - Extracts the subscription object, customer ID, and period end date.
  - Finds the user by `stripeCustomerId` (or by email as fallback).
  - Updates the Firestore user document:
    - `subscriptionCancelled: true`
    - `subscriptionEndDate` (if present)
  - Logs all actions and errors.

---

## Error Handling
- All database operations are wrapped in try/catch blocks.
- Errors are logged with context (user ID, customer ID, session ID, etc.).
- If a user cannot be found by customer ID, the handler attempts to find by email (if available in metadata).
- If no user is found, a warning is logged.

---

## Logging
- Every major action (user update, error, fallback) is logged with relevant details.
- This helps with troubleshooting issues in the Firebase Functions logs.

---

## Security
- Signature verification ensures only Stripe can trigger the webhook.
- No sensitive data is logged (body is truncated for logs).

---

## Summary Table of Event Handling

| Event Type                    | Firestore Update Fields                                 | Fallbacks/Notes                |
|-------------------------------|--------------------------------------------------------|---------------------------------|
| `checkout.session.completed`  | `stripeCustomerId`, `subscriptionType`, `subscriptionStartDate`, `subscriptionEndDate`, `subscriptionCancelled: false` | Tries by UID, then by email     |
| `customer.subscription.updated`| `subscriptionType`, `subscriptionStartDate`, `subscriptionEndDate`, `subscriptionCancelled: false` | Tries by customerId, then email |
| `customer.subscription.deleted`| `subscriptionCancelled: true`, `subscriptionEndDate`   | Tries by customerId, then email |

---

## Recommendations
- Ensure your Stripe webhook endpoint is configured to listen for all three events: `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted`.
- Monitor Firebase logs for errors or warnings.
- Test the full subscription lifecycle (purchase, renewal, cancellation) to verify Firestore updates.

---

## Example Log Output

```
[STRIPE WEBHOOK] Event received: customer.subscription.updated
[STRIPE WEBHOOK] User abc123 subscription renewed/updated after customer.subscription.updated { stripeCustomerId: 'cus_...', startDate: '...', endDate: '...' }
```

---

## See Also
- [Stripe Webhook Events Documentation](https://stripe.com/docs/api/events/types)
- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
