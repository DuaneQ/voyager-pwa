import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ViewProfileModal } from '../../components/modals/ViewProfileModal';
import { UserProfileContext } from '../../Context/UserProfileContext';
import { Video } from '../../types/Video';
import { Timestamp } from 'firebase/firestore';
import * as firebaseFirestore from 'firebase/firestore';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  arrayUnion: jest.fn(),
  deleteDoc: jest.fn(),
  addDoc: jest.fn(),
  serverTimestamp: jest.fn(),
}));

jest.mock('../../environments/firebaseConfig', () => ({
  app: {},
  auth: {
    currentUser: {
      uid: 'current-user-123'
    }
  },
}));

// Mock DOMPurify
jest.mock('dompurify', () => ({
  sanitize: (input: string) => input
}));

const mockGetDoc = firebaseFirestore.getDoc as jest.MockedFunction<typeof firebaseFirestore.getDoc>;
const mockGetDocs = firebaseFirestore.getDocs as jest.MockedFunction<typeof firebaseFirestore.getDocs>;

describe('ViewProfileModal - Video Tab', () => {
  const mockUser = {
    uid: 'user-123',
    username: 'testuser',
    bio: 'Test bio',
    photos: {
      profile: 'https://example.com/profile.jpg'
    }
  };

  const mockVideos: Video[] = [
    {
      id: 'video-1',
      userId: 'user-123',
      title: 'User Video 1',
      description: 'First video by user',
      videoUrl: 'https://example.com/video1.mp4',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      isPublic: true,
      likes: ['user-2'],
      commentCount: 3,
      viewCount: 50,
      duration: 60,
      fileSize: 10 * 1024 * 1024,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    },
    {
      id: 'video-2',
      userId: 'user-123',
      title: 'User Video 2',
      description: 'Second video by user',
      videoUrl: 'https://example.com/video2.mp4',
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      isPublic: false,
      likes: [],
      commentCount: 1,
      viewCount: 25,
      duration: 45,
      fileSize: 8 * 1024 * 1024,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
  ];

  const mockUserProfileContext = {
    userProfile: null,
    updateUserProfile: jest.fn()
  };

  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    userId: 'user-123'
  };

  const renderWithContext = (props = defaultProps) => {
    return render(
      <UserProfileContext.Provider value={mockUserProfileContext}>
        <ViewProfileModal {...props} />
      </UserProfileContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock user profile fetch
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockUser
    } as any);

    // Mock videos fetch
    mockGetDocs.mockResolvedValue({
      forEach: (callback: any) => {
        mockVideos.forEach((video) => {
          callback({
            id: video.id,
            data: () => video
          });
        });
      }
    } as any);
  });

  it('should render profile modal with tabs', async () => {
    renderWithContext();
    
    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('Profile')).toBeInTheDocument();
      expect(screen.getByText('Photos')).toBeInTheDocument();
      expect(screen.getByText('Videos')).toBeInTheDocument();
    });
  });

  it('should switch to Videos tab when clicked', async () => {
    renderWithContext();
    
    await waitFor(() => {
      expect(screen.getByText('Videos')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByText('Videos'));
    
    await waitFor(() => {
      expect(screen.getByTestId('videos-tab-panel')).toBeInTheDocument();
    });
  });

  it('should load and display user videos in Videos tab', async () => {
    renderWithContext();
    
    // Switch to Videos tab
    await waitFor(() => {
      fireEvent.click(screen.getByText('Videos'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('user-video-video-1')).toBeInTheDocument();
      expect(screen.getByTestId('user-video-video-2')).toBeInTheDocument();
    });
  });

  it('should display video thumbnails with fallback images', async () => {
    renderWithContext();
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Videos'));
    });
    
    await waitFor(() => {
      const videoElements = screen.getAllByTestId(/^user-video-/);
      
      videoElements.forEach(videoElement => {
        // Check for video element with poster
        const video = videoElement.querySelector('video');
        expect(video).toHaveAttribute('poster');
        
        // Check for fallback image
        const img = videoElement.querySelector('img');
        expect(img).toBeInTheDocument();
        
        // Check for play icon overlay
        const playIcon = videoElement.querySelector('[data-testid*="play-icon"]');
        expect(playIcon).toBeInTheDocument();
      });
    });
  });

  it('should handle video thumbnail click to enlarge', async () => {
    renderWithContext();
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Videos'));
    });
    
    await waitFor(() => {
      const firstVideo = screen.getByTestId('user-video-video-1');
      fireEvent.click(firstVideo);
      
      expect(screen.getByTestId('enlarged-video-modal')).toBeInTheDocument();
      expect(screen.getByTestId('enlarged-video-player')).toBeInTheDocument();
    });
  });

  it('should close enlarged video modal', async () => {
    renderWithContext();
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Videos'));
    });
    
    await waitFor(() => {
      const firstVideo = screen.getByTestId('user-video-video-1');
      fireEvent.click(firstVideo);
    });
    
    const closeButton = screen.getByTestId('close-enlarged-video');
    fireEvent.click(closeButton);
    
    expect(screen.queryByTestId('enlarged-video-modal')).not.toBeInTheDocument();
  });

  it('should show loading state when videos are being fetched', async () => {
    // Mock slow video loading
    mockGetDocs.mockImplementation(() => new Promise(() => {}));
    
    renderWithContext();
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Videos'));
    });
    
    expect(screen.getByTestId('videos-loading')).toBeInTheDocument();
  });

  it('should show empty state when user has no videos', async () => {
    // Mock empty videos response
    mockGetDocs.mockResolvedValue({
      forEach: jest.fn()
    } as any);
    
    renderWithContext();
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Videos'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('no-videos-message')).toBeInTheDocument();
      expect(screen.getByText('No videos shared yet')).toBeInTheDocument();
    });
  });

  it('should handle video loading error', async () => {
    mockGetDocs.mockRejectedValue(new Error('Failed to load videos'));
    
    renderWithContext();
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Videos'));
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('videos-error')).toBeInTheDocument();
    });
  });

  it('should display video metadata in grid', async () => {
    renderWithContext();
    
    await waitFor(() => {
      fireEvent.click(screen.getByText('Videos'));
    });
    
    await waitFor(() => {
      expect(screen.getByText('User Video 1')).toBeInTheDocument();
      expect(screen.getByText('User Video 2')).toBeInTheDocument();
    });
  });

  describe('Mobile responsive behavior', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
    });

    it('should render mobile-optimized video grid', async () => {
      renderWithContext();
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Videos'));
      });
      
      await waitFor(() => {
        const videoElements = screen.getAllByTestId(/^user-video-/);
        
        videoElements.forEach(videoElement => {
          const video = videoElement.querySelector('video');
          expect(video).toHaveStyle({
            'object-fit': 'cover'
          });
        });
      });
    });

    it('should handle touch interactions on mobile', async () => {
      renderWithContext();
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Videos'));
      });
      
      await waitFor(() => {
        const firstVideo = screen.getByTestId('user-video-video-1');
        
        fireEvent.touchStart(firstVideo, {
          touches: [{ clientX: 100, clientY: 100 }]
        });
        
        fireEvent.touchEnd(firstVideo, {
          changedTouches: [{ clientX: 100, clientY: 100 }]
        });
        
        expect(screen.getByTestId('enlarged-video-modal')).toBeInTheDocument();
      });
    });

    it('should show mobile-optimized video thumbnails', async () => {
      renderWithContext();
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Videos'));
      });
      
      await waitFor(() => {
        const videoThumbnails = screen.getAllByTestId(/^user-video-/);
        
        videoThumbnails.forEach(thumbnail => {
          // Check that fallback image exists for mobile
          const img = thumbnail.querySelector('img');
          expect(img).toBeInTheDocument();
          expect(img).toHaveAttribute('src');
          
          // Check that video has proper mobile attributes
          const video = thumbnail.querySelector('video');
          expect(video).toHaveAttribute('poster');
          expect(video).toHaveAttribute('preload', 'metadata');
        });
      });
    });
  });

  describe('Video thumbnail fallback behavior', () => {
    it('should show fallback image when video poster fails', async () => {
      renderWithContext();
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Videos'));
      });
      
      await waitFor(() => {
        const videoThumbnails = screen.getAllByTestId(/^user-video-/);
        const firstThumbnail = videoThumbnails[0];
        
        // Simulate video error
        const video = firstThumbnail.querySelector('video');
        if (video) {
          fireEvent.error(video);
        }
        
        // Fallback image should still be visible
        const img = firstThumbnail.querySelector('img');
        expect(img).toBeInTheDocument();
      });
    });

    it('should hide fallback image when thumbnail fails to load', async () => {
      renderWithContext();
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Videos'));
      });
      
      await waitFor(() => {
        const videoThumbnails = screen.getAllByTestId(/^user-video-/);
        const firstThumbnail = videoThumbnails[0];
        
        // Simulate image error
        const img = firstThumbnail.querySelector('img');
        if (img) {
          fireEvent.error(img);
          expect(img).toHaveStyle({ display: 'none' });
        }
      });
    });

    it('should show play icon overlay on all video thumbnails', async () => {
      renderWithContext();
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Videos'));
      });
      
      await waitFor(() => {
        const playIcons = screen.getAllByText('▶');
        expect(playIcons.length).toBe(mockVideos.length);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for video thumbnails', async () => {
      renderWithContext();
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Videos'));
      });
      
      await waitFor(() => {
        const firstVideo = screen.getByTestId('user-video-video-1');
        expect(firstVideo).toHaveAttribute('role', 'button');
        expect(firstVideo).toHaveAttribute('aria-label', 
          expect.stringContaining('User Video 1')
        );
      });
    });

    it('should be keyboard navigable', async () => {
      renderWithContext();
      
      await waitFor(() => {
        fireEvent.click(screen.getByText('Videos'));
      });
      
      await waitFor(() => {
        const firstVideo = screen.getByTestId('user-video-video-1');
        
        fireEvent.keyDown(firstVideo, { key: 'Enter' });
        
        expect(screen.getByTestId('enlarged-video-modal')).toBeInTheDocument();
      });
    });
  });

  describe('Performance optimization', () => {
    it('should only load videos when Videos tab is selected', async () => {
      renderWithContext();
      
      // Should not load videos initially
      expect(mockGetDocs).toHaveBeenCalledTimes(1); // Only for connections, not videos
      
      // Load videos when tab is clicked
      await waitFor(() => {
        fireEvent.click(screen.getByText('Videos'));
      });
      
      expect(mockGetDocs).toHaveBeenCalledTimes(2); // Now includes videos
    });

    it('should not reload videos when switching between tabs', async () => {
      renderWithContext();
      
      // Switch to Videos tab
      await waitFor(() => {
        fireEvent.click(screen.getByText('Videos'));
      });
      
      const initialCallCount = mockGetDocs.mock.calls.length;
      
      // Switch to Profile tab
      fireEvent.click(screen.getByText('Profile'));
      
      // Switch back to Videos tab
      fireEvent.click(screen.getByText('Videos'));
      
      // Should not make additional calls
      expect(mockGetDocs).toHaveBeenCalledTimes(initialCallCount);
    });
  });
});
