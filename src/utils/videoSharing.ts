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
        // Use html2canvas or similar library to capture the frame
        // For now, we'll return a placeholder
        setTimeout(() => {
          document.body.removeChild(tempContainer);
          resolve('data:image/png;base64,placeholder'); // Placeholder - integrate with html2canvas
        }, 100);
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
 */
export const updatePageMetaTags = (video: Video) => {
  const title = video.title || 'Amazing Travel Video';
  const description = video.description || 'Watch this amazing travel video on TravalPass.com';
  const thumbnailUrl = video.thumbnailUrl;

  // Update or create Open Graph meta tags
  updateMetaTag('og:title', title);
  updateMetaTag('og:description', description);
  updateMetaTag('og:image', thumbnailUrl);
  updateMetaTag('og:image:width', '1200');
  updateMetaTag('og:image:height', '630');
  updateMetaTag('og:type', 'video.other');
  
  // Update Twitter Card meta tags
  updateMetaTag('twitter:card', 'summary_large_image');
  updateMetaTag('twitter:title', title);
  updateMetaTag('twitter:description', description);
  updateMetaTag('twitter:image', thumbnailUrl);
  
  // Update page title
  document.title = `${title} - TravalPass`;
  
  // Update description meta tag
  updateMetaTag('description', description);
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
    
    const shareData: ShareData = {
      title: video.title || 'Amazing Travel Video',
      text: generateShareText(video),
      url: videoUrl || window.location.href
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
      // Fallback: copy to clipboard with thumbnail URL
      const textToCopy = `${shareData.text}\n\n📸 Thumbnail: ${video.thumbnailUrl}\n🔗 ${shareData.url}`;
      await navigator.clipboard.writeText(textToCopy);
      
      // Show success message (you might want to use your app's notification system)
      alert('Link and thumbnail URL copied to clipboard!');
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
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        // Calculate aspect ratio to fit image properly
        const aspectRatio = img.width / img.height;
        let drawWidth = canvas.width;
        let drawHeight = canvas.height;
        
        if (aspectRatio > canvas.width / canvas.height) {
          // Image is wider
          drawHeight = canvas.width / aspectRatio;
        } else {
          // Image is taller
          drawWidth = canvas.height * aspectRatio;
        }
        
        const x = (canvas.width - drawWidth) / 2;
        const y = (canvas.height - drawHeight) / 2;
        
        // Draw thumbnail
        ctx.drawImage(img, x, y, drawWidth, drawHeight);
        
        // Add dark overlay for text readability
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Add play button overlay
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 40, 0, 2 * Math.PI);
        ctx.fill();
        
        // Play triangle
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - 15, canvas.height / 2 - 20);
        ctx.lineTo(canvas.width / 2 - 15, canvas.height / 2 + 20);
        ctx.lineTo(canvas.width / 2 + 20, canvas.height / 2);
        ctx.closePath();
        ctx.fill();
        
        // Add text overlay
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        // Title
        const title = video.title || 'Amazing Travel Video';
        ctx.fillText(title.substring(0, 40), canvas.width / 2, 100);
        
        // TravalPass branding
        ctx.font = 'bold 32px Arial, sans-serif';
        ctx.fillText('TravalPass.com', canvas.width / 2, canvas.height - 50);
        
        // Convert to data URL
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve(dataUrl);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load thumbnail image'));
      };
      
      // Use thumbnail URL or fallback
      img.src = video.thumbnailUrl || '/DEFAULT_AVATAR.png';
      
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
  console.log('Video processing not implemented yet - using UI overlay approach');
  return originalVideoBlob;
};
