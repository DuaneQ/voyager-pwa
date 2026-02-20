/**
 * matchContactsWithUsers.ts - Contact Discovery Cloud Function
 * 
 * Matches hashed phone numbers and emails against Firebase users
 * Privacy-first: Only receives SHA-256 hashed identifiers, never raw contact data
 * 
 * Cost: ~$0.06 per 1000 requests (Cloud Functions invocation)
 * Firestore reads: Batched queries (10 hashes per query)
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import logger from './utils/logger';

interface MatchContactsRequest {
  hashedIdentifiers: string[];
}

interface MatchedContact {
  hash: string;
  userId: string;
  displayName: string;
  username?: string;
  profilePhotoUrl?: string;
}

interface MatchContactsResponse {
  success: boolean;
  matches: MatchedContact[];
  totalHashes: number;
  totalMatches: number;
  error?: string;
}

/**
 * Match hashed contacts against Firebase users
 * 
 * Security:
 * - Requires authentication
 * - Rate limited to 1000 hashes per request
 * - Client-side hashing ensures raw contact data never reaches server
 * 
 * Performance:
 * - Firestore 'in' queries support max 10 items per query
 * - Batch processing prevents timeout on large contact lists
 * - Deduplicates users found via multiple identifiers (phone + email)
 */
export const matchContactsWithUsers = functions.https.onCall(
  async (data: MatchContactsRequest, context): Promise<MatchContactsResponse> => {
    const startTime = Date.now();

    // 1. Authentication check
    if (!context.auth) {
      logger.warn('[matchContactsWithUsers] Unauthenticated request');
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to match contacts'
      );
    }

    const userId = context.auth.uid;
    logger.info(`[matchContactsWithUsers] User ${userId} matching contacts`);

    // 2. Input validation
    const { hashedIdentifiers } = data;

    if (!hashedIdentifiers || !Array.isArray(hashedIdentifiers)) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'hashedIdentifiers must be an array'
      );
    }

    if (hashedIdentifiers.length === 0) {
      return {
        success: true,
        matches: [],
        totalHashes: 0,
        totalMatches: 0,
      };
    }

    // 3. Rate limiting (max 1000 hashes per request)
    if (hashedIdentifiers.length > 1000) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Maximum 1000 identifiers per request (received ' + hashedIdentifiers.length + ')'
      );
    }

    // 4. Validate hash format (SHA-256 = 64 hex characters)
    const invalidHashes = hashedIdentifiers.filter(
      hash => typeof hash !== 'string' || !/^[a-f0-9]{64}$/i.test(hash)
    );

    if (invalidHashes.length > 0) {
      logger.warn(`[matchContactsWithUsers] Invalid hash format: ${invalidHashes.slice(0, 3).join(', ')}`);
      throw new functions.https.HttpsError(
        'invalid-argument',
        `Invalid hash format. Expected 64 hex characters. Found ${invalidHashes.length} invalid hashes.`
      );
    }

    try {
      const db = admin.firestore();
      const matches: MatchedContact[] = [];
      const matchedUserIds = new Set<string>(); // Track to prevent duplicates

      // 5. Batch processing (Firestore 'in' query supports max 10 items)
      const batchSize = 10;
      const batches = Math.ceil(hashedIdentifiers.length / batchSize);

      logger.info(`[matchContactsWithUsers] Processing ${hashedIdentifiers.length} hashes in ${batches} batches`);

      for (let i = 0; i < hashedIdentifiers.length; i += batchSize) {
        const batch = hashedIdentifiers.slice(i, i + batchSize);

        // Query users by phoneHash
        const phoneQuery = db.collection('users')
          .where('phoneHash', 'in', batch)
          .select('displayName', 'username', 'profilePhotoUrl', 'phoneHash');

        const phoneMatches = await phoneQuery.get();

        phoneMatches.forEach(doc => {
          const userId = doc.id;
          
          // Skip if already matched (prevents duplicates)
          if (matchedUserIds.has(userId)) return;
          
          // Skip self-match
          if (userId === context.auth!.uid) return;

          const userData = doc.data();
          matches.push({
            hash: userData.phoneHash,
            userId: userId,
            displayName: userData.displayName || 'TravalPass User',
            username: userData.username,
            profilePhotoUrl: userData.profilePhotoUrl,
          });

          matchedUserIds.add(userId);
        });

        // Query users by emailHash
        const emailQuery = db.collection('users')
          .where('emailHash', 'in', batch)
          .select('displayName', 'username', 'profilePhotoUrl', 'emailHash');

        const emailMatches = await emailQuery.get();

        emailMatches.forEach(doc => {
          const userId = doc.id;
          
          // Skip if already matched (same user via phone)
          if (matchedUserIds.has(userId)) return;
          
          // Skip self-match
          if (userId === context.auth!.uid) return;

          const userData = doc.data();
          matches.push({
            hash: userData.emailHash,
            userId: userId,
            displayName: userData.displayName || 'TravalPass User',
            username: userData.username,
            profilePhotoUrl: userData.profilePhotoUrl,
          });

          matchedUserIds.add(userId);
        });
      }

      const duration = Date.now() - startTime;
      logger.info(`[matchContactsWithUsers] Found ${matches.length} matches in ${duration}ms`);

      // 6. Store sync metadata for analytics
      try {
        await db.collection('contactSyncs').add({
          userId: context.auth.uid,
          totalHashes: hashedIdentifiers.length,
          totalMatches: matches.length,
          matchRate: matches.length / hashedIdentifiers.length,
          syncedAt: admin.firestore.FieldValue.serverTimestamp(),
          durationMs: duration,
        });
      } catch (analyticsError) {
        // Don't fail the request if analytics fails
        logger.error('[matchContactsWithUsers] Analytics error:', analyticsError);
      }

      return {
        success: true,
        matches,
        totalHashes: hashedIdentifiers.length,
        totalMatches: matches.length,
      };

    } catch (error: any) {
      logger.error('[matchContactsWithUsers] Error:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to match contacts: ' + error.message
      );
    }
  }
);
