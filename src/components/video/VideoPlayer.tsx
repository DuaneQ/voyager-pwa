import React from 'react';
import { Video } from '../../types/Video';

interface VideoPlayerProps {
  video: Video;
  isPlaying?: boolean;
  onPlayToggle?: () => void;
  onVideoEnd?: () => void;
  className?: string;
  showBranding?: boolean; // For sharing mode
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  video,
  isPlaying = false,
  onPlayToggle,
  onVideoEnd,
  className = '',
  showBranding = false
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [hasUserInteracted, setHasUserInteracted] = React.useState(false);

  React.useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isPlaying) {
      // Unmute after first user interaction
      if (hasUserInteracted) {
        videoElement.muted = false;
      }
      
      // Only attempt to play if the element is still in the DOM and ready
      const playVideo = async () => {
        try {
          // Check if element is still connected to DOM
          if (!videoElement.isConnected) {
            console.log('Video element not in DOM, skipping play');
            return;
          }
          
          // Check if video is ready to play
          if (videoElement.readyState >= 2) { // HAVE_CURRENT_DATA
            await videoElement.play();
          } else {
            // Wait for video to be ready
            const onCanPlay = () => {
              videoElement.removeEventListener('canplay', onCanPlay);
              if (videoElement.isConnected && isPlaying) {
                videoElement.play().catch(console.log);
              }
            };
            videoElement.addEventListener('canplay', onCanPlay);
          }
        } catch (error) {
          if (error instanceof DOMException) {
            if (error.name === 'NotAllowedError') {
              // Silently handle autoplay policy violations
              console.log('Autoplay blocked - user interaction required');
              onPlayToggle?.(); // Reset playing state
            } else if (error.name === 'AbortError') {
              // Media was removed or interrupted, ignore
              console.log('Video play interrupted - element likely unmounted');
            } else {
              console.error('Video play error:', error);
            }
          } else {
            console.error('Video play error:', error);
          }
        }
      };

      playVideo();
    } else {
      // Only pause if element is still in DOM
      if (videoElement.isConnected) {
        videoElement.pause();
      }
    }
  }, [isPlaying, onPlayToggle, hasUserInteracted]);

  const handleVideoClick = () => {
    setHasUserInteracted(true); // Mark that user has interacted
    onPlayToggle?.();
  };

  const handleVideoEnded = () => {
    onVideoEnd?.();
  };

  return (
    <div 
      className={`video-player ${className}`} 
      data-testid="video-player"
    >
      <video
        ref={videoRef}
        src={video.videoUrl}
        poster={video.thumbnailUrl}
        onClick={handleVideoClick}
        onEnded={handleVideoEnded}
        className="video-element"
        data-testid="video-element"
        loop={false}
        muted={true} // Muted videos can autoplay in most browsers
        controls={false} // We'll handle controls manually for TikTok-like experience
        playsInline
        preload="metadata" // Only load metadata initially to improve performance
      />
      
      {!isPlaying && (
        <div className="play-overlay" onClick={handleVideoClick} data-testid="play-overlay">
          <div className="play-button">▶</div>
        </div>
      )}

      {/* Video info overlay on the video itself */}
      <div className="video-info-overlay">
        {video.title && (
          <h3 className="video-title" data-testid="video-title">{video.title}</h3>
        )}
        {video.description && (
          <p className="video-description" data-testid="video-description">{video.description}</p>
        )}
      </div>

      {/* Branding footer for sharing */}
      {showBranding && (
        <div className="video-branding-footer" data-testid="branding-footer">
          <div className="branding-content">
            <span className="app-name">TravalPass.com</span>
            <span className="tagline">Discover Amazing Travel Videos</span>
          </div>
        </div>
      )}
    </div>
  );
};
