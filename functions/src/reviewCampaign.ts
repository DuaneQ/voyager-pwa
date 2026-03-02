import { onCall, HttpsError } from 'firebase-functions/v2/https'
import * as admin from 'firebase-admin'

const COLLECTION = 'ads_campaigns'

/**
 * Admin-only callable that approves or rejects an ad campaign.
 *
 * Caller must be authenticated and their UID must match the ADMIN_UID
 * environment variable (set in .env / .env.mundo1-1).
 *
 * Approve: sets status → 'active', isUnderReview → false
 * Reject:  sets status → 'paused', isUnderReview → false, reviewNote → note
 */
export const reviewCampaign = onCall({ region: 'us-central1' }, async (request) => {
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

  // ── Input validation ────────────────────────────────────────────────────────
  const { campaignId, action, note } = request.data as {
    campaignId?: string
    action?: string
    note?: string
  }

  if (!campaignId || typeof campaignId !== 'string') {
    throw new HttpsError('invalid-argument', 'campaignId is required.')
  }
  if (action !== 'approve' && action !== 'reject') {
    throw new HttpsError('invalid-argument', 'action must be "approve" or "reject".')
  }
  if (action === 'reject' && (!note || !note.trim())) {
    throw new HttpsError('invalid-argument', 'A rejection note is required.')
  }

  // ── Update ──────────────────────────────────────────────────────────────────
  const db = admin.firestore()
  const update: Record<string, unknown> = {
    isUnderReview: false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }

  if (action === 'approve') {
    update.status = 'active'

    // ── Set budgetCents for atomic budget tracking ─────────────────────────
    // The advertiser portal stores budgetAmount as a dollar string ("50").
    // Convert to integer cents (5000) so logAdEvents can use
    // FieldValue.increment(-N) without floating-point issues.
    const preSnap = await db.collection(COLLECTION).doc(campaignId).get()
    const preData = preSnap.data()
    if (preData?.budgetAmount) {
      const dollars = parseFloat(preData.budgetAmount)
      if (!isNaN(dollars) && dollars > 0) {
        update.budgetCents = Math.round(dollars * 100)
      }
    }
  } else {
    update.status = 'paused'
    update.reviewNote = note!.trim()
  }

  await db.collection(COLLECTION).doc(campaignId).update(update)

  // ── Email notification to advertiser ────────────────────────────────────────
  try {
    const campaignSnap = await db.collection(COLLECTION).doc(campaignId).get()
    const campaign = campaignSnap.data()
    const userEmail: string = campaign?.userEmail ?? ''

    if (userEmail) {
      const isApproved = action === 'approve'
      const mailDoc = {
        to: userEmail,
        from: 'no-reply@travalpass.com',
        message: {
          subject: isApproved
            ? `✅ Your campaign "${campaign?.name}" has been approved`
            : `❌ Your campaign "${campaign?.name}" needs changes`,
          text: isApproved
            ? `Great news! Your ad campaign "${campaign?.name}" has been reviewed and approved. It is now active and will begin serving ads on the scheduled dates.\n\nManage your campaign: https://ads.travalpass.com`
            : `Your ad campaign "${campaign?.name}" was reviewed and requires changes before it can go live.\n\nReview note from our team:\n${note}\n\nPlease update your campaign and resubmit: https://ads.travalpass.com`,
          html: isApproved
            ? `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #2e7d32 0%, #66bb6a 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; font-size: 22px;">✅ Campaign Approved!</h1>
                </div>
                <div style="background: white; padding: 24px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
                  <p style="font-size: 16px; color: #333;">Great news! Your ad campaign <strong>${campaign?.name}</strong> has been reviewed and <strong style="color:#2e7d32">approved</strong>.</p>
                  <p style="color: #555;">It is now active and will begin serving ads on your scheduled dates.</p>
                  <div style="text-align: center; margin-top: 24px;">
                    <a href="https://ads.travalpass.com"
                       style="display: inline-block; background: #2e7d32; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;"
                    >Manage Your Campaign</a>
                  </div>
                </div>
              </div>`
            : `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #c62828 0%, #ef5350 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; font-size: 22px;">❌ Campaign Needs Changes</h1>
                </div>
                <div style="background: white; padding: 24px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
                  <p style="font-size: 16px; color: #333;">Your ad campaign <strong>${campaign?.name}</strong> was reviewed and requires changes before it can go live.</p>
                  <div style="background: #fff3e0; border-left: 4px solid #f57c00; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
                    <p style="margin: 0; font-weight: 600; color: #e65100;">Note from our review team:</p>
                    <p style="margin: 8px 0 0; color: #555;">${note}</p>
                  </div>
                  <p style="color: #555;">Please update your campaign and resubmit for review.</p>
                  <div style="text-align: center; margin-top: 24px;">
                    <a href="https://ads.travalpass.com"
                       style="display: inline-block; background: #1976d2; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;"
                    >Update Campaign</a>
                  </div>
                </div>
              </div>`,
        },
      }

      const mailRef = await db.collection('mail').add(mailDoc)
      console.log(`[reviewCampaign] Mail doc written at mail/${mailRef.id} for ${userEmail} (${action})`)
    } else {
      console.warn(`[reviewCampaign] No userEmail on campaign ${campaignId} — skipping advertiser notification.`)
    }
  } catch (emailErr) {
    // Non-fatal: log but don't fail the review action
    console.error('[reviewCampaign] Failed to send advertiser notification email:', emailErr)
  }

  return { success: true }
})
