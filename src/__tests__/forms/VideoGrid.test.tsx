import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VideoGrid } from '../../components/forms/VideoGrid';
import { Video } from '../../types/Video';
import * as firebaseFirestore from 'firebase/firestore';
import * as firebaseStorage from 'firebase/storage';
import { useVideoUpload } from '../../hooks/useVideoUpload';

// Mock Firebase modules
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  getDocs: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({
      toDate: () => new Date('2023-01-01T00:00:00.000Z'),
      seconds: 1672531200,
      nanoseconds: 0
    })),
    fromDate: jest.fn((date) => ({
      toDate: () => date,
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: (date.getTime() % 1000) * 1000000
    }))
  }
}));

jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  deleteObject: jest.fn(),
}));

jest.mock('../../hooks/useVideoUpload');

// Mock all MUI components to avoid theme issues
jest.mock('@mui/material', () => ({
  Grid: ({ children, container, item, xs, spacing, px, ...props }: any) => {
    const className = `grid-${item ? 'item' : container ? 'container' : 'default'}${xs ? `-xs-${xs}` : ''}`;
    return <div className={className} data-testid={container ? 'grid-container' : item ? 'grid-item' : 'grid'} {...props}>{children}</div>;
  },
  Box: ({ children, sx, onClick, ...props }: any) => (
    <div onClick={onClick} data-testid="box" {...props}>{children}</div>
  ),
  CircularProgress: ({ size, ...props }: any) => (
    <div data-testid="circular-progress" {...props}>Loading...</div>
  ),
  Alert: ({ children, severity, ...props }: any) => (
    <div data-testid="alert" data-severity={severity} {...props}>{children}</div>
  ),
  Modal: ({ children, open, onClose, ...props }: any) => 
    open ? <div data-testid="modal" {...props}>{children}</div> : null,
  IconButton: ({ children, onClick, ...props }: any) => (
    <button data-testid="icon-button" onClick={onClick} {...props}>{children}</button>
  ),
  Dialog: ({ children, open, onClose, ...props }: any) => 
    open ? <div data-testid="dialog" {...props}>{children}</div> : null,
  DialogTitle: ({ children, ...props }: any) => (
    <div data-testid="dialog-title" {...props}>{children}</div>
  ),
  DialogContent: ({ children, ...props }: any) => (
    <div data-testid="dialog-content" {...props}>{children}</div>
  ),
  DialogContentText: ({ children, ...props }: any) => (
    <div data-testid="dialog-content-text" {...props}>{children}</div>
  ),
  DialogActions: ({ children, ...props }: any) => (
    <div data-testid="dialog-actions" {...props}>{children}</div>
  ),
  Button: ({ children, onClick, disabled, startIcon, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="button" {...props}>
      {startIcon && <span data-testid="button-start-icon">{startIcon}</span>}
      {children}
    </button>
  ),
  Menu: ({ children, anchorEl, open, onClose, ...props }: any) => 
    open ? <div data-testid="menu" {...props}>{children}</div> : null,
  MenuItem: ({ children, onClick, disabled, ...props }: any) => (
    <div onClick={onClick} data-testid="menu-item" data-disabled={disabled} {...props}>{children}</div>
  ),
}));

jest.mock('@mui/icons-material/Close', () => 
  ({ ...props }: any) => <span data-testid="close-icon" {...props}>✕</span>
);

jest.mock('@mui/icons-material/Delete', () => 
  ({ ...props }: any) => <span data-testid="delete-icon" {...props}>🗑</span>
);

jest.mock('@mui/icons-material/PlayArrow', () => 
  ({ ...props }: any) => <span data-testid="play-arrow-icon" {...props}>▶</span>
);

jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn()
}));

jest.mock('../../Context/UserProfileContext', () => ({
  UserProfileContext: {}
}));

jest.mock('../../environments/firebaseConfig', () => ({
  db: {},
  storage: {},
  auth: {
    currentUser: {
      uid: 'test-user-123'
    }
  },
}));

// Mock VideoUploadModal
jest.mock('../../components/modals/VideoUploadModal', () => ({
  VideoUploadModal: ({ isOpen, onClose, onUpload }: any) => 
    isOpen ? (
      <div data-testid="video-upload-modal">
        <button onClick={onClose} data-testid="close-modal">Close</button>
        <button 
          onClick={() => onUpload({ 
            title: 'Test Video', 
            description: 'Test Description',
            isPublic: true, 
            file: new File([''], 'test.mp4') 
          })} 
          data-testid="upload-video">
          Upload
        </button>
      </div>
    ) : null
}));

const mockGetDocs = firebaseFirestore.getDocs as jest.MockedFunction<typeof firebaseFirestore.getDocs>;
const mockDeleteDoc = firebaseFirestore.deleteDoc as jest.MockedFunction<typeof firebaseFirestore.deleteDoc>;
const mockDeleteObject = firebaseStorage.deleteObject as jest.MockedFunction<typeof firebaseStorage.deleteObject>;
const mockUseVideoUpload = useVideoUpload as jest.MockedFunction<typeof useVideoUpload>;

// Get the mocked useContext function
const mockUseContext = require('react').useContext as jest.MockedFunction<any>;

describe('VideoGrid', () => {
  const mockUploadVideo = jest.fn();
  
  // Access mocked Timestamp
  const { Timestamp } = firebaseFirestore as any;
  
  // Helper function to render VideoGrid (no theme provider needed with mocked components)
  const renderVideoGrid = () => {
    return render(<VideoGrid />);
  };
  
  const mockVideos: Video[] = [
    {
      id: 'video-1',
      userId: 'test-user-123',
      title: 'Test Video 1',
      description: 'First test video',
      videoUrl: 'https://example.com/video1.mp4',
      thumbnailUrl: 'https://example.com/thumb1.jpg',
      isPublic: true,
      likes: [],
      commentCount: 0,
      viewCount: 10,
      duration: 30,
      fileSize: 1024 * 1024,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    },
    {
      id: 'video-2',
      userId: 'test-user-123',
      title: 'Test Video 2',
      description: 'Second test video',
      videoUrl: 'https://example.com/video2.mp4',
      thumbnailUrl: 'https://example.com/thumb2.jpg',
      isPublic: false,
      likes: ['user-1'],
      commentCount: 3,
      viewCount: 25,
      duration: 45,
      fileSize: 2 * 1024 * 1024,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock useContext to return our UserProfile context value
    mockUseContext.mockReturnValue({
      userProfile: {
        uid: 'test-user-123',
        username: 'testuser',
        email: 'test@example.com'
      },
      setUserProfile: jest.fn(),
      updateUserProfile: jest.fn()
    });
    
    // Mock useVideoUpload hook
    mockUseVideoUpload.mockReturnValue({
      uploadVideo: mockUploadVideo,
      isUploading: false,
      uploadProgress: 0,
      processingStatus: null,
      error: null
    });
    
    // Mock successful video loading
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

  it('should render video grid with add video button', async () => {
    renderVideoGrid();
    
    // Should show loading initially
    expect(screen.queryByTestId('add-video-button')).toBeInTheDocument();
    
    // Wait for videos to load
    await waitFor(() => {
      expect(screen.getByTestId('add-video-button')).toBeInTheDocument();
    });
  });

  it('should load and display user videos', async () => {
    renderVideoGrid();
    
    await waitFor(() => {
      // Should display video thumbnails
      expect(screen.getAllByTestId(/^video-thumbnail-/)).toHaveLength(2);
      expect(screen.getByTestId('video-thumbnail-video-1')).toBeInTheDocument();
      expect(screen.getByTestId('video-thumbnail-video-2')).toBeInTheDocument();
    });
  });

  it('should render video thumbnails with fallback images', async () => {
    renderVideoGrid();
    
    await waitFor(() => {
      const videoThumbnails = screen.getAllByTestId(/^video-thumbnail-/);
      videoThumbnails.forEach(thumbnail => {
        // Check for video element with poster
        const videoElement = thumbnail.querySelector('video');
        expect(videoElement).toHaveAttribute('poster');
        
        // Check for fallback image
        const imgElement = thumbnail.querySelector('img');
        expect(imgElement).toBeInTheDocument();
        
        // Check for play icon overlay
        const playIcon = thumbnail.querySelector('[data-testid*="play-icon"]');
        expect(playIcon).toBeInTheDocument();
      });
    });
  });

  it('should open upload modal when add video button is clicked', async () => {
    renderVideoGrid();
    
    await waitFor(() => {
      expect(screen.getByTestId('add-video-button')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByTestId('add-video-button'));
    
    expect(screen.getByTestId('video-upload-modal')).toBeInTheDocument();
  });

  it('should handle video upload successfully', async () => {
    const newVideo: Video = {
      id: 'new-video',
      userId: 'test-user-123',
      title: 'New Video',
      description: 'New Description',
      videoUrl: 'https://example.com/new.mp4',
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
    
    renderVideoGrid();
    
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('add-video-button'));
    });
    
    fireEvent.click(screen.getByTestId('upload-video'));
    
    await waitFor(() => {
      expect(mockUploadVideo).toHaveBeenCalledWith({
        title: 'Test Video',
        description: 'Test Description',
        isPublic: true,
        file: expect.any(File)
      });
    });
  });

  it('should open context menu on video long press/right click', async () => {
    renderVideoGrid();
    
    await waitFor(() => {
      const firstVideo = screen.getByTestId('video-thumbnail-video-1');
      fireEvent.contextMenu(firstVideo);
      
      expect(screen.getByTestId('video-context-menu')).toBeInTheDocument();
      expect(screen.getByTestId('delete-video-option')).toBeInTheDocument();
    });
  });

  it('should handle video deletion', async () => {
    mockDeleteDoc.mockResolvedValue(undefined);
    mockDeleteObject.mockResolvedValue(undefined);
    
    renderVideoGrid();
    
    await waitFor(() => {
      const firstVideo = screen.getByTestId('video-thumbnail-video-1');
      fireEvent.contextMenu(firstVideo);
    });
    
    fireEvent.click(screen.getByTestId('delete-video-option'));
    
    // Confirm deletion in dialog
    await waitFor(() => {
      expect(screen.getByTestId('delete-confirmation-dialog')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByTestId('confirm-delete-button'));
    
    await waitFor(() => {
      expect(mockDeleteDoc).toHaveBeenCalled();
      expect(mockDeleteObject).toHaveBeenCalledTimes(2); // video + thumbnail
    });
  });

  it('should enlarge video when thumbnail is clicked', async () => {
    renderVideoGrid();
    
    await waitFor(() => {
      const firstVideo = screen.getByTestId('video-thumbnail-video-1');
      fireEvent.click(firstVideo);
      
      expect(screen.getByTestId('enlarged-video-modal')).toBeInTheDocument();
      expect(screen.getByTestId('enlarged-video-player')).toBeInTheDocument();
    });
  });

  it('should handle empty video state', async () => {
    mockGetDocs.mockResolvedValue({
      forEach: jest.fn()
    } as any);
    
    renderVideoGrid();
    
    await waitFor(() => {
      expect(screen.getByTestId('add-video-button')).toBeInTheDocument();
      expect(screen.queryByTestId(/^video-thumbnail-/)).not.toBeInTheDocument();
    });
  });

  it('should handle loading error', async () => {
    mockGetDocs.mockRejectedValue(new Error('Failed to load videos'));
    
    renderVideoGrid();
    
    await waitFor(() => {
      expect(screen.getByTestId('video-grid-error')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load videos/)).toBeInTheDocument();
    });
  });

  it('should disable interactions during upload', () => {
    mockUseVideoUpload.mockReturnValue({
      uploadVideo: mockUploadVideo,
      isUploading: true,
      uploadProgress: 50,
      processingStatus: 'uploading',
      error: null
    });
    
    renderVideoGrid();
    
    expect(screen.getByTestId('add-video-button')).toBeDisabled();
  });

  it('should show upload progress when uploading', () => {
    mockUseVideoUpload.mockReturnValue({
      uploadVideo: mockUploadVideo,
      isUploading: true,
      uploadProgress: 75,
      processingStatus: 'processing',
      error: null
    });
    
    renderVideoGrid();
    
    expect(screen.getByTestId('upload-progress-indicator')).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  // Mobile-specific tests
  describe('Mobile behavior', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      // Mock touch events
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        configurable: true,
        value: true,
      });
    });

    it('should handle touch interactions on mobile', async () => {
      renderVideoGrid();
      
      await waitFor(() => {
        const firstVideo = screen.getByTestId('video-thumbnail-video-1');
        
        // Simulate touch events
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
      renderVideoGrid();
      
      await waitFor(() => {
        const videoThumbnails = screen.getAllByTestId(/^video-thumbnail-/);
        videoThumbnails.forEach(thumbnail => {
          const videoElement = thumbnail.querySelector('video');
          expect(videoElement).toHaveStyle({
            'object-fit': 'cover'
          });
        });
      });
    });
  });
});
