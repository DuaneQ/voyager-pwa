import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';
import logger from './utils/logger';

// Use a valid Stripe API version (e.g., 2024-05-01)
const stripe = new Stripe(process.env.STRIPE_API_KEY!, { apiVersion: '2022-11-15' });

// Expects authenticated user and their Stripe customer ID in Firestore
export const createStripePortalSession = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const uid = context.auth.uid;
    // Get user doc
    const userDoc = await admin.firestore().collection('users').doc(uid).get();
    const user = userDoc.data();
    if (!user || !user.stripeCustomerId) {
      throw new functions.https.HttpsError('not-found', 'Stripe customer ID not found for user');
    }
    // Determine return URL based on frontend origin (passed from client)
    let origin = 'https://travalpass.com';
    if (data && typeof data.origin === 'string' && data.origin.startsWith('http')) {
      origin = data.origin;
    }
  logger.info('[STRIPE PORTAL] Creating portal session with origin:', origin, { receivedOrigin: data?.origin, uid, email: user?.email });
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${origin}/search`,
    });
    return { url: session.url };
  } catch (err: any) {
    logger.error('[STRIPE PORTAL] Error creating portal session:', err);
    if (err instanceof functions.https.HttpsError) throw err;
    throw new functions.https.HttpsError('internal', err?.message || 'Failed to create Stripe portal session');
  }
});
