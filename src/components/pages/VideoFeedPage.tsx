import React, { useState, useEffect } from 'react';
import { VideoPlayer } from '../video/VideoPlayer';
import { VideoUploadModal } from '../modals/VideoUploadModal';
import { ShareVideoModal } from '../modals/ShareVideoModal';
import { VideoCommentsModal } from '../modals/VideoCommentsModal';
import { useVideoUpload } from '../../hooks/useVideoUpload';
import { Video, VideoUploadData } from '../../types/Video';
import { collection, query, where, orderBy, limit, getDocs, startAfter, DocumentSnapshot, doc, updateDoc, arrayUnion, arrayRemove, Query, DocumentData } from 'firebase/firestore';
import { db, auth } from '../../environments/firebaseConfig';
import { IosShare } from '@mui/icons-material';

type VideoFilter = 'all' | 'liked' | 'mine';

export const VideoFeedPage: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false); // Start paused for mobile compatibility
  const [currentFilter, setCurrentFilter] = useState<VideoFilter>('all');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'up' | 'down' | null>(null);
  
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
    // First load connections; videos will be loaded once connectedUserIds updates
    loadConnectedUsers();
  }, [currentFilter]);

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
      
      let videosQuery: Query<DocumentData> | null = null;
      
      if (currentFilter === 'all') {
        // All Videos: public videos + private videos from connections
        // First get public videos
        videosQuery = query(
          collection(db, 'videos'),
          where('isPublic', '==', true),
          orderBy('createdAt', 'desc'),
          limit(BATCH_SIZE)
        );

        if (loadMore && lastDoc) {
          videosQuery = query(
            collection(db, 'videos'),
            where('isPublic', '==', true),
            orderBy('createdAt', 'desc'),
            startAfter(lastDoc),
            limit(BATCH_SIZE)
          );
        }
      } else if (currentFilter === 'liked') {
        // Liked Videos: videos where current user ID is in likes array
        if (!userId) {
          setVideos([]);
          setIsLoading(false);
          setIsLoadingMore(false);
          return;
        }
        
        videosQuery = query(
          collection(db, 'videos'),
          where('likes', 'array-contains', userId),
          orderBy('createdAt', 'desc'),
          limit(BATCH_SIZE)
        );

        if (loadMore && lastDoc) {
          videosQuery = query(
            collection(db, 'videos'),
            where('likes', 'array-contains', userId),
            orderBy('createdAt', 'desc'),
            startAfter(lastDoc),
            limit(BATCH_SIZE)
          );
        }
      } else if (currentFilter === 'mine') {
        // My Videos: videos uploaded by current user
        if (!userId) {
          setVideos([]);
          setIsLoading(false);
          setIsLoadingMore(false);
          return;
        }
        
        videosQuery = query(
          collection(db, 'videos'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(BATCH_SIZE)
        );

        if (loadMore && lastDoc) {
          videosQuery = query(
            collection(db, 'videos'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc'),
            startAfter(lastDoc),
            limit(BATCH_SIZE)
          );
        }
      }
      
      if (!videosQuery) {
        // This shouldn't happen, but handle it gracefully
        setVideos([]);
        setIsLoading(false);
        setIsLoadingMore(false);
        return;
      }
      
      const querySnapshot = await getDocs(videosQuery);
      let loadedVideos: Video[] = [];
      let lastDocument: DocumentSnapshot | null = null;
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        loadedVideos.push({
          id: doc.id,
          ...data
        } as Video);
        lastDocument = doc as DocumentSnapshot;
      });

      // For "all" filter, also load private videos from connections
      if (currentFilter === 'all' && !loadMore && connectedUserIds.length > 0) {
        try {
          // Load private videos from connected users
          const privateQuery = query(
            collection(db, 'videos'),
            where('isPublic', '==', false),
            where('userId', 'in', connectedUserIds.slice(0, 10)), // Firestore 'in' limit is 10
            orderBy('createdAt', 'desc'),
            limit(BATCH_SIZE)
          );
          
          const privateSnapshot = await getDocs(privateQuery);
          const privateVideos: Video[] = [];
          
          privateSnapshot.forEach((doc) => {
            const data = doc.data();
            privateVideos.push({
              id: doc.id,
              ...data
            } as Video);
          });
          
          // Merge and sort by creation date
          loadedVideos = [...loadedVideos, ...privateVideos]
            .sort((a, b) => b.createdAt.seconds - a.createdAt.seconds)
            .slice(0, BATCH_SIZE);
        } catch (privateErr) {
          console.warn('Could not load private videos from connections:', privateErr);
        }
      }
      
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

  const handleFilterChange = (filter: VideoFilter) => {
    setCurrentFilter(filter);
    setCurrentVideoIndex(0);
    setLastDoc(null);
    setHasMoreVideos(true);
  };

  const handlePlayToggle = () => {
    setIsPlaying(prev => {
  // toggling playback state
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

  const handleComments = () => {
    if (!currentVideo) return;
    setIsCommentsModalOpen(true);
  };

  const handleCommentAdded = () => {
    // The comment count will be automatically updated when the video data is refreshed
    // since we're now using the comments array length
    // No need for manual increment since comments are part of the video document
  };

  const handleLike = async () => {
    if (!currentVideo || !auth.currentUser) return;

    try {
      const videoRef = doc(db, 'videos', currentVideo.id);
      const currentUserId = auth.currentUser.uid;
      const isLiked = currentVideo.likes?.includes(currentUserId);

      if (isLiked) {
        // Unlike the video
        await updateDoc(videoRef, {
          likes: arrayRemove(currentUserId)
        });
        
        // Update local state
        setVideos(prev => prev.map(video => 
          video.id === currentVideo.id 
            ? { ...video, likes: video.likes?.filter(id => id !== currentUserId) || [] }
            : video
        ));
      } else {
        // Like the video
        await updateDoc(videoRef, {
          likes: arrayUnion(currentUserId)
        });
        
        // Update local state
        setVideos(prev => prev.map(video => 
          video.id === currentVideo.id 
            ? { ...video, likes: [...(video.likes || []), currentUserId] }
            : video
        ));
      }
    } catch (err) {
      console.error('Error updating like:', err);
      // Could show a toast notification here in the future
    }
  };

  // Swipe gesture handling with improved responsiveness
  const minSwipeDistance = 30; // Reduced from 50 for more responsive swiping

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
    if (currentVideoIndex < videos.length - 1 && !isTransitioning) {
      setIsTransitioning(true);
      setTransitionDirection('up');
      
      // Start transition
      setTimeout(() => {
        setCurrentVideoIndex(prev => prev + 1);
        setIsPlaying(true); // Auto-play next video after swipe
        
        // End transition
        setTimeout(() => {
          setIsTransitioning(false);
          setTransitionDirection(null);
        }, 100);
      }, 150);
    } else if (hasMoreVideos && !isLoadingMore && !isTransitioning) {
      // Load more videos when reaching the end
      loadVideos(true);
    }
  };

  const goToPreviousVideo = () => {
    if (currentVideoIndex > 0 && !isTransitioning) {
      setIsTransitioning(true);
      setTransitionDirection('down');
      
      // Start transition
      setTimeout(() => {
        setCurrentVideoIndex(prev => prev - 1);
        setIsPlaying(true); // Auto-play previous video after swipe
        
        // End transition
        setTimeout(() => {
          setIsTransitioning(false);
          setTransitionDirection(null);
        }, 100);
      }, 150);
    }
  };

  // Auto-load more videos when approaching the end
  useEffect(() => {
    const shouldLoadMore = currentVideoIndex >= videos.length - 2 && hasMoreVideos && !isLoadingMore;
    if (shouldLoadMore) {
      loadVideos(true);
    }
  }, [currentVideoIndex, videos.length, hasMoreVideos, isLoadingMore]);

  // Load videos when connections or filter change. This ensures we sequence
  // the connections query first (which updates connectedUserIds) and then
  // load videos once connectedUserIds is available.
  useEffect(() => {
    loadVideos(false);
  }, [connectedUserIds, currentFilter]);

  const getEmptyStateMessage = () => {
    switch (currentFilter) {
      case 'liked':
        return {
          title: 'No liked videos yet',
          subtitle: 'Videos you like will appear here!'
        };
      case 'mine':
        return {
          title: 'No videos uploaded yet',
          subtitle: 'Upload your first travel video to get started!'
        };
      default:
        return {
          title: 'No videos yet',
          subtitle: 'Be the first to share your travel memories!'
        };
    }
  };

  const currentVideo = videos[currentVideoIndex];

  if (isLoading) {
    return (
      <div className="video-feed-page" data-testid="video-feed-page">
        {/* Filter Toggle Buttons */}
        <div className="filter-toggles" data-testid="filter-toggles">
          <button
            className={`filter-toggle ${currentFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
            data-testid="filter-all"
          >
            All
          </button>
          <button
            className={`filter-toggle ${currentFilter === 'liked' ? 'active' : ''}`}
            onClick={() => handleFilterChange('liked')}
            data-testid="filter-liked"
            disabled={!userId}
          >
            Liked
          </button>
          <button
            className={`filter-toggle ${currentFilter === 'mine' ? 'active' : ''}`}
            onClick={() => handleFilterChange('mine')}
            data-testid="filter-mine"
            disabled={!userId}
          >
            My Videos
          </button>
        </div>
        
        <div className="loading-state" data-testid="loading-state">
          Loading videos...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="video-feed-page" data-testid="video-feed-page">
        {/* Filter Toggle Buttons */}
        <div className="filter-toggles" data-testid="filter-toggles">
          <button
            className={`filter-toggle ${currentFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
            data-testid="filter-all"
          >
            All
          </button>
          <button
            className={`filter-toggle ${currentFilter === 'liked' ? 'active' : ''}`}
            onClick={() => handleFilterChange('liked')}
            data-testid="filter-liked"
            disabled={!userId}
          >
            Liked
          </button>
          <button
            className={`filter-toggle ${currentFilter === 'mine' ? 'active' : ''}`}
            onClick={() => handleFilterChange('mine')}
            data-testid="filter-mine"
            disabled={!userId}
          >
            My Videos
          </button>
        </div>
        
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
    const emptyMessage = getEmptyStateMessage();
    
    return (
      <div className="video-feed-page" data-testid="video-feed-page">
        {/* Filter Toggle Buttons */}
        <div className="filter-toggles" data-testid="filter-toggles">
          <button
            className={`filter-toggle ${currentFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
            data-testid="filter-all"
          >
            All
          </button>
          <button
            className={`filter-toggle ${currentFilter === 'liked' ? 'active' : ''}`}
            onClick={() => handleFilterChange('liked')}
            data-testid="filter-liked"
            disabled={!userId}
          >
            Liked
          </button>
          <button
            className={`filter-toggle ${currentFilter === 'mine' ? 'active' : ''}`}
            onClick={() => handleFilterChange('mine')}
            data-testid="filter-mine"
            disabled={!userId}
          >
            My Videos
          </button>
        </div>
        
        <div className="empty-state" data-testid="empty-state">
          <h2>{emptyMessage.title}</h2>
          <p>{emptyMessage.subtitle}</p>
          {(userId && currentFilter !== 'liked') && (
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
      {/* Filter Toggle Buttons */}
      <div className="filter-toggles" data-testid="filter-toggles">
        <button
          className={`filter-toggle ${currentFilter === 'all' ? 'active' : ''}`}
          onClick={() => handleFilterChange('all')}
          data-testid="filter-all"
        >
          All
        </button>
        <button
          className={`filter-toggle ${currentFilter === 'liked' ? 'active' : ''}`}
          onClick={() => handleFilterChange('liked')}
          data-testid="filter-liked"
          disabled={!userId}
        >
          Liked
        </button>
        <button
          className={`filter-toggle ${currentFilter === 'mine' ? 'active' : ''}`}
          onClick={() => handleFilterChange('mine')}
          data-testid="filter-mine"
          disabled={!userId}
        >
          My Videos
        </button>
      </div>
      
      {videos.length > 0 && (
        <>
          <div 
            className={`video-container ${isTransitioning ? `transitioning-${transitionDirection}` : ''}`} 
            data-testid="video-container"
          >
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
                <button 
                  className={`control-button like-button ${currentVideo?.likes?.includes(auth.currentUser?.uid || '') ? 'liked' : ''}`}
                  data-testid="like-button"
                  onClick={handleLike}
                  disabled={!auth.currentUser}
                >
                  ❤️ {currentVideo?.likes?.length || 0}
                </button>
                {/* Comment button */}
                <button 
                  className="control-button comment-button" 
                  data-testid="comment-button"
                  onClick={handleComments}
                >
                  💬 {currentVideo?.comments?.length || 0}
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

      {/* Comments Modal */}
      {isCommentsModalOpen && currentVideo && (
        <VideoCommentsModal
          open={isCommentsModalOpen}
          onClose={() => setIsCommentsModalOpen(false)}
          video={currentVideo}
          onCommentAdded={handleCommentAdded}
        />
      )}
    </div>
  );
};
