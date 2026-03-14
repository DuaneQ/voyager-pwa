/**
 * Mux Video Processing Functions
 *
 * Handles video transcoding via Mux for universal Android/iOS compatibility.
 *
 * Flow:
 * 1. User uploads video to Firebase Storage (existing flow)
 * 2. onVideoUploaded trigger detects new video in Storage
 * 3. Send video URL to Mux for transcoding
 * 4. Mux webhook notifies when transcoding completes
 * 5. Update Firestore with Mux playback URL
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO (Story A): Auto-delete raw uploads from Firebase Storage after 30 days
 * ─────────────────────────────────────────────────────────────────────────────
 * Why: Once Mux finishes transcoding (video.asset.ready webhook), the original
 * Storage file is never served to users — Mux CDN handles all playback via
 * stream.mux.com/{playbackId}.m3u8. Keeping the Storage copy indefinitely is
 * pure cost with no user-facing benefit.
 *
 * Recommended approach: Firebase Storage Object Lifecycle rule (free, no code).
 * In firebase.json (or the Firebase Console → Storage → Rules → Lifecycle):
 *
 *   {
 *     "lifecycle": {
 *       "rule": [{
 *         "action": { "type": "Delete" },
 *         "condition": {
 *           "age": 30,
 *           "matchesStorageClass": ["STANDARD"]
 *         }
 *       }]
 *     }
 *   }
 *
 * Scope the rule to the bucket prefix `users/` to avoid deleting other assets.
 * 30-day window gives a re-transcode safety net (e.g. if we switch from Mux or
 * need to reprocess at a higher quality tier) without paying for permanent storage.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TODO (Story B): Delete Mux asset when a user deletes their video
 * ─────────────────────────────────────────────────────────────────────────────
 * Why: VideoService.deleteVideo() (voyager-RN/src/services/video/VideoService.ts)
 * currently deletes the Firebase Storage file and the Firestore `videos/{id}`
 * document but does NOT call mux.video.assets.delete(muxAssetId). This means:
 *   • The transcoded video remains accessible at stream.mux.com/{playbackId}.m3u8
 *     even after the user deletes it — a privacy/GDPR concern.
 *   • Mux charges for stored asset minutes on orphaned assets indefinitely.
 *
 * Implementation plan:
 *   Option 1 (client-side, simpler): In VideoService.deleteVideo(), read
 *   `video.muxAssetId` before deleting the Firestore doc, then call a new
 *   Cloud Function `deleteMuxAsset({ muxAssetId })` that calls
 *   mux.video.assets.delete(muxAssetId). The Cloud Function holds the Mux
 *   credentials — never expose them to the client.
 *
 *   Option 2 (server-side, safer): Add a Firestore onDocumentDeleted trigger
 *   on `videos/{videoId}` that reads the deleted doc snapshot, extracts
 *   muxAssetId, and calls mux.video.assets.delete(). Fully automatic — no
 *   client changes needed.
 *
 *   Recommendation: Option 2. It catches deletions from any surface (PWA, RN,
 *   admin scripts, account deletion flow) without needing each caller to know
 *   about Mux.
 *
 * Same gap applies to ad campaigns: if an ads_campaigns doc is deleted while
 * muxAssetId is set, the asset should also be removed from Mux.
 */

import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onRequest, onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import Mux from "@mux/mux-node";
import * as crypto from "crypto";

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Mux credentials — loaded from environment variables (.env / .env.mundo1-1).
// Never hardcode these. Set MUX_TOKEN_ID, MUX_TOKEN_SECRET,
// MUX_WEBHOOK_DEV_SIGNING_SECRET, MUX_WEBHOOK_PROD_SIGNING_SECRET in .env.
const MUX_TOKEN_ID = process.env.MUX_TOKEN_ID ?? '';
const MUX_TOKEN_SECRET = process.env.MUX_TOKEN_SECRET ?? '';
const MUX_WEBHOOK_SECRET_DEV = process.env.MUX_WEBHOOK_DEV_SIGNING_SECRET ?? '';
const MUX_WEBHOOK_SECRET_PROD = process.env.MUX_WEBHOOK_PROD_SIGNING_SECRET ?? '';

// Initialize Mux client
const mux = new Mux({
  tokenId: MUX_TOKEN_ID,
  tokenSecret: MUX_TOKEN_SECRET,
});

/**
 * Triggered when a video is uploaded to Firebase Storage
 * Sends the video to Mux for transcoding
 */
export const onVideoUploaded = onObjectFinalized(
  {
    bucket: "mundo1-1.appspot.com", // Production bucket
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    // Only process video files in user video directories
    if (!filePath || !contentType?.startsWith("video/")) {
      console.log(`[Mux] Skipping non-video file: ${filePath}`);
      return;
    }

    // Match pattern: users/{userId}/videos/{videoFileName}
    const videoPathMatch = filePath.match(/^users\/([^/]+)\/videos\/([^/]+)$/);
    if (!videoPathMatch) {
      console.log(`[Mux] Skipping file not in video path: ${filePath}`);
      return;
    }

    const userId = videoPathMatch[1];
    const videoFileName = videoPathMatch[2];
    const videoId = videoFileName.replace(/\.[^.]+$/, ""); // Remove extension

    console.log(`[Mux] Processing video upload: userId=${userId}, videoId=${videoId}`);

    try {
      // Get the download URL for the video
      const bucket = admin.storage().bucket(event.data.bucket);
      const file = bucket.file(filePath);
      
      // Get a signed URL that Mux can access (valid for 1 hour)
      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 3600 * 1000, // 1 hour
      });

      console.log(`[Mux] Got signed URL for video, sending to Mux...`);

      // Create Mux asset from the video URL
      const asset = await mux.video.assets.create({
        inputs: [{ url: signedUrl }],
        playback_policy: ["public"],
        // Encoding settings for universal compatibility
        encoding_tier: "baseline", // Use baseline for fastest encoding
        max_resolution_tier: "1080p", // Cap at 1080p for mobile
        // Standard MP4 renditions (free) so og:video works for Facebook/social sharing
        mp4_support: "standard",
        // Add metadata for tracking
        passthrough: JSON.stringify({
          userId,
          videoId,
          originalPath: filePath,
          firebaseVideoDocId: "", // Will be updated by webhook
        }),
      });

      console.log(`[Mux] Asset created: ${asset.id}, status: ${asset.status}`);

      // Find the Firestore document for this video and update it with Mux info
      // The document might not exist yet if this trigger fires before Firestore write
      // Note: videoUrl is a string, not an array, so we fetch by userId and filter client-side
      const videosSnapshot = await db
        .collection("videos")
        .where("userId", "==", userId)
        .get();

      let videoDocId: string | null = null;
      videosSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.videoUrl && data.videoUrl.includes(videoId)) {
          videoDocId = doc.id;
        }
      });

      if (videoDocId) {
        // Update with Mux asset info (transcoding in progress)
        await db.collection("videos").doc(videoDocId).update({
          muxAssetId: asset.id,
          muxStatus: asset.status,
          muxPlaybackId: asset.playback_ids?.[0]?.id || null,
          muxProcessingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`[Mux] Updated Firestore doc ${videoDocId} with Mux asset info`);
      } else {
        // Store mapping for later (webhook will use this)
        await db.collection("mux_pending").doc(asset.id).set({
          userId,
          videoId,
          originalPath: filePath,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`[Mux] Created pending record for asset ${asset.id}`);
      }

      return { success: true, assetId: asset.id };
    } catch (error) {
      console.error(`[Mux] Error processing video:`, error);
      throw error;
    }
  }
);

/**
 * Mux Webhook Handler
 * Receives notifications when video processing completes or fails
 * 
 * Webhook URL: https://us-central1-mundo1-dev.cloudfunctions.net/muxWebhook
 */
export const muxWebhook = onRequest(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (req, res) => {
    // Only accept POST requests
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    // Verify webhook signature for security
    const signature = req.headers["mux-signature"] as string;
    if (!signature) {
      console.error("[Mux Webhook] Missing mux-signature header");
      res.status(401).send("Missing signature");
      return;
    }

    // Parse signature header: t=timestamp,v1=signature
    const signatureParts = signature.split(",");
    const timestamp = signatureParts.find((p) => p.startsWith("t="))?.split("=")[1];
    const expectedSignature = signatureParts.find((p) => p.startsWith("v1="))?.split("=")[1];

    if (!timestamp || !expectedSignature) {
      console.error("[Mux Webhook] Invalid signature format");
      res.status(401).send("Invalid signature format");
      return;
    }

    // Verify signature: HMAC-SHA256 of "timestamp.body"
    const payload = `${timestamp}.${JSON.stringify(req.body)}`;
    
    // Try both dev and prod secrets (same Mux account, different webhook endpoints)
    const computedSignatureDev = crypto
      .createHmac("sha256", MUX_WEBHOOK_SECRET_DEV)
      .update(payload)
      .digest("hex");
    const computedSignatureProd = crypto
      .createHmac("sha256", MUX_WEBHOOK_SECRET_PROD)
      .update(payload)
      .digest("hex");

    const expectedBuf = Buffer.from(expectedSignature, "hex");
    const devBuf = Buffer.from(computedSignatureDev, "hex");
    const prodBuf = Buffer.from(computedSignatureProd, "hex");
    const isValidDev = expectedBuf.length === devBuf.length && crypto.timingSafeEqual(expectedBuf, devBuf);
    const isValidProd = expectedBuf.length === prodBuf.length && crypto.timingSafeEqual(expectedBuf, prodBuf);
    if (!isValidDev && !isValidProd) {
      console.error("[Mux Webhook] Signature mismatch");
      res.status(401).send("Invalid signature");
      return;
    }

    const event = req.body;
    console.log(`[Mux Webhook] Verified event: ${event.type}`);

    try {
      switch (event.type) {
        case "video.asset.ready": {
          // Video is ready for playback
          const asset = event.data;
          const assetId = asset.id;
          const playbackId = asset.playback_ids?.[0]?.id;

          if (!playbackId) {
            console.error(`[Mux Webhook] No playback ID for asset ${assetId}`);
            res.status(200).send("OK");
            return;
          }

          // Construct the HLS playback URL
          const muxPlaybackUrl = `https://stream.mux.com/${playbackId}.m3u8`;
          const muxThumbnailUrl = `https://image.mux.com/${playbackId}/thumbnail.jpg`;

          console.log(`[Mux Webhook] Asset ready: ${assetId}, playbackUrl: ${muxPlaybackUrl}`);

          // Route to the correct Firestore collection based on passthrough metadata.
          // Ad campaigns set type:'ad' and campaignId; organic videos set videoId.
          let passthrough: Record<string, unknown> = {};
          try {
            passthrough = asset.passthrough ? JSON.parse(asset.passthrough as string) : {};
          } catch {
            console.warn(`[Mux Webhook] Could not parse passthrough for asset ${assetId}`);
          }

          if (passthrough.type === "ad" && typeof passthrough.campaignId === "string") {
            const campaignId = passthrough.campaignId;
            await db.collection("ads_campaigns").doc(campaignId).update({
              muxPlaybackUrl,
              muxThumbnailUrl,
              muxPlaybackId: playbackId,
              muxStatus: "ready",
              muxReadyAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`[Mux Webhook] Updated ads_campaigns/${campaignId} with playback URL`);
            break;
          }

          // Try to find video doc by muxAssetId
          const videosQuery = await db
            .collection("videos")
            .where("muxAssetId", "==", assetId)
            .limit(1)
            .get();

          if (!videosQuery.empty) {
            const videoDoc = videosQuery.docs[0];
            await videoDoc.ref.update({
              muxPlaybackUrl,
              muxThumbnailUrl,
              muxPlaybackId: playbackId,
              muxStatus: "ready",
              muxReadyAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`[Mux Webhook] Updated video ${videoDoc.id} with playback URL`);
          } else {
            // Check pending records
            const pendingDoc = await db.collection("mux_pending").doc(assetId).get();
            if (pendingDoc.exists) {
              const pending = pendingDoc.data();
              // Try to find the video by matching userId and videoId in URL
              const videosQuery2 = await db
                .collection("videos")
                .where("userId", "==", pending?.userId)
                .get();

              for (const doc of videosQuery2.docs) {
                const data = doc.data();
                if (data.videoUrl && data.videoUrl.includes(pending?.videoId)) {
                  await doc.ref.update({
                    muxAssetId: assetId,
                    muxPlaybackUrl,
                    muxThumbnailUrl,
                    muxPlaybackId: playbackId,
                    muxStatus: "ready",
                    muxReadyAt: admin.firestore.FieldValue.serverTimestamp(),
                  });
                  console.log(`[Mux Webhook] Updated video ${doc.id} from pending record`);
                  // Clean up pending record
                  await pendingDoc.ref.delete();
                  break;
                }
              }
            }
          }
          break;
        }

        case "video.asset.errored": {
          // Video processing failed
          const asset = event.data;
          const assetId = asset.id;
          const errorMessage = asset.errors?.messages?.join(", ") || "Unknown error";

          console.error(`[Mux Webhook] Asset errored: ${assetId}, error: ${errorMessage}`);

          // Route ad campaign errors to ads_campaigns collection
          let errorPassthrough: Record<string, unknown> = {};
          try {
            errorPassthrough = asset.passthrough ? JSON.parse(asset.passthrough as string) : {};
          } catch {
            console.warn(`[Mux Webhook] Could not parse passthrough for errored asset ${assetId}`);
          }

          if (errorPassthrough.type === "ad" && typeof errorPassthrough.campaignId === "string") {
            await db.collection("ads_campaigns").doc(errorPassthrough.campaignId).update({
              muxStatus: "errored",
              muxError: errorMessage,
              muxErrorAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.error(`[Mux Webhook] Updated ads_campaigns/${errorPassthrough.campaignId} with error status`);
            break;
          }

          // Update video doc with error status
          const videosQuery = await db
            .collection("videos")
            .where("muxAssetId", "==", assetId)
            .limit(1)
            .get();

          if (!videosQuery.empty) {
            await videosQuery.docs[0].ref.update({
              muxStatus: "errored",
              muxError: errorMessage,
              muxErrorAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
          break;
        }

        default:
          console.log(`[Mux Webhook] Unhandled event type: ${event.type}`);
      }

      res.status(200).send("OK");
    } catch (error) {
      console.error(`[Mux Webhook] Error processing webhook:`, error);
      res.status(500).send("Internal server error");
    }
  }
);

/**
 * Manually trigger Mux processing for an existing video
 * Useful for migrating existing videos to Mux
 */
export const processVideoWithMux = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 120,
  },
  async (request) => {
    // Require authentication
    if (!request.auth) {
      throw new Error("Authentication required");
    }

    const { videoId, videoUrl } = request.data;

    if (!videoId || !videoUrl) {
      throw new Error("videoId and videoUrl are required");
    }

    console.log(`[Mux] Manual processing requested for video ${videoId}`);

    try {
      // Create Mux asset from the video URL
      const asset = await mux.video.assets.create({
        inputs: [{ url: videoUrl }],
        playback_policy: ["public"],
        encoding_tier: "baseline",
        max_resolution_tier: "1080p",
        mp4_support: "standard",
        passthrough: JSON.stringify({
          videoId,
          userId: request.auth.uid,
        }),
      });

      // Update Firestore with Mux asset info
      await db.collection("videos").doc(videoId).update({
        muxAssetId: asset.id,
        muxStatus: asset.status,
        muxPlaybackId: asset.playback_ids?.[0]?.id || null,
        muxProcessingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`[Mux] Asset created: ${asset.id} for video ${videoId}`);

      return {
        success: true,
        assetId: asset.id,
        status: asset.status,
      };
    } catch (error) {
      console.error(`[Mux] Error processing video ${videoId}:`, error);
      throw error;
    }
  }
);

/**
 * Process an ad campaign video with Mux.
 *
 * Called from the voyager-ads advertiser UI after a video creative has been
 * uploaded to Firebase Storage.  The function:
 *   1. Validates that the authenticated caller owns the campaign.
 *   2. Generates a short-lived signed URL for the Storage object.
 *   3. Creates a Mux asset (baseline encoding, ≤ 1080p).
 *   4. Writes muxAssetId / muxStatus:'preparing' to ads_campaigns/{campaignId}.
 *
 * The muxWebhook function completes the flow when Mux fires video.asset.ready.
 */
export const processAdVideoWithMux = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 120,
  },
  async (request) => {
    if (!request.auth) {
      throw new Error("Authentication required");
    }

    const { campaignId, storagePath } = request.data as { campaignId?: string; storagePath?: string };

    if (!campaignId || !storagePath) {
      throw new Error("campaignId and storagePath are required");
    }

    // Verify the authenticated caller owns this campaign.
    const campaignRef = db.collection("ads_campaigns").doc(campaignId);
    const campaignSnap = await campaignRef.get();
    if (!campaignSnap.exists) {
      throw new Error(`Campaign ${campaignId} not found`);
    }
    if (campaignSnap.data()?.uid !== request.auth.uid) {
      throw new Error("Unauthorized: caller does not own this campaign");
    }

    console.log(`[Mux Ads] Processing ad video: campaignId=${campaignId}, storagePath=${storagePath}`);

    try {
      // Generate a signed URL that Mux can fetch (valid for 1 hour).
      // Use the default bucket so this works on both dev and prod projects.
      const bucket = admin.storage().bucket();
      const file = bucket.file(storagePath);
      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 3600 * 1000,
      });

      // Create the Mux asset; embed campaignId in passthrough so the webhook
      // can route video.asset.ready to ads_campaigns (not videos).
      const asset = await mux.video.assets.create({
        inputs: [{ url: signedUrl }],
        playback_policy: ["public"],
        encoding_tier: "baseline",
        max_resolution_tier: "1080p",
        mp4_support: "standard",
        passthrough: JSON.stringify({
          campaignId,
          type: "ad",
        }),
      });

      await campaignRef.update({
        muxAssetId: asset.id,
        muxStatus: "preparing",
        muxPlaybackId: asset.playback_ids?.[0]?.id || null,
        muxProcessingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`[Mux Ads] Asset created: ${asset.id} for campaign ${campaignId}`);

      return {
        success: true,
        assetId: asset.id,
        status: asset.status,
      };
    } catch (error) {
      console.error(`[Mux Ads] Error processing campaign ${campaignId}:`, error);
      throw error;
    }
  }
);

/**
 * Migrate all existing videos to Mux
 * Admin-only function
 */
export const migrateVideosToMux = onCall(
  {
    region: "us-central1",
    memory: "512MiB",
    timeoutSeconds: 540, // 9 minutes max
  },
  async (request) => {
    // Require authentication
    if (!request.auth) {
      throw new Error("Authentication required");
    }

    const { limit: maxVideos = 10, dryRun = true } = request.data;

    console.log(`[Mux Migration] Starting migration, limit=${maxVideos}, dryRun=${dryRun}`);

    try {
      // Find videos that don't have Mux processing yet
      // Note: Firestore can't query for "field doesn't exist", so we fetch all and filter
      const videosSnapshot = await db
        .collection("videos")
        .limit(maxVideos * 2) // Fetch extra to account for already-processed videos
        .get();

      const videosToMigrate: { id: string; videoUrl: string; userId: string }[] = [];

      videosSnapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.muxAssetId && data.videoUrl && videosToMigrate.length < maxVideos) {
          videosToMigrate.push({
            id: doc.id,
            videoUrl: data.videoUrl,
            userId: data.userId,
          });
        }
      });

      console.log(`[Mux Migration] Found ${videosToMigrate.length} videos to migrate`);

      if (dryRun) {
        return {
          success: true,
          dryRun: true,
          videosFound: videosToMigrate.length,
          videos: videosToMigrate.map((v) => ({ id: v.id, userId: v.userId })),
        };
      }

      const results: { videoId: string; success: boolean; assetId?: string; error?: string }[] = [];

      for (const video of videosToMigrate) {
        try {
          const asset = await mux.video.assets.create({
            inputs: [{ url: video.videoUrl }],
            playback_policy: ["public"],
            encoding_tier: "baseline",
            max_resolution_tier: "1080p",
            mp4_support: "standard",
            passthrough: JSON.stringify({
              videoId: video.id,
              userId: video.userId,
            }),
          });

          await db.collection("videos").doc(video.id).update({
            muxAssetId: asset.id,
            muxStatus: asset.status,
            muxPlaybackId: asset.playback_ids?.[0]?.id || null,
            muxProcessingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          results.push({ videoId: video.id, success: true, assetId: asset.id });
          console.log(`[Mux Migration] Processed video ${video.id}, asset ${asset.id}`);

          // Small delay to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`[Mux Migration] Error processing video ${video.id}:`, error);
          results.push({
            videoId: video.id,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      return {
        success: true,
        dryRun: false,
        processed: results.length,
        results,
      };
    } catch (error) {
      console.error(`[Mux Migration] Error:`, error);
      throw error;
    }
  }
);
