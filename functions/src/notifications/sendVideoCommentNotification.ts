/**
 * Send Video Comment Notification Cloud Function
 * 
 * Triggered when a video document is updated in Firestore.
 * Detects new comments by comparing before/after comment arrays.
 * Sends push notification to the video owner when someone else comments.
 * 
 * Flow:
 * 1. Video document updated in videos/{videoId}
 * 2. Function compares comments array before/after
 * 3. If a new comment was added by a different user than the video owner:
 *    - Get the video owner's FCM tokens
 *    - Get the commenter's display name
 *    - Send notification with comment preview
 * 4. Clean up invalid tokens after send
 * 
 * Note: Comments are stored as an embedded array in the video document,
 * not as a subcollection, so we use onDocumentUpdated instead of onDocumentCreated.
 */

import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { getTokensForUser, cleanupInvalidTokens, truncateText, getUserDisplayName } from './utils';
import type { MulticastMessage } from 'firebase-admin/messaging';

interface VideoComment {
  id: string;
  userId: string;
  text: string;
  createdAt: FirebaseFirestore.Timestamp;
}

interface VideoData {
  userId: string;        // Video owner
  title?: string;
  description?: string;
  comments?: VideoComment[];
}

/**
 * Cloud Function: sendVideoCommentNotification
 * Triggers: onUpdate on videos/{videoId}
 * 
 * Only fires a notification when:
 * - A new comment is detected (comments array grew)
 * - The commenter is NOT the video owner (no self-notifications)
 */
export const sendVideoCommentNotification = onDocumentUpdated(
  'videos/{videoId}',
  async (event) => {
    const beforeData = event.data?.before?.data() as VideoData | undefined;
    const afterData = event.data?.after?.data() as VideoData | undefined;

    if (!beforeData || !afterData) {
      console.error('❌ sendVideoCommentNotification: Missing before/after data');
      return;
    }

    const videoId = event.params.videoId;
    const videoOwnerId = afterData.userId;

    // Compare comment arrays to detect new comments
    const beforeComments = beforeData.comments || [];
    const afterComments = afterData.comments || [];

    console.log(`📝 sendVideoCommentNotification: Video ${videoId} updated. Comments: ${beforeComments.length} → ${afterComments.length}`);

    // No new comments added — could be a like, view count, or other update
    if (afterComments.length <= beforeComments.length) {
      console.log(`ℹ️ sendVideoCommentNotification: No new comments detected, skipping`);
      return;
    }

    // Find the new comment(s) by comparing IDs
    const beforeIds = new Set(beforeComments.map(c => c.id));
    const newComments = afterComments.filter(c => !beforeIds.has(c.id));

    if (newComments.length === 0) {
      console.log(`ℹ️ sendVideoCommentNotification: No new comment IDs found, skipping`);
      return;
    }

    console.log(`📬 sendVideoCommentNotification: ${newComments.length} new comment(s) detected on video ${videoId}`);

    // Process each new comment (typically just one, but handle multiple)
    for (const comment of newComments) {
      // Don't notify the video owner about their own comments
      if (comment.userId === videoOwnerId) {
        console.log(`ℹ️ sendVideoCommentNotification: Skipping self-comment by video owner ${videoOwnerId}`);
        continue;
      }

      try {
        // Get video owner's FCM tokens
        const tokens = await getTokensForUser(videoOwnerId);

        if (!tokens || tokens.length === 0) {
          console.log(`⚠️ sendVideoCommentNotification: No tokens for video owner ${videoOwnerId}, skipping`);
          continue;
        }

        // Get commenter's display name
        const commenterName = await getUserDisplayName(comment.userId);
        const commentPreview = truncateText(comment.text, 100);
        const videoTitle = afterData.title ? truncateText(afterData.title, 50) : 'your video';

        console.log(`📤 sendVideoCommentNotification: Sending to video owner ${videoOwnerId} (${tokens.length} tokens). Commenter: ${commenterName}`);

        // Build notification payload
        // Title: short and clear. Body: includes video title + comment text.
        const notifTitle = `${commenterName} commented`;
        const notifBody = `On "${videoTitle}": ${commentPreview}`;
        const payload: MulticastMessage = {
          tokens,
          notification: {
            title: notifTitle,
            body: notifBody,
          },
          data: {
            type: 'video_comment',
            videoId,
            commenterId: comment.userId,
            commenterName,
            commentId: comment.id,
            screen: 'Videos',
          },
          android: {
            notification: {
              channelId: 'default',
              sound: 'default',
              priority: 'high',
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
                alert: {
                  title: notifTitle,
                  body: notifBody,
                },
              },
            },
          },
        };

        // Send notification
        const response = await admin.messaging().sendEachForMulticast(payload);

        console.log(
          `✅ sendVideoCommentNotification: Sent to video owner ${videoOwnerId}: ${response.successCount}/${tokens.length} succeeded`
        );

        // Log individual failures for debugging
        response.responses.forEach((res, idx) => {
          if (!res.success) {
            console.error(`❌ sendVideoCommentNotification: Token ${idx} failed:`, res.error?.code, res.error?.message);
          }
        });

        // Clean up invalid tokens
        await cleanupInvalidTokens(videoOwnerId, tokens, response);

      } catch (error) {
        console.error(`❌ sendVideoCommentNotification: Error sending notification for comment ${comment.id}:`, error);
        // Continue processing other comments even if one fails
      }
    }

    console.log(`✅ sendVideoCommentNotification: Processing complete for video ${videoId}`);
  }
);
