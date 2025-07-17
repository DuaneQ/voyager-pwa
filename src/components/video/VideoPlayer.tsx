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

    if (isPlaying && hasUserInteracted) {
      // Only attempt to play if user has interacted and element is ready
      const playVideo = async () => {
        try {
          // Check if element is still connected to DOM
          if (!videoElement.isConnected) {
            console.log('Video element not in DOM, skipping play');
            return;
          }
          
          // Wait for video to be ready if needed
          if (videoElement.readyState < 2) { // Less than HAVE_CURRENT_DATA
            const onCanPlay = () => {
              videoElement.removeEventListener('canplay', onCanPlay);
              if (videoElement.isConnected && isPlaying && hasUserInteracted) {
                videoElement.play().catch(error => {
                  console.log('Video play failed after canplay:', error);
                  onPlayToggle?.(); // Reset playing state
                });
              }
            };
            videoElement.addEventListener('canplay', onCanPlay);
            return;
          }
          
          await videoElement.play();
        } catch (error) {
          if (error instanceof DOMException) {
            if (error.name === 'NotAllowedError') {
              console.log('Autoplay blocked - user interaction required');
              onPlayToggle?.(); // Reset playing state
            } else if (error.name === 'AbortError') {
              console.log('Video play interrupted - element likely unmounted');
            } else {
              console.error('Video play error:', error);
              onPlayToggle?.(); // Reset playing state on error
            }
          } else {
            console.error('Video play error:', error);
            onPlayToggle?.(); // Reset playing state on error
          }
        }
      };

      playVideo();
    } else if (!isPlaying) {
      // Only pause if element is still in DOM
      if (videoElement.isConnected && !videoElement.paused) {
        videoElement.pause();
      }
    }
  }, [isPlaying, onPlayToggle, hasUserInteracted]);

  const handleVideoClick = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    setHasUserInteracted(true);
    
    // Resume audio context on iOS Safari
    if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        try {
          const audioContext = new AudioContextClass();
          if (audioContext.state === 'suspended') {
            audioContext.resume().catch(console.log);
          }
        } catch (e) {
          console.log('AudioContext creation failed:', e);
        }
      }
    }
    
    // Unmute video on first interaction (mobile requirement)
    if (isMuted) {
      videoElement.muted = false;
      setIsMuted(false);
    }
    
    onPlayToggle?.();
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const videoElement = e.currentTarget;
    const error = videoElement.error;
    
    let errorMessage = 'Unknown video error';
    if (error) {
      switch (error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = 'Video playback aborted';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = 'Network error while loading video';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = 'Video decode error';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Video format not supported';
          break;
        default:
          errorMessage = `Video error code: ${error.code}`;
      }
    }
    
    console.error('Video error:', {
      message: errorMessage,
      error: videoElement.error,
      networkState: videoElement.networkState,
      readyState: videoElement.readyState,
      src: videoElement.src,
      userAgent: navigator.userAgent,
      isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    });
  };

  const handleVideoLoadStart = () => {
    console.log('Video load started:', video.videoUrl);
    console.log('Video element src:', videoRef.current?.src);
  };

  const handleVideoCanPlay = () => {
    console.log('Video can play:', video.videoUrl);
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
        onError={handleVideoError}
        onLoadStart={handleVideoLoadStart}
        onCanPlay={handleVideoCanPlay}
        className="video-element"
        data-testid="video-element"
        loop={false}
        muted={true} // Always start muted for mobile compatibility
        controls={false}
        playsInline={true}
        preload="metadata"
        webkit-playsinline="true"
        x-webkit-airplay="allow"
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
