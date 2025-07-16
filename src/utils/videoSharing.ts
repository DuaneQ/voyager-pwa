import { Video } from '../types/Video';

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
 * Generates share text with TravalPass.com branding
 */
export const generateShareText = (video: Video): string => {
  const title = video.title || 'Amazing Travel Video';
  const description = video.description ? ` - ${video.description}` : '';
  
  return `${title}${description}\n\nWatch more travel videos on TravalPass.com 🌍✈️`;
};

/**
 * Native Web Share API with branding
 */
export const shareVideoWithBranding = async (video: Video, videoUrl?: string) => {
  try {
    const shareData = {
      title: video.title || 'Amazing Travel Video',
      text: generateShareText(video),
      url: videoUrl || window.location.href
    };

    if (navigator.share) {
      await navigator.share(shareData);
    } else {
      // Fallback: copy to clipboard
      const textToCopy = `${shareData.text}\n${shareData.url}`;
      await navigator.clipboard.writeText(textToCopy);
      
      // Show success message (you might want to use your app's notification system)
      alert('Link copied to clipboard!');
    }
  } catch (error) {
    console.error('Error sharing video:', error);
    throw error;
  }
};

/**
 * Creates a shareable video blob with branding footer
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
