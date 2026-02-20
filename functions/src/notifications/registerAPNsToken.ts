/**
 * Cloud Function: registerAPNsToken
 * 
 * Converts an iOS APNs device token into an FCM registration token
 * using Firebase's Instance ID batchImport API.
 * 
 * Why: expo-notifications getDevicePushTokenAsync() returns a raw APNs token
 * on iOS, which is NOT a valid FCM registration token. Firebase Admin SDK's
 * messaging.send() requires FCM tokens. This function bridges the gap.
 * 
 * Flow:
 *   iOS app gets APNs token → calls this function → gets FCM token back →
 *   saves FCM token to Firestore → cloud functions can send notifications
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';

const BUNDLE_ID = 'com.travalpass.app';

/**
 * Get an OAuth2 access token from the default service account credentials.
 * Cloud Functions have automatic access to Application Default Credentials.
 */
async function getAccessToken(): Promise<string> {
  try {
    const credential = admin.credential.applicationDefault();
    const tokenResult = await credential.getAccessToken();
    return tokenResult.access_token;
  } catch (error) {
    logger.error('Failed to get access token', { error });
    throw new HttpsError('internal', 'Failed to authenticate with Google services');
  }
}

export const registerAPNsToken = onCall(async (request) => {
  // Auth check
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be authenticated');
  }

  const { apnsToken, sandbox = false } = request.data;
  const uid = request.auth.uid;

  if (!apnsToken || typeof apnsToken !== 'string') {
    throw new HttpsError('invalid-argument', 'apnsToken is required and must be a string');
  }

  logger.info(`📱 registerAPNsToken called by ${uid}`, {
    tokenPreview: apnsToken.substring(0, 20) + '...',
    sandbox,
  });

  try {
    const accessToken = await getAccessToken();

    // Call Firebase Instance ID batchImport API
    // https://firebase.google.com/docs/cloud-messaging/manage-tokens#import-apns-tokens
    const response = await fetch('https://iid.googleapis.com/iid/v1:batchImport', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'access_token_auth': 'true',
      },
      body: JSON.stringify({
        application: BUNDLE_ID,
        sandbox,
        apns_tokens: [apnsToken],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('❌ IID batchImport HTTP error', {
        status: response.status,
        body: errorBody,
      });
      throw new HttpsError('internal', `IID API returned ${response.status}: ${errorBody}`);
    }

    const data = await response.json();
    logger.info('📬 IID batchImport response', { results: data.results });

    if (!data.results || data.results.length === 0) {
      throw new HttpsError('internal', 'No results from IID batchImport');
    }

    const result = data.results[0];

    if (result.status === 'OK' && result.registration_token) {
      logger.info('✅ APNs → FCM conversion succeeded', {
        fcmTokenPreview: result.registration_token.substring(0, 30) + '...',
      });
      return { fcmToken: result.registration_token };
    }

    logger.error('❌ APNs → FCM conversion failed', { result });
    throw new HttpsError('internal', `Token conversion failed: ${result.status}`);
  } catch (error) {
    if (error instanceof HttpsError) throw error;

    logger.error('❌ registerAPNsToken unexpected error', { error });
    throw new HttpsError('internal', 'Failed to convert APNs token');
  }
});
