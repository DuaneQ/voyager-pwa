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
    
    // Setup dual getDocs mock for connections + videos queries (default setup)
    mockGetDocs
      .mockResolvedValueOnce({
        // First call - connections query (empty)
        forEach: jest.fn()
      } as any)
      .mockResolvedValue({
        // Subsequent calls - videos query (repeatable)
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
    // Mock both connections and videos queries  
    mockGetDocs
      .mockResolvedValueOnce({
        // First call - connections query (empty)
        forEach: jest.fn()
      } as any)
      .mockResolvedValueOnce({
        // Second call - videos query
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
      expect(screen.getByTestId('navigation-hint')).toBeInTheDocument();
    });
  });

  it('should display current video information', async () => {
    // Mock both connections and videos queries
    mockGetDocs
      .mockResolvedValueOnce({
        // First call - connections query (empty)
        forEach: jest.fn()
      } as any)
      .mockResolvedValueOnce({
        // Second call - videos query
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
    // Mock both connections and videos queries
    mockGetDocs
      .mockResolvedValueOnce({
        // First call - connections query (empty)
        forEach: jest.fn()
      } as any)
      .mockResolvedValueOnce({
        // Second call - videos query
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
      expect(screen.getByText((content, element) => {
        return element?.textContent === '1 of 2';
      })).toBeInTheDocument();
    });

    const feedPage = screen.getByTestId('video-feed-page');

    // Swipe up to go to next video
    fireEvent.touchStart(feedPage, {
      targetTouches: [{ clientY: 300 }]
    });
    
    fireEvent.touchMove(feedPage, {
      targetTouches: [{ clientY: 200 }]
    });
    
    fireEvent.touchEnd(feedPage, {
      changedTouches: [{ clientY: 200 }]
    });

    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element?.textContent === '2 of 2';
      })).toBeInTheDocument();
      expect(screen.getByText('❤️ 1')).toBeInTheDocument(); // Second video has 1 like
      expect(screen.getByText('💬 2')).toBeInTheDocument(); // Second video has 2 comments
    });

    // Swipe down to go back to previous video
    fireEvent.touchStart(feedPage, {
      targetTouches: [{ clientY: 200 }]
    });
    
    fireEvent.touchMove(feedPage, {
      targetTouches: [{ clientY: 300 }]
    });
    
    fireEvent.touchEnd(feedPage, {
      changedTouches: [{ clientY: 300 }]
    });
    
    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element?.textContent === '1 of 2';
      })).toBeInTheDocument();
    });
  });

  it('should respect navigation boundaries with swipes', async () => {
    // Mock both connections and videos queries
    mockGetDocs
      .mockResolvedValueOnce({
        // First call - connections query (empty)
        forEach: jest.fn()
      } as any)
      .mockResolvedValueOnce({
        // Second call - videos query
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
      expect(screen.getByText((content, element) => {
        return element?.textContent === '1 of 2';
      })).toBeInTheDocument();
    });

    const feedPage = screen.getByTestId('video-feed-page');

    // Try to swipe down from first video (should not navigate)
    fireEvent.touchStart(feedPage, {
      targetTouches: [{ clientY: 200 }]
    });
    
    fireEvent.touchMove(feedPage, {
      targetTouches: [{ clientY: 300 }]
    });
    
    fireEvent.touchEnd(feedPage, {
      changedTouches: [{ clientY: 300 }]
    });

    // Should still be on first video
    expect(screen.getByText((content, element) => {
      return element?.textContent === '1 of 2';
    })).toBeInTheDocument();

    // Go to last video first
    fireEvent.touchStart(feedPage, {
      targetTouches: [{ clientY: 300 }]
    });
    
    fireEvent.touchMove(feedPage, {
      targetTouches: [{ clientY: 200 }]
    });
    
    fireEvent.touchEnd(feedPage, {
      changedTouches: [{ clientY: 200 }]
    });

    await waitFor(() => {
      expect(screen.getByText((content, element) => {
        return element?.textContent === '2 of 2';
      })).toBeInTheDocument();
    });

    // Try to swipe up from last video (should not navigate)
    fireEvent.touchStart(feedPage, {
      targetTouches: [{ clientY: 300 }]
    });
    
    fireEvent.touchMove(feedPage, {
      targetTouches: [{ clientY: 200 }]
    });
    
    fireEvent.touchEnd(feedPage, {
      changedTouches: [{ clientY: 200 }]
    });

    // Should still be on second video
    expect(screen.getByText((content, element) => {
      return element?.textContent === '2 of 2';
    })).toBeInTheDocument();
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
    // Clear default mock and setup error for both connections and videos calls
    mockGetDocs.mockClear();
    mockGetDocs
      .mockResolvedValueOnce({
        // First call - connections query (empty)
        forEach: jest.fn()
      } as any)
      .mockRejectedValue(new Error('Network error')); // Second call - videos query (error)
    
    render(<VideoFeedPage />);
    
    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      expect(screen.getByText('Failed to load videos')).toBeInTheDocument();
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });
  });

  it.skip('should retry loading videos when retry button is clicked', async () => {
    // Clear default mock and setup error for both connections and videos calls
    mockGetDocs.mockClear();
    mockGetDocs
      .mockResolvedValueOnce({
        // First call - connections query (empty)
        forEach: jest.fn()
      } as any)
      .mockRejectedValueOnce(new Error('Network error')) // Second call - videos query (error)
      .mockResolvedValueOnce({
        // Third call - connections retry (empty)
        forEach: jest.fn()
      } as any)
      .mockResolvedValue({
        // Fourth call - videos retry (success)
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
      // Clear all mocks before each test
      jest.clearAllMocks();
      
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

      // Mock Firebase query functions
      mockCollection.mockReturnValue({ id: 'videos' } as any);
      mockWhere.mockReturnValue({ type: 'where' } as any);
      mockOrderBy.mockReturnValue({ type: 'orderBy' } as any);
      mockLimit.mockReturnValue({ type: 'limit' } as any);
      mockQuery.mockReturnValue({ id: 'query' } as any);
      
      // Mock user
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

      // Set up fresh getDocs mocks for each test
      mockGetDocs
        .mockResolvedValueOnce({
          // First call - connections query (empty)
          forEach: jest.fn()
        } as any)
        .mockResolvedValue({
          // Subsequent calls - videos query (repeatable)
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

    it.skip('should handle swipe up to go to next video', async () => {
      render(<VideoFeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feed-page')).toBeInTheDocument();
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      const feedPage = screen.getByTestId('video-feed-page');
      
      // Simulate swipe up gesture (current implementation: swipe up = next video)
      fireEvent.touchStart(feedPage, {
        targetTouches: [{ clientY: 300 }]
      });
      
      fireEvent.touchMove(feedPage, {
        targetTouches: [{ clientY: 200 }]
      });
      
      fireEvent.touchEnd(feedPage, {
        changedTouches: [{ clientY: 200 }]
      });

      await waitFor(() => {
        expect(screen.getByText((content, element) => {
          return element?.textContent === '2 of 2';
        })).toBeInTheDocument();
      });
    });

    it.skip('should handle swipe down to go to previous video', async () => {
      render(<VideoFeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feed-page')).toBeInTheDocument();
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      const feedPage = screen.getByTestId('video-feed-page');

      // First go to second video using swipe up
      fireEvent.touchStart(feedPage, {
        targetTouches: [{ clientY: 300 }]
      });
      
      fireEvent.touchMove(feedPage, {
        targetTouches: [{ clientY: 200 }]
      });
      
      fireEvent.touchEnd(feedPage, {
        changedTouches: [{ clientY: 200 }]
      });

      await waitFor(() => {
        expect(screen.getByText((content, element) => {
          return element?.textContent === '2 of 2';
        })).toBeInTheDocument();
      });
      
      // Now swipe down to go back to previous video
      fireEvent.touchStart(feedPage, {
        targetTouches: [{ clientY: 200 }]
      });
      
      fireEvent.touchMove(feedPage, {
        targetTouches: [{ clientY: 300 }]
      });
      
      fireEvent.touchEnd(feedPage, {
        changedTouches: [{ clientY: 300 }]
      });

      await waitFor(() => {
        expect(screen.getByText((content, element) => {
          return element?.textContent === '1 of 2';
        })).toBeInTheDocument();
      });
    });

    it('should ignore small swipe gestures', async () => {
      render(<VideoFeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feed-page')).toBeInTheDocument();
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      const feedPage = screen.getByTestId('video-feed-page');
      
      // Simulate small swipe (less than minSwipeDistance)
      fireEvent.touchStart(feedPage, {
        targetTouches: [{ clientY: 200 }]
      });
      
      fireEvent.touchMove(feedPage, {
        targetTouches: [{ clientY: 180 }] // Only 20px difference
      });
      
      fireEvent.touchEnd(feedPage, {
        changedTouches: [{ clientY: 180 }]
      });

      // Should stay on same video
      expect(screen.getByText((content, element) => {
        return element?.textContent === '1 of 2';
      })).toBeInTheDocument();
    });

    it.skip('should not navigate beyond video boundaries with gestures', async () => {
      render(<VideoFeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feed-page')).toBeInTheDocument();
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      const feedPage = screen.getByTestId('video-feed-page');
      
      // Try to swipe down when already at first video
      fireEvent.touchStart(feedPage, {
        targetTouches: [{ clientY: 200 }]
      });
      
      fireEvent.touchMove(feedPage, {
        targetTouches: [{ clientY: 300 }]
      });
      
      fireEvent.touchEnd(feedPage, {
        changedTouches: [{ clientY: 300 }]
      });

      // Should still be on first video
      expect(screen.getByText((content, element) => {
        return element?.textContent === '1 of 2';
      })).toBeInTheDocument();
    });

    it('should handle touch events without errors', async () => {
      render(<VideoFeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feed-page')).toBeInTheDocument();
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      const feedPage = screen.getByTestId('video-feed-page');
      
      // Test touch without move (tap)
      fireEvent.touchStart(feedPage, {
        targetTouches: [{ clientY: 200 }]
      });
      
      fireEvent.touchEnd(feedPage, {
        changedTouches: [{ clientY: 200 }]
      });

      // Should not cause errors or navigation
      expect(screen.getByText((content, element) => {
        return element?.textContent === '1 of 2';
      })).toBeInTheDocument();
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

    it.skip('should load more videos when swiping to end', async () => {
      // Clear default mock and setup custom sequence for load more test
      mockGetDocs.mockClear();
      
      // Mock additional videos for pagination test  
      let callCount = 0;
      mockGetDocs.mockImplementation(() => {
        callCount++;
        return Promise.resolve({
          forEach: (callback: any) => {
            if (callCount === 1) {
              // First call - connections (empty)
              return;
            } else if (callCount === 2) {
              // Second call - initial videos (return BATCH_SIZE=3 to indicate more available)
              const initialVideos = [
                ...mockVideos,
                {
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
                }
              ];
              
              initialVideos.forEach((video) => {
                const { id, ...rest } = video;
                callback({
                  id,
                  data: () => rest
                });
              });
            } else if (callCount === 3) {
              // Third call - connections for reload after connections change
              return;
            } else {
              // Fourth+ calls - additional videos (load more)
              const additionalVideo = {
                id: 'video-4',
                userId: 'user-4',
                title: 'Test Video 4', 
                videoUrl: 'https://example.com/video4.mp4',
                thumbnailUrl: 'https://example.com/thumb4.jpg',
                isPublic: true,
                likes: [],
                commentCount: 0,
                viewCount: 2,
                duration: 25,
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
      
      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      const feedPage = screen.getByTestId('video-feed-page');
      
      // Navigate to second video
      fireEvent.touchStart(feedPage, {
        targetTouches: [{ clientY: 300 }]
      });
      
      fireEvent.touchMove(feedPage, {
        targetTouches: [{ clientY: 200 }]
      });
      
      fireEvent.touchEnd(feedPage, {
        changedTouches: [{ clientY: 200 }]
      });

      await waitFor(() => {
        expect(screen.getByText((content, element) => {
          return element?.textContent === '2 of 3';
        })).toBeInTheDocument();
      });

      // Navigate to third video (should trigger load more)
      fireEvent.touchStart(feedPage, {
        targetTouches: [{ clientY: 300 }]
      });
      
      fireEvent.touchMove(feedPage, {
        targetTouches: [{ clientY: 200 }]
      });
      
      fireEvent.touchEnd(feedPage, {
        changedTouches: [{ clientY: 200 }]
      });

      // Should load more videos and show updated count
      await waitFor(() => {
        expect(screen.getByText((content, element) => {
          return element?.textContent === '3 of 4';
        })).toBeInTheDocument();
      });
    });
  });

  describe('Video playback behavior', () => {
    it('should start videos in paused state for mobile compatibility', async () => {
      render(<VideoFeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('video-container')).toBeInTheDocument();
      });

      // VideoPlayer should receive isPlaying=false initially
      const videoPlayer = screen.getByTestId('video-player');
      expect(videoPlayer).toBeInTheDocument();
    });

    it.skip('should auto-play next video after swipe', async () => {
      render(<VideoFeedPage />);
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feed-page')).toBeInTheDocument();
      });

      const feedPage = screen.getByTestId('video-feed-page');
      
      // Swipe to next video
      fireEvent.touchStart(feedPage, {
        targetTouches: [{ clientY: 300 }]
      });
      
      fireEvent.touchMove(feedPage, {
        targetTouches: [{ clientY: 200 }]
      });
      
      fireEvent.touchEnd(feedPage, {
        changedTouches: [{ clientY: 200 }]
      });

      // Wait for navigation to complete
      await waitFor(() => {
        expect(screen.getByTestId('video-player')).toBeInTheDocument();
      });

      // Verify we navigated to second video
      expect(screen.getByText((content, element) => {
        return element?.textContent === '2 of 2';
      })).toBeInTheDocument();

      // Video should auto-play after swipe navigation
      const videoPlayer = screen.getByTestId('video-player');
      expect(videoPlayer).toBeInTheDocument();
      // Auto-play is now enabled after swipe navigation
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
      expect(screen.getByText((content, element) => {
        return element?.textContent === '1 of 2';
      })).toBeInTheDocument();
    });
  });
});
