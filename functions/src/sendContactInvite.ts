/**
 * sendContactInvite.ts - Send invitation to contact
 * 
 * Records invite in Firestore for analytics tracking
 * Generates referral code for viral coefficient measurement
 * 
 * Future: Can integrate with SMS/Email services (Twilio, SendGrid)
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import logger from './utils/logger';
import * as crypto from 'crypto';

interface SendInviteRequest {
  contactIdentifier: string;  // Hashed phone or email
  inviteMethod: 'sms' | 'email' | 'link' | 'share';
  contactName?: string;       // Optional display name (not stored)
}

interface SendInviteResponse {
  success: boolean;
  referralCode: string;
  inviteLink: string;
  error?: string;
}

/**
 * Generate unique referral code for tracking invite acceptance
 */
function generateReferralCode(userId: string): string {
  const timestamp = Date.now().toString(36);
  const randomPart = crypto.randomBytes(4).toString('hex');
  const hash = crypto.createHash('sha256')
    .update(userId + timestamp + randomPart)
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();
  
  return hash;
}

/**
 * Send contact invite and track for viral coefficient
 * 
 * Rate Limiting: 100 invites per day per user (enforced client-side + here)
 * 
 * Analytics: Tracks inviter, method, timestamp for K-factor calculation
 */
export const sendContactInvite = functions.https.onCall(
  async (data: SendInviteRequest, context): Promise<SendInviteResponse> => {
    // 1. Authentication check
    if (!context.auth) {
      logger.warn('[sendContactInvite] Unauthenticated request');
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to send invites'
      );
    }

    const userId = context.auth.uid;
    logger.info(`[sendContactInvite] User ${userId} sending invite`);

    // 2. Input validation
    const { contactIdentifier, inviteMethod } = data;

    if (!contactIdentifier || typeof contactIdentifier !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'contactIdentifier is required'
      );
    }

    if (!['sms', 'email', 'link', 'share'].includes(inviteMethod)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'inviteMethod must be one of: sms, email, link, share'
      );
    }

    // Validate hash format (SHA-256 = 64 hex characters)
    if (!/^[a-f0-9]{64}$/i.test(contactIdentifier)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'contactIdentifier must be a valid SHA-256 hash (64 hex characters)'
      );
    }

    try {
      const db = admin.firestore();

      // 3. Check rate limit (100 invites per day)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const invitesToday = await db.collection('contactInvites')
        .where('inviterUserId', '==', userId)
        .where('invitedAt', '>=', admin.firestore.Timestamp.fromDate(today))
        .count()
        .get();

      if (invitesToday.data().count >= 100) {
        throw new functions.https.HttpsError(
          'resource-exhausted',
          'Daily invite limit reached (100 invites per day). Try again tomorrow.'
        );
      }

      // 4. Check for duplicate invite (same contact invited within 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentInvite = await db.collection('contactInvites')
        .where('inviterUserId', '==', userId)
        .where('contactIdentifier', '==', contactIdentifier)
        .where('invitedAt', '>=', admin.firestore.Timestamp.fromDate(sevenDaysAgo))
        .limit(1)
        .get();

      if (!recentInvite.empty) {
        // Return existing referral code instead of creating duplicate
        const existingInvite = recentInvite.docs[0].data();
        const inviteLink = 'https://travalpass.com';
        
        logger.info(`[sendContactInvite] Duplicate invite within 7 days, returning existing referral code`);
        
        return {
          success: true,
          referralCode: existingInvite.referralCode,
          inviteLink,
        };
      }

      // 5. Generate unique referral code
      const referralCode = generateReferralCode(userId);
      const inviteLink = 'https://travalpass.com';

      // 6. Store invite record for analytics
      await db.collection('contactInvites').add({
        inviterUserId: userId,
        contactIdentifier, // Hashed phone/email
        inviteMethod,
        referralCode,
        inviteLink,
        invitedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: 'sent',
        // Analytics fields (filled when accepted)
        acceptedAt: null,
        acceptedByUserId: null,
        conversionTimeMinutes: null,
      });

      // 7. Update user's invite count
      const userRef = db.collection('users').doc(userId);
      await userRef.update({
        'analytics.totalInvitesSent': admin.firestore.FieldValue.increment(1),
        [`analytics.invitesByChannel.${inviteMethod}`]: admin.firestore.FieldValue.increment(1),
      });

      logger.info(`[sendContactInvite] Invite recorded with referral code ${referralCode}`);

      // TODO: Future enhancement - integrate with Twilio/SendGrid for actual SMS/Email delivery
      // For now, client handles the actual sending via native APIs

      return {
        success: true,
        referralCode,
        inviteLink,
      };

    } catch (error: any) {
      // Re-throw HttpsError as-is
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      logger.error('[sendContactInvite] Error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to send invite: ' + error.message
      );
    }
  }
);
