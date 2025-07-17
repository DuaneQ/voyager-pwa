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
    console.log('VideoPlayer: Play effect triggered. isPlaying:', isPlaying, 'hasUserInteracted:', hasUserInteracted);
    const videoElement = videoRef.current;
    if (!videoElement) {
      console.log('VideoPlayer: No video element in play effect');
      return;
    }

    if (isPlaying && hasUserInteracted) {
      console.log('VideoPlayer: Attempting to play video');
      // Only attempt to play if user has interacted and element is ready
      const playVideo = async () => {
        try {
          // Check if element is still connected to DOM
          if (!videoElement.isConnected) {
            console.log('Video element not in DOM, skipping play');
            return;
          }
          
          console.log('VideoPlayer: Video readyState:', videoElement.readyState);
          
          // Wait for video to be ready if needed
          if (videoElement.readyState < 2) { // Less than HAVE_CURRENT_DATA
            console.log('VideoPlayer: Waiting for video to load');
            
            let playAttempted = false;
            
            const attemptPlay = () => {
              if (playAttempted) return;
              playAttempted = true;
              
              // Clean up listeners
              videoElement.removeEventListener('canplay', attemptPlay);
              videoElement.removeEventListener('canplaythrough', attemptPlay);
              videoElement.removeEventListener('loadeddata', attemptPlay);
              
              if (videoElement.isConnected && isPlaying && hasUserInteracted) {
                console.log('VideoPlayer: Playing video after load event');
                videoElement.play().catch(error => {
                  console.log('Video play failed after load event:', error);
                  onPlayToggle?.(); // Reset playing state
                });
              }
            };
            
            // Listen for multiple video ready events
            videoElement.addEventListener('canplay', attemptPlay);
            videoElement.addEventListener('canplaythrough', attemptPlay);
            videoElement.addEventListener('loadeddata', attemptPlay);
            
            // Add timeout fallback for mobile
            setTimeout(() => {
              if (!playAttempted && videoElement.readyState >= 1) {
                console.log('VideoPlayer: Timeout fallback - attempting play with readyState:', videoElement.readyState);
                attemptPlay();
              }
            }, 1000); // 1 second timeout (reduced from 3)
            
            return;
          }
          
          console.log('VideoPlayer: Video is ready, calling play()');
          await videoElement.play();
          console.log('VideoPlayer: Video play() succeeded');
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
      console.log('VideoPlayer: Pausing video');
      // Only pause if element is still in DOM
      if (videoElement.isConnected && !videoElement.paused) {
        videoElement.pause();
        console.log('VideoPlayer: Video paused');
      }
    } else {
      console.log('VideoPlayer: Not playing because hasUserInteracted is false');
    }
  }, [isPlaying, onPlayToggle, hasUserInteracted]);

  const handleVideoClick = () => {
    console.log('VideoPlayer: handleVideoClick called');
    const videoElement = videoRef.current;
    if (!videoElement) {
      console.log('VideoPlayer: No video element found');
      return;
    }

    console.log('VideoPlayer: Setting hasUserInteracted to true');
    setHasUserInteracted(true);
    
    // Resume audio context on iOS Safari
    if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        try {
          const audioContext = new AudioContextClass();
          if (audioContext.state === 'suspended') {
            console.log('VideoPlayer: Resuming audio context');
            audioContext.resume().catch(console.log);
          }
        } catch (e) {
          console.log('AudioContext creation failed:', e);
        }
      }
    }
    
    // Unmute video on first interaction (mobile requirement)
    if (isMuted) {
      console.log('VideoPlayer: Unmuting video');
      videoElement.muted = false;
      setIsMuted(false);
    }
    
    console.log('VideoPlayer: Calling onPlayToggle');
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
        preload="auto"
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
