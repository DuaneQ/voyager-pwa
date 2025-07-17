import React, { useState, useContext, useEffect } from "react";
import { Menu, MenuItem, Grid, CircularProgress, Alert, Modal, Box, IconButton, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { UserProfileContext } from "../../Context/UserProfileContext";
import { Video, VideoUploadData } from "../../types/Video";
import { collection, query, where, orderBy, limit, getDocs, deleteDoc, doc } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import { db, storage, auth } from "../../environments/firebaseConfig";
import { useVideoUpload } from "../../hooks/useVideoUpload";
import { VideoUploadModal } from "../modals/VideoUploadModal";

const VIDEO_SIZE = 120; // px

export const VideoGrid = () => {
  const { uploadVideo, isUploading } = useVideoUpload();
  const { userProfile } = useContext(UserProfileContext);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enlargedVideo, setEnlargedVideo] = useState<Video | null>(null);
  const [userVideos, setUserVideos] = useState<Video[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [videoToDelete, setVideoToDelete] = useState<Video | null>(null);
  const [deletingVideo, setDeletingVideo] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  const currentUserId = auth.currentUser?.uid;

  // Load user's videos
  const loadUserVideos = async () => {
    if (!currentUserId) return;
    
    setLoadingVideos(true);
    try {
      const videosQuery = query(
        collection(db, 'videos'),
        where('userId', '==', currentUserId),
        orderBy('createdAt', 'desc'),
        limit(50) // Increased limit for more videos
      );
      
      const videosSnapshot = await getDocs(videosQuery);
      const videos: Video[] = [];
      
      videosSnapshot.forEach((doc) => {
        videos.push({
          id: doc.id,
          ...doc.data()
        } as Video);
      });
      
      setUserVideos(videos);
    } catch (error) {
      console.error('Error loading user videos:', error);
      setUserVideos([]);
      setError('Error loading videos');
    } finally {
      setLoadingVideos(false);
    }
  };

  // Load videos on component mount
  useEffect(() => {
    loadUserVideos();
  }, [currentUserId]);

  function handleUploadVideo() {
    setUploadModalOpen(true);
    setMenuAnchor(null);
  }

  const handleVideoUpload = async (videoData: VideoUploadData) => {
    setError(null);
    try {
      await uploadVideo(videoData);
      await loadUserVideos(); // Refresh the video list
      setUploadModalOpen(false);
    } catch (error) {
      setError("Error uploading video.");
      console.error("Error uploading video:", error);
    }
  };

  const handleVideoClick = (event: React.MouseEvent<HTMLElement>, video: Video) => {
    if (!loadingVideos) {
      setSelectedVideo(video);
      setMenuAnchor(event.currentTarget);
    }
  };

  const handlePlayVideo = (video: Video) => {
    setEnlargedVideo(video);
    setMenuAnchor(null);
  };

  const handleCloseVideoModal = () => {
    setEnlargedVideo(null);
  };

  const handleDeleteClick = (video: Video) => {
    setVideoToDelete(video);
    setDeleteDialogOpen(true);
    setMenuAnchor(null);
  };

  const handleDeleteVideo = async () => {
    if (!videoToDelete || !currentUserId) return;

    setDeletingVideo(true);
    try {
      // Delete video file from Storage
      const videoRef = ref(storage, videoToDelete.videoUrl);
      await deleteObject(videoRef);

      // Delete thumbnail from Storage
      const thumbnailRef = ref(storage, videoToDelete.thumbnailUrl);
      await deleteObject(thumbnailRef);

      // Delete video document from Firestore
      await deleteDoc(doc(db, 'videos', videoToDelete.id));

      // Refresh video list
      await loadUserVideos();
    } catch (error) {
      console.error('Error deleting video:', error);
      setError('Error deleting video');
    } finally {
      setDeletingVideo(false);
      setDeleteDialogOpen(false);
      setVideoToDelete(null);
    }
  };

  return (
    <>
      <Grid container spacing={2} px={1}>
        {/* Upload Button - Always show first */}
        <Grid item xs={6} display="flex" justifyContent="center">
          <Box
            data-testid="add-video-button"
            sx={{
              width: VIDEO_SIZE,
              height: VIDEO_SIZE,
              position: 'relative',
              borderRadius: 2,
              overflow: 'hidden',
              backgroundColor: '#f5f5f5',
              cursor: loadingVideos ? "not-allowed" : "pointer",
              opacity: loadingVideos ? 0.5 : 1,
              boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px dashed #ccc',
              '&:hover': {
                backgroundColor: '#eeeeee',
                borderColor: '#999',
              }
            }}
            onClick={handleUploadVideo}
          >
            <Box sx={{ textAlign: 'center', color: '#666' }}>
              <PlayArrowIcon sx={{ fontSize: '2rem', mb: 1 }} />
              <Box sx={{ fontSize: '0.75rem' }}>Add Video</Box>
            </Box>
          </Box>
        </Grid>

        {/* Dynamic Video Grid - Render all user videos */}
        {userVideos.map((video, index) => (
          <Grid item xs={6} key={video.id} display="flex" justifyContent="center">
            <Box
              sx={{
                width: VIDEO_SIZE,
                height: VIDEO_SIZE,
                position: 'relative',
                borderRadius: 2,
                overflow: 'hidden',
                backgroundColor: '#000',
                cursor: loadingVideos ? "not-allowed" : "pointer",
                opacity: loadingVideos ? 0.5 : 1,
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onClick={(event) => handleVideoClick(event, video)}
            >
              {/* Fallback thumbnail image for mobile */}
              <img
                src={video.thumbnailUrl}
                alt={video.title || 'Video thumbnail'}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  zIndex: 1,
                }}
                onError={(e) => {
                  // Hide image if thumbnail fails to load
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <video
                src={video.videoUrl}
                poster={video.thumbnailUrl}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  zIndex: 2,
                  '--poster-url': `url(${video.thumbnailUrl})`,
                } as React.CSSProperties}
                muted
                preload="metadata"
                onLoadedMetadata={(e) => {
                  // Ensure thumbnail shows on mobile
                  const video = e.target as HTMLVideoElement;
                  video.currentTime = 0.1;
                }}
                onError={() => {
                  // Video failed to load, rely on fallback image
                }}
              />
              {/* Play icon overlay */}
              <Box
                sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 3,
                  color: 'white',
                  fontSize: '1.5rem',
                  opacity: 0.8,
                  pointerEvents: 'none',
                  textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                }}
              >
                ▶
              </Box>
              <PlayArrowIcon
                sx={{
                  position: 'absolute',
                  color: 'white',
                  fontSize: '2rem',
                  textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                }}
              />
            </Box>
          </Grid>
        ))}
      </Grid>
      
      {loadingVideos && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
      
      {error && <Alert severity="error" sx={{ mt: 2, mb: 1 }}>{error}</Alert>}
      
      {/* VideoUploadModal */}
      <VideoUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onUpload={handleVideoUpload}
      />
      
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
        autoFocus={false}
      >
        {isUploading ? (
          <MenuItem disabled>
            <CircularProgress size={24} />
          </MenuItem>
        ) : selectedVideo ? [
          <MenuItem key="play" onClick={() => handlePlayVideo(selectedVideo)}>Play Video</MenuItem>,
          <MenuItem key="delete" onClick={() => handleDeleteClick(selectedVideo)}>Delete Video</MenuItem>,
          <MenuItem key="cancel" onClick={() => setMenuAnchor(null)}>Cancel</MenuItem>,
        ] : [
          <MenuItem key="cancel" onClick={() => setMenuAnchor(null)}>Cancel</MenuItem>,
        ]}
      </Menu>

      {/* Video Player Modal */}
      <Modal
        open={Boolean(enlargedVideo)}
        onClose={handleCloseVideoModal}
        aria-labelledby="video-player-modal"
        aria-describedby="modal-to-play-video"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "black",
            boxShadow: 24,
            borderRadius: 2,
            maxWidth: "90vw",
            maxHeight: "90vh",
            outline: "none",
          }}
        >
          <IconButton
            onClick={handleCloseVideoModal}
            sx={{ 
              position: "absolute", 
              top: 8, 
              right: 8, 
              color: 'white',
              backgroundColor: 'rgba(0,0,0,0.5)',
              zIndex: 1,
              '&:hover': {
                backgroundColor: 'rgba(0,0,0,0.7)',
              }
            }}
          >
            <CloseIcon />
          </IconButton>
          {enlargedVideo && (
            <video
              src={enlargedVideo.videoUrl}
              controls
              autoPlay
              style={{
                maxWidth: "90vw",
                maxHeight: "90vh",
                borderRadius: 8,
              }}
            />
          )}
        </Box>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deletingVideo && setDeleteDialogOpen(false)}
        aria-labelledby="delete-video-dialog-title"
      >
        <DialogTitle id="delete-video-dialog-title">
          Delete Video?
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this video? This action cannot be undone.
            {videoToDelete?.title && (
              <>
                <br />
                <strong>"{videoToDelete.title}"</strong>
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteDialogOpen(false)} 
            disabled={deletingVideo}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteVideo}
            color="error"
            variant="contained"
            disabled={deletingVideo}
            startIcon={deletingVideo ? <CircularProgress size={20} /> : <DeleteIcon />}
          >
            {deletingVideo ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
