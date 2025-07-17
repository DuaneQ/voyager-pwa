import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VideoPlayer } from '../video/VideoPlayer';
import { ShareVideoModal } from '../modals/ShareVideoModal';
import { Video } from '../../types/Video';
import { doc, getDoc, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../../environments/firebaseConfig';
import { updatePageMetaTags } from '../../utils/videoSharing';

export const VideoPage: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false); // Don't autoplay on individual video pages
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const viewTrackedRef = useRef(false); // Prevent double-counting views

  useEffect(() => {
    if (!videoId) {
      setError('No video ID provided');
      setLoading(false);
      return;
    }

    loadVideo();
  }, [videoId]);

  const loadVideo = async () => {
    try {
      setLoading(true);
      setError(null);

      const videoDoc = await getDoc(doc(db, 'videos', videoId!));
      
      if (!videoDoc.exists()) {
        setError('Video not found');
        return;
      }

      const videoData = {
        id: videoDoc.id,
        ...videoDoc.data()
      } as Video;

      setVideo(videoData);
      
      // Update meta tags for social sharing
      updatePageMetaTags(videoData);
      
      // Track video view (only once per component mount)
      if (!viewTrackedRef.current) {
        await trackVideoView(videoData.id);
        viewTrackedRef.current = true;
      }
      
    } catch (err) {
      console.error('Error loading video:', err);
      setError('Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const trackVideoView = async (videoId: string) => {
    try {
      const videoRef = doc(db, 'videos', videoId);
      await updateDoc(videoRef, {
        viewCount: increment(1)
      });
    } catch (err) {
      console.error('Error tracking video view:', err);
      // Don't show error to user for analytics tracking failure
    }
  };

  const handleLikeVideo = async () => {
    if (!video || !auth.currentUser) return;

    try {
      const videoRef = doc(db, 'videos', video.id);
      const currentUserId = auth.currentUser.uid;
      const isLiked = video.likes?.includes(currentUserId);

      if (isLiked) {
        // Unlike the video
        await updateDoc(videoRef, {
          likes: arrayRemove(currentUserId)
        });
        setVideo(prev => prev ? {
          ...prev,
          likes: prev.likes?.filter(id => id !== currentUserId) || []
        } : null);
      } else {
        // Like the video
        await updateDoc(videoRef, {
          likes: arrayUnion(currentUserId)
        });
        setVideo(prev => prev ? {
          ...prev,
          likes: [...(prev.likes || []), currentUserId]
        } : null);
      }
    } catch (err) {
      console.error('Error updating like:', err);
    }
  };

  const handlePlayToggle = () => {
    setIsPlaying(prev => !prev);
  };

  const handleGoBack = () => {
    navigate(-1); // Go back in browser history
  };

  const handleViewAllVideos = () => {
    navigate('/Videos');
  };

  if (loading) {
    return (
      <div className="video-page loading" data-testid="video-page">
        <div className="loading-spinner" data-testid="loading-spinner">Loading video...</div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="video-page error" data-testid="video-page-error">
        <div className="error-message" data-testid="error-message">
          <h2>{error === 'Video not found' ? 'Video Not Found' : 'Error'}</h2>
          <p>{error}</p>
          {error === 'Failed to load video' ? (
            <button 
              onClick={loadVideo} 
              className="retry-button"
              data-testid="retry-button"
            >
              Retry
            </button>
          ) : (
            <button 
              onClick={handleGoBack} 
              className="back-button"
              data-testid="go-back-button"
            >
              Back to Videos
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="video-page" data-testid="video-page">
      <div className="video-page-header" data-testid="video-page-header">
        <button 
          onClick={handleGoBack} 
          className="back-button" 
          aria-label="Back to videos"
          data-testid="back-button"
        >
          ← Back
        </button>
        <h1>{video.title || 'Video'}</h1>
      </div>
      
      <div className="video-page-container">
        <VideoPlayer
          video={video}
          isPlaying={isPlaying}
          onPlayToggle={handlePlayToggle}
          className="individual-video-player"
          showInfoOverlay={false}
        />
        
        <div className="video-page-info" data-testid="video-page-info">
          {video.title && (
            <h2 className="video-title">{video.title}</h2>
          )}
          {video.description && (
            <p className="video-description">{video.description}</p>
          )}
          
          <div className="video-stats" data-testid="video-stats">
            <span>👁️ {video.viewCount || 0} views</span>
            <span>❤️ {video.likes?.length || 0} likes</span>
            <span>💬 {video.commentCount || 0} comments</span>
          </div>
          
          <div className="video-actions">
            <button 
              className="action-button like-button"
              data-testid="like-button"
              onClick={handleLikeVideo}
            >
              ❤️ Like
            </button>
            
            <button 
              className="action-button share-button"
              data-testid="share-button"
              onClick={() => setIsShareModalOpen(true)}
            >
              Share Video
            </button>
            
            <button 
              className="action-button view-all-button"
              data-testid="view-all-button"
              onClick={handleViewAllVideos}
            >
              View All Videos
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {isShareModalOpen && video && (
        <ShareVideoModal
          open={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          video={video}
        />
      )}
    </div>
  );
};
