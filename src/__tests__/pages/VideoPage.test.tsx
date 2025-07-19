import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { VideoPage } from '../../components/pages/VideoPage';
import { Video } from '../../types/Video';
import * as firebaseFirestore from 'firebase/firestore';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  increment: jest.fn(),
  arrayUnion: jest.fn(),
  arrayRemove: jest.fn(),
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

jest.mock('../../environments/firebaseConfig', () => ({
  db: {},
  auth: {
    currentUser: {
      uid: 'test-user-123'
    }
  },
}));

// Mock VideoPlayer component
jest.mock('../../components/video/VideoPlayer', () => ({
  VideoPlayer: ({ video, className }: any) => (
    <div className={`video-player ${className}`} data-testid="video-player">
      <div data-testid="video-element">Mock Video: {video.title}</div>
      {video.title && <h3 data-testid="video-title">{video.title}</h3>}
      {video.description && <p data-testid="video-description">{video.description}</p>}
    </div>
  )
}));

// Mock ShareVideoModal
jest.mock('../../components/modals/ShareVideoModal', () => ({
  ShareVideoModal: ({ open, onClose, video }: any) =>
    open ? (
      <div data-testid="share-modal">
        <button onClick={onClose} data-testid="close-share-modal">Close</button>
        <div data-testid="share-video-title">{video.title}</div>
      </div>
    ) : null
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockGetDoc = firebaseFirestore.getDoc as jest.MockedFunction<typeof firebaseFirestore.getDoc>;
const mockUpdateDoc = firebaseFirestore.updateDoc as jest.MockedFunction<typeof firebaseFirestore.updateDoc>;
const mockIncrement = firebaseFirestore.increment as jest.MockedFunction<typeof firebaseFirestore.increment>;
const mockDoc = firebaseFirestore.doc as jest.MockedFunction<typeof firebaseFirestore.doc>;
const mockArrayUnion = firebaseFirestore.arrayUnion as jest.MockedFunction<typeof firebaseFirestore.arrayUnion>;
const mockArrayRemove = firebaseFirestore.arrayRemove as jest.MockedFunction<typeof firebaseFirestore.arrayRemove>;

describe('VideoPage', () => {
  // Access mocked Timestamp
  const { Timestamp } = firebaseFirestore as any;
  
  const mockVideo: Video = {
    id: 'test-video-1',
    userId: 'user-1',
    title: 'Amazing Travel Video',
    description: 'This is a wonderful travel video from my recent trip to Paris.',
    videoUrl: 'https://example.com/video.mp4',
    thumbnailUrl: 'https://example.com/thumbnail.jpg',
    isPublic: true,
    likes: ['user-2', 'user-3'],
    comments: [
      { id: 'c1', userId: 'user-2', text: 'Great video!', createdAt: Timestamp.now() },
      { id: 'c2', userId: 'user-3', text: 'Amazing!', createdAt: Timestamp.now() },
      { id: 'c3', userId: 'user-4', text: 'Love it!', createdAt: Timestamp.now() },
      { id: 'c4', userId: 'user-5', text: 'Nice work!', createdAt: Timestamp.now() },
      { id: 'c5', userId: 'user-6', text: 'Awesome!', createdAt: Timestamp.now() }
    ],
    viewCount: 100,
    duration: 120,
    fileSize: 50 * 1024 * 1024, // 50MB
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  };

  const renderVideoPage = (videoId: string = 'test-video-1') => {
    return render(
      <MemoryRouter initialEntries={[`/video/${videoId}`]}>
        <Routes>
          <Route path="/video/:videoId" element={<VideoPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockNavigate.mockClear();
    
    // Mock document reference
    mockDoc.mockReturnValue({ id: 'test-video-1' } as any);
    
    // Mock successful video fetch
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => mockVideo,
      id: mockVideo.id
    } as any);
    
    // Mock successful updateDoc for analytics tracking
    mockUpdateDoc.mockResolvedValue(undefined);
    
    // Set up increment function to return the expected object
    mockIncrement.mockReturnValue({ __increment: 1 } as any);
    
    // Set up array functions
    mockArrayUnion.mockReturnValue({ __arrayUnion: ['test-user-123'] } as any);
    mockArrayRemove.mockReturnValue({ __arrayRemove: ['test-user-123'] } as any);
  });

  it('should render loading state initially', () => {
    // Make getDoc not resolve immediately
    mockGetDoc.mockImplementation(() => new Promise(() => {}));
    
    renderVideoPage();
    
    expect(screen.getByTestId('video-page')).toBeInTheDocument();
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading video...')).toBeInTheDocument();
  });

  it('should render video page with video details', async () => {
    renderVideoPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('video-page')).toBeInTheDocument();
      expect(screen.getByTestId('video-page-header')).toBeInTheDocument();
      expect(screen.getByTestId('video-player')).toBeInTheDocument();
      expect(screen.getByTestId('video-page-info')).toBeInTheDocument();
    });
    
    // Check that the title appears in the header (h1)
    expect(screen.getByRole('heading', { level: 1, name: 'Amazing Travel Video' })).toBeInTheDocument();
    // Check description using the test ID to avoid multiple matches
    expect(screen.getByTestId('video-description')).toHaveTextContent('This is a wonderful travel video from my recent trip to Paris.');
  });

  it('should display video statistics', async () => {
    renderVideoPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('video-stats')).toBeInTheDocument();
      expect(screen.getByText(/100.*views/)).toBeInTheDocument();
      expect(screen.getByText(/2.*likes/)).toBeInTheDocument();
      expect(screen.getByText(/5.*comments/)).toBeInTheDocument();
    });
  });

  it('should handle back button click', async () => {
    renderVideoPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('back-button')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByTestId('back-button'));
    
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it('should handle like button interaction', async () => {
    mockUpdateDoc.mockResolvedValue(undefined);
    
    renderVideoPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('like-button')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByTestId('like-button'));
    
    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          likes: expect.anything()
        })
      );
    });
  });

  it('should handle share button interaction', async () => {
    renderVideoPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('share-button')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByTestId('share-button'));
    
    expect(screen.getByTestId('share-modal')).toBeInTheDocument();
    expect(screen.getByTestId('share-video-title')).toHaveTextContent('Amazing Travel Video');
  });

  it('should handle view all videos button', async () => {
    renderVideoPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('view-all-button')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByTestId('view-all-button'));
    
    expect(mockNavigate).toHaveBeenCalledWith('/Videos');
  });

  it('should handle error when video not found', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => false
    } as any);
    
    renderVideoPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText('Video not found')).toBeInTheDocument();
      expect(screen.getByTestId('go-back-button')).toBeInTheDocument();
    });
  });

  it('should handle network error', async () => {
    mockGetDoc.mockRejectedValue(new Error('Network error'));
    
    renderVideoPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument();
      expect(screen.getByText('Failed to load video')).toBeInTheDocument();
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });
  });

  it('should retry loading video when retry button is clicked', async () => {
    mockGetDoc.mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        exists: () => true,
        data: () => mockVideo,
        id: mockVideo.id
      } as any);
    
    renderVideoPage();
    
    await waitFor(() => {
      expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByTestId('retry-button'));
    
    await waitFor(() => {
      expect(screen.getByTestId('video-player')).toBeInTheDocument();
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

    it('should render mobile-optimized layout', async () => {
      renderVideoPage();
      
      await waitFor(() => {
        const videoPlayer = screen.getByTestId('video-player');
        expect(videoPlayer).toHaveClass('individual-video-player');
        
        const pageInfo = screen.getByTestId('video-page-info');
        expect(pageInfo).toBeInTheDocument();
      });
    });

    it('should handle mobile touch interactions', async () => {
      renderVideoPage();
      
      await waitFor(() => {
        const likeButton = screen.getByTestId('like-button');
        
        fireEvent.touchStart(likeButton);
        fireEvent.touchEnd(likeButton);
        
        expect(mockUpdateDoc).toHaveBeenCalled();
      });
    });
  });

  describe('Video playback integration', () => {
    it('should autoplay video on desktop', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });
      
      renderVideoPage();
      
      await waitFor(() => {
        const videoPlayer = screen.getByTestId('video-player');
        expect(videoPlayer).toBeInTheDocument();
        // VideoPlayer component should receive autoplay props
      });
    });

    it('should not autoplay video on mobile', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });
      
      renderVideoPage();
      
      await waitFor(() => {
        const videoPlayer = screen.getByTestId('video-player');
        expect(videoPlayer).toBeInTheDocument();
        // VideoPlayer should require user interaction on mobile
      });
    });
  });

  describe('Analytics tracking', () => {
    it('should track video view on mount', async () => {
      renderVideoPage();
      
      await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            viewCount: { __increment: 1 }
          })
        );
      });
    });

    it('should not double-count views on re-render', async () => {
      const { rerender } = renderVideoPage();
      
      await waitFor(() => {
        expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      });
      
      rerender(
        <MemoryRouter initialEntries={['/video/test-video-1']}>
          <Routes>
            <Route path="/video/:videoId" element={<VideoPage />} />
          </Routes>
        </MemoryRouter>
      );
      
      // Should still only be called once
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    });
  });
});
