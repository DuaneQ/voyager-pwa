import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import express from "express";

// Initialize admin if not already done
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const app = express();

// Helper function to detect social media crawlers
function isSocialMediaCrawler(userAgent: string): boolean {
  const crawlerPatterns = [
    /facebookexternalhit/i,
    /twitterbot/i,
    /linkedinbot/i,
    /whatsapp/i,
    /telegrambot/i,
    /slackbot/i,
    /discordbot/i,
    /skype/i,
    /pinterest/i,
    /redditbot/i,
    /applebot/i,
    /googlebot/i,
    /bingbot/i
  ];
  
  return crawlerPatterns.some(pattern => pattern.test(userAgent));
}

// Generate HTML with video-specific meta tags
function generateVideoHTML(video: any, videoId: string): string {
  // Use production domain for TravalPass
  const baseUrl = 'https://travalpass.com';
  const videoUrl = `${baseUrl}/video/${videoId}`;
  const shareUrl = `${baseUrl}/video-share/${videoId}`;
  
  // Use video thumbnail or fallback to default
  const imageUrl = video.thumbnailUrl || `${baseUrl}/og-image.png`;
  
  // Clean and truncate description
  const description = video.description 
    ? video.description.substring(0, 160) 
    : 'Watch this amazing video on TravalPass';
  
  const title = video.title 
    ? `${video.title} - TravalPass` 
    : 'Video - TravalPass';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  
  <!-- Primary Meta Tags -->
  <title>${title}</title>
  <meta name="title" content="${title}">
  <meta name="description" content="${description}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="video.other">
  <meta property="og:url" content="${videoUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:video" content="${video.videoUrl}">
  <meta property="og:video:secure_url" content="${video.videoUrl}">
  <meta property="og:video:type" content="video/mp4">
  <meta property="og:site_name" content="TravalPass">
  
  <!-- Twitter -->
  <meta property="twitter:card" content="player">
  <meta property="twitter:url" content="${videoUrl}">
  <meta property="twitter:title" content="${title}">
  <meta property="twitter:description" content="${description}">
  <meta property="twitter:image" content="${imageUrl}">
  <meta property="twitter:player" content="${video.videoUrl}">
  <meta property="twitter:player:width" content="1280">
  <meta property="twitter:player:height" content="720">
  
  <!-- LinkedIn -->
  <meta property="og:video:width" content="1280">
  <meta property="og:video:height" content="720">
  
  <!-- Favicon -->
  <link rel="icon" href="${baseUrl}/favicon.ico">
  <link rel="apple-touch-icon" href="${baseUrl}/logo192.png">
  
  <!-- Redirect script for non-crawler users -->
  <script>
    // Only redirect if this is not a crawler
    const userAgent = navigator.userAgent.toLowerCase();
    const isCrawler = /bot|crawler|spider|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegram|slack|discord|skype|pinterest|reddit/i.test(userAgent);
    
    if (!isCrawler) {
      // Redirect to the actual app
      window.location.href = '${videoUrl}';
    }
  </script>
</head>
<body>
  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <img src="${imageUrl}" alt="Video thumbnail" style="max-width: 600px; width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
    <h1 style="margin: 20px 0 10px 0; text-align: center; color: #333;">${video.title || 'Video'}</h1>
    <p style="margin: 0 20px 20px 20px; text-align: center; color: #666; max-width: 600px;">${description}</p>
    <a href="${videoUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Watch on TravalPass</a>
    <noscript>
      <meta http-equiv="refresh" content="0; url=${videoUrl}">
    </noscript>
  </div>
</body>
</html>`;
}

// Express route handler
app.get('/video-share/:videoId', async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const userAgent = req.get('User-Agent') || '';
    
    console.log(`Video share request for ${videoId}, User-Agent: ${userAgent}`);
    
    // Fetch video from Firestore
    const videoDoc = await admin.firestore().collection('videos').doc(videoId).get();
    
    if (!videoDoc.exists) {
      return res.status(404).send('Video not found');
    }
    
    const videoData = videoDoc.data();
    
    // Check if this is a social media crawler
    if (isSocialMediaCrawler(userAgent)) {
      console.log('Serving crawler-optimized HTML for video:', videoId);
      const html = generateVideoHTML(videoData, videoId);
      res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
      res.send(html);
    } else {
      // For regular users, redirect to the actual video page
      console.log('Redirecting regular user to video page for video:', videoId);
      res.redirect(`https://travalpass.com/video/${videoId}`);
    }
    
  } catch (error) {
    console.error('Error serving video page:', error);
    res.status(500).send('Internal server error');
  }
});

// Default route
app.get('/', (req, res) => {
  res.redirect('https://travalpass.com');
});

export const videoShare = functions.https.onRequest(app);
