/**
 * Video Sharing Utilities
 * 
 * IMPORTANT: For optimal social media sharing (especially messaging apps like WhatsApp, 
 * Telegram, iMessage), implement server-side meta tag generation using the patterns
 * in src/utils/serverSideSharing.ts
 * 
 * The client-side functions in this file provide enhanced sharing for modern browsers
 * but messaging apps require server-rendered meta tags for reliable thumbnail display.
 */

import { Video } from '../types/Video';

/**
 * Extended ShareData interface to include files for thumbnail sharing
 */
interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

/**
 * Utility for sharing videos with TravalPass.com branding
 * Similar to TikTok/Facebook approach where branding appears only when sharing
 */

/**
 * Creates a branded video frame for sharing
 * This function captures the video with the branding footer overlay
 */
export const captureVideoFrameWithBranding = async (
  video: Video,
  timeInSeconds: number = 1
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary container for rendering the branded video
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.top = '-9999px';
      tempContainer.style.left = '-9999px';
      tempContainer.style.width = '320px';
      tempContainer.style.height = '568px'; // TikTok-like aspect ratio
      tempContainer.style.backgroundColor = '#000';
      
      document.body.appendChild(tempContainer);

      // Create video element
      const videoElement = document.createElement('video');
      videoElement.src = video.videoUrl;
      videoElement.style.width = '100%';
      videoElement.style.height = '100%';
      videoElement.style.objectFit = 'cover';
      
      // Create branding overlay
      const brandingOverlay = document.createElement('div');
      brandingOverlay.innerHTML = `
        <div style="
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
          padding: 20px;
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
        ">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-size: 16px; font-weight: bold; margin-bottom: 4px;">
                TravalPass.com
              </div>
              <div style="font-size: 12px; opacity: 0.8;">
                Discover Amazing Travel Videos
              </div>
            </div>
            <div style="
              background: #007AFF;
              color: white;
              padding: 8px 16px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
            ">
              Download App
            </div>
          </div>
        </div>
      `;
      
      tempContainer.appendChild(videoElement);
      tempContainer.appendChild(brandingOverlay);

      videoElement.onloadedmetadata = () => {
        videoElement.currentTime = timeInSeconds;
      };

      videoElement.onseeked = () => {
        try {
          // Create canvas to capture video frame
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            document.body.removeChild(tempContainer);
            reject(new Error('Canvas not supported'));
            return;
          }
          
          // Set canvas size to video dimensions
          canvas.width = videoElement.videoWidth || 320;
          canvas.height = videoElement.videoHeight || 568;
          
          // Draw the current video frame
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
          
          // Add branding overlay to the canvas
          const overlayHeight = Math.floor(canvas.height * 0.2); // 20% of video height
          
          // Dark gradient background for text
          const gradient = ctx.createLinearGradient(0, canvas.height - overlayHeight, 0, canvas.height);
          gradient.addColorStop(0, 'rgba(0,0,0,0.3)');
          gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, canvas.height - overlayHeight, canvas.width, overlayHeight);
          
          // Add TravalPass branding text
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.floor(canvas.width * 0.04)}px Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 2;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          
          const brandingY = canvas.height - overlayHeight + (overlayHeight * 0.3);
          ctx.fillText('TravalPass.com', canvas.width / 2, brandingY);
          
          // Smaller subtitle
          ctx.font = `${Math.floor(canvas.width * 0.025)}px Arial, sans-serif`;
          ctx.fillText('Discover Amazing Travel Videos', canvas.width / 2, brandingY + (overlayHeight * 0.3));
          
          // Convert canvas to data URL
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          
          document.body.removeChild(tempContainer);
          resolve(dataUrl);
        } catch (error) {
          document.body.removeChild(tempContainer);
          reject(error);
        }
      };

      videoElement.onerror = () => {
        document.body.removeChild(tempContainer);
        reject(new Error('Failed to load video for sharing'));
      };
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Updates page meta tags for better social media sharing
 * Note: For messaging apps, server-side meta tag generation is more reliable
 * See src/utils/serverSideSharing.ts for backend implementation guidance
 */
export const updatePageMetaTags = async (video: Video) => {
  const title = video.title || 'Amazing Travel Video';
  const description = video.description || 'Watch this amazing travel video on TravalPass.com';
  // Use the sharing URL for social media meta tags
  const videoUrl = `${window.location.origin}/video-share/${video.id}`;
  
  // Try to create a branded thumbnail for better sharing
  let thumbnailUrl = video.thumbnailUrl;
  try {
    const brandedThumbnail = await createShareableVideoCard(video);
    thumbnailUrl = brandedThumbnail;
  } catch (error) {
    console.log('Could not create branded thumbnail, using original:', error);
  }

  // Update or create Open Graph meta tags
  updateMetaTag('og:title', title);
  updateMetaTag('og:description', description);
  updateMetaTag('og:image', thumbnailUrl);
  updateMetaTag('og:image:width', '1200');
  updateMetaTag('og:image:height', '630');
  updateMetaTag('og:type', 'video.other');
  updateMetaTag('og:url', videoUrl);
  updateMetaTag('og:site_name', 'TravalPass');
  
  // Add video-specific meta tags for better sharing
  if (video.videoUrl) {
    updateMetaTag('og:video:url', video.videoUrl);
    updateMetaTag('og:video:secure_url', video.videoUrl);
    updateMetaTag('og:video:type', 'video/mp4');
    updateMetaTag('og:video:width', '1920');
    updateMetaTag('og:video:height', '1080');
  }
  
  // Update Twitter Card meta tags
  updateMetaTag('twitter:card', 'summary_large_image');
  updateMetaTag('twitter:title', title);
  updateMetaTag('twitter:description', description);
  updateMetaTag('twitter:image', thumbnailUrl);
  updateMetaTag('twitter:site', '@TravalPass');
  
  // Add structured data for better video understanding
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": title,
    "description": description,
    "thumbnailUrl": thumbnailUrl,
    "uploadDate": video.createdAt || new Date().toISOString(),
    "contentUrl": video.videoUrl,
    "embedUrl": videoUrl,
    "publisher": {
      "@type": "Organization",
      "name": "TravalPass",
      "url": "https://travalpass.com"
    }
  };
  
  // Add or update structured data script
  let structuredDataScript = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
  if (!structuredDataScript) {
    structuredDataScript = document.createElement('script');
    structuredDataScript.type = 'application/ld+json';
    document.head.appendChild(structuredDataScript);
  }
  structuredDataScript.textContent = JSON.stringify(structuredData);
  
  // Update page title
  document.title = `${title} - TravalPass`;
  
  // Update description meta tag
  updateMetaTag('description', description);
  
  // Force refresh of link previews (works for some platforms)
  updateMetaTag('og:updated_time', new Date().toISOString());
};

/**
 * Helper function to update or create meta tags
 */
const updateMetaTag = (property: string, content: string) => {
  if (!content) return;
  
  // Try property attribute first (for og: tags)
  let meta = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement;
  
  // Fallback to name attribute (for other tags)
  if (!meta) {
    meta = document.querySelector(`meta[name="${property}"]`) as HTMLMetaElement;
  }
  
  if (meta) {
    meta.content = content;
  } else {
    // Create new meta tag
    meta = document.createElement('meta');
    const isOgOrTwitter = property.startsWith('og:') || property.startsWith('twitter:');
    
    if (isOgOrTwitter) {
      meta.setAttribute('property', property);
    } else {
      meta.setAttribute('name', property);
    }
    
    meta.content = content;
    document.head.appendChild(meta);
  }
};

/**
 * Generates share text with TravalPass.com branding
 */
export const generateShareText = (video: Video): string => {
  const title = video.title || 'Amazing Travel Video';
  const description = video.description ? ` - ${video.description}` : '';
  
  return `${title}${description}\n\nWatch more travel videos on TravalPass.com 🌍✈️`;
};

/**
 * Native Web Share API with branding and thumbnail support
 */
export const shareVideoWithBranding = async (video: Video, videoUrl?: string) => {
  try {
    // Update page meta tags dynamically for better social sharing
    updatePageMetaTags(video);
    
    // Create a more descriptive URL that includes video information
    const baseUrl = window.location.origin;
    // Use the sharing URL for social media to bypass authentication
    const shareUrl = videoUrl || `${baseUrl}/video-share/${video.id}`;
    
    const shareData: ShareData = {
      title: video.title || 'Amazing Travel Video',
      text: generateShareText(video),
      url: shareUrl
    };

    // Try to include the thumbnail image if supported
    if (video.thumbnailUrl && 'files' in navigator && 'fetch' in window) {
      try {
        // Create a shareable video card image
        const shareableImageDataUrl = await createShareableVideoCard(video);
        
        // Convert data URL to blob then to file
        const response = await fetch(shareableImageDataUrl);
        const blob = await response.blob();
        const file = new File([blob], `${video.title || 'video'}-thumbnail.jpg`, { type: 'image/jpeg' });
        shareData.files = [file];
      } catch (error) {
        console.log('Could not create shareable image, trying original thumbnail:', error);
        
        // Fallback to original thumbnail
        try {
          const response = await fetch(video.thumbnailUrl);
          const blob = await response.blob();
          const file = new File([blob], 'thumbnail.jpg', { type: 'image/jpeg' });
          shareData.files = [file];
        } catch (thumbError) {
          console.log('Could not include thumbnail in share:', thumbError);
        }
      }
    }

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData);
    } else if (navigator.share) {
      // Fallback without files if canShare indicates files aren't supported
      const fallbackShareData = {
        title: shareData.title,
        text: shareData.text,
        url: shareData.url
      };
      await navigator.share(fallbackShareData);
    } else {
      // Fallback: copy to clipboard with cache-busted URL for better preview refresh
      const cachebustedUrl = refreshLinkPreview(shareData.url || shareUrl);
      const textToCopy = `${shareData.text}\n\n${cachebustedUrl}`;
      await navigator.clipboard.writeText(textToCopy);
      
      // Show success message
      alert('Video link copied to clipboard! The thumbnail should appear when you paste the link. For best results in messaging apps, your backend should serve proper meta tags.');
    }
  } catch (error) {
    console.error('Error sharing video:', error);
    throw error;
  }
};

/**
 * Creates a share-optimized image with video thumbnail and branding
 */
export const createShareableVideoCard = async (video: Video): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas not supported'));
        return;
      }

      // Set canvas size for optimal social media sharing (1200x630 for Facebook/Twitter)
      canvas.width = 1200;
      canvas.height = 630;

      // Background
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Load and draw thumbnail
      const img = new Image();
      // Don't set crossOrigin if the image is from the same domain
      if (video.thumbnailUrl && !video.thumbnailUrl.startsWith(window.location.origin)) {
        img.crossOrigin = 'anonymous';
      }
      
      img.onload = () => {
        // Calculate aspect ratio to fit image properly
        const aspectRatio = img.width / img.height;
        let drawWidth = canvas.width;
        let drawHeight = canvas.height;
        
        if (aspectRatio > canvas.width / canvas.height) {
          // Image is wider - fit to width
          drawHeight = canvas.width / aspectRatio;
        } else {
          // Image is taller - fit to height
          drawWidth = canvas.height * aspectRatio;
        }
        
        const x = (canvas.width - drawWidth) / 2;
        const y = (canvas.height - drawHeight) / 2;
        
        // Draw thumbnail
        ctx.drawImage(img, x, y, drawWidth, drawHeight);
        
        // Add dark overlay for text readability
        const overlayGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        overlayGradient.addColorStop(0, 'rgba(0, 0, 0, 0.1)');
        overlayGradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');
        overlayGradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
        ctx.fillStyle = overlayGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add play button overlay
        const playButtonSize = Math.min(canvas.width, canvas.height) * 0.12;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, playButtonSize, 0, 2 * Math.PI);
        ctx.fill();
        
        // Play triangle
        ctx.fillStyle = '#007AFF';
        ctx.beginPath();
        const triangleSize = playButtonSize * 0.6;
        ctx.moveTo(canvas.width / 2 - triangleSize * 0.3, canvas.height / 2 - triangleSize * 0.5);
        ctx.lineTo(canvas.width / 2 - triangleSize * 0.3, canvas.height / 2 + triangleSize * 0.5);
        ctx.lineTo(canvas.width / 2 + triangleSize * 0.7, canvas.height / 2);
        ctx.closePath();
        ctx.fill();
        
        // Add text overlay at bottom
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Title
        const title = video.title || 'Amazing Travel Video';
        const titleFontSize = Math.max(24, canvas.width * 0.04);
        ctx.font = `bold ${titleFontSize}px Arial, sans-serif`;
        const maxTitleLength = Math.floor(canvas.width / (titleFontSize * 0.6));
        const truncatedTitle = title.length > maxTitleLength ? title.substring(0, maxTitleLength - 3) + '...' : title;
        ctx.fillText(truncatedTitle, canvas.width / 2, canvas.height - 120);
        
        // TravalPass branding
        const brandingFontSize = Math.max(18, canvas.width * 0.027);
        ctx.font = `bold ${brandingFontSize}px Arial, sans-serif`;
        ctx.fillStyle = '#007AFF';
        
        // Branding background
        const brandingText = 'TravalPass.com';
        const brandingMetrics = ctx.measureText(brandingText);
        const brandingWidth = brandingMetrics.width + 32;
        const brandingHeight = brandingFontSize + 16;
        const brandingX = (canvas.width - brandingWidth) / 2;
        const brandingY = canvas.height - 60;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(brandingX, brandingY - brandingHeight + 8, brandingWidth, brandingHeight);
        
        ctx.fillStyle = '#007AFF';
        ctx.fillText(brandingText, canvas.width / 2, canvas.height - 42);
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(dataUrl);
      };
      
      img.onerror = () => {
        // Fallback: create branded card without video thumbnail
        // Create gradient background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, '#007AFF');
        gradient.addColorStop(0.5, '#5856D6');
        gradient.addColorStop(1, '#FF2D92');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add play button overlay
        const playButtonSize = Math.min(canvas.width, canvas.height) * 0.12;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, playButtonSize, 0, 2 * Math.PI);
        ctx.fill();
        
        // Play triangle
        ctx.fillStyle = '#007AFF';
        ctx.beginPath();
        const triangleSize = playButtonSize * 0.6;
        ctx.moveTo(canvas.width / 2 - triangleSize * 0.3, canvas.height / 2 - triangleSize * 0.5);
        ctx.lineTo(canvas.width / 2 - triangleSize * 0.3, canvas.height / 2 + triangleSize * 0.5);
        ctx.lineTo(canvas.width / 2 + triangleSize * 0.7, canvas.height / 2);
        ctx.closePath();
        ctx.fill();
        
        // Add text overlay
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Title
        const title = video.title || 'Amazing Travel Video';
        const titleFontSize = Math.max(24, canvas.width * 0.04);
        ctx.font = `bold ${titleFontSize}px Arial, sans-serif`;
        const maxTitleLength = Math.floor(canvas.width / (titleFontSize * 0.6));
        const truncatedTitle = title.length > maxTitleLength ? title.substring(0, maxTitleLength - 3) + '...' : title;
        ctx.fillText(truncatedTitle, canvas.width / 2, canvas.height - 120);
        
        // TravalPass branding
        const brandingFontSize = Math.max(18, canvas.width * 0.027);
        ctx.font = `bold ${brandingFontSize}px Arial, sans-serif`;
        
        // Branding background
        const brandingText = 'TravalPass.com';
        const brandingMetrics = ctx.measureText(brandingText);
        const brandingWidth = brandingMetrics.width + 32;
        const brandingHeight = brandingFontSize + 16;
        const brandingX = (canvas.width - brandingWidth) / 2;
        const brandingY = canvas.height - 60;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(brandingX, brandingY - brandingHeight + 8, brandingWidth, brandingHeight);
        
        ctx.fillStyle = '#007AFF';
        ctx.fillText(brandingText, canvas.width / 2, canvas.height - 42);
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(dataUrl);
      };
      
      // Start loading the image
      if (video.thumbnailUrl) {
        img.src = video.thumbnailUrl;
      } else {
        // No thumbnail URL, create gradient background immediately
        setTimeout(() => img.onerror?.(new Event('error')), 0);
      }
      
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Creates a branded video blob with branding footer
 * This is more complex and would require video processing libraries
 */
export const createBrandedVideoBlob = async (
  originalVideoBlob: Blob,
  video: Video
): Promise<Blob> => {
  // This would require video processing libraries like FFmpeg.wasm
  // For MVP, we'll just return the original video and handle branding in the UI
  return originalVideoBlob;
};

/**
 * Generates server-side compatible meta tags for video sharing
 * This data can be used to pre-render pages with proper meta tags
 */
export const generateVideoMetaTags = (video: Video, videoUrl: string) => {
  const title = video.title || 'Amazing Travel Video';
  const description = video.description || 'Watch this amazing travel video on TravalPass.com';
  const thumbnailUrl = video.thumbnailUrl;
  
  return {
    title: `${title} - TravalPass`,
    description,
    openGraph: {
      title,
      description,
      image: thumbnailUrl,
      url: videoUrl,
      type: 'video.other',
      video: {
        url: video.videoUrl,
        secureUrl: video.videoUrl,
        type: 'video/mp4',
        width: 1920,
        height: 1080
      }
    },
    twitter: {
      card: 'player',
      title,
      description,
      image: thumbnailUrl,
      player: video.videoUrl,
      playerWidth: 1920,
      playerHeight: 1080
    }
  };
};

/**
 * Forces link preview refresh for messaging apps (limited effectiveness)
 */
export const refreshLinkPreview = (url: string) => {
  // Add cache-busting parameter to force re-crawl
  const timestamp = Date.now();
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}_t=${timestamp}`;
};
