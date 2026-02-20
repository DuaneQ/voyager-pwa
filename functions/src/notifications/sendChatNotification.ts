/**
 * Send Chat Notification Cloud Function
 * 
 * Triggered when a new message is created in a connection's messages subcollection.
 * Sends push notifications to all users in the connection except the sender.
 * 
 * Flow:
 * 1. Message created in connections/{connId}/messages/{msgId}
 * 2. Function reads message document
 * 3. Function reads parent connection to get recipient user IDs
 * 4. For each recipient (excluding sender):
 *    - Get their FCM tokens
 *    - Send notification with message preview
 * 5. Clean up invalid tokens after send
 */

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { getTokensForUser, cleanupInvalidTokens, truncateText, getUserDisplayName } from './utils';
import type { MulticastMessage } from 'firebase-admin/messaging';

interface MessageData {
  sender: string;  // User ID of the message sender
  senderName?: string;
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  createdAt?: FirebaseFirestore.Timestamp;
  type?: 'text' | 'image' | 'video';
}

interface ConnectionData {
  users: string[];  // Array of user IDs in the connection
}

/**
 * Cloud Function: sendChatNotification
 * Triggers: onCreate on connections/{connectionId}/messages/{messageId}
 */
export const sendChatNotification = onDocumentCreated(
  'connections/{connectionId}/messages/{messageId}',
  async (event) => {
    const snap = event.data;
    if (!snap) {
      console.error('No data in onCreate event');
      return;
    }

    const connectionId = event.params.connectionId;
    const messageId = event.params.messageId;
    const message = snap.data() as MessageData;

    console.log(`New message created in connection ${connectionId}: ${messageId}`);

    // Validate message data
    if (!message || !message.sender) {
      console.error(`Invalid message data for ${connectionId}/${messageId}:`, message);
      return;
    }

    // Get connection document to find recipients
    const connectionDoc = await admin.firestore()
      .doc(`connections/${connectionId}`)
      .get();

    if (!connectionDoc.exists) {
      console.error(`Connection document not found: ${connectionId}`);
      return;
    }

    const connection = connectionDoc.data() as ConnectionData;

    if (!connection || !connection.users || !Array.isArray(connection.users)) {
      console.error(`Invalid connection data for ${connectionId}:`, connection);
      return;
    }

    // Get recipients (all users except sender)
    const recipients = connection.users.filter(userId => userId !== message.sender);

    if (recipients.length === 0) {
      console.log(`No recipients for message in connection ${connectionId}`);
      return;
    }

    // Get sender's display name (fallback to message.senderName)
    const senderName = message.senderName || await getUserDisplayName(message.sender);

    // Determine notification body based on message type
    let notificationBody: string;
    if (message.imageUrl) {
      notificationBody = '📷 Sent a photo';
    } else if (message.videoUrl) {
      notificationBody = '🎥 Sent a video';
    } else if (message.text) {
      notificationBody = truncateText(message.text, 100);
    } else {
      notificationBody = 'Sent a message';
    }

    // Send notification to each recipient
    const notificationPromises = recipients.map(async (recipientId) => {
      try {
        // Get recipient's FCM tokens
        const tokens = await getTokensForUser(recipientId);

        if (!tokens || tokens.length === 0) {
          console.log(`No tokens for recipient ${recipientId}, skipping notification`);
          return;
        }

        // Build notification payload
        const payload: MulticastMessage = {
          tokens,
          notification: {
            title: senderName,
            body: notificationBody,
          },
          data: {
            type: 'new_message',
            connectionId,
            senderId: message.sender,  // Using 'senderId' in data payload for consistency with client expectations
            senderName,
            screen: 'ChatScreen',
            messageId,
          },
          android: {
            notification: {
              channelId: 'chat-messages',
              sound: 'default',
              priority: 'high',
            },
            collapseKey: `chat_${connectionId}`,
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
                alert: {
                  title: senderName,
                  body: notificationBody,
                },
              },
            },
          },
        };

        // Send notification
        const response = await admin.messaging().sendEachForMulticast(payload);

        console.log(
          `Sent chat notification to user ${recipientId}: ${response.successCount}/${tokens.length} succeeded`
        );

        // Clean up invalid tokens
        await cleanupInvalidTokens(recipientId, tokens, response);

      } catch (error) {
        console.error(`Error sending chat notification to user ${recipientId}:`, error);
        // Continue processing other recipients even if one fails
      }
    });

    await Promise.all(notificationPromises);
    console.log(`Chat notification processing complete for message ${messageId} in connection ${connectionId}`);
  }
);
