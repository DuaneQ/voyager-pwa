/**
 * Send Match Notification Cloud Function
 * 
 * Triggered when a new connection is created in Firestore.
 * Sends push notifications to both users about their new match.
 * 
 * Flow:
 * 1. Connection created in connections/{connectionId}
 * 2. Function reads connection document
 * 3. For each user in the connection:
 *    - Get their FCM tokens
 *    - Get the other user's name
 *    - Send personalized notification
 * 4. Clean up invalid tokens after send
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { getTokensForUser, cleanupInvalidTokens, getUserDisplayName } from './utils';
import type { MulticastMessage } from 'firebase-admin/messaging';

interface ConnectionData {
  users: string[];  // Array of user IDs in the connection
  createdAt?: FirebaseFirestore.Timestamp;
  itineraries?: Array<{
    destination?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

/**
 * Cloud Function: sendMatchNotification
 * Triggers: onCreate on connections/{connectionId}
 */
export const sendMatchNotification = onDocumentCreated(
  'connections/{connectionId}',
  async (event) => {
    const snap = event.data;
    if (!snap) {
      console.error('No data in onCreate event');
      return;
    }

    const connectionId = event.params.connectionId;
    const connection = snap.data() as ConnectionData;

    console.log(`New connection created: ${connectionId}`);

    // Validate connection data
    if (!connection || !connection.users || !Array.isArray(connection.users)) {
      console.error(`Invalid connection data for ${connectionId}:`, connection);
      return;
    }

    if (connection.users.length < 2) {
      console.warn(`Connection ${connectionId} has less than 2 users, skipping notification`);
      return;
    }

    // Get itinerary destination for notification body (if available)
    const itinerary = connection.itineraries?.[0];
    const destination = itinerary?.destination || 'your destination';
    const dates = itinerary?.startDate && itinerary?.endDate
      ? `${formatDate(itinerary.startDate)} - ${formatDate(itinerary.endDate)}`
      : '';

    // Send notification to each user about the other user(s)
    const notificationPromises = connection.users.map(async (userId) => {
      try {
        // Get this user's FCM tokens
        const tokens = await getTokensForUser(userId);
        
        if (!tokens || tokens.length === 0) {
          console.log(`No tokens for user ${userId}, skipping notification`);
          return;
        }

        // Get the other user's name for personalized notification
        const otherUserIds = connection.users.filter(id => id !== userId);
        const otherUserNames = await Promise.all(
          otherUserIds.map(id => getUserDisplayName(id))
        );
        const otherUserName = otherUserNames.join(' and ');

        // Build notification payload
        const payload: MulticastMessage = {
          tokens,
          notification: {
            title: 'New Match! 🎉',
            body: `You matched with ${otherUserName}${destination ? ` — ${destination}` : ''}${dates ? `, ${dates}` : ''}`,
          },
          data: {
            type: 'new_match',
            connectionId,
            screen: 'ChatScreen',
          },
          android: {
            notification: {
              channelId: 'matches',
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
                  title: 'New Match! 🎉',
                  body: `You matched with ${otherUserName}${destination ? ` — ${destination}` : ''}`,
                },
              },
            },
          },
        };

        // Send notification
        const response = await admin.messaging().sendEachForMulticast(payload);

        console.log(`Sent match notification to user ${userId}: ${response.successCount}/${tokens.length} succeeded`);

        // Clean up invalid tokens
        await cleanupInvalidTokens(userId, tokens, response);

      } catch (error) {
        console.error(`Error sending match notification to user ${userId}:`, error);
        // Continue processing other users even if one fails
      }
    });

    await Promise.all(notificationPromises);
    console.log(`Match notification processing complete for connection ${connectionId}`);
  }
);

/**
 * Format date string for notification display
 * Converts YYYY-MM-DD to readable format
 */
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}
