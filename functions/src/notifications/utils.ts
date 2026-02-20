/**
 * Notification Utilities for Push Notifications
 * 
 * Handles token retrieval and cleanup for FCM push notifications.
 * Uses simplified array field storage: users/{uid}.fcmTokens[]
 */

import * as admin from 'firebase-admin';
import type { BatchResponse } from 'firebase-admin/messaging';

/**
 * Get all FCM tokens for a user from Firestore
 * Reads from users/{userId}.fcmTokens array field
 * 
 * @param userId - The user's Firestore UID
 * @returns Array of Expo push tokens (e.g., "ExponentPushToken[abc123]")
 */
export async function getTokensForUser(userId: string): Promise<string[]> {
  try {
    const userDoc = await admin.firestore().doc(`users/${userId}`).get();
    
    if (!userDoc.exists) {
      console.warn(`User document not found: ${userId}`);
      return [];
    }
    
    const fcmTokens = userDoc.data()?.fcmTokens;
    
    if (!fcmTokens || !Array.isArray(fcmTokens)) {
      console.log(`No FCM tokens found for user: ${userId}`);
      return [];
    }
    
    return fcmTokens.filter((token: string) => typeof token === 'string' && token.length > 0);
  } catch (error) {
    console.error(`Error fetching tokens for user ${userId}:`, error);
    return [];
  }
}

/**
 * Clean up invalid FCM tokens after a failed send attempt
 * Removes failed tokens from users/{userId}.fcmTokens array
 * 
 * @param userId - The user's Firestore UID
 * @param tokensSent - Array of tokens that were sent to
 * @param response - BatchResponse from FCM send operation
 */
export async function cleanupInvalidTokens(
  userId: string,
  tokensSent: string[],
  response: BatchResponse
): Promise<void> {
  try {
    // Extract failed tokens based on response
    const failedTokens: string[] = [];
    
    response.responses.forEach((res, idx) => {
      if (!res.success) {
        const error = res.error;
        
        // Remove tokens with permanent failures
        // MessageRejected errors or invalid registration tokens should be cleaned up
        if (
          error?.code === 'messaging/invalid-registration-token' ||
          error?.code === 'messaging/registration-token-not-registered' ||
          error?.code === 'messaging/invalid-argument'
        ) {
          failedTokens.push(tokensSent[idx]);
          console.log(`Invalid token detected for user ${userId}: ${tokensSent[idx]} (${error.code})`);
        } else {
          // Log other errors but don't remove tokens (might be temporary)
          console.warn(`Temporary FCM error for user ${userId}: ${error?.code} - ${error?.message}`);
        }
      }
    });
    
    if (failedTokens.length === 0) {
      console.log(`No invalid tokens to clean up for user ${userId}`);
      return;
    }
    
    // Remove failed tokens from Firestore array
    const userRef = admin.firestore().doc(`users/${userId}`);
    await userRef.update({
      fcmTokens: admin.firestore.FieldValue.arrayRemove(...failedTokens)
    });
    
    console.log(`Cleaned up ${failedTokens.length} invalid tokens for user ${userId}`);
  } catch (error) {
    console.error(`Error cleaning up tokens for user ${userId}:`, error);
    // Don't throw - token cleanup is best effort
  }
}

/**
 * Truncate text to a maximum length with ellipsis
 * Used for notification body text
 * 
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Get display name for a user from Firestore
 * 
 * @param userId - The user's Firestore UID
 * @returns Display name or 'Someone' as fallback
 */
export async function getUserDisplayName(userId: string): Promise<string> {
  try {
    const userDoc = await admin.firestore().doc(`users/${userId}`).get();
    
    if (!userDoc.exists) {
      return 'Someone';
    }
    
    const userData = userDoc.data();
    return userData?.username || userData?.displayName || 'Someone';
  } catch (error) {
    console.error(`Error fetching display name for user ${userId}:`, error);
    return 'Someone';
  }
}
