/**
 * Server-side sharing utilities for optimal social media meta tag generation
 * This file contains utilities that should be implemented on your backend
 * for the most reliable social media sharing experience.
 */

import { Video } from '../types/Video';

/**
 * Template for server-side HTML head generation
 * Use this structure in your backend to generate proper meta tags
 */
export const generateServerSideHTMLHead = (video: Video, videoUrl: string): string => {
  const title = video.title || 'Amazing Travel Video';
  const description = video.description || 'Watch this amazing travel video on TravalPass.com';
  const thumbnailUrl = video.thumbnailUrl;
  const timestamp = Date.now();
  
  return `
    <!-- Basic Meta Tags -->
    <title>${title} - TravalPass</title>
    <meta name="description" content="${description}" />
    
    <!-- Open Graph Meta Tags for Facebook/LinkedIn -->
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${thumbnailUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:type" content="video.other" />
    <meta property="og:url" content="${videoUrl}" />
    <meta property="og:video:url" content="${video.videoUrl}" />
    <meta property="og:video:secure_url" content="${video.videoUrl}" />
    <meta property="og:video:type" content="video/mp4" />
    <meta property="og:video:width" content="1920" />
    <meta property="og:video:height" content="1080" />
    <meta property="og:updated_time" content="${timestamp}" />
    
    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="player" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${thumbnailUrl}" />
    <meta name="twitter:player" content="${video.videoUrl}" />
    <meta name="twitter:player:width" content="1920" />
    <meta name="twitter:player:height" content="1080" />
    
    <!-- WhatsApp/Telegram specific -->
    <meta property="og:site_name" content="TravalPass" />
    <meta property="og:locale" content="en_US" />
  `;
};

/**
 * Express.js route handler example for video pages
 * Implement this pattern in your backend
 */
export const expressRouteExample = `
// Express.js example route handler
app.get('/video/:videoId', async (req, res) => {
  try {
    const videoId = req.params.videoId;
    
    // Fetch video data from your database
    const video = await getVideoById(videoId);
    
    if (!video) {
      return res.status(404).send('Video not found');
    }
    
    // Generate the complete HTML with proper meta tags
    const videoUrl = \`\${req.protocol}://\${req.get('host')}/video/\${videoId}\`;
    const metaTags = generateServerSideHTMLHead(video, videoUrl);
    
    // Your main HTML template with injected meta tags
    const html = \`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        \${metaTags}
        <!-- Your other head content -->
      </head>
      <body>
        <!-- Your React app root -->
        <div id="root"></div>
        <!-- Your bundled JavaScript -->
        <script src="/static/js/bundle.js"></script>
      </body>
      </html>
    \`;
    
    res.send(html);
  } catch (error) {
    console.error('Error serving video page:', error);
    res.status(500).send('Server error');
  }
});
`;

/**
 * Next.js implementation example
 */
export const nextJSExample = `
// Next.js pages/video/[videoId].tsx
import Head from 'next/head';
import { GetServerSideProps } from 'next';

interface VideoPageProps {
  video: Video;
  videoUrl: string;
}

export default function VideoPage({ video, videoUrl }: VideoPageProps) {
  return (
    <>
      <Head>
        <title>{\`\${video.title} - TravalPass\`}</title>
        <meta name="description" content={video.description} />
        
        {/* Open Graph */}
        <meta property="og:title" content={video.title} />
        <meta property="og:description" content={video.description} />
        <meta property="og:image" content={video.thumbnailUrl} />
        <meta property="og:type" content="video.other" />
        <meta property="og:url" content={videoUrl} />
        <meta property="og:video:url" content={video.videoUrl} />
        
        {/* Twitter */}
        <meta name="twitter:card" content="player" />
        <meta name="twitter:player" content={video.videoUrl} />
      </Head>
      
      {/* Your video component */}
      <VideoPlayer video={video} />
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const videoId = context.params?.videoId as string;
  
  // Fetch video from your API/database
  const video = await getVideoById(videoId);
  
  if (!video) {
    return { notFound: true };
  }
  
  const videoUrl = \`\${process.env.NEXT_PUBLIC_BASE_URL}/video/\${videoId}\`;
  
  return {
    props: {
      video,
      videoUrl,
    },
  };
};
`;

/**
 * Implementation notes for your backend team
 */
export const implementationNotes = `
IMPLEMENTATION GUIDE FOR BACKEND TEAM:

1. **Why Server-Side Meta Tags Are Necessary:**
   - Social media crawlers (Facebook, Twitter, WhatsApp, etc.) fetch pages during the first share
   - They cache the meta tag data and don't re-fetch on subsequent shares
   - Client-side JavaScript changes to meta tags are ignored by these crawlers
   - Only server-rendered meta tags in the initial HTML response are recognized

2. **Required Backend Changes:**
   - Create dynamic routes for /video/:videoId that serve proper HTML with meta tags
   - Ensure meta tags are in the initial HTML response, not added via JavaScript
   - Include Open Graph, Twitter Card, and basic meta tags for maximum compatibility
   - Consider implementing cache invalidation when video data changes

3. **Testing Social Media Sharing:**
   - Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/
   - Twitter Card Validator: https://cards-dev.twitter.com/validator
   - LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/
   - Test with real messaging apps (WhatsApp, Telegram, iMessage)

4. **Performance Considerations:**
   - Cache generated HTML for popular videos
   - Use CDN for thumbnail images
   - Implement proper error handling for missing videos
   - Consider prerendering for SEO benefits

5. **Alternative Solutions:**
   - Use a service like Prerender.io or Rendertron for SPA prerendering
   - Implement Server-Side Rendering (SSR) with Next.js or similar
   - Use static site generation with dynamic routes
`;

/**
 * Validation function to check if server-side sharing is working
 */
export const validateServerSideSharing = async (videoUrl: string): Promise<{
  success: boolean;
  issues: string[];
  recommendations: string[];
}> => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  try {
    const response = await fetch(videoUrl);
    const html = await response.text();
    
    // Check for essential meta tags
    if (!html.includes('property="og:title"')) {
      issues.push('Missing og:title meta tag');
    }
    if (!html.includes('property="og:image"')) {
      issues.push('Missing og:image meta tag');
    }
    if (!html.includes('property="og:video:url"')) {
      issues.push('Missing og:video:url meta tag');
    }
    if (!html.includes('name="twitter:card"')) {
      issues.push('Missing Twitter card meta tag');
    }
    
    // Check if meta tags appear in HEAD section
    const headContent = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    if (headContent) {
      const headHTML = headContent[1];
      if (!headHTML.includes('og:title')) {
        issues.push('Meta tags not found in HEAD section');
      }
    } else {
      issues.push('No HEAD section found');
    }
    
    // Provide recommendations
    if (issues.length > 0) {
      recommendations.push('Implement server-side meta tag generation');
      recommendations.push('Ensure meta tags are in the initial HTML response');
      recommendations.push('Test with Facebook Sharing Debugger');
    }
    
    return {
      success: issues.length === 0,
      issues,
      recommendations
    };
  } catch (error) {
    return {
      success: false,
      issues: [`Failed to fetch video URL: ${error}`],
      recommendations: ['Check if the video URL is accessible', 'Implement proper error handling']
    };
  }
};
