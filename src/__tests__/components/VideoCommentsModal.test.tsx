import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoCommentsModal } from '../../components/modals/VideoCommentsModal';
import { Video } from '../../types/Video';
import { Timestamp } from 'firebase/firestore';

// Mock Firebase
jest.mock('../../environments/firebaseConfig', () => ({
  db: {},
  auth: {
    currentUser: {
      uid: 'test-user-id',
      displayName: 'Test User',
      photoURL: 'https://example.com/photo.jpg'
    }
  }
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
  updateDoc: jest.fn(),
  arrayUnion: jest.fn(),
  Timestamp: {
    now: () => ({ toMillis: () => Date.now(), seconds: Math.floor(Date.now() / 1000) }),
    fromDate: (date: Date) => ({ toMillis: () => date.getTime(), seconds: Math.floor(date.getTime() / 1000) })
  }
}));

// Mock DOMPurify
jest.mock('dompurify', () => ({
  sanitize: jest.fn((input) => input)
}));

const mockVideo: Video = {
  id: 'test-video-id',
  userId: 'video-owner-id',
  title: 'Test Video',
  description: 'Test Description',
  videoUrl: 'https://example.com/video.mp4',
  thumbnailUrl: 'https://example.com/thumb.jpg',
  isPublic: true,
  likes: [],
  comments: [
    { id: 'comment-1', userId: 'user-1', text: 'Great video!', createdAt: Timestamp.now() },
    { id: 'comment-2', userId: 'user-2', text: 'Nice work!', createdAt: Timestamp.now() }
  ],
  viewCount: 10,
  duration: 30,
  fileSize: 1024,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now()
};

const mockComments = [
  {
    id: 'comment-1',
    videoId: 'test-video-id',
    userId: 'user-1',
    text: 'Great video!',
    createdAt: Timestamp.fromDate(new Date(Date.now() - 3600000)), // 1 hour ago
    username: 'User One',
    profilePhotoURL: 'https://example.com/user1.jpg'
  },
  {
    id: 'comment-2',
    videoId: 'test-video-id',
    userId: 'user-2',
    text: 'Amazing content, thanks for sharing!',
    createdAt: Timestamp.fromDate(new Date(Date.now() - 7200000)), // 2 hours ago
    username: 'User Two',
    profilePhotoURL: null
  }
];

describe('VideoCommentsModal', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    video: mockVideo,
    onCommentAdded: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Firestore queries
    const { getDocs, getDoc } = require('firebase/firestore');
    
    getDocs.mockResolvedValue({
      forEach: (callback: any) => {
        mockComments.forEach((comment, index) => {
          callback({
            id: comment.id,
            data: () => ({
              videoId: comment.videoId,
              userId: comment.userId,
              text: comment.text,
              createdAt: comment.createdAt
            })
          });
        });
      }
    });
    
    getDoc.mockImplementation((docRef: any) => {
      const userId = docRef.path?.split('/')[1];
      const user = mockComments.find(c => c.userId === userId);
      return Promise.resolve({
        exists: () => !!user,
        data: () => user ? {
          username: user.username,
          profilePhotoURL: user.profilePhotoURL
        } : null
      });
    });
  });

  it('renders the modal when open', () => {
    render(<VideoCommentsModal {...defaultProps} />);
    
    expect(screen.getByTestId('video-comments-modal')).toBeInTheDocument();
    expect(screen.getByText('Comments (2)')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<VideoCommentsModal {...defaultProps} open={false} />);
    
    expect(screen.queryByTestId('video-comments-modal')).not.toBeInTheDocument();
  });

  it('displays the close button and calls onClose when clicked', async () => {
    const user = userEvent.setup();
    render(<VideoCommentsModal {...defaultProps} />);
    
    const closeButton = screen.getByTestId('close-comments');
    await user.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('loads and displays comments when opened', async () => {
    render(<VideoCommentsModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('comment-comment-1')).toBeInTheDocument();
      expect(screen.getByTestId('comment-comment-2')).toBeInTheDocument();
    });
    
    // Check comment content
    expect(screen.getByText('Great video!')).toBeInTheDocument();
    expect(screen.getByText('Amazing content, thanks for sharing!')).toBeInTheDocument();
    expect(screen.getByText('User One')).toBeInTheDocument();
    expect(screen.getByText('User Two')).toBeInTheDocument();
  });

  it('shows relative timestamps for comments', async () => {
    render(<VideoCommentsModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('1h ago')).toBeInTheDocument();
      expect(screen.getByText('2h ago')).toBeInTheDocument();
    });
  });

  it('displays comment input for logged-in users', () => {
    render(<VideoCommentsModal {...defaultProps} />);
    
    expect(screen.getByTestId('comment-input')).toBeInTheDocument();
    expect(screen.getByTestId('submit-comment')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Add a comment...')).toBeInTheDocument();
  });

  it('allows users to type and submit comments', async () => {
    const user = userEvent.setup();
    const { addDoc } = require('firebase/firestore');
    
    addDoc.mockResolvedValue({ id: 'new-comment-id' });
    
    render(<VideoCommentsModal {...defaultProps} />);
    
    const commentInput = screen.getByTestId('comment-input');
    const submitButton = screen.getByTestId('submit-comment');
    
    // Type a comment
    await user.type(commentInput, 'This is a test comment');
    expect(commentInput).toHaveValue('This is a test comment');
    
    // Submit the comment
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          videoId: 'test-video-id',
          userId: 'test-user-id',
          text: 'This is a test comment'
        })
      );
    });
    
    expect(defaultProps.onCommentAdded).toHaveBeenCalledTimes(1);
  });

  it('shows character count for comment input', async () => {
    const user = userEvent.setup();
    render(<VideoCommentsModal {...defaultProps} />);
    
    const commentInput = screen.getByTestId('comment-input');
    await user.type(commentInput, 'Test');
    
    expect(screen.getByText('4/300')).toBeInTheDocument();
  });

  it('disables submit button for empty comments', () => {
    render(<VideoCommentsModal {...defaultProps} />);
    
    const submitButton = screen.getByTestId('submit-comment');
    expect(submitButton).toBeDisabled();
  });

  it('disables submit button when comment exceeds max length', async () => {
    const user = userEvent.setup();
    render(<VideoCommentsModal {...defaultProps} />);
    
    const commentInput = screen.getByTestId('comment-input');
    const longComment = 'a'.repeat(301); // Exceeds 300 character limit
    
    await user.type(commentInput, longComment);
    
    const submitButton = screen.getByTestId('submit-comment');
    expect(submitButton).toBeDisabled();
  });

  it('shows loading state while submitting comment', async () => {
    const user = userEvent.setup();
    const { addDoc } = require('firebase/firestore');
    
    // Make addDoc hang to test loading state
    let resolveAddDoc: (value: any) => void;
    addDoc.mockReturnValue(new Promise(resolve => { resolveAddDoc = resolve; }));
    
    render(<VideoCommentsModal {...defaultProps} />);
    
    const commentInput = screen.getByTestId('comment-input');
    const submitButton = screen.getByTestId('submit-comment');
    
    await user.type(commentInput, 'Test comment');
    await user.click(submitButton);
    
    // Should show loading spinner
    expect(within(submitButton).getByRole('progressbar')).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
    
    // Resolve the promise
    resolveAddDoc!({ id: 'new-comment-id' });
  });

  it('shows message when no comments exist', async () => {
    const { getDocs } = require('firebase/firestore');
    getDocs.mockResolvedValue({
      forEach: () => {} // Empty comments
    });
    
    render(<VideoCommentsModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('No comments yet. Be the first to comment!')).toBeInTheDocument();
    });
  });

  it('shows login message for non-logged-in users', () => {
    const { auth } = require('../../environments/firebaseConfig');
    auth.currentUser = null;
    
    render(<VideoCommentsModal {...defaultProps} />);
    
    expect(screen.getByText('Log in to leave a comment')).toBeInTheDocument();
    expect(screen.queryByTestId('comment-input')).not.toBeInTheDocument();
  });

  it('handles errors gracefully when loading comments fails', async () => {
    const { getDocs } = require('firebase/firestore');
    getDocs.mockRejectedValue(new Error('Failed to load comments'));
    
    render(<VideoCommentsModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load comments')).toBeInTheDocument();
    });
  });

  it('handles errors gracefully when submitting comment fails', async () => {
    const user = userEvent.setup();
    const { addDoc } = require('firebase/firestore');
    
    addDoc.mockRejectedValue(new Error('Failed to add comment'));
    
    render(<VideoCommentsModal {...defaultProps} />);
    
    const commentInput = screen.getByTestId('comment-input');
    const submitButton = screen.getByTestId('submit-comment');
    
    await user.type(commentInput, 'Test comment');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to add comment. Please try again.')).toBeInTheDocument();
    });
  });

  it('sanitizes comment text before submission', async () => {
    const user = userEvent.setup();
    const { addDoc } = require('firebase/firestore');
    const DOMPurify = require('dompurify');
    
    addDoc.mockResolvedValue({ id: 'new-comment-id' });
    DOMPurify.sanitize.mockReturnValue('sanitized comment');
    
    render(<VideoCommentsModal {...defaultProps} />);
    
    const commentInput = screen.getByTestId('comment-input');
    const submitButton = screen.getByTestId('submit-comment');
    
    await user.type(commentInput, '<script>alert("xss")</script>Test comment');
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(DOMPurify.sanitize).toHaveBeenCalledWith('<script>alert("xss")</script>Test comment');
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          text: 'sanitized comment'
        })
      );
    });
  });

  it('clears comment input after successful submission', async () => {
    const user = userEvent.setup();
    const { addDoc } = require('firebase/firestore');
    
    addDoc.mockResolvedValue({ id: 'new-comment-id' });
    
    render(<VideoCommentsModal {...defaultProps} />);
    
    const commentInput = screen.getByTestId('comment-input');
    const submitButton = screen.getByTestId('submit-comment');
    
    await user.type(commentInput, 'Test comment');
    expect(commentInput).toHaveValue('Test comment');
    
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(commentInput).toHaveValue('');
    });
  });
});
