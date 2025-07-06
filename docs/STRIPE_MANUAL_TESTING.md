# Manual Testing: Stripe Subscription Flow

## Prerequisites
- Test user account in your app
- Stripe test mode enabled
- Access to Firestore and Firebase Functions logs

## Test Steps

### 1. Upgrade to Premium
- Log in as a test user
- Click the "Upgrade" button (should redirect to Stripe Checkout)
- Complete payment using a Stripe test card (e.g., 4242 4242 4242 4242)
- After payment, confirm redirection to the app (return URL)

### 2. Webhook Processing
- In Firebase Functions logs, confirm receipt of `checkout.session.completed` or `customer.subscription.created` event
- Confirm the user's Firestore document is updated:
  - `subscriptionType: 'premium'`
  - `subscriptionEndDate` is set and in the future
  - `subscriptionCancelled: false`

### 3. App Validation
- Refresh the app or log in again
- Confirm premium features are unlocked (e.g., unlimited searches)
- The UI should show "Premium" and a "Manage" button

### 4. Manage Subscription
- Click "Manage"
- Confirm redirection to the Stripe Billing Portal
- Make changes (e.g., cancel subscription)
- Confirm Stripe sends webhook events and Firestore is updated accordingly
- After cancellation, `subscriptionType` should revert to `free` or similar, and `subscriptionCancelled: true`

### 5. Validation Checkpoints
- **Before payment:** `subscriptionType` is `free`
- **After payment:** `subscriptionType` is `premium`, `subscriptionEndDate` is set
- **After cancellation:** `subscriptionType` is `free` or `subscriptionCancelled: true`
- **On error:** UI should show error messages if Stripe or backend fails

## Troubleshooting
- If the user is not upgraded, check the webhook logs in Firebase Functions
- Ensure the webhook endpoint is publicly accessible and configured in Stripe dashboard
- Check Firestore for correct user document updates
- Use Stripe dashboard to view test payments and subscriptions
