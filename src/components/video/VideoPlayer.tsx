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
  const [isMuted, setIsMuted] = React.useState(true); // Track mute state

  // Mobile-specific audio initialization
  React.useEffect(() => {
    const handleFirstInteraction = () => {
      setHasUserInteracted(true);
      // Remove listeners after first interaction
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('click', handleFirstInteraction);
    };

    document.addEventListener('touchstart', handleFirstInteraction, { passive: true });
    document.addEventListener('click', handleFirstInteraction);

    return () => {
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('click', handleFirstInteraction);
    };
  }, []);

  React.useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    if (isPlaying) {
      // Only attempt to play if the element is still in the DOM and ready
      const playVideo = async () => {
        try {
          // Check if element is still connected to DOM
          if (!videoElement.isConnected) {
            console.log('Video element not in DOM, skipping play');
            return;
          }
          
          // For mobile devices, ensure we unmute on user interaction
          if (hasUserInteracted && isMuted) {
            videoElement.muted = false;
            setIsMuted(false);
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
  }, [isPlaying, onPlayToggle, hasUserInteracted, isMuted]);

  const handleVideoClick = () => {
    setHasUserInteracted(true); // Mark that user has interacted
    
    // On mobile, first click should unmute if muted
    const videoElement = videoRef.current;
    if (videoElement && isMuted) {
      videoElement.muted = false;
      setIsMuted(false);
      
      // Force audio context resume on iOS (Safari requirement)
      if (typeof window !== 'undefined' && window.AudioContext) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch(console.log);
        }
      }
    }
    
    onPlayToggle?.();
  };

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering play/pause
    const videoElement = videoRef.current;
    if (videoElement) {
      const newMutedState = !videoElement.muted;
      videoElement.muted = newMutedState;
      setIsMuted(newMutedState);
      setHasUserInteracted(true);
    }
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
        muted={isMuted} // Use state-controlled muting
        controls={false} // We'll handle controls manually for TikTok-like experience
        playsInline
        preload="metadata" // Only load metadata initially to improve performance
        webkit-playsinline="true" // iOS specific attribute
      />
      
      {/* Mute/Unmute button for mobile */}
      <button 
        className="mute-button" 
        onClick={handleMuteToggle}
        data-testid="mute-button"
        aria-label={isMuted ? "Unmute video" : "Mute video"}
      >
        {isMuted ? "🔇" : "🔊"}
      </button>
      
      {!isPlaying && (
        <div className="play-overlay" onClick={handleVideoClick} data-testid="play-overlay">
          <div className="play-button">▶</div>
          {isMuted && hasUserInteracted && (
            <div className="audio-hint">Tap 🔇 to unmute</div>
          )}
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
