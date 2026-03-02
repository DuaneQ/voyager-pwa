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

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Stripe from "stripe";
import express from "express";

// Ensure the Firestore-based itineraryShare is exported so it is packaged and deployed.
export { itineraryShare } from './itinerarySharing';
// Export RPCs implemented under functions so they are included in the Cloud Functions bundle
export * from './functions/itinerariesRpc';
// Export Stripe checkout and portal session functions
export { createStripeCheckoutSession } from './createStripeCheckoutSession';
export { createStripePortalSession } from './createStripePortalSession';
// Export Mux video processing functions
export { onVideoUploaded, muxWebhook, processVideoWithMux, migrateVideosToMux } from './muxVideoProcessing';
// Export Contact Discovery functions
export { matchContactsWithUsers } from './matchContactsWithUsers';
export { sendContactInvite } from './sendContactInvite';
// Export Push Notification functions
export { sendMatchNotification } from './notifications/sendMatchNotification';
export { sendChatNotification } from './notifications/sendChatNotification';
export { sendVideoCommentNotification } from './notifications/sendVideoCommentNotification';
export { registerAPNsToken } from './notifications/registerAPNsToken';
// Export Ads admin functions
export { reviewCampaign } from './reviewCampaign';
export { getPendingCampaigns } from './getPendingCampaigns';
// Export Ads delivery functions (consumer-side)
export { selectAds } from './selectAds';
export { logAdEvents } from './logAdEvents';
import bodyParser from "body-parser";

/**
 * ENVIRONMENT VARIABLES
 * All secrets (API keys, webhook secrets, admin UIDs) are loaded from environment
 * variables via .env (development) and .env.mundo1-1 (production overrides).
 * Firebase Functions v2 reads these files at deploy time.
 * See: https://firebase.google.com/docs/functions/config-env
 *
 * Required variables (set in .env and .env.mundo1-1 as needed):
 *   STRIPE_API_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID
 *   OPENAI_API_KEY
 *   GOOGLE_PLACES_API_KEY
 *   SERPAPI_KEY
 *   MUX_TOKEN_ID, MUX_TOKEN_SECRET
 *   MUX_WEBHOOK_DEV_SIGNING_SECRET, MUX_WEBHOOK_PROD_SIGNING_SECRET
 *   ADMIN_UID, ADMIN_EMAIL
 *
 * NEVER hardcode secrets in source files.
 */

admin.initializeApp();

const db = admin.firestore();

// Use v2 Firestore onDocumentCreated trigger
export const notifyNewConnection = onDocumentCreated("connections/{connectionId}", async (event) => {
  const snap = event.data;
  // In v2 the event.data is a DocumentSnapshot-like object. Call data() if available.
  const connection = snap && typeof (snap as any).data === 'function' ? (snap as any).data() : snap;
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
    event.params?.connectionId
  );
  return null;
});

// NOTE: Legacy sendNewMessageNotification removed on Feb 14, 2026.
// It was a duplicate of sendChatNotification (both triggered on same Firestore path).
// sendChatNotification handles all chat message notifications using the modern
// fcmTokens[] array and sendEachForMulticast() API.

// ── Ads: notify admin when a new campaign is submitted for review ─────────────
export const notifyNewAdCampaign = onDocumentCreated("ads_campaigns/{campaignId}", async (event) => {
  const snap = event.data;
  const campaign = snap && typeof (snap as any).data === 'function' ? (snap as any).data() : snap;

  if (!campaign || !campaign.isUnderReview) {
    // Only notify when the document is created with isUnderReview: true
    return null;
  }

  const adminEmailEnv: string = process.env.ADMIN_EMAIL ?? '';
  if (!adminEmailEnv) {
    console.error('[notifyNewAdCampaign] ADMIN_EMAIL env var is not set — skipping notification.');
    return null;
  }

  // Support comma-separated list of admin emails
  const adminEmails = adminEmailEnv.split(',').map(e => e.trim()).filter(Boolean);
  const campaignId = event.params?.campaignId as string;

  const mailDoc = {
    to: adminEmails,
    from: 'no-reply@travalpass.com',
    message: {
      subject: `[Voyager Ads] New campaign pending review: "${campaign.name}"`,
      text: `A new ad campaign has been submitted and is awaiting your review.

Campaign: ${campaign.name}
Advertiser: ${campaign.userEmail}
Placement: ${campaign.placement}
Objective: ${campaign.objective}
Budget: ${campaign.budgetType} $${campaign.budgetAmount}

Review it in the admin panel: https://ads.travalpass.com/admin`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 22px;">📋 New Ad Campaign Pending Review</h1>
          </div>
          <div style="background: white; padding: 24px; border: 1px solid #e0e0e0; border-radius: 0 0 8px 8px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr><td style="padding: 8px; color: #666; width: 140px;">Campaign name</td><td style="padding: 8px; font-weight: 600;">${campaign.name}</td></tr>
              <tr style="background:#f9f9f9"><td style="padding: 8px; color: #666;">Advertiser</td><td style="padding: 8px;">${campaign.userEmail}</td></tr>
              <tr><td style="padding: 8px; color: #666;">Placement</td><td style="padding: 8px;">${campaign.placement}</td></tr>
              <tr style="background:#f9f9f9"><td style="padding: 8px; color: #666;">Objective</td><td style="padding: 8px;">${campaign.objective}</td></tr>
              <tr><td style="padding: 8px; color: #666;">Budget</td><td style="padding: 8px;">${campaign.budgetType} — $${campaign.budgetAmount}</td></tr>
              <tr style="background:#f9f9f9"><td style="padding: 8px; color: #666;">Dates</td><td style="padding: 8px;">${campaign.startDate} → ${campaign.endDate}</td></tr>
            </table>
            <div style="text-align: center;">
              <a href="https://ads.travalpass.com/admin"
                 style="display: inline-block; background: #1976d2; color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;"
              >Review Campaign</a>
            </div>
            <p style="margin-top: 20px; font-size: 12px; color: #999; text-align: center;">Campaign ID: ${campaignId}</p>
          </div>
        </div>
      `,
    },
  };

  try {
    const mailRef = await db.collection('mail').add(mailDoc);
    console.log(`[notifyNewAdCampaign] Mail doc written at mail/${mailRef.id} for campaign ${campaignId}`);
  } catch (err) {
    console.error('[notifyNewAdCampaign] Failed to write mail doc:', err);
  }

  return null;
});

export const notifyFeedbackSubmission = onDocumentCreated("feedback/{feedbackId}", async (event) => {
  const snap = event.data;
  const feedback = snap && typeof (snap as any).data === 'function' ? (snap as any).data() : snap;
  const feedbackId = event.params?.feedbackId as string;

  if (!feedback) {
    console.log("❌ No feedback data found:", feedback);
    return null;
  }

  try {
    // Get user details if available
    let userData = null;
    if (feedback.userId && feedback.userId !== 'anonymous') {
      const userDoc = await db.collection("users").doc(feedback.userId).get();
      userData = userDoc.data() || {};
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

    // Send the email using the "mail" collection
    const mailRef = await db.collection("mail").add(mailDoc);

    // Check if the mail document was actually created
    const createdMailDoc = await mailRef.get();

    // Update the feedback document to mark the email as sent
    await db.collection("feedback").doc(feedbackId).update({
      emailSent: true,
      emailSentTimestamp: admin.firestore.FieldValue.serverTimestamp(),
      mailDocumentId: mailRef.id, // Add this for debugging
    });

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

export const sendEmailCampaign = onCall(async (request) => {
  const { campaignId, testEmail } = request.data;
  
  if (!campaignId) {
    throw new HttpsError('invalid-argument', 'Campaign ID is required');
  }

  console.log(`[EMAIL CAMPAIGN] Starting campaign: ${campaignId}`);
  
  try {
    // Get all users from the database
    const usersRef = db.collection("users");
    const usersSnapshot = await usersRef.get();
    
    if (usersSnapshot.empty) {
      console.log("[EMAIL CAMPAIGN] No users found in database");
      return { success: false, message: "No users found" };
    }

    const emailPromises: Promise<any>[] = [];
    const campaignField = `emailCampaigns.${campaignId}`;
    let emailCount = 0;
    let skippedCount = 0;

    // If testEmail is provided, only send to that email
    if (testEmail) {
      console.log(`[EMAIL CAMPAIGN] Test mode - sending only to: ${testEmail}`);
      
      // Look up the actual username for the test email
      let testUsername = "Test User";
      const testEmailLower = testEmail.toLowerCase();
      
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userEmailLower = userData.email ? userData.email.toLowerCase() : '';
        
        if (userEmailLower === testEmailLower) {
          testUsername = userData.username || userData.displayName || userData.name || "Traveler";
          console.log(`[EMAIL CAMPAIGN] Found user for ${testEmail}: ${testUsername}`);
          break;
        }
      }
      
      if (testUsername === "Test User") {
        console.log(`[EMAIL CAMPAIGN] Warning: Could not find user with email ${testEmail}, using default name`);
      }
      
      const mailDoc = createCampaignEmailContent(testEmail, campaignId, testUsername);
      emailPromises.push(db.collection("mail").add(mailDoc));
      emailCount = 1;
    } else {
      // Send to all users
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const userEmail = userData.email;
        
        if (!userEmail) {
          console.log(`[EMAIL CAMPAIGN] Skipping user ${userDoc.id} - no email`);
          skippedCount++;
          continue;
        }

        // Check if user has already received this campaign
        if (userData.emailCampaigns && userData.emailCampaigns[campaignId]) {
          console.log(`[EMAIL CAMPAIGN] Skipping user ${userDoc.id} - already received campaign ${campaignId}`);
          skippedCount++;
          continue;
        }

        // Create email document
        const mailDoc = createCampaignEmailContent(userEmail, campaignId, userData.username || "Traveler");
        emailPromises.push(db.collection("mail").add(mailDoc));

        // Mark user as having received this campaign
        emailPromises.push(
          userDoc.ref.update({
            [campaignField]: {
              sentAt: admin.firestore.FieldValue.serverTimestamp(),
              campaignId: campaignId
            }
          })
        );

        emailCount++;
      }
    }

    // Send all emails
    await Promise.all(emailPromises);

    const result = {
      success: true,
      campaignId,
      emailsSent: emailCount,
      usersSkipped: skippedCount,
      totalUsers: usersSnapshot.size
    };

    console.log(`[EMAIL CAMPAIGN] Campaign ${campaignId} completed:`, result);
    return result;

  } catch (error) {
    console.error(`[EMAIL CAMPAIGN] Error in campaign ${campaignId}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', `Failed to send email campaign: ${error}`);
  }
});

// Helper function to create email content for campaigns
function createCampaignEmailContent(userEmail: string, campaignId: string, username: string) {
  // Campaign-specific content
  const campaigns: { [key: string]: any } = {
    "new-features-2025": {
      subject: "Thank you for being one of the first travelers on TravalPass ✈️",
      htmlContent: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%); color: white; padding: 30px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 600;">TravalPass</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Find Travel Companions</p>
          </div>

          <!-- Main Content -->
          <div style="padding: 30px 20px;">
            <h2 style="color: #1976d2; margin: 0 0 20px 0; font-size: 24px;">Hi ${username}! 👋</h2>
            
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Thank you for being one of the very first travelers to join TravalPass! Your early support means the world to me.
            </p>

            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Since launch, my small team and I have been working hard to add exciting new features that I think you'll love:
            </p>

            <!-- New Features Section -->
            <div style="background: #f8f9fa; border-radius: 8px; padding: 25px; margin-bottom: 25px;">
              <h3 style="color: #1976d2; margin: 0 0 15px 0; font-size: 20px;">🤖 AI Itinerary Generation</h3>
              <ul style="color: #555; font-size: 15px; line-height: 1.6; margin: 0; padding-left: 20px;">
                <li>Set your <strong>Travel Preference Profile</strong> on your profile page</li>
                <li>Generate personalized <strong>daily itineraries</strong> for your entire trip</li>
                <li>Get recommendations for <strong>activities, accommodations, restaurants, and travel</strong></li>
                <li><strong>Edit and share</strong> your itineraries with friends and travel companions</li>
              </ul>
            </div>

            <!-- Sample Itinerary -->
            <div style="text-align: center; margin: 25px 0;">
              <a href="https://travalpass.com/share-itinerary/gen_1759794137253_r16fdynnc" 
                 style="display: inline-block; background: #1976d2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                🗺️ View Sample AI Itinerary
              </a>
            </div>

            <!-- Tutorial Video -->
            <div style="background: #e3f2fd; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center;">
              <h4 style="color: #1976d2; margin: 0 0 10px 0; font-size: 18px;">📹 Quick Tutorial</h4>
              <p style="color: #555; font-size: 15px; margin-bottom: 15px;">
                I've created a quick walkthrough to show you how to use all the new TravalPass features:
              </p>
              <a href="https://youtube.com/shorts/hyRvN9cHtRM?feature=share" 
                 style="display: inline-block; background: #d32f2f; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                ▶️ Watch the Tutorial
              </a>
            </div>

            <!-- Feedback Section -->
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
              As an early adopter, you have the unique opportunity to help shape TravalPass. I truly value your input and would love to hear:
            </p>
            
            <ul style="color: #555; font-size: 15px; line-height: 1.6; margin-bottom: 20px; padding-left: 20px;">
              <li>Ideas for new features</li>
              <li>Suggestions for improvements</li>
              <li>Any feedback about your experience</li>
            </ul>

            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              You can reach me at <a href="mailto:feedback@travalpass.com" style="color: #1976d2;">feedback@travalpass.com</a> 
              or use the floating feedback button inside the app.
            </p>

            <!-- Call to Action -->
            <div style="background: #f1f8e9; border-radius: 8px; padding: 20px; margin-bottom: 25px; text-align: center;">
              <h4 style="color: #388e3c; margin: 0 0 10px 0; font-size: 18px;">🚀 Try the New Features</h4>
              <p style="color: #555; font-size: 15px; margin-bottom: 15px;">
                Generate your first AI itinerary and share it with friends!
              </p>
              <a href="https://travalpass.com/profile" 
                 style="display: inline-block; background: #388e3c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
                Set Up Your Travel Profile
              </a>
            </div>

            <!-- Closing -->
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 10px;">
              Thank you again for being part of the TravalPass journey from the beginning. Your support and feedback are what make this platform special.
            </p>

            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 0;">
              Happy travels! ✈️
            </p>

            <p style="color: #1976d2; font-size: 16px; font-weight: 500; margin: 20px 0 0 0;">
              — The Team at TravalPass ✈️
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #f5f5f5; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
            <p style="color: #666; font-size: 14px; margin: 0;">
              <a href="https://travalpass.com" style="color: #1976d2; text-decoration: none;">TravalPass.com</a> | 
              Find Travel Companions | © 2025 TravalPass
            </p>
          </div>
        </div>
      `,
      textContent: `
Hi ${username}!

Thank you for being one of the very first travelers to join TravalPass! Your early support means the world to me.

Since launch, my small team and I have been working hard to add exciting new features:

🤖 AI ITINERARY GENERATION
- Set your Travel Preference Profile on your profile page
- Generate personalized daily itineraries for your entire trip  
- Get recommendations for activities, accommodations, restaurants, and travel
- Edit and share your itineraries with friends and travel companions

View a sample AI itinerary: https://travalpass.com/share-itinerary/gen_1759794137253_r16fdynnc

📹 QUICK TUTORIAL
I've created a quick walkthrough to show you how to use all the new TravalPass features:
https://youtube.com/shorts/hyRvN9cHtRM?feature=share

💭 YOUR FEEDBACK MATTERS
As an early adopter, you have the unique opportunity to help shape TravalPass. I truly value your input and would love to hear:
- Ideas for new features
- Suggestions for improvements  
- Any feedback about your experience

You can reach me at feedback@travalpass.com or use the floating feedback button inside the app.

🚀 GET STARTED
Generate your first AI itinerary and share it with friends: https://travalpass.com/profile

Thank you again for being part of the TravalPass journey from the beginning. Your support and feedback are what make this platform special.

Happy travels! ✈️

– The Team at TravalPass ✈️

TravalPass.com | Find Travel Companions | © 2025 TravalPass
      `
    }
  };

  const campaign = campaigns[campaignId];
  if (!campaign) {
    throw new HttpsError('not-found', `Unknown campaign ID: ${campaignId}`);
  }

  return {
    to: userEmail,
    from: "no-reply@travalpass.com",
    message: {
      subject: campaign.subject,
      text: campaign.textContent.trim(),
      html: campaign.htmlContent.trim(),
    },
    tracking_settings: {
      click_tracking: {
        enable: false
      },
      open_tracking: {
        enable: false
      }
    }
  };
}

export const notifyViolationReport = onDocumentCreated("violations/{violationId}", async (event) => {
  const snap = event.data;
  const violation = snap && typeof (snap as any).data === 'function' ? (snap as any).data() : snap;
  const violationId = event.params?.violationId as string;

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

const stripe = new Stripe(process.env.STRIPE_API_KEY!, { apiVersion: '2022-11-15' });

const app = express();

// Stripe requires the raw body to validate the signature
app.post("/", bodyParser.raw({ type: "application/json" }), async (req: any, res: any) => {
  const sig = req.headers["stripe-signature"];
  let event: Stripe.Event;

  try {
    // Use req.rawBody for Firebase Functions compatibility
    event = stripe.webhooks.constructEvent(
      req.rawBody,
      sig as string,
      process.env.STRIPE_WEBHOOK_SECRET!
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

// Export the function (v2 HTTPS)
export const stripeWebhook = onRequest(app);
export { videoShare } from './videoSharing';
export { searchFlights } from './searchFlights';
export { searchAccommodations } from './searchAccommodations';
export { generateItineraryWithAI } from './generateItineraryWithAI';
export { generateFullItinerary } from './generateFullItinerary';
export { placeSearch, geocodePlace } from './placeProxy';
export { openFlightsGetAll, openFlightsSearch, openFlightsHttp } from './openFlightsProxy';
