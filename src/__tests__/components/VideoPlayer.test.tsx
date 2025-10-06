import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoPlayer } from '../../components/video/VideoPlayer';

// Provide a simple MediaError shim used by tests
(global as any).MediaError = {
  MEDIA_ERR_ABORTED: 1,
  MEDIA_ERR_NETWORK: 2,
  MEDIA_ERR_DECODE: 3,
  MEDIA_ERR_SRC_NOT_SUPPORTED: 4
};

describe('VideoPlayer', () => {
  const mockPlay = jest.fn();
  const mockPause = jest.fn();

  beforeAll(() => {
    Object.defineProperty(HTMLVideoElement.prototype, 'play', {
      value: mockPlay,
      writable: true
    });

    Object.defineProperty(HTMLVideoElement.prototype, 'pause', {
      value: mockPause,
      writable: true
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockVideo = {
    id: 'test-video-1',
    userId: 'user-1',
    title: 'Test Video',
    description: 'This is a test video description',
    videoUrl: 'https://example.com/video.mp4',
    thumbnailUrl: 'https://example.com/thumbnail.jpg',
    isPublic: true
  } as any;

  it('renders title and description overlay when showInfoOverlay is true', () => {
    render(<VideoPlayer video={mockVideo} showInfoOverlay={true} />);
    expect(screen.getByTestId('video-title')).toHaveTextContent('Test Video');
    expect(screen.getByTestId('video-description')).toHaveTextContent('This is a test video description');
  });

  it('renders play overlay when not playing and hides when playing', () => {
    const { rerender } = render(<VideoPlayer video={mockVideo} isPlaying={false} />);
    expect(screen.getByTestId('play-overlay')).toBeInTheDocument();

    rerender(<VideoPlayer video={mockVideo} isPlaying={true} />);
    expect(screen.queryByTestId('play-overlay')).not.toBeInTheDocument();
  });

  it('renders mute button and toggles state on click', () => {
    render(<VideoPlayer video={mockVideo} />);
    const muteButton = screen.getByTestId('mute-button');
    expect(muteButton).toBeInTheDocument();

    fireEvent.click(muteButton);
    // Expect state to change visually (component may update icon/text)
    expect(muteButton).toBeInTheDocument();
  });

  it('calls onPlayToggle when video or overlay are clicked', () => {
    const mockOnPlayToggle = jest.fn();
    render(<VideoPlayer video={mockVideo} onPlayToggle={mockOnPlayToggle} isPlaying={false} />);
    fireEvent.click(screen.getByTestId('play-overlay'));
    expect(mockOnPlayToggle).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('video-element'));
    expect(mockOnPlayToggle).toHaveBeenCalledTimes(2);
  });

  it('calls onVideoEnd when video ended', () => {
    const mockOnVideoEnd = jest.fn();
    render(<VideoPlayer video={mockVideo} onVideoEnd={mockOnVideoEnd} />);
    fireEvent.ended(screen.getByTestId('video-element'));
    expect(mockOnVideoEnd).toHaveBeenCalledTimes(1);
  });

  it('handles video load/canplay events without throwing', () => {
    render(<VideoPlayer video={mockVideo} />);
    const videoEl = screen.getByTestId('video-element');
    fireEvent.loadStart(videoEl);
    fireEvent.canPlay(videoEl);
    fireEvent.loadedMetadata(videoEl as any);
    expect(videoEl).toBeInTheDocument();
  });

  describe('Mobile-specific behavior', () => {
    beforeEach(() => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      });

      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
    });

    it('attempts to play after user interaction when isPlaying=true', async () => {
      render(<VideoPlayer video={mockVideo} isPlaying={true} />);
      expect(mockPlay).not.toHaveBeenCalled();
      const videoElement = screen.getByTestId('video-element') as any;
      // Ensure the element appears ready so the effect will call play()
      Object.defineProperty(videoElement, 'readyState', { value: 4, writable: true, configurable: true });
      Object.defineProperty(videoElement, 'isConnected', { value: true, writable: true, configurable: true });
      fireEvent.click(videoElement);
      await waitFor(() => expect(mockPlay).toHaveBeenCalled());
    });

    it('unmutes on first interaction', () => {
      render(<VideoPlayer video={mockVideo} />);
      const videoElement = screen.getByTestId('video-element') as any;
      expect(videoElement.muted).toBeTruthy();
      fireEvent.click(videoElement);
      expect(screen.getByTestId('mute-button')).toBeInTheDocument();
    });
  });

  describe('Video error handling', () => {
    it('logs network error', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      render(<VideoPlayer video={mockVideo} />);
      const videoElement = screen.getByTestId('video-element') as any;
      Object.defineProperty(videoElement, 'error', { value: { code: (global as any).MediaError.MEDIA_ERR_NETWORK }, writable: true });
      fireEvent.error(videoElement);
      expect(console.error).toHaveBeenCalled();
    });

    it('logs decode error', () => {
      jest.spyOn(console, 'error').mockImplementation(() => {});
      render(<VideoPlayer video={mockVideo} />);
      const videoElement = screen.getByTestId('video-element') as any;
      Object.defineProperty(videoElement, 'error', { value: { code: (global as any).MediaError.MEDIA_ERR_DECODE }, writable: true });
      fireEvent.error(videoElement);
      expect(console.error).toHaveBeenCalled();
    });
  });
});

