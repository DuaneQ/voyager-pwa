import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Divider,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  AccountCircle as AccountCircleIcon
} from '@mui/icons-material';
import { doc, getDoc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db, auth } from '../../environments/firebaseConfig';
import { Video, VideoComment } from '../../types/Video';
import DOMPurify from 'dompurify';

interface VideoCommentsModalProps {
  open: boolean;
  onClose: () => void;
  video: Video;
  onCommentAdded?: () => void; // Callback to refresh video data
}

interface CommentWithUser extends VideoComment {
  username?: string;
  profilePhotoURL?: string;
}

const modalStyle = {
  position: 'absolute' as 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: { xs: '90%', sm: '500px' },
  maxHeight: '80vh',
  bgcolor: 'background.paper',
  borderRadius: 2,
  boxShadow: 24,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
};

export const VideoCommentsModal: React.FC<VideoCommentsModalProps> = ({
  open,
  onClose,
  video,
  onCommentAdded
}) => {
  const [comments, setComments] = useState<CommentWithUser[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentUser = auth.currentUser;
  const maxCommentLength = 300;

  // Load comments when modal opens
  useEffect(() => {
    if (open && video.id) {
      loadComments();
    }
  }, [open, video.id, video.comments]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadComments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Comments are already in the video object, we just need to enrich them with user data
      const commentsWithUsers: CommentWithUser[] = await Promise.all(
        (video.comments || []).map(async (comment) => {
          try {
            const userDoc = await getDoc(doc(db, 'users', comment.userId));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              return {
                ...comment,
                username: userData.username || 'Unknown User',
                profilePhotoURL: userData.profilePhotoURL || null
              };
            }
          } catch (error) {
            console.error('Error loading user data for comment:', error);
          }
          
          return {
            ...comment,
            username: 'Unknown User',
            profilePhotoURL: null
          };
        })
      );

      setComments(commentsWithUsers);
    } catch (error) {
      console.error('Error loading comments:', error);
      setError('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentUser) {
      setError('You must be logged in to comment');
      return;
    }

    if (!newComment.trim()) {
      return;
    }

    if (newComment.length > maxCommentLength) {
      setError(`Comment is too long. Maximum ${maxCommentLength} characters.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Sanitize comment text
      const sanitizedComment = DOMPurify.sanitize(newComment.trim());
      
      // Create new comment object
      const newCommentData: VideoComment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: currentUser.uid,
        text: sanitizedComment,
        createdAt: Timestamp.now()
      };

      console.log('Attempting to add comment:', newCommentData);
      console.log('Current user:', { uid: currentUser.uid, email: currentUser.email });
      console.log('Video ID:', video.id);

      // Update the video document by adding the comment to the comments array
      const videoRef = doc(db, 'videos', video.id);
      await updateDoc(videoRef, {
        comments: arrayUnion(newCommentData),
        updatedAt: Timestamp.now()
      });
      
      console.log('Comment added successfully to Firebase');
      
      // Add comment to local state immediately (optimistic update)
      const newCommentWithUser: CommentWithUser = {
        ...newCommentData,
        username: currentUser.displayName || 'You',
        profilePhotoURL: currentUser.photoURL ?? undefined
      };

      setComments(prev => [newCommentWithUser, ...prev]);
      setNewComment('');
      
      // Notify parent component to refresh video data
      onCommentAdded?.();
      
    } catch (error) {
      console.error('Error adding comment:', error);
      console.error('Error details:', {
        code: (error as any)?.code,
        message: (error as any)?.message,
        customData: (error as any)?.customData
      });
      setError('Failed to add comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTimeAgo = (timestamp: Timestamp): string => {
    const now = Date.now();
    const commentTime = timestamp.toMillis();
    const diffInSeconds = Math.floor((now - commentTime) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const handleClose = () => {
    setNewComment('');
    setError(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} data-testid="video-comments-modal">
      <Box sx={modalStyle}>
        {/* Header */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0
        }}>
          <Typography variant="h6" component="h2">
            Comments ({video.comments?.length || 0})
          </Typography>
          <IconButton onClick={handleClose} size="small" data-testid="close-comments">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Comments List */}
        <Box sx={{ 
          flex: 1, 
          overflow: 'auto',
          p: 1
        }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          ) : error ? (
            <Alert severity="error" sx={{ m: 2 }}>
              {error}
            </Alert>
          ) : comments.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 3 }}>
              <Typography color="text.secondary">
                No comments yet. Be the first to comment!
              </Typography>
            </Box>
          ) : (
            <List dense>
              {comments.map((comment, index) => (
                <React.Fragment key={comment.id}>
                  <ListItem alignItems="flex-start" data-testid={`comment-${comment.id}`}>
                    <ListItemAvatar>
                      {comment.profilePhotoURL ? (
                        <Avatar 
                          src={comment.profilePhotoURL} 
                          alt={comment.username}
                          sx={{ width: 32, height: 32 }}
                        />
                      ) : (
                        <Avatar sx={{ width: 32, height: 32 }}>
                          <AccountCircleIcon />
                        </Avatar>
                      )}
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2" component="span">
                            {comment.username}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {formatTimeAgo(comment.createdAt)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" component="p" sx={{ mt: 0.5 }}>
                          {comment.text}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {index < comments.length - 1 && <Divider variant="inset" component="li" />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Comment Input */}
        {currentUser && (
          <Box sx={{ 
            p: 2, 
            borderTop: '1px solid',
            borderColor: 'divider',
            flexShrink: 0
          }}>
            <form onSubmit={handleSubmitComment}>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  disabled={submitting}
                  multiline
                  maxRows={3}
                  inputProps={{ 
                    maxLength: maxCommentLength,
                    'data-testid': 'comment-input'
                  }}
                  helperText={`${newComment.length}/${maxCommentLength}`}
                />
                <Button
                  type="submit"
                  variant="contained"
                  size="small"
                  disabled={!newComment.trim() || submitting || newComment.length > maxCommentLength}
                  sx={{ minWidth: 'auto', px: 2 }}
                  data-testid="submit-comment"
                >
                  {submitting ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <SendIcon fontSize="small" />
                  )}
                </Button>
              </Box>
            </form>
          </Box>
        )}

        {!currentUser && (
          <Box sx={{ 
            p: 2, 
            borderTop: '1px solid',
            borderColor: 'divider',
            textAlign: 'center'
          }}>
            <Typography color="text.secondary">
              Log in to leave a comment
            </Typography>
          </Box>
        )}
      </Box>
    </Modal>
  );
};
