/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
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
        message: {
          subject: "You have a new connection!",
          text: `Hi, you have a new connection! Open the app to start chatting.`,
          html: `<p>Hi,</p>
                 <p>You have a new connection!<br>
                 <a href="https://your-app-url.com/chat">Open the app to start chatting.</a></p>`,
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
