import * as functions from 'firebase-functions/v1'
import * as admin from 'firebase-admin'

const COLLECTION = 'ads_campaigns'

/**
 * Admin-only callable that returns all campaigns currently pending review.
 * Uses the Admin SDK so Firestore security rules are bypassed — only the
 * server-side UID check gates access.
 */
export const getPendingCampaigns = functions.https.onCall(async (_data, context) => {
  // ── Auth check ──────────────────────────────────────────────────────────────
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.')
  }

  const adminUid: string = process.env.ADMIN_UID ?? functions.config().admin?.uid ?? ''
  if (!adminUid || context.auth.uid !== adminUid) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required.')
  }

  // ── Query ───────────────────────────────────────────────────────────────────
  const snapshot = await admin
    .firestore()
    .collection(COLLECTION)
    .where('isUnderReview', '==', true)
    .orderBy('createdAt', 'desc')
    .get()

  const campaigns = snapshot.docs.map((doc) => {
    const d = doc.data()
    return {
      id: doc.id,
      ...d,
      // Convert Firestore Timestamps to ISO strings for JSON serialisation
      createdAt: d.createdAt?.toDate?.()?.toISOString() ?? d.createdAt ?? '',
      updatedAt: d.updatedAt?.toDate?.()?.toISOString() ?? d.updatedAt ?? '',
    }
  })

  return { campaigns }
})
