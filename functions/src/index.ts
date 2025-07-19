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
import Stripe from "stripe";
import express from "express";
import bodyParser from "body-parser";
// import { createStripePortalSession } from './createStripePortalSession';
// import { createStripeCheckoutSession } from './createStripeCheckoutSession';

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
  .onCreate(async (snap: functions.firestore.DocumentSnapshot, context: functions.EventContext) => {
    const message = snap.data();
    const connectionId = context.params.connectionId;

    if (!message) {
      console.log("No message data found:", message);
      return null;
    }

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
    
    console.log(`FCM Debug for user ${recipientUid}:`, {
      userExists: userDoc.exists,
      hasData: !!userData,
      hasFCMToken: !!(userData && userData.fcmToken),
      lastTokenUpdate: userData?.lastTokenUpdate,
      deviceInfo: userData?.deviceInfo?.platform,
      tokenValidated: userData?.tokenValidated
    });
    
    const fcmToken = userData && userData.fcmToken;

    if (fcmToken) {
      try {
        await admin.messaging().send({
          token: fcmToken,
          notification: {
            title: "New Message",
            body: message.text || "You have a new message!",
          },
          data: {
            connectionId,
          },
        });
        console.log(`Notification sent successfully to user ${recipientUid}`);
      } catch (error: any) {
        console.error(`Failed to send notification to user ${recipientUid}:`, error);
        
        // If the token is invalid, remove it from the user document
        if (error.code === 'messaging/invalid-registration-token' || 
            error.code === 'messaging/registration-token-not-registered') {
          console.log(`Removing invalid FCM token for user ${recipientUid}`);
          await db.collection("users").doc(recipientUid).update({
            fcmToken: admin.firestore.FieldValue.delete(),
            invalidTokenRemovedAt: admin.firestore.FieldValue.serverTimestamp(),
            lastTokenError: error.message
          });
        }
      }
    } else {
      console.log(`No FCM token found for user ${recipientUid}. User document exists: ${userDoc.exists}. Check if user has logged in recently and granted notification permissions.`);
    }

    return null;
  });

export const notifyFeedbackSubmission = functions.firestore
  .document("feedback/{feedbackId}")
  .onCreate(async (snap: functions.firestore.DocumentSnapshot, context: functions.EventContext) => {
    const feedback = snap.data();
    const feedbackId = context.params.feedbackId;

    console.log("=== FEEDBACK SUBMISSION DEBUG ===");
    console.log("Feedback ID:", feedbackId);
    console.log("Feedback data:", JSON.stringify(feedback, null, 2));

    if (!feedback) {
      console.log("❌ No feedback data found:", feedback);
      return null;
    }

    try {
      // Get user details if available
      let userData = null;
      if (feedback.userId && feedback.userId !== 'anonymous') {
        console.log("🔍 Fetching user data for:", feedback.userId);
        const userDoc = await db.collection("users").doc(feedback.userId).get();
        userData = userDoc.data() || {};
        console.log("👤 User data found:", !!userData, userData?.username);
      }

      // Format feedback type and severity
      const typeEmoji: { [key: string]: string } = {
        bug: "🐛",
        feature: "💡", 
        improvement: "⚡",
        general: "💭"
      };

      const severityColor: { [key: string]: string } = {
        critical: "#FF0000",
        high: "#FF6600", 
        medium: "#FFCC00",
        low: "#00CC00"
      };

      const priorityText = feedback.severity ? 
        `<span style="color: ${severityColor[feedback.severity as string]};">●</span> ${feedback.severity.toUpperCase()}` : 
        "Normal Priority";

      // Prepare email content
      const mailDoc = {
        to: "feedback@travalpass.com",
        from: "no-reply@travalpass.com",
        message: {
          subject: `[BETA FEEDBACK] ${typeEmoji[feedback.type as string] || "📝"} ${feedback.title}`,
          text: `
            New Beta Feedback Received!
            
            Feedback ID: ${feedbackId}
            Type: ${feedback.type}
            ${feedback.severity ? `Severity: ${feedback.severity}` : ''}
            ${feedback.rating ? `Rating: ${feedback.rating}/5 stars` : ''}
            
            Title: ${feedback.title}
            Description: ${feedback.description}
            
            ${feedback.stepsToReproduce ? `Steps to Reproduce:\n${feedback.stepsToReproduce}\n` : ''}
            ${feedback.expectedBehavior ? `Expected Behavior:\n${feedback.expectedBehavior}\n` : ''}
            ${feedback.actualBehavior ? `Actual Behavior:\n${feedback.actualBehavior}\n` : ''}
            
            User Information:
            - User ID: ${feedback.userId || 'Anonymous'}
            - Username: ${userData?.username || 'N/A'}
            - Contact Email: ${feedback.userEmail || 'Not provided'}
            
            Technical Information:
            - Device: ${feedback.deviceInfo?.platform || 'Unknown'}
            - Browser: ${feedback.deviceInfo?.userAgent || 'Unknown'}
            - Screen: ${feedback.deviceInfo?.screenResolution || 'N/A'}
            - Page: ${feedback.deviceInfo?.url || 'N/A'}
            - App Version: ${feedback.version || 'Unknown'}
            - Online: ${feedback.deviceInfo?.online ? 'Yes' : 'No'}
            
            Submitted: ${new Date(feedback.createdAt?.toDate ? feedback.createdAt.toDate() : feedback.createdAt).toLocaleString()}
          `,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
                <h1 style="margin: 0; font-size: 24px;">${typeEmoji[feedback.type as string] || "📝"} New Beta Feedback</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">${priorityText}</p>
              </div>
              
              <div style="background: white; padding: 20px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
                <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                  <h2 style="margin: 0 0 10px 0; color: #333;">${feedback.title}</h2>
                  <p style="margin: 0; color: #666; white-space: pre-wrap;">${feedback.description}</p>
                  ${feedback.rating ? `<div style="margin-top: 10px;">Rating: ${'⭐'.repeat(feedback.rating)} (${feedback.rating}/5)</div>` : ''}
                </div>

                ${feedback.stepsToReproduce ? `
                  <div style="margin-bottom: 15px;">
                    <h3 style="color: #d32f2f; margin: 0 0 5px 0;">Steps to Reproduce:</h3>
                    <pre style="background: #ffebee; padding: 10px; border-radius: 4px; white-space: pre-wrap; font-family: monospace; font-size: 12px;">${feedback.stepsToReproduce}</pre>
                  </div>
                ` : ''}

                ${feedback.expectedBehavior ? `
                  <div style="margin-bottom: 15px;">
                    <h3 style="color: #2e7d32; margin: 0 0 5px 0;">Expected Behavior:</h3>
                    <p style="background: #e8f5e8; padding: 10px; border-radius: 4px; margin: 0;">${feedback.expectedBehavior}</p>
                  </div>
                ` : ''}

                ${feedback.actualBehavior ? `
                  <div style="margin-bottom: 15px;">
                    <h3 style="color: #f57c00; margin: 0 0 5px 0;">Actual Behavior:</h3>
                    <p style="background: #fff3e0; padding: 10px; border-radius: 4px; margin: 0;">${feedback.actualBehavior}</p>
                  </div>
                ` : ''}

                <div style="display: flex; gap: 20px; margin-top: 20px;">
                  <div style="flex: 1;">
                    <h3 style="margin: 0 0 10px 0; color: #333;">User Info</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #666;">
                      <li>ID: ${feedback.userId || 'Anonymous'}</li>
                      <li>Username: ${userData?.username || 'N/A'}</li>
                      <li>Email: ${feedback.userEmail || 'Not provided'}</li>
                    </ul>
                  </div>
                  
                  <div style="flex: 1;">
                    <h3 style="margin: 0 0 10px 0; color: #333;">Technical Info</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #666; font-size: 12px;">
                      <li>Device: ${feedback.deviceInfo?.platform || 'Unknown'}</li>
                      <li>Screen: ${feedback.deviceInfo?.screenResolution || 'N/A'}</li>
                      <li>Version: ${feedback.version || 'Unknown'}</li>
                      <li>Online: ${feedback.deviceInfo?.online ? 'Yes' : 'No'}</li>
                    </ul>
                  </div>
                </div>

                <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999;">
                  <p><strong>Page:</strong> ${feedback.deviceInfo?.url || 'N/A'}</p>
                  <p><strong>User Agent:</strong> ${feedback.deviceInfo?.userAgent || 'Unknown'}</p>
                  <p><strong>Submitted:</strong> ${new Date(feedback.createdAt?.toDate ? feedback.createdAt.toDate() : feedback.createdAt).toLocaleString()}</p>
                </div>

                <div style="text-align: center; margin-top: 20px;">
                  <a href="https://console.firebase.google.com/project/mundo1-1/firestore/data/feedback/${feedbackId}" 
                     style="display: inline-block; background: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
                    View in Firebase Console
                  </a>
                </div>
              </div>
            </div>
          `,
        },
      };

      console.log("📧 Preparing to send email to:", mailDoc.to);
      console.log("📧 Email subject:", mailDoc.message.subject);
      console.log("📧 Email from:", mailDoc.from);

      // Send the email using the "mail" collection
      const mailRef = await db.collection("mail").add(mailDoc);
      console.log(`✅ Mail document created successfully: mail/${mailRef.id}`);

      // Check if the mail document was actually created
      const createdMailDoc = await mailRef.get();
      console.log("📄 Mail document exists:", createdMailDoc.exists);
      console.log("📄 Mail document data:", JSON.stringify(createdMailDoc.data(), null, 2));

      // Update the feedback document to mark the email as sent
      await db.collection("feedback").doc(feedbackId).update({
        emailSent: true,
        emailSentTimestamp: admin.firestore.FieldValue.serverTimestamp(),
        mailDocumentId: mailRef.id, // Add this for debugging
      });

      console.log("✅ Feedback document updated successfully");
      console.log("=== END FEEDBACK SUBMISSION DEBUG ===");

      return null;
    } catch (err) {
      console.error("❌ Error sending feedback notification email:", err);
      console.error("❌ Error details:", JSON.stringify(err, null, 2));
      
      // Type guard for error handling
      const errorMessage = err instanceof Error ? err.message : String(err);
      
      // Update feedback document with error info
      await db.collection("feedback").doc(feedbackId).update({
        emailSent: false,
        emailError: errorMessage,
        emailErrorTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      return null;
    }
  });

export const notifyViolationReport = functions.firestore
  .document("violations/{violationId}")
  .onCreate(async (snap: functions.firestore.DocumentSnapshot, context: functions.EventContext) => {
    const violation = snap.data();
    const violationId = context.params.violationId;

    if (!violation) {
      console.log("No violation data found:", violation);
      return null;
    }

    try {
      // Get reported user details
      const reportedUserDoc = await db
        .collection("users")
        .doc(violation.reportedUserId)
        .get();
      const reportedUserData = reportedUserDoc.data() || {};

      // Get reporting user details
      const reportingUserDoc = await db
        .collection("users")
        .doc(violation.reportedByUserId)
        .get();
      const reportingUserData = reportingUserDoc.data() || {};

      // Format reason to be more readable
      const formattedReason = violation.reason
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char: string) => char.toUpperCase());

      // Prepare email content
      const mailDoc = {
        to: "violations@travalpass.com",
        from: "no-reply@travalpass.com",
        message: {
          subject: `[VIOLATION REPORT] ${formattedReason}`,
          text: `
            A new user violation has been reported.
            
            Report ID: ${violationId}
            Reason: ${formattedReason}
            Description: ${violation.description || "No description provided"}
            
            Reported User:
            - User ID: ${violation.reportedUserId}
            - Username: ${reportedUserData.username || "N/A"}
            - Email: ${reportedUserData.email || "N/A"}
            
            Reported By:
            - User ID: ${violation.reportedByUserId}
            - Username: ${reportingUserData.username || "N/A"}
            - Email: ${reportingUserData.email || "N/A"}
            
            Timestamp: ${new Date(
              violation.timestamp?._seconds * 1000
            ).toISOString() || new Date().toISOString()}
          `,
          html: `
            <h1>User Violation Report</h1>
            <p><strong>Report ID:</strong> ${violationId}</p>
            <p><strong>Reason:</strong> ${formattedReason}</p>
            <p><strong>Description:</strong> ${
              violation.description || "<em>No description provided</em>"
            }</p>
            
            <h2>Reported User</h2>
            <ul>
              <li><strong>User ID:</strong> ${violation.reportedUserId}</li>
              <li><strong>Username:</strong> ${reportedUserData.username || "N/A"}</li>
              <li><strong>Email:</strong> ${reportedUserData.email || "N/A"}</li>
            </ul>
            
            <h2>Reported By</h2>
            <ul>
              <li><strong>User ID:</strong> ${violation.reportedByUserId}</li>
              <li><strong>Username:</strong> ${reportingUserData.username || "N/A"}</li>
              <li><strong>Email:</strong> ${reportingUserData.email || "N/A"}</li>
            </ul>
            
            <p><strong>Timestamp:</strong> ${new Date(
              violation.timestamp?._seconds * 1000
            ).toLocaleString() || new Date().toLocaleString()}</p>
            
            <hr>
            <p><em>This is an automated message from the Travalpass system. Please investigate this violation report at your earliest convenience.</em></p>
            <p><a href="https://console.firebase.google.com/project/YOUR_PROJECT_ID/firestore/data/violations/${violationId}">View in Firebase Console</a></p>
          `,
        },
      };

      // Send the email using the "mail" collection (for SendGrid or similar)
      const mailRef = await db.collection("mail").add(mailDoc);
      console.log(`Violation report email sent, mail/${mailRef.id}`);

      // Update the violation document to mark the email as sent
      await db.collection("violations").doc(violationId).update({
        emailSent: true,
        emailSentTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      });

      return null;
    } catch (err) {
      console.error("Error sending violation report email:", err);
      return null;
    }
  });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: '2022-11-15' });

const app = express();

// Stripe requires the raw body to validate the signature
app.post("/", bodyParser.raw({ type: "application/json" }), async (req: any, res: any) => {
  const sig = req.headers["stripe-signature"];
  let event: Stripe.Event;

  // Log the incoming webhook for troubleshooting
  console.log("[STRIPE WEBHOOK] Incoming request", {
    headers: req.headers,
    body: req.body ? req.body.toString('utf8').slice(0, 500) : undefined // avoid logging secrets
  });

  try {
    // Use req.rawBody for Firebase Functions compatibility
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig as string,
      process.env.STRIPE_WEBHOOK_SECRET || "" // Ensure this is set in your environment variables
    );
    console.log(`[STRIPE WEBHOOK] Event received: ${event.type}`);
  } catch (err: any) {
    console.error("[STRIPE WEBHOOK] Signature verification failed.", err.message, {
      headers: req.headers,
      // Log both body and rawBody for troubleshooting
      body: req.body ? req.body.toString('utf8').slice(0, 500) : undefined,
      rawBody: req.rawBody ? req.rawBody.toString('utf8').slice(0, 500) : undefined
    });
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const uid = session.metadata?.uid;
      const customerId = session.customer as string;
      const now = new Date();
      const startDate = now.toISOString();
      let endDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
      if (session.subscription) {
        try {
          const subscriptionResp = await stripe.subscriptions.retrieve(session.subscription as string);
          // Stripe types: if using auto-pagination or expand, may be wrapped in Response<T>
          const subscription = (subscriptionResp as any)?.current_period_end !== undefined
            ? subscriptionResp as any
            : (subscriptionResp as any)?.data || subscriptionResp;
          if (subscription.current_period_end) {
            endDate = new Date(subscription.current_period_end * 1000).toISOString();
          }
        } catch (err) {
          console.error("[STRIPE WEBHOOK] Failed to fetch subscription for end date:", err, {
            sessionId: session.id,
            subscriptionId: session.subscription
          });
        }
      }

      if (uid) {
        const userRef = db.collection("users").doc(uid);
        try {
          await userRef.set({
            stripeCustomerId: customerId,
            subscriptionType: "premium",
            subscriptionStartDate: startDate,
            subscriptionEndDate: endDate,
            subscriptionCancelled: false
          }, { merge: true });
          console.log(`[STRIPE WEBHOOK] User ${uid} updated after checkout.session.completed`, {
            stripeCustomerId: customerId,
            startDate,
            endDate
          });
        } catch (err) {
          console.error(`[STRIPE WEBHOOK] Failed to update user ${uid} after checkout.session.completed:`, err, {
            stripeCustomerId: customerId,
            sessionId: session.id
          });
        }
      } else if (session.customer_email) {
        const usersRef = db.collection("users");
        try {
          const snapshot = await usersRef.where("email", "==", session.customer_email).get();
          if (snapshot.empty) {
            console.warn(`[STRIPE WEBHOOK] No user found with email ${session.customer_email} for checkout.session.completed`, {
              sessionId: session.id
            });
          }
          snapshot.forEach(doc => {
            doc.ref.update({
              subscriptionType: "premium",
              subscriptionStartDate: startDate,
              subscriptionEndDate: endDate,
              subscriptionCancelled: false,
              stripeCustomerId: customerId
            });
            console.log(`[STRIPE WEBHOOK] User ${doc.id} updated by email after checkout.session.completed`, {
              email: session.customer_email,
              stripeCustomerId: customerId
            });
          });
        } catch (err) {
          console.error(`[STRIPE WEBHOOK] Failed to update user by email ${session.customer_email} after checkout.session.completed:`, err, {
            sessionId: session.id
          });
        }
      } else {
        console.warn(`[STRIPE WEBHOOK] No UID or customer_email found in session for checkout.session.completed`, {
          sessionId: session.id
        });
      }
    } else if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer;
      let endDate: string | undefined = undefined;
      let startDate: string | undefined = undefined;
      const sub: any = subscription as any;
      if (sub.current_period_end) {
        endDate = new Date(sub.current_period_end * 1000).toISOString();
      }
      if (sub.current_period_start) {
        startDate = new Date(sub.current_period_start * 1000).toISOString();
      }

      const usersRef = db.collection("users");
      try {
        const snapshot = await usersRef.where("stripeCustomerId", "==", customerId).get();
        if (!snapshot.empty) {
          snapshot.forEach(doc => {
            const update: any = {
              subscriptionType: "premium",
              subscriptionCancelled: false
            };
            if (endDate) update.subscriptionEndDate = endDate;
            if (startDate) update.subscriptionStartDate = startDate;
            doc.ref.update(update);
            console.log(`[STRIPE WEBHOOK] User ${doc.id} subscription renewed/updated after customer.subscription.updated`, {
              stripeCustomerId: customerId,
              startDate,
              endDate
            });
          });
        } else {
          // Fallback: try to find by email if present in metadata
          const email = subscription.metadata?.email;
          if (email) {
            const emailSnap = await usersRef.where("email", "==", email).get();
            if (emailSnap.empty) {
              console.warn(`[STRIPE WEBHOOK] No user found with email ${email} for customer.subscription.updated`, {
                subscriptionId: subscription.id
              });
            }
            emailSnap.forEach(doc => {
              const update: any = {
                subscriptionType: "premium",
                subscriptionCancelled: false
              };
              if (endDate) update.subscriptionEndDate = endDate;
              if (startDate) update.subscriptionStartDate = startDate;
              doc.ref.update(update);
              console.log(`[STRIPE WEBHOOK] User ${doc.id} subscription renewed/updated by email after customer.subscription.updated`, {
                email,
                startDate,
                endDate
              });
            });
          } else {
            console.warn(`[STRIPE WEBHOOK] No user found for customer.subscription.updated: no customerId or email`, {
              subscriptionId: subscription.id
            });
          }
        }
      } catch (err) {
        console.error(`[STRIPE WEBHOOK] Failed to update user after customer.subscription.updated:`, err, {
          stripeCustomerId: customerId,
          subscriptionId: subscription.id
        });
      }
    } else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer;
      let endDate: string | undefined = undefined;
      const sub: any = subscription as any;
      if (sub.current_period_end) {
        endDate = new Date(sub.current_period_end * 1000).toISOString();
      }

      const usersRef = db.collection("users");
      try {
        const snapshot = await usersRef.where("stripeCustomerId", "==", customerId).get();
        if (!snapshot.empty) {
          snapshot.forEach(doc => {
            const update: any = { subscriptionCancelled: true };
            if (endDate) update.subscriptionEndDate = endDate;
            doc.ref.update(update);
            console.log(`[STRIPE WEBHOOK] User ${doc.id} subscription cancelled after customer.subscription.deleted`, {
              stripeCustomerId: customerId,
              endDate
            });
          });
        } else {
          const email = subscription.metadata?.email;
          if (email) {
            const emailSnap = await usersRef.where("email", "==", email).get();
            if (emailSnap.empty) {
              console.warn(`[STRIPE WEBHOOK] No user found with email ${email} for customer.subscription.deleted`, {
                subscriptionId: subscription.id
              });
            }
            emailSnap.forEach(doc => {
              const update: any = { subscriptionCancelled: true };
              if (endDate) update.subscriptionEndDate = endDate;
              doc.ref.update(update);
              console.log(`[STRIPE WEBHOOK] User ${doc.id} subscription cancelled by email after customer.subscription.deleted`, {
                email,
                endDate
              });
            });
          } else {
            console.warn(`[STRIPE WEBHOOK] No user found for customer.subscription.deleted: no customerId or email`, {
              subscriptionId: subscription.id
            });
          }
        }
      } catch (err) {
        console.error(`[STRIPE WEBHOOK] Failed to update user after customer.subscription.deleted:`, err, {
          stripeCustomerId: customerId,
          subscriptionId: subscription.id
        });
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error("[STRIPE WEBHOOK] Error handling Stripe webhook:", err, {
      eventType: event?.type,
      eventId: event?.id
    });
    res.status(500).send("Internal webhook error");
  }
});

// Export the function
export const stripeWebhook = functions.https.onRequest(app);
// export { createStripePortalSession, createStripeCheckoutSession };
export { videoShare } from './videoSharing';
