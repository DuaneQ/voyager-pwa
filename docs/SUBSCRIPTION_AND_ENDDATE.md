# Subscription Logic and `subscriptionEndDate` Importance

## How Subscriptions Work

1. **User Upgrades to Premium**
   - User initiates a Stripe Checkout session.
   - On successful payment, Stripe sends a `checkout.session.completed` event to our webhook.
   - The webhook updates the user's Firestore document with:
     - `subscriptionType: 'premium'`
     - `subscriptionEndDate` (from Stripe)
     - `subscriptionCancelled: false`

2. **Subscription Auto-Renewal**
   - Stripe automatically renews subscriptions unless cancelled.
   - On renewal, Stripe sends a `customer.subscription.updated` event.
   - The webhook updates `subscriptionEndDate` to the new period.

3. **User Cancels Subscription**
   - User cancels via the Stripe portal.
   - Stripe sends a `customer.subscription.deleted` event.
   - The webhook sets `subscriptionCancelled: true` and updates `subscriptionEndDate` to the end of the current period.
   - **User retains premium access until `subscriptionEndDate` is reached.**

4. **Premium Access Logic**
   - The app checks:
     - `subscriptionType === 'premium'`
     - `subscriptionEndDate` is in the future
   - If both are true, the user has unlimited views.
   - If not, the user is limited to 20 views per day.

5. **Webhook Reliability**
   - If the webhook fails to update `subscriptionEndDate`, the user may lose access prematurely.
   - Monitoring and reconciliation are critical to ensure a seamless user experience.

---

## Why `subscriptionEndDate` Is Critical

- The `subscriptionEndDate` field in each user's Firestore document is the **single source of truth** for whether a user is considered "premium" in the app.
- The `useUsageTracking` hook checks if today's date is before or equal to `subscriptionEndDate` to determine if the user has unlimited itinerary views.
- If `subscriptionEndDate` is missing, in the past, or not updated, the user will lose premium access—even if they are still paying Stripe.
- **All premium access logic depends on this field being accurate and up-to-date.**

---

## Monitoring Webhook Logs for Failures

1. **Firebase Console:**
   - Go to [Google Cloud Functions logs](https://console.cloud.google.com/functions) for your project.
   - Filter logs for your `stripeWebhook` function.
   - Look for errors, especially those mentioning Firestore update failures or Stripe event parsing issues.
   - You can set up log-based alerts in Google Cloud to notify you of errors.

2. **Automated Alerts:**
   - In Google Cloud Logging, create an alert policy for log entries with severity `ERROR` or containing keywords like `STRIPE WEBHOOK` and `Error`.
   - This can send you email or Slack notifications if a webhook fails.

3. **Automated Reconciliation (Recommended):**
   - Write a scheduled (cron) Firebase Function or a script that:
     - Fetches all active Stripe subscriptions via the Stripe API.
     - For each, finds the corresponding Firestore user by `stripeCustomerId`.
     - Ensures Firestore `subscriptionEndDate` matches Stripe's `current_period_end`.
     - Updates Firestore if discrepancies are found.
   - Schedule this job to run daily or weekly.

---

## Summary Table

| Field                  | Purpose                                              |
|------------------------|------------------------------------------------------|
| `subscriptionType`     | Should be `'premium'` for premium users              |
| `subscriptionEndDate`  | Date until which user has premium access             |
| `subscriptionCancelled`| True if user cancelled, but access lasts until end   |

---

**In summary:**
- `subscriptionEndDate` is the key field for premium access.
- Stripe webhooks must update this field reliably.
- Monitor webhook logs and consider periodic reconciliation to prevent access issues.
- Ensure your tests cover all edge cases for premium/free logic and daily limits.
