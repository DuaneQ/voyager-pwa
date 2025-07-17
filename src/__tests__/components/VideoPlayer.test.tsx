import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VideoPlayer } from '../../components/video/VideoPlayer';
import { Video } from '../../types/Video';
import { Timestamp } from 'firebase/firestore';

// Mock HTMLVideoElement methods
const mockPlay = jest.fn();
const mockPause = jest.fn();
const mockLoad = jest.fn();

// Mock AudioContext for mobile testing
const mockAudioContext = {
  state: 'suspended',
  resume: jest.fn().mockResolvedValue(undefined)
};

beforeAll(() => {
  Object.defineProperty(HTMLVideoElement.prototype, 'play', {
    value: mockPlay,
    writable: true
  });
  
  Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
    value: mockPause,
    writable: true
  });

  Object.defineProperty(HTMLVideoElement.prototype, 'load', {
    value: mockLoad,
    writable: true
  });

  // Mock readyState property
  Object.defineProperty(HTMLVideoElement.prototype, 'readyState', {
    value: 4, // HAVE_ENOUGH_DATA
    writable: true
  });

  // Mock isConnected property
  Object.defineProperty(HTMLVideoElement.prototype, 'isConnected', {
    value: true,
    writable: true
  });

  // Mock paused property
  Object.defineProperty(HTMLVideoElement.prototype, 'paused', {
    value: true,
    writable: true
  });

  // Mock muted property
  Object.defineProperty(HTMLVideoElement.prototype, 'muted', {
    value: true,
    writable: true
  });

  // Mock currentTime property
  Object.defineProperty(HTMLVideoElement.prototype, 'currentTime', {
    value: 0,
    writable: true
  });

  // Mock AudioContext
  Object.defineProperty(window, 'AudioContext', {
    value: jest.fn(() => mockAudioContext),
    writable: true
  });

  Object.defineProperty(window, 'webkitAudioContext', {
    value: jest.fn(() => mockAudioContext),
    writable: true
  });
});

describe('VideoPlayer', () => {
  const mockVideo: Video = {
    id: 'test-video-1',
    userId: 'user-1',
    title: 'Test Video',
    description: 'This is a test video description',
    videoUrl: 'https://example.com/video.mp4',
    thumbnailUrl: 'https://example.com/thumbnail.jpg',
    isPublic: true,
    likes: [],
    commentCount: 0,
    viewCount: 0,
    duration: 30,
    fileSize: 1024 * 1024 * 10, // 10MB
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const mockOnPlayToggle = jest.fn();
  const mockOnVideoEnd = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockPlay.mockResolvedValue(undefined);
    mockAudioContext.resume.mockResolvedValue(undefined);
    
    // Reset console mocks
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render video player with video info', () => {
    render(<VideoPlayer video={mockVideo} />);
    
    expect(screen.getByTestId('video-player')).toBeInTheDocument();
    expect(screen.getByTestId('video-element')).toBeInTheDocument();
    expect(screen.getByTestId('video-title')).toHaveTextContent('Test Video');
    expect(screen.getByTestId('video-description')).toHaveTextContent('This is a test video description');
  });

  it('should show play overlay when not playing', () => {
    render(<VideoPlayer video={mockVideo} isPlaying={false} />);
    
    expect(screen.getByTestId('play-overlay')).toBeInTheDocument();
  });

  it('should hide play overlay when playing', () => {
    render(<VideoPlayer video={mockVideo} isPlaying={true} />);
    
    expect(screen.queryByTestId('play-overlay')).not.toBeInTheDocument();
  });

  it('should render mute button', () => {
    render(<VideoPlayer video={mockVideo} />);
    
    expect(screen.getByTestId('mute-button')).toBeInTheDocument();
    expect(screen.getByTestId('mute-button')).toHaveTextContent('🔇');
  });

  it('should handle mute button toggle', () => {
    render(<VideoPlayer video={mockVideo} />);
    
    const muteButton = screen.getByTestId('mute-button');
    fireEvent.click(muteButton);
    
    expect(screen.getByTestId('mute-button')).toHaveTextContent('🔊');
  });

  it('should call onPlayToggle when video is clicked', () => {
    render(<VideoPlayer video={mockVideo} onPlayToggle={mockOnPlayToggle} />);
    
    fireEvent.click(screen.getByTestId('video-element'));
    
    expect(mockOnPlayToggle).toHaveBeenCalledTimes(1);
  });

  it('should call onPlayToggle when play overlay is clicked', () => {
    render(<VideoPlayer video={mockVideo} isPlaying={false} onPlayToggle={mockOnPlayToggle} />);
    
    fireEvent.click(screen.getByTestId('play-overlay'));
    
    expect(mockOnPlayToggle).toHaveBeenCalledTimes(1);
  });

  it('should call onVideoEnd when video ends', () => {
    render(<VideoPlayer video={mockVideo} onVideoEnd={mockOnVideoEnd} />);
    
    const videoElement = screen.getByTestId('video-element');
    fireEvent.ended(videoElement);
    
    expect(mockOnVideoEnd).toHaveBeenCalledTimes(1);
  });

  it('should handle video loading and metadata events', () => {
    render(<VideoPlayer video={mockVideo} />);
    
    const videoElement = screen.getByTestId('video-element');
    
    fireEvent.loadStart(videoElement);
    fireEvent.canPlay(videoElement);
    fireEvent.loadedMetadata(videoElement);
    
    // Should not throw errors
    expect(videoElement).toBeInTheDocument();
  });

  it('should render without title and description when not provided', () => {
    const videoWithoutText: Video = {
      ...mockVideo,
      title: undefined,
      description: undefined
    };
    
    render(<VideoPlayer video={videoWithoutText} />);
    
    expect(screen.queryByTestId('video-title')).not.toBeInTheDocument();
    expect(screen.queryByTestId('video-description')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    render(<VideoPlayer video={mockVideo} className="custom-class" />);
    
    const playerElement = screen.getByTestId('video-player');
    expect(playerElement).toHaveClass('video-player');
    expect(playerElement).toHaveClass('custom-class');
  });

  it('should show branding footer when showBranding is true', () => {
    render(<VideoPlayer video={mockVideo} showBranding={true} />);
    
    expect(screen.getByTestId('branding-footer')).toBeInTheDocument();
    expect(screen.getByText('TravalPass.com')).toBeInTheDocument();
    expect(screen.getByText('Discover Amazing Travel Videos')).toBeInTheDocument();
  });

  it('should not show branding footer by default', () => {
    render(<VideoPlayer video={mockVideo} />);
    
    expect(screen.queryByTestId('branding-footer')).not.toBeInTheDocument();
  });

  it('should set correct video attributes', () => {
    render(<VideoPlayer video={mockVideo} />);
    
    const videoElement = screen.getByTestId('video-element') as HTMLVideoElement;
    
    expect(videoElement.src).toBe(mockVideo.videoUrl);
    expect(videoElement.poster).toBe(mockVideo.thumbnailUrl);
    expect(videoElement.loop).toBe(false);
    expect(videoElement.muted).toBe(true);
    expect(videoElement.controls).toBe(false);
    expect(videoElement.playsInline).toBe(true);
    expect(videoElement.getAttribute('webkit-playsinline')).toBe('true');
    expect(videoElement.getAttribute('x-webkit-airplay')).toBe('allow');
  });

  describe('Mobile-specific behavior', () => {
    beforeEach(() => {
      // Mock mobile environment
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      });

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
    });

    it('should handle user interaction requirement on mobile', async () => {
      render(<VideoPlayer video={mockVideo} isPlaying={true} onPlayToggle={mockOnPlayToggle} />);
      
      // Initially should not play without user interaction
      expect(mockPlay).not.toHaveBeenCalled();
      
      // Simulate user interaction
      fireEvent.click(screen.getByTestId('video-element'));
      
      await waitFor(() => {
        expect(mockPlay).toHaveBeenCalled();
      });
    });

    it('should resume audio context on iOS when video is clicked', () => {
      render(<VideoPlayer video={mockVideo} onPlayToggle={mockOnPlayToggle} />);
      
      fireEvent.click(screen.getByTestId('video-element'));
      
      expect(mockAudioContext.resume).toHaveBeenCalled();
    });

    it('should unmute video on first interaction', () => {
      render(<VideoPlayer video={mockVideo} onPlayToggle={mockOnPlayToggle} />);
      
      const videoElement = screen.getByTestId('video-element') as HTMLVideoElement;
      expect(videoElement.muted).toBe(true);
      
      fireEvent.click(videoElement);
      
      expect(screen.getByTestId('mute-button')).toHaveTextContent('🔊');
    });

    it('should handle play errors gracefully on mobile', async () => {
      const notAllowedError = new DOMException('NotAllowedError', 'NotAllowedError');
      mockPlay.mockRejectedValue(notAllowedError);
      
      render(<VideoPlayer video={mockVideo} isPlaying={true} onPlayToggle={mockOnPlayToggle} />);
      
      // Simulate user interaction first
      fireEvent.click(screen.getByTestId('video-element'));
      
      await waitFor(() => {
        expect(mockOnPlayToggle).toHaveBeenCalled(); // Should reset playing state
      });
    });

    it('should show audio hint when muted and has user interaction', () => {
      render(<VideoPlayer video={mockVideo} isPlaying={false} />);
      
      // Simulate user interaction
      fireEvent.click(screen.getByTestId('video-element'));
      
      expect(screen.getByText('Tap 🔇 to unmute')).toBeInTheDocument();
    });

    it('should handle AbortError when video element is unmounted', async () => {
      const abortError = new DOMException('AbortError', 'AbortError');
      mockPlay.mockRejectedValue(abortError);
      
      const { unmount } = render(<VideoPlayer video={mockVideo} isPlaying={true} />);
      
      // Simulate user interaction first
      fireEvent.click(screen.getByTestId('video-element'));
      
      // Unmount component while play is in progress
      unmount();
      
      // Should not throw error
      await waitFor(() => {
        expect(mockPlay).toHaveBeenCalled();
      });
    });

    it('should handle video with low readyState', async () => {
      // Mock video with low readyState
      Object.defineProperty(HTMLVideoElement.prototype, 'readyState', {
        value: 1, // HAVE_METADATA
        writable: true,
        configurable: true
      });

      render(<VideoPlayer video={mockVideo} isPlaying={true} />);
      
      // Simulate user interaction
      fireEvent.click(screen.getByTestId('video-element'));
      
      const videoElement = screen.getByTestId('video-element');
      
      // Simulate canplay event
      fireEvent.canPlay(videoElement);
      
      await waitFor(() => {
        expect(mockPlay).toHaveBeenCalled();
      });
    });

    it('should handle timeout fallback for video loading', async () => {
      jest.useFakeTimers();
      
      // Mock video with low readyState that doesn't improve
      Object.defineProperty(HTMLVideoElement.prototype, 'readyState', {
        value: 1, // HAVE_METADATA
        writable: true,
        configurable: true
      });

      render(<VideoPlayer video={mockVideo} isPlaying={true} />);
      
      // Simulate user interaction
      fireEvent.click(screen.getByTestId('video-element'));
      
      // Fast-forward past timeout
      jest.advanceTimersByTime(1000);
      
      await waitFor(() => {
        expect(mockPlay).toHaveBeenCalled();
      });
      
      jest.useRealTimers();
    });
  });

  describe('Video error handling', () => {
    it('should handle network error', () => {
      render(<VideoPlayer video={mockVideo} />);
      
      const videoElement = screen.getByTestId('video-element');
      
      // Mock video error
      Object.defineProperty(videoElement, 'error', {
        value: { code: MediaError.MEDIA_ERR_NETWORK },
        writable: true
      });
      
      fireEvent.error(videoElement);
      
      // Should log error without throwing
      expect(console.error).toHaveBeenCalledWith(
        'Video error:',
        expect.objectContaining({
          message: 'Network error while loading video'
        })
      );
    });

    it('should handle decode error', () => {
      render(<VideoPlayer video={mockVideo} />);
      
      const videoElement = screen.getByTestId('video-element');
      
      Object.defineProperty(videoElement, 'error', {
        value: { code: MediaError.MEDIA_ERR_DECODE },
        writable: true
      });
      
      fireEvent.error(videoElement);
      
      expect(console.error).toHaveBeenCalledWith(
        'Video error:',
        expect.objectContaining({
          message: 'Video decode error'
        })
      );
    });

    it('should handle unsupported format error', () => {
      render(<VideoPlayer video={mockVideo} />);
      
      const videoElement = screen.getByTestId('video-element');
      
      Object.defineProperty(videoElement, 'error', {
        value: { code: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED },
        writable: true
      });
      
      fireEvent.error(videoElement);
      
      expect(console.error).toHaveBeenCalledWith(
        'Video error:',
        expect.objectContaining({
          message: 'Video format not supported'
        })
      );
    });
  });

  describe('Video playback states', () => {
    it('should attempt to play when isPlaying becomes true and user has interacted', async () => {
      const { rerender } = render(<VideoPlayer video={mockVideo} isPlaying={false} />);
      
      // Simulate user interaction first
      fireEvent.click(screen.getByTestId('video-element'));
      
      // Now change to playing
      rerender(<VideoPlayer video={mockVideo} isPlaying={true} />);
      
      await waitFor(() => {
        expect(mockPlay).toHaveBeenCalled();
      });
    });

    it('should pause when isPlaying becomes false', () => {
      const { rerender } = render(<VideoPlayer video={mockVideo} isPlaying={true} />);
      
      // Mock video as not paused
      Object.defineProperty(HTMLVideoElement.prototype, 'paused', {
        value: false,
        writable: true,
        configurable: true
      });
      
      rerender(<VideoPlayer video={mockVideo} isPlaying={false} />);
      
      expect(mockPause).toHaveBeenCalled();
    });

    it('should not pause if video is already paused', () => {
      const { rerender } = render(<VideoPlayer video={mockVideo} isPlaying={true} />);
      
      // Mock video as already paused
      Object.defineProperty(HTMLVideoElement.prototype, 'paused', {
        value: true,
        writable: true,
        configurable: true
      });
      
      rerender(<VideoPlayer video={mockVideo} isPlaying={false} />);
      
      expect(mockPause).not.toHaveBeenCalled();
    });

    it('should not play without user interaction', () => {
      render(<VideoPlayer video={mockVideo} isPlaying={true} />);
      
      // Should not play immediately without user interaction
      expect(mockPlay).not.toHaveBeenCalled();
    });
  });
});
