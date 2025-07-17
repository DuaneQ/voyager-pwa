import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { VideoPlayer } from '../video/VideoPlayer';
import { ShareVideoModal } from '../modals/ShareVideoModal';
import { Video } from '../../types/Video';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../environments/firebaseConfig';
import { updatePageMetaTags } from '../../utils/videoSharing';

export const VideoPage: React.FC = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false); // Don't autoplay on individual video pages
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

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
      
    } catch (err) {
      console.error('Error loading video:', err);
      setError('Failed to load video');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayToggle = () => {
    setIsPlaying(prev => !prev);
  };

  const handleGoBack = () => {
    navigate('/Videos');
  };

  if (loading) {
    return (
      <div className="video-page loading" data-testid="video-page-loading">
        <div className="loading-spinner">Loading video...</div>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div className="video-page error" data-testid="video-page-error">
        <div className="error-message">
          <h2>Video Not Found</h2>
          <p>{error}</p>
          <button onClick={handleGoBack} className="back-button">
            Back to Videos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="video-page" data-testid="video-page">
      <div className="video-page-header">
        <button onClick={handleGoBack} className="back-button" aria-label="Back to videos">
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
        />
        
        <div className="video-page-info">
          {video.title && (
            <h2 className="video-title">{video.title}</h2>
          )}
          {video.description && (
            <p className="video-description">{video.description}</p>
          )}
          
          <div className="video-stats">
            <span>👁️ {video.viewCount || 0} views</span>
            <span>❤️ {video.likes?.length || 0} likes</span>
            <span>💬 {video.commentCount || 0} comments</span>
          </div>
          
          <div className="video-actions">
            <button 
              className="action-button share-button"
              onClick={() => setIsShareModalOpen(true)}
            >
              Share Video
            </button>
            
            <button 
              className="action-button view-all-button"
              onClick={handleGoBack}
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
