import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2022-11-15' });

export const createStripeCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  const uid = context.auth.uid;
  const userRef = admin.firestore().collection('users').doc(uid);
  const userDoc = await userRef.get();
  const user = userDoc.data();

  let stripeCustomerId = user?.stripeCustomerId;
  if (!stripeCustomerId) {
    // Create Stripe customer and save to Firestore
    const customer = await stripe.customers.create({
      email: user?.email,
      metadata: { uid }
    });
    stripeCustomerId = customer.id;
    await userRef.update({ stripeCustomerId });
  }

  // Determine return URLs based on frontend origin (passed from client)
  let origin = 'https://travalpass.com';
  if (data && typeof data.origin === 'string' && data.origin.startsWith('http')) {
    origin = data.origin;
  }
  console.log('[STRIPE CHECKOUT] Creating session with origin:', origin, { receivedOrigin: data?.origin, uid, email: user?.email });
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    customer: stripeCustomerId,
    metadata: { uid },
    success_url: `${origin}/search?checkout=success`,
    cancel_url: `${origin}/search?checkout=cancel`,
  });

  return { url: session.url };
});
