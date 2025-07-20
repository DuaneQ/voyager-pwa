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

// Helper function to detect Facebook's in-app browser
function isFacebookInAppBrowser(userAgent: string): boolean {
  // Facebook in-app browser patterns
  return /FBAN|FBAV|FBSV|FBID/i.test(userAgent) || 
         (/Mobile.*Facebook/i.test(userAgent) && !/facebookexternalhit/i.test(userAgent));
}

// Helper function to detect other in-app browsers that might have issues
function isRestrictedInAppBrowser(userAgent: string): boolean {
  const restrictedPatterns = [
    /FBAN|FBAV|FBSV|FBID/i, // Facebook
    /Instagram/i,           // Instagram
    /Line\//i,             // Line
    /MicroMessenger/i,     // WeChat
    /TwitterAndroid|Twitter for iPhone/i // Twitter
  ];
  
  return restrictedPatterns.some(pattern => pattern.test(userAgent));
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

  // For Facebook sharing, prioritize a compelling thumbnail over video file
  // Facebook often doesn't display video previews reliably for non-partner domains
  const fbOptimizedImageUrl = video.thumbnailUrl || `${baseUrl}/og-image.png`;

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
  
  <!-- Open Graph / Facebook (Optimized for thumbnail sharing) -->
  <meta property="og:type" content="video.other">
  <meta property="og:url" content="${videoUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${fbOptimizedImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:site_name" content="TravalPass">
  
  <!-- Video meta tags (may work for some platforms) -->
  ${video.videoUrl && video.isPublic ? `<meta property="og:video" content="${video.videoUrl}">` : ''}
  ${video.videoUrl && video.isPublic ? `<meta property="og:video:secure_url" content="${video.videoUrl}">` : ''}
  ${video.videoUrl && video.isPublic ? `<meta property="og:video:type" content="video/mp4">` : ''}
  ${video.videoUrl && video.isPublic ? `<meta property="og:video:width" content="1280">` : ''}
  ${video.videoUrl && video.isPublic ? `<meta property="og:video:height" content="720">` : ''}
  ${video.duration ? `<meta property="video:duration" content="${video.duration}">` : ''}
  
  <!-- Facebook App ID (replace with your actual app ID) -->
  <meta property="fb:app_id" content="9693404114094436">
  
  <!-- Debug info for troubleshooting -->
  <!-- App ID: 9693404114094436 -->
  <!-- Video ID: ${videoId} -->
  <!-- Video URL: ${video.videoUrl || 'No video URL'} -->
  <!-- Is Public: ${video.isPublic} -->
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${videoUrl}">
  <meta property="twitter:title" content="${title}">
  <meta property="twitter:description" content="${description}">
  <meta property="twitter:image" content="${imageUrl}">
  ${video.videoUrl ? `<meta property="twitter:player" content="${shareUrl}">` : ''}
  ${video.videoUrl ? `<meta property="twitter:player:width" content="1280">` : ''}
  ${video.videoUrl ? `<meta property="twitter:player:height" content="720">` : ''}
  
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
      // Redirect to the actual app after a short delay to allow meta tags to load
      setTimeout(() => {
        window.location.href = '${videoUrl}';
      }, 100);
    }
  </script>
</head>
<body>
  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <img src="${imageUrl}" alt="Video thumbnail" style="max-width: 600px; width: 100%; height: auto; border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);" onerror="this.style.display='none'">
    <h1 style="margin: 20px 0 10px 0; text-align: center; color: #333;">${video.title || 'Video'}</h1>
    <p style="margin: 0 20px 20px 20px; text-align: center; color: #666; max-width: 600px;">${description}</p>
    <a href="${videoUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Watch on TravalPass</a>
    <p style="margin-top: 10px; font-size: 12px; color: #999;">If you're not redirected automatically, click the button above.</p>
    <noscript>
      <meta http-equiv="refresh" content="0; url=${videoUrl}">
    </noscript>
  </div>
</body>
</html>`;
}

// Generate HTML for Facebook in-app browser (better user experience)
function generateFacebookInAppHTML(video: any, videoId: string): string {
  const baseUrl = 'https://travalpass.com';
  const videoUrl = `${baseUrl}/video/${videoId}`;
  const shareUrl = `${baseUrl}/video-share/${videoId}`;
  
  const title = video.title || 'Video';
  const description = video.description 
    ? video.description.substring(0, 160) 
    : 'Watch this amazing video on TravalPass';
  const imageUrl = video.thumbnailUrl || `${baseUrl}/og-image.png`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - TravalPass</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
      margin: 0;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .container {
      background: white;
      border-radius: 16px;
      padding: 30px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    }
    .video-thumbnail {
      width: 100%;
      max-width: 300px;
      height: 200px;
      object-fit: cover;
      border-radius: 12px;
      margin-bottom: 20px;
      box-shadow: 0 8px 16px rgba(0,0,0,0.1);
    }
    .video-title {
      font-size: 24px;
      font-weight: bold;
      color: #333;
      margin-bottom: 10px;
      line-height: 1.3;
    }
    .video-description {
      color: #666;
      margin-bottom: 25px;
      line-height: 1.5;
    }
    .browser-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .browser-button {
      display: inline-block;
      padding: 15px 25px;
      background: #007bff;
      color: white;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      transition: all 0.2s;
    }
    .browser-button:hover {
      background: #0056b3;
      transform: translateY(-1px);
    }
    .browser-button.secondary {
      background: #6c757d;
    }
    .browser-button.secondary:hover {
      background: #545b62;
    }
    .facebook-note {
      background: #e7f3ff;
      border: 1px solid #b3d9ff;
      border-radius: 8px;
      padding: 15px;
      margin-top: 20px;
      font-size: 14px;
      color: #0066cc;
    }
    .play-icon {
      font-size: 48px;
      color: #007bff;
      margin-bottom: 15px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="play-icon">▶️</div>
    ${video.thumbnailUrl ? `<img src="${imageUrl}" alt="Video thumbnail" class="video-thumbnail" onerror="this.style.display='none'">` : ''}
    <h1 class="video-title">${title}</h1>
    <p class="video-description">${description}</p>
    
    <div class="browser-buttons">
      <a href="${videoUrl}" class="browser-button">
        🌐 Open in Browser
      </a>
      <a href="${shareUrl}" class="browser-button secondary">
        📱 Open TravalPass App
      </a>
    </div>
    
    <div class="facebook-note">
      <strong>📱 Better Experience:</strong><br>
      For the best video viewing experience, tap "Open in Browser" above or use the three-dot menu in the top right to open in your default browser.
    </div>
  </div>

  <script>
    // Try to detect if we can auto-redirect
    function openInBrowser() {
      // For iOS, try to open in Safari
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        window.location.href = 'x-web-search://?${videoUrl}';
        // Fallback
        setTimeout(() => {
          window.location.href = '${videoUrl}';
        }, 1000);
      } else {
        // For Android and others
        window.location.href = '${videoUrl}';
      }
    }
    
    // Add click handlers
    document.addEventListener('DOMContentLoaded', function() {
      // Auto-focus on the open in browser button
      const browserButton = document.querySelector('.browser-button');
      if (browserButton) {
        browserButton.focus();
      }
    });
  </script>
</body>
</html>`;
}

// Generate HTML for private videos (limited preview)
function generatePrivateVideoHTML(video: any, videoId: string): string {
  const baseUrl = 'https://travalpass.com';
  const videoUrl = `${baseUrl}/video/${videoId}`;
  
  const title = 'Private Video - TravalPass';
  const description = 'This video is private. Log in to TravalPass to see if you have access.';
  const imageUrl = `${baseUrl}/og-image.png`; // Use default image for private videos

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
  <meta property="og:type" content="website">
  <meta property="og:url" content="${videoUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="TravalPass">
  
  <!-- Twitter -->
  <meta property="twitter:card" content="summary_large_image">
  <meta property="twitter:url" content="${videoUrl}">
  <meta property="twitter:title" content="${title}">
  <meta property="twitter:description" content="${description}">
  <meta property="twitter:image" content="${imageUrl}">
  
  <!-- Favicon -->
  <link rel="icon" href="${baseUrl}/favicon.ico">
  <link rel="apple-touch-icon" href="${baseUrl}/logo192.png">
</head>
<body>
  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="text-align: center; max-width: 500px; padding: 20px;">
      <h1 style="color: #333; margin-bottom: 20px;">🔒 Private Video</h1>
      <p style="color: #666; margin-bottom: 30px; line-height: 1.5;">This video is private and can only be viewed by connected users. Log in to TravalPass to check if you have access.</p>
      <a href="${videoUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">Open TravalPass</a>
    </div>
  </div>
</body>
</html>`;
}

// Express route handler for sharing URLs
app.get('/video-share/:videoId', async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const userAgent = req.get('User-Agent') || '';
    
    console.log(`Video share request for ${videoId}, User-Agent: ${userAgent}`);
    
    // Fetch video from Firestore using Admin SDK (bypasses security rules)
    const videoDoc = await db.collection('videos').doc(videoId).get();
    
    if (!videoDoc.exists) {
      console.log(`Video not found: ${videoId}`);
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Video Not Found - TravalPass</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Video Not Found</h1>
          <p>The video you're looking for doesn't exist or has been removed.</p>
          <a href="https://travalpass.com" style="color: #007bff; text-decoration: none;">← Back to TravalPass</a>
        </body>
        </html>
      `);
    }
    
    const videoData = videoDoc.data();
    
    // Check if video is public or if we should allow sharing
    const isPublic = videoData?.isPublic === true;
    
    if (!isPublic) {
      console.log(`Private video shared: ${videoId}`);
      // For private videos, still show some content for social media crawlers
      // but redirect users to app where they can authenticate
      if (isSocialMediaCrawler(userAgent)) {
        // Show limited preview for social media crawlers
        const html = generatePrivateVideoHTML(videoData, videoId);
        res.set('Cache-Control', 'public, max-age=60'); // Cache for 1 minute
        res.send(html);
      } else {
        // Redirect users to the app where they can authenticate and check access
        console.log('Redirecting to app for private video authentication check');
        res.redirect(302, `https://travalpass.com/video/${videoId}`);
      }
      return;
    }
    
    // Handle public videos
    
    // Check if this is a Facebook in-app browser
    if (isFacebookInAppBrowser(userAgent)) {
      console.log('Detected Facebook in-app browser, serving special landing page');
      const html = generateFacebookInAppHTML(videoData, videoId);
      res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
      return res.send(html);
    }
    
    if (isSocialMediaCrawler(userAgent)) {
      console.log('Serving crawler-optimized HTML for public video:', videoId);
      const html = generateVideoHTML(videoData, videoId);
      res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
      res.send(html);
    } else {
      // For regular users, redirect to the client-side video route
      console.log('Redirecting regular user to client-side video route for video:', videoId);
      res.redirect(302, `https://travalpass.com/video/${videoId}`);
    }
    
  } catch (error) {
    console.error('Error serving video page:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error - TravalPass</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
        <h1>Something went wrong</h1>
        <p>We're having trouble loading this video. Please try again later.</p>
        <a href="https://travalpass.com" style="color: #007bff; text-decoration: none;">← Back to TravalPass</a>
      </body>
      </html>
    `);
  }
});

// Express route handler for regular video URLs (redirect crawlers to sharing version)
app.get('/video/:videoId', async (req, res) => {
  try {
    const videoId = req.params.videoId;
    const userAgent = req.get('User-Agent') || '';
    
    console.log(`Video page request for ${videoId}, User-Agent: ${userAgent}`);
    
    // If it's a social media crawler, redirect to the sharing URL for proper meta tags
    if (isSocialMediaCrawler(userAgent)) {
      console.log('Redirecting crawler to sharing URL for proper meta tags');
      return res.redirect(301, `https://travalpass.com/video-share/${videoId}`);
    }
    
    // If it's a Facebook in-app browser, also redirect to sharing URL for special handling
    if (isFacebookInAppBrowser(userAgent)) {
      console.log('Redirecting Facebook in-app browser to sharing URL for special handling');
      return res.redirect(302, `https://travalpass.com/video-share/${videoId}`);
    }
    
    // For regular users, serve the client-side app
    // This should be handled by your hosting, but if it reaches here, redirect to main app
    console.log('Redirecting regular user to client app');
    res.redirect(302, `https://travalpass.com`);
    
  } catch (error) {
    console.error('Error handling video route:', error);
    res.redirect(302, `https://travalpass.com`);
  }
});

// Default route
app.get('/', (req, res) => {
  res.redirect('https://travalpass.com');
});

export const videoShare = functions.https.onRequest(app);
