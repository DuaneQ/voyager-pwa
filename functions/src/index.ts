/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 * Cloud Function triggered when a new connection is created in Firestore.
 * Sends an email notification to both users using SendGrid.
 *
 * @function
 * @param {functions.firestore.DocumentSnapshot} snap - The snapshot of the created connection document.
 * @param {functions.EventContext} context - The event context.
 * @returns {Promise<void>}
 */

import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
admin.initializeApp();

const db = admin.firestore();

// Use v1 Firestore trigger from firebase-functions
export const notifyNewConnection = functions.firestore
  .document("connections/{connectionId}")
  .onCreate(async (snap, context) => {
    const connection = snap.data();
    if (
      !connection ||
      !connection.emails ||
      !Array.isArray(connection.emails)
    ) {
      console.log("No emails found in connection doc:", connection);
      return null;
    }

    // Remove duplicate emails and filter out empty strings
    const uniqueEmails = Array.from(new Set(connection.emails)).filter(Boolean);

    const mailPromises = uniqueEmails.map(async (email) => {
      const mailDoc = {
        to: email,
        from: "no-reply@travalpass.com",
        message: {
          subject: "You have a new connection!",
          text: `Hi, you have a new connection! Open the app to start chatting with your new Traval Buddy about your upcoming trips.`,
          html: `<p>Hi,</p>
                <p>You have a new connection!<br>
                <a href="https://travalpass.com/chat">Open the app to start chatting.</a></p>
                <hr>
                <h4>Safety Tips for Meeting Your Traval Buddy</h4>
                <ul>
                  <li>Always meet in a public place.</li>
                  <li>Tell a friend or family member where you're going.</li>
                  <li>Don't share sensitive personal information too soon.</li>
                  <li>Trust your instincts—if something feels off, leave.</li>
                  <li>Arrange your own transportation.</li>
                </ul>
                <p>Happy and safe travels!</p>`,
        },
      };

      try {
        const mailRef = await db.collection("mail").add(mailDoc);
        console.log(`Mail doc written for ${email} at mail/${mailRef.id}`);
      } catch (err) {
        console.error(`Failed to write mail doc for ${email}:`, err);
      }
    });

    await Promise.all(mailPromises);
    console.log(
      "All mail promises resolved for connectionId:",
      context.params.connectionId
    );
    return null;
  });

export const sendNewMessageNotification = functions.firestore
  .document("connections/{connectionId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const message = snap.data();
    const connectionId = context.params.connectionId;

    // Get the connection document to find both users
    const connectionRef = db.collection("connections").doc(connectionId);
    const connectionSnap = await connectionRef.get();
    const connection = connectionSnap.data();
    if (!connection || !connection.users || !Array.isArray(connection.users)) {
      console.log("No users found in connection doc:", connection);
      return null;
    }

    // Find the recipient UID (the user who is NOT the sender)
    const recipientUid = connection.users.find(
      (uid: string) => uid !== message.sender
    );
    if (!recipientUid) {
      console.log("No recipient found for message:", message);
      return null;
    }

    // Get the recipient's FCM token from their user profile
    const userDoc = await db.collection("users").doc(recipientUid).get();
    const userData = userDoc.data();
    const fcmToken = userData && userData.fcmToken;

    if (fcmToken) {
      await admin.messaging().send({
        token: fcmToken,
        notification: {
          title: "New Message",
          body: message.text ? message.text : "You have a new message!",
        },
        data: {
          connectionId,
        },
      });
      console.log(`Notification sent to user ${recipientUid}`);
    } else {
      console.log(`No FCM token found for user ${recipientUid}`);
    }

    return null;
  });
