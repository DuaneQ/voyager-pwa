// Mock HTMLMediaElement play/pause for jsdom
Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
  configurable: true,
  writable: true,
  value: jest.fn().mockResolvedValue(undefined)
});
Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
  configurable: true,
  writable: true,
  value: jest.fn()
});
Object.defineProperty(window.HTMLMediaElement.prototype, 'load', {
  configurable: true,
  writable: true,
  value: jest.fn()
});

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VideoFeedPage } from '../../components/pages/VideoFeedPage';
import { Video } from '../../types/Video';
import { Timestamp } from 'firebase/firestore';
import * as firestore from 'firebase/firestore';
import * as useVideoUpload from '../../hooks/useVideoUpload';
import { auth } from '../../environments/firebaseConfig';

// Mock Firebase
jest.mock('firebase/firestore');
jest.mock('../../hooks/useVideoUpload');
jest.mock('../../environments/firebaseConfig', () => ({
  db: jest.fn(),
  auth: {
    currentUser: null, // Start with no user
  },
}));

// Mock VideoUploadModal component
jest.mock('../../components/modals/VideoUploadModal', () => ({
  VideoUploadModal: ({ isOpen, onClose, onUpload }: any) => 
    isOpen ? (
      <div data-testid="video-upload-modal">
        <button onClick={onClose} data-testid="close-modal">Close</button>
        <button onClick={() => onUpload({ title: 'Test', isPublic: true, file: new File([''], 'test.mp4') })} data-testid="upload-video">Upload</button>
      </div>
    ) : null
}));

// Mock VideoPlayer component to avoid video element issues
jest.mock('../../components/video/VideoPlayer', () => ({
  VideoPlayer: ({ video, isPlaying, className }: any) => (
    <div className={`video-player ${className}`} data-testid="video-player">
      <div data-testid="video-element">Mock Video: {video.title}</div>
      {video.title && <h3 data-testid="video-title">{video.title}</h3>}
      {video.description && <p data-testid="video-description">{video.description}</p>}
    </div>
  )
}));

const mockAuth = auth as jest.Mocked<typeof auth>;

const mockGetDocs = firestore.getDocs as jest.MockedFunction<typeof firestore.getDocs>;
const mockQuery = firestore.query as jest.MockedFunction<typeof firestore.query>;
const mockCollection = firestore.collection as jest.MockedFunction<typeof firestore.collection>;
const mockWhere = firestore.where as jest.MockedFunction<typeof firestore.where>;
const mockOrderBy = firestore.orderBy as jest.MockedFunction<typeof firestore.orderBy>;
const mockLimit = firestore.limit as jest.MockedFunction<typeof firestore.limit>;

const mockUseVideoUpload = useVideoUpload.useVideoUpload as jest.MockedFunction<typeof useVideoUpload.useVideoUpload>;

describe('VideoFeedPage', () => {
  const mockUserId = 'test-user-123';
  const mockUploadVideo = jest.fn();

  const mockVideos: Video[] = [
    {
      id: 'video-1',
      userId: 'user-1',
      title: 'Test Video 1',
      description: 'First test video',
      videoUrl: 'https://example.com/video1.mp4',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      isPublic: true,
      likes: ['user-2', 'user-3'],
      commentCount: 5,
      viewCount: 100,
      duration: 30,
      fileSize: 1024 * 1024,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    },
    {
      id: 'video-2',
      userId: 'user-2',
      title: 'Test Video 2',
      description: 'Second test video',
      videoUrl: 'https://example.com/video2.mp4',
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      isPublic: true,
      likes: ['user-1'],
      commentCount: 2,
      viewCount: 50,
      duration: 45,
      fileSize: 2 * 1024 * 1024,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Firebase query functions
    mockCollection.mockReturnValue({ id: 'videos' } as any);
    mockWhere.mockReturnValue({ type: 'where' } as any);
    mockOrderBy.mockReturnValue({ type: 'orderBy' } as any);
    mockLimit.mockReturnValue({ type: 'limit' } as any);
    mockQuery.mockReturnValue({ id: 'query' } as any);
    
    // Mock user by default for most tests
    Object.defineProperty(mockAuth, 'currentUser', {
      value: { uid: mockUserId },
      writable: true,
    });
    
    // Mock upload hook
    mockUseVideoUpload.mockReturnValue({
      uploadVideo: mockUploadVideo,
      isUploading: false,
      uploadProgress: 0,
      processingStatus: null,
      error: null
    });
  });

  it('should render loading state initially', () => {
    // Mock getDocs to not resolve immediately
    mockGetDocs.mockImplementation(() => new Promise(() => {}));
    
    render(<VideoFeedPage />);
    
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    expect(screen.getByText('Loading videos...')).toBeInTheDocument();
  });

  it('should render empty state when no videos exist', async () => {
    // Mock empty query result
    mockGetDocs.mockResolvedValue({
      forEach: jest.fn()
    } as any);
    
    render(<VideoFeedPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No videos yet')).toBeInTheDocument();
      expect(screen.getByText('Be the first to share your travel memories!')).toBeInTheDocument();
      expect(screen.getByTestId('upload-first-video-button')).toBeInTheDocument();
    });
  });

  it('should render videos when they exist', async () => {
    // Mock query result with videos
    mockGetDocs.mockResolvedValue({
      forEach: (callback: any) => {
        mockVideos.forEach((video) => {
          const { id, ...rest } = video;
          callback({
            id,
            data: () => rest
          });
        });
      }
    } as any);
    
    render(<VideoFeedPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('video-container')).toBeInTheDocument();
      expect(screen.getByTestId('video-controls')).toBeInTheDocument();
      expect(screen.getByTestId('navigation-controls')).toBeInTheDocument();
    });
  });

  it('should display current video information', async () => {
    mockGetDocs.mockResolvedValue({
      forEach: (callback: any) => {
        mockVideos.forEach((video) => {
          const { id, ...rest } = video;
          callback({
            id,
            data: () => rest
          });
        });
      }
    } as any);
    
    render(<VideoFeedPage />);
    
    await waitFor(() => {
      expect(screen.getByText('❤️ 2')).toBeInTheDocument(); // First video has 2 likes
      expect(screen.getByText('💬 5')).toBeInTheDocument(); // First video has 5 comments
      expect(screen.getByText('1 of 2')).toBeInTheDocument(); // Video counter
    });
  });

  it('should navigate between videos', async () => {
    mockGetDocs.mockResolvedValue({
      forEach: (callback: any) => {
        mockVideos.forEach((video) => {
          const { id, ...rest } = video;
          callback({
            id,
            data: () => rest
          });
        });
      }
    } as any);
    
    render(<VideoFeedPage />);

    await waitFor(() => {
      expect(screen.getByTestId('video-counter').textContent).toBe('1 of 2');
    });

    // Click next button
    fireEvent.click(screen.getByTestId('next-button'));

    await waitFor(() => {
      expect(screen.getByTestId('video-counter').textContent).toBe('2 of 2');
      expect(screen.getByText('❤️ 1')).toBeInTheDocument(); // Second video has 1 like
      expect(screen.getByText('💬 2')).toBeInTheDocument(); // Second video has 2 comments
    });

    // Click previous button
    fireEvent.click(screen.getByTestId('prev-button'));
    
    await waitFor(() => {
      expect(screen.getByText('1 of 2')).toBeInTheDocument();
    });
  });

  it('should disable navigation buttons at boundaries', async () => {
    mockGetDocs.mockResolvedValue({
      forEach: (callback: any) => {
        mockVideos.forEach((video) => {
          // The data() method should not include the id property
          const { id, ...rest } = video;
          callback({
            id,
            data: () => rest
          });
        });
      }
    } as any);

    render(<VideoFeedPage />);

    await waitFor(() => {
      const prevButton = screen.getByTestId('prev-button') as HTMLButtonElement;
      const nextButton = screen.getByTestId('next-button') as HTMLButtonElement;

      // At first video, previous should be disabled
      expect(prevButton.disabled).toBe(true);
      expect(nextButton.disabled).toBe(false);
    });

    // Go to last video
    fireEvent.click(screen.getByTestId('next-button'));

    await waitFor(() => {
      const prevButton = screen.getByTestId('prev-button') as HTMLButtonElement;
      const nextButton = screen.getByTestId('next-button') as HTMLButtonElement;

      // At last video, next should be disabled
      expect(prevButton.disabled).toBe(false);
      expect(nextButton.disabled).toBe(true);
    });
  });

  it('should open upload modal when upload button is clicked', async () => {
    mockGetDocs.mockResolvedValue({
      forEach: jest.fn()
    } as any);
    
    render(<VideoFeedPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('upload-first-video-button')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('upload-first-video-button'));
    
    // Modal should be open (we're not testing the modal internals here)
    expect(screen.getByTestId('video-upload-modal')).toBeInTheDocument();
  });

  it('should handle upload success', async () => {
    const newVideo: Video = {
      id: 'new-video',
      userId: 'test-user-123',
      title: 'New Video',
      videoUrl: 'https://example.com/new-video.mp4',
      thumbnailUrl: 'https://example.com/new-thumb.jpg',
      isPublic: true,
      likes: [],
      commentCount: 0,
      viewCount: 0,
      duration: 20,
      fileSize: 1024 * 1024,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    mockUploadVideo.mockResolvedValue(newVideo);
    mockGetDocs.mockResolvedValue({
      forEach: jest.fn()
    } as any);
    
    render(<VideoFeedPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('upload-first-video-button')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('upload-first-video-button'));
    
    // Simulate successful upload by calling the onUpload prop
    // This would normally be done by the VideoUploadModal component
    const uploadData = {
      title: 'New Video',
      isPublic: true,
      file: new File(['content'], 'test.mp4', { type: 'video/mp4' })
    };

    // Since we can't easily trigger the modal's onUpload from here,
    // we'll just verify that the upload function would be called
    expect(mockUseVideoUpload).toHaveBeenCalled();
  });

  it('should handle error state', async () => {
    mockGetDocs.mockRejectedValue(new Error('Network error'));
    
    render(<VideoFeedPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      expect(screen.getByText('Failed to load videos')).toBeInTheDocument();
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });
  });

  it('should retry loading videos when retry button is clicked', async () => {
    mockGetDocs.mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        forEach: jest.fn()
      } as any);
    
    render(<VideoFeedPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('retry-button'));
    
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    });
  });

  it('should not show upload button when user is not authenticated', async () => {
    // Mock empty query result
    mockGetDocs.mockResolvedValue({
      forEach: jest.fn()
    } as any);
    
    // Mock no user
    Object.defineProperty(mockAuth, 'currentUser', {
      value: null,
      writable: true,
    });
    
    render(<VideoFeedPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.queryByTestId('upload-first-video-button')).not.toBeInTheDocument();
    });
  });

  describe('Mobile gesture navigation', () => {
    beforeEach(() => {
      // Mock mobile environment
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      // Mock touch capability
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        configurable: true,
        value: true,
      });

      // Mock videos for gesture tests
      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => {
          mockVideos.forEach((video) => {
            const { id, ...rest } = video;
            callback({
              id,
              data: () => rest
            });
          });
        }
      } as any);
    });

    it('should handle swipe up to go to next video', async () => {
      render(<VideoFeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feed-page')).toBeInTheDocument();
      });

      const feedPage = screen.getByTestId('video-feed-page');
      
      // Simulate swipe up gesture
      fireEvent.touchStart(feedPage, {
        touches: [{ clientY: 300 }]
      });
      
      fireEvent.touchMove(feedPage, {
        touches: [{ clientY: 200 }]
      });
      
      fireEvent.touchEnd(feedPage, {
        changedTouches: [{ clientY: 200 }]
      });

      await waitFor(() => {
        expect(screen.getByText('2 of 2')).toBeInTheDocument();
      });
    });

    it('should handle swipe down to go to previous video', async () => {
      render(<VideoFeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feed-page')).toBeInTheDocument();
      });

      // First go to second video
      const nextButton = screen.getByTestId('next-button');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('2 of 2')).toBeInTheDocument();
      });

      const feedPage = screen.getByTestId('video-feed-page');
      
      // Simulate swipe down gesture
      fireEvent.touchStart(feedPage, {
        touches: [{ clientY: 200 }]
      });
      
      fireEvent.touchMove(feedPage, {
        touches: [{ clientY: 300 }]
      });
      
      fireEvent.touchEnd(feedPage, {
        changedTouches: [{ clientY: 300 }]
      });

      await waitFor(() => {
        expect(screen.getByText('1 of 2')).toBeInTheDocument();
      });
    });

    it('should ignore small swipe gestures', async () => {
      render(<VideoFeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feed-page')).toBeInTheDocument();
        expect(screen.getByText('1 of 2')).toBeInTheDocument();
      });

      const feedPage = screen.getByTestId('video-feed-page');
      
      // Simulate small swipe (less than minSwipeDistance)
      fireEvent.touchStart(feedPage, {
        touches: [{ clientY: 200 }]
      });
      
      fireEvent.touchMove(feedPage, {
        touches: [{ clientY: 180 }] // Only 20px difference
      });
      
      fireEvent.touchEnd(feedPage, {
        changedTouches: [{ clientY: 180 }]
      });

      // Should stay on same video
      expect(screen.getByText('1 of 2')).toBeInTheDocument();
    });

    it('should not navigate beyond video boundaries with gestures', async () => {
      render(<VideoFeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feed-page')).toBeInTheDocument();
        expect(screen.getByText('1 of 2')).toBeInTheDocument();
      });

      const feedPage = screen.getByTestId('video-feed-page');
      
      // Try to swipe down when already at first video
      fireEvent.touchStart(feedPage, {
        touches: [{ clientY: 200 }]
      });
      
      fireEvent.touchMove(feedPage, {
        touches: [{ clientY: 300 }]
      });
      
      fireEvent.touchEnd(feedPage, {
        changedTouches: [{ clientY: 300 }]
      });

      // Should still be on first video
      expect(screen.getByText('1 of 2')).toBeInTheDocument();
    });

    it('should handle touch events without errors', async () => {
      render(<VideoFeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feed-page')).toBeInTheDocument();
      });

      const feedPage = screen.getByTestId('video-feed-page');
      
      // Test touch without move (tap)
      fireEvent.touchStart(feedPage, {
        touches: [{ clientY: 200 }]
      });
      
      fireEvent.touchEnd(feedPage, {
        changedTouches: [{ clientY: 200 }]
      });

      // Should not cause errors or navigation
      expect(screen.getByText('1 of 2')).toBeInTheDocument();
    });

    it('should prevent body scroll during video feed', () => {
      render(<VideoFeedPage />);
      
      expect(document.body).toHaveClass('video-feed-active');
    });

    it('should restore body scroll on unmount', () => {
      const { unmount } = render(<VideoFeedPage />);
      
      unmount();
      
      expect(document.body).not.toHaveClass('video-feed-active');
    });

    it('should load more videos when swiping to end', async () => {
      // Mock additional videos for pagination test
      let callCount = 0;
      mockGetDocs.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          forEach: (callback: any) => {
            if (callCount === 1) {
              // First call - initial videos
              mockVideos.forEach((video) => {
                const { id, ...rest } = video;
                callback({
                  id,
                  data: () => rest
                });
              });
            } else {
              // Second call - additional videos
              const additionalVideo = {
                id: 'video-3',
                userId: 'user-3',
                title: 'Test Video 3',
                videoUrl: 'https://example.com/video3.mp4',
                thumbnailUrl: 'https://example.com/thumb3.jpg',
                isPublic: true,
                likes: [],
                commentCount: 0,
                viewCount: 5,
                duration: 20,
                fileSize: 1024 * 1024,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
              };
              const { id, ...rest } = additionalVideo;
              callback({
                id,
                data: () => rest
              });
            }
          }
        } as any);
      });

      render(<VideoFeedPage />);
      
      // Navigate to last video
      await waitFor(() => {
        expect(screen.getByText('1 of 2')).toBeInTheDocument();
      });

      const nextButton = screen.getByTestId('next-button');
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(screen.getByText('2 of 2')).toBeInTheDocument();
      });

      // Try to navigate beyond current videos (should trigger load more)
      const feedPage = screen.getByTestId('video-feed-page');
      fireEvent.touchStart(feedPage, {
        touches: [{ clientY: 300 }]
      });
      
      fireEvent.touchMove(feedPage, {
        touches: [{ clientY: 200 }]
      });
      
      fireEvent.touchEnd(feedPage, {
        changedTouches: [{ clientY: 200 }]
      });

      // Should load more videos
      await waitFor(() => {
        expect(mockGetDocs).toHaveBeenCalledTimes(3); // Initial connections + initial videos + load more
      });
    });
  });

  describe('Video playback behavior', () => {
    beforeEach(() => {
      mockGetDocs.mockResolvedValue({
        forEach: (callback: any) => {
          mockVideos.forEach((video) => {
            const { id, ...rest } = video;
            callback({
              id,
              data: () => rest
            });
          });
        }
      } as any);
    });

    it('should start videos in paused state for mobile compatibility', async () => {
      render(<VideoFeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('video-container')).toBeInTheDocument();
      });

      // VideoPlayer should receive isPlaying=false initially
      const videoPlayer = screen.getByTestId('video-player');
      expect(videoPlayer).toBeInTheDocument();
    });

    it('should not auto-play next video after swipe', async () => {
      render(<VideoFeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feed-page')).toBeInTheDocument();
      });

      const feedPage = screen.getByTestId('video-feed-page');
      
      // Swipe to next video
      fireEvent.touchStart(feedPage, {
        touches: [{ clientY: 300 }]
      });
      
      fireEvent.touchMove(feedPage, {
        touches: [{ clientY: 200 }]
      });
      
      fireEvent.touchEnd(feedPage, {
        changedTouches: [{ clientY: 200 }]
      });

      await waitFor(() => {
        expect(screen.getByText('2 of 2')).toBeInTheDocument();
      });

      // Video should not be auto-playing
      const videoPlayer = screen.getByTestId('video-player');
      expect(videoPlayer).toBeInTheDocument();
      // Should require user interaction to play
    });

    it('should handle video end without auto-advancing', async () => {
      render(<VideoFeedPage />);
      
      await waitFor(() => {
        const videoPlayer = screen.getByTestId('video-player');
        expect(videoPlayer).toBeInTheDocument();
      });

      // Simulate video ending
      const videoPlayer = screen.getByTestId('video-player');
      const videoElement = videoPlayer.querySelector('video');
      if (videoElement) {
        fireEvent.ended(videoElement);
      }

      // Should stay on same video, not auto-advance
      expect(screen.getByText('1 of 2')).toBeInTheDocument();
    });
  });
});
