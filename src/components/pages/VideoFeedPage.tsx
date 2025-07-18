import React, { useState, useEffect } from 'react';
import { VideoPlayer } from '../video/VideoPlayer';
import { VideoUploadModal } from '../modals/VideoUploadModal';
import { ShareVideoModal } from '../modals/ShareVideoModal';
import { useVideoUpload } from '../../hooks/useVideoUpload';
import { Video, VideoUploadData } from '../../types/Video';
import { collection, query, where, orderBy, limit, getDocs, startAfter, DocumentSnapshot } from 'firebase/firestore';
import { db, auth } from '../../environments/firebaseConfig';
import { IosShare } from '@mui/icons-material';

export const VideoFeedPage: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false); // Start paused for mobile compatibility
  
  // Pagination state
  const [lastDoc, setLastDoc] = useState<DocumentSnapshot | null>(null);
  const [hasMoreVideos, setHasMoreVideos] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  
  // Connection state for private videos
  const [connectedUserIds, setConnectedUserIds] = useState<string[]>([]);
  
  // Touch handling for swipe navigation
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  const { uploadVideo, isUploading, uploadProgress, processingStatus } = useVideoUpload();
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    loadConnectedUsers();
    loadVideos();
  }, []);

  // Load connected user IDs from connections
  const loadConnectedUsers = async () => {
    if (!userId) {
      setConnectedUserIds([]);
      return;
    }

    try {
      // Query connections where current user is in the users array
      const connectionsQuery = query(
        collection(db, 'connections'),
        where('users', 'array-contains', userId)
      );
      
      const connectionsSnapshot = await getDocs(connectionsQuery);
      const connectedIds = new Set<string>();
      
      connectionsSnapshot.forEach((doc) => {
        const connectionData = doc.data();
        // Add all users from this connection except the current user
        connectionData.users?.forEach((uid: string) => {
          if (uid !== userId) {
            connectedIds.add(uid);
          }
        });
      });
      
      setConnectedUserIds(Array.from(connectedIds));
    } catch (err) {
      console.error('Error loading connections:', err);
      setConnectedUserIds([]);
    }
  };

  // Prevent body scroll when component mounts
  useEffect(() => {
    document.body.classList.add('video-feed-active');
    return () => {
      document.body.classList.remove('video-feed-active');
    };
  }, []);

  // Reset currentVideoIndex to 0 whenever videos change and videos are not empty
  useEffect(() => {
    if (videos.length > 0) {
      setCurrentVideoIndex(0);
    }
  }, [videos.length]);

  const loadVideos = async (loadMore = false) => {
    try {
      if (loadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setError(null);
      }
      
      // Load only 3-5 videos at a time to minimize Firebase reads
      const BATCH_SIZE = 3;
      
      // For now, only load public videos to avoid permission issues
      // TODO: Implement separate queries for private videos from connections
      let videosQuery = query(
        collection(db, 'videos'),
        where('isPublic', '==', true),
        orderBy('createdAt', 'desc'),
        limit(BATCH_SIZE)
      );

      // For pagination, start after the last document
      if (loadMore && lastDoc) {
        videosQuery = query(
          collection(db, 'videos'),
          where('isPublic', '==', true),
          orderBy('createdAt', 'desc'),
          startAfter(lastDoc),
          limit(BATCH_SIZE)
        );
      }
      
      const querySnapshot = await getDocs(videosQuery);
      const loadedVideos: Video[] = [];
      let lastDocument: DocumentSnapshot | null = null;
      
      querySnapshot.forEach((doc) => {
        loadedVideos.push({
          id: doc.id,
          ...doc.data()
        } as Video);
        lastDocument = doc;
      });
      
      // Update state
      if (loadMore) {
        setVideos(prev => [...prev, ...loadedVideos]);
      } else {
        setVideos(loadedVideos);
      }
      
      setLastDoc(lastDocument);
      setHasMoreVideos(loadedVideos.length === BATCH_SIZE);
      
    } catch (err) {
      console.error('Error loading videos:', err);
      if (!loadMore) {
        setError('Failed to load videos');
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleVideoUpload = async (videoData: VideoUploadData) => {
    try {
      const uploadedVideo = await uploadVideo(videoData);
      // Add to beginning of videos list if it's public
      if (uploadedVideo.isPublic) {
        setVideos(prev => [uploadedVideo, ...prev]);
      }
      setIsUploadModalOpen(false);
    } catch (err) {
      console.error('Upload failed:', err);
      // Error is handled by the modal
    }
  };

  const handlePlayToggle = () => {
    console.log('VideoFeedPage: handlePlayToggle called, current isPlaying:', isPlaying);
    setIsPlaying(prev => {
      console.log('VideoFeedPage: Setting isPlaying from', prev, 'to', !prev);
      return !prev;
    });
  };

  const handleVideoEnd = () => {
    // Don't auto-play next video - require user interaction on mobile
    setIsPlaying(false);
  };

  const handleShare = async () => {
    if (!currentVideo) return;
    setIsShareModalOpen(true);
  };

  // Swipe gesture handling
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null); // otherwise the swipe is fired even with usual touch events
    setTouchStart(e.targetTouches[0].clientY);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientY);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isUpSwipe = distance > minSwipeDistance;
    const isDownSwipe = distance < -minSwipeDistance;

    if (isUpSwipe && currentVideoIndex < videos.length - 1) {
      // Swipe up - next video
      goToNextVideo();
    }
    if (isDownSwipe && currentVideoIndex > 0) {
      // Swipe down - previous video
      goToPreviousVideo();
    }
  };

  const goToNextVideo = () => {
    if (currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(prev => prev + 1);
      setIsPlaying(true); // Auto-play next video after swipe
    } else if (hasMoreVideos && !isLoadingMore) {
      // Load more videos when reaching the end
      loadVideos(true);
    }
  };

  const goToPreviousVideo = () => {
    if (currentVideoIndex > 0) {
      setCurrentVideoIndex(prev => prev - 1);
      setIsPlaying(true); // Auto-play previous video after swipe
    }
  };

  // Auto-load more videos when approaching the end
  useEffect(() => {
    const shouldLoadMore = currentVideoIndex >= videos.length - 2 && hasMoreVideos && !isLoadingMore;
    if (shouldLoadMore) {
      loadVideos(true);
    }
  }, [currentVideoIndex, videos.length, hasMoreVideos, isLoadingMore]);

  // Reload videos when connections change
  useEffect(() => {
    if (connectedUserIds.length >= 0) { // Trigger even when 0 connections
      loadVideos(false);
    }
  }, [connectedUserIds]);

  const currentVideo = videos[currentVideoIndex];

  if (isLoading) {
    return (
      <div className="video-feed-page" data-testid="video-feed-page">
        <div className="loading-state" data-testid="loading-state">
          Loading videos...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="video-feed-page" data-testid="video-feed-page">
        <div className="error-state" data-testid="error-state">
          <p>{error}</p>
          <button onClick={() => loadVideos(false)} data-testid="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="video-feed-page" data-testid="video-feed-page">
        <div className="empty-state" data-testid="empty-state">
          <h2>No videos yet</h2>
          <p>Be the first to share your travel memories!</p>
          {userId && (
            <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="upload-button"
              data-testid="upload-first-video-button"
            >
              Upload Video
            </button>
          )}
        </div>

        {userId && (
          <VideoUploadModal
            isOpen={isUploadModalOpen}
            onClose={() => setIsUploadModalOpen(false)}
            onUpload={handleVideoUpload}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            processingStatus={processingStatus}
          />
        )}
      </div>
    );
  }

  return (
    <div 
      className="video-feed-page" 
      data-testid="video-feed-page"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {videos.length > 0 && (
        <>
          <div className="video-container" data-testid="video-container">
            {currentVideo && (
              <VideoPlayer
                video={currentVideo}
                isPlaying={isPlaying}
                onPlayToggle={handlePlayToggle}
                onVideoEnd={handleVideoEnd}
                className="feed-video-player"
              />
            )}
            
            {/* Side controls with upload button above like */}
            <div className="video-controls" data-testid="video-controls">
              <div className="side-controls">
                {/* Upload button */}
                {userId && (
                  <button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="control-button upload-button"
                    data-testid="upload-button"
                    disabled={isUploading}
                  >
                    +
                  </button>
                )}
                {/* Like button */}
                <button className="control-button like-button" data-testid="like-button">
                  ❤️ {currentVideo?.likes?.length || 0}
                </button>
                {/* Comment button */}
                <button className="control-button comment-button" data-testid="comment-button">
                  💬 {currentVideo?.commentCount || 0}
                </button>
                {/* Share button */}
                <button 
                  className="control-button share-button" 
                  data-testid="share-button"
                  onClick={handleShare}
                >
                  <IosShare />
                </button>
              </div>
            </div>

            {/* Video counter */}
            <div className="video-counter" data-testid="video-counter">
              {currentVideoIndex + 1} of {videos.length}
            </div>

            {/* Video navigation indicators */}
            <div className="video-navigation-hint" data-testid="navigation-hint">
              {currentVideoIndex > 0 && (
                <div className="nav-hint nav-hint-up">↑ Swipe up for next</div>
              )}
              {currentVideoIndex < videos.length - 1 && (
                <div className="nav-hint nav-hint-down">↓ Swipe down for previous</div>
              )}
            </div>
          </div>
          {/* Remove navigation controls - no longer needed */}
        </>
      )}
      {/* Upload Modal */}
      {userId && (
        <VideoUploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          onUpload={handleVideoUpload}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          processingStatus={processingStatus}
        />
      )}

      {/* Share Modal */}
      {isShareModalOpen && currentVideo && (
        <ShareVideoModal
          open={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          video={currentVideo}
        />
      )}
    </div>
  );
};
