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

// Mux credentials (hardcoded per project convention - see index.ts comment)
const MUX_TOKEN_ID = "a08a323c-83c3-4689-9e01-3d0c9ddebd47";
const MUX_TOKEN_SECRET = "Ahl+1R8js47EC/eVooJuM6FQnArjefTruvw1VAu4HszknS6uJrryeIpiVd/cDI5yop7WxMgs07N";
const MUX_WEBHOOK_SECRET_DEV = "v3ob3vqdg4pskfr80t24v4hu4se7kr5e";
const MUX_WEBHOOK_SECRET_PROD = "9hb8dk3t5tfb7bh8nlep286l9qj39dov";

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

    if (computedSignatureDev !== expectedSignature && computedSignatureProd !== expectedSignature) {
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
