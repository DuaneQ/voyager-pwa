import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'

const COLLECTION = 'ads_campaigns'

/**
 * Admin-only callable that returns all campaigns currently pending review.
 * Uses the Admin SDK so Firestore security rules are bypassed — only the
 * server-side UID check gates access.
 */
export const getPendingCampaigns = onCall({ region: 'us-central1' }, async (request) => {
  // ── Auth check ──────────────────────────────────────────────────────────────
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.')
  }

  const adminUids = (process.env.ADMIN_UIDS ?? process.env.ADMIN_UID ?? '')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean)
  if (adminUids.length === 0 || !adminUids.includes(request.auth.uid)) {
    throw new HttpsError('permission-denied', 'Admin access required.')
  }

  // ── Query ───────────────────────────────────────────────────────────────────
  // Note: no .orderBy() here — avoids requiring a composite index that isn't
  // deployed. The pending-review collection is small, so we sort in memory.
  const snapshot = await admin
    .firestore()
    .collection(COLLECTION)
    .where('isUnderReview', '==', true)
    .get()

  const campaigns = snapshot.docs
    .map((doc) => {
      const d = doc.data()
      return {
        id: doc.id,
        ...d,
        // Convert Firestore Timestamps to ISO strings for JSON serialisation
        createdAt: d.createdAt?.toDate?.()?.toISOString() ?? d.createdAt ?? '',
        updatedAt: d.updatedAt?.toDate?.()?.toISOString() ?? d.updatedAt ?? '',
      }
    })
    .sort((a, b) => {
      if (a.createdAt === b.createdAt) return 0
      return a.createdAt > b.createdAt ? -1 : 1 // newest first
    })

  return { campaigns }
})
