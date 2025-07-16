import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoPlayer } from '../../components/video/VideoPlayer';
import { Video } from '../../types/Video';
import { Timestamp } from 'firebase/firestore';

// Mock HTMLVideoElement methods
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

  it('should call play when isPlaying becomes true', () => {
    const { rerender } = render(<VideoPlayer video={mockVideo} isPlaying={false} />);
    
    expect(mockPlay).not.toHaveBeenCalled();
    
    rerender(<VideoPlayer video={mockVideo} isPlaying={true} />);
    
    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  it('should call pause when isPlaying becomes false', () => {
    const { rerender } = render(<VideoPlayer video={mockVideo} isPlaying={true} />);
    
    rerender(<VideoPlayer video={mockVideo} isPlaying={false} />);
    
    expect(mockPause).toHaveBeenCalledTimes(1);
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

  it('should handle play errors gracefully', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockPlay.mockRejectedValue(new Error('Play failed'));
    
    const { rerender } = render(<VideoPlayer video={mockVideo} isPlaying={false} />);
    
    rerender(<VideoPlayer video={mockVideo} isPlaying={true} />);
    
    expect(mockPlay).toHaveBeenCalledTimes(1);
    // Should not throw error, just log it
    
    consoleError.mockRestore();
  });

  it('should set correct video attributes', () => {
    render(<VideoPlayer video={mockVideo} />);
    
    const videoElement = screen.getByTestId('video-element') as HTMLVideoElement;
    
    expect(videoElement.src).toBe(mockVideo.videoUrl);
    expect(videoElement.poster).toBe(mockVideo.thumbnailUrl);
    expect(videoElement.loop).toBe(false);
    expect(videoElement.muted).toBe(false);
    expect(videoElement.controls).toBe(false);
    expect(videoElement.playsInline).toBe(true);
  });
});
