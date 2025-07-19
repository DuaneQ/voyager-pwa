import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
    now: () => ({ 
      toMillis: () => Date.now(), 
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0
    }),
    fromDate: (date: Date) => ({ 
      toMillis: () => date.getTime(), 
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0
    })
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
    { 
      id: 'comment-1', 
      userId: 'user-1', 
      text: 'Great video!', 
      createdAt: { 
        toMillis: () => Date.now() - 3600000,
        seconds: Math.floor((Date.now() - 3600000) / 1000),
        nanoseconds: 0
      } as any
    },
    { 
      id: 'comment-2', 
      userId: 'user-2', 
      text: 'Nice work!', 
      createdAt: { 
        toMillis: () => Date.now() - 7200000,
        seconds: Math.floor((Date.now() - 7200000) / 1000),
        nanoseconds: 0
      } as any
    }
  ],
  viewCount: 10,
  duration: 30,
  fileSize: 1024,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now()
};

describe('VideoCommentsModal', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    video: mockVideo,
    onCommentAdded: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset auth mock to ensure currentUser is available
    const { auth } = require('../../environments/firebaseConfig');
    auth.currentUser = {
      uid: 'test-user-id',
      displayName: 'Test User',
      photoURL: 'https://example.com/photo.jpg'
    };
    
    // Mock getDoc for user data
    const { getDoc } = require('firebase/firestore');
    getDoc.mockImplementation((docRef: any) => {
      const userId = docRef.path?.includes('user-1') ? 'user-1' : 
                    docRef.path?.includes('user-2') ? 'user-2' : 'unknown';
      
      const userData = {
        'user-1': { username: 'User One', profilePhotoURL: 'https://example.com/user1.jpg' },
        'user-2': { username: 'User Two', profilePhotoURL: null }
      };
      
      return Promise.resolve({
        exists: () => userData[userId as keyof typeof userData] !== undefined,
        data: () => userData[userId as keyof typeof userData] || null
      });
    });
  });

  it('renders modal with comments', async () => {
    render(<VideoCommentsModal {...defaultProps} />);
    
    expect(screen.getByTestId('video-comments-modal')).toBeInTheDocument();
    expect(screen.getByText('Comments (2)')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByTestId('comment-comment-1')).toBeInTheDocument();
      expect(screen.getByTestId('comment-comment-2')).toBeInTheDocument();
      expect(screen.getByText('Great video!')).toBeInTheDocument();
      expect(screen.getByText('Nice work!')).toBeInTheDocument();
    });
  });

  it('renders empty state when no comments', async () => {
    const videoWithoutComments = { ...mockVideo, comments: [] };
    render(<VideoCommentsModal {...defaultProps} video={videoWithoutComments} />);
    
    expect(screen.getByText('Comments (0)')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('No comments yet. Be the first to comment!')).toBeInTheDocument();
    });
  });

  it('shows login message when user is not authenticated', () => {
    // Temporarily mock no user
    const { auth } = require('../../environments/firebaseConfig');
    const originalUser = auth.currentUser;
    auth.currentUser = null;
    
    render(<VideoCommentsModal {...defaultProps} />);
    
    expect(screen.getByText('Log in to leave a comment')).toBeInTheDocument();
    
    // Restore original user
    auth.currentUser = originalUser;
  });

  it('allows user to submit a comment', async () => {
    const { updateDoc, arrayUnion } = require('firebase/firestore');
    updateDoc.mockResolvedValue({});
    arrayUnion.mockReturnValue('mocked-array-union');
    
    render(<VideoCommentsModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('comment-input')).toBeInTheDocument();
    });
    
    const input = screen.getByTestId('comment-input');
    const submitButton = screen.getByTestId('submit-comment');
    
    fireEvent.change(input, { target: { value: 'New test comment' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(updateDoc).toHaveBeenCalled();
      expect(arrayUnion).toHaveBeenCalled();
      expect(defaultProps.onCommentAdded).toHaveBeenCalled();
    });
  });

  it('handles comment submission error', async () => {
    const { updateDoc } = require('firebase/firestore');
    updateDoc.mockRejectedValue(new Error('Network error'));
    
    render(<VideoCommentsModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('comment-input')).toBeInTheDocument();
    });
    
    const input = screen.getByTestId('comment-input');
    const submitButton = screen.getByTestId('submit-comment');
    
    fireEvent.change(input, { target: { value: 'Test comment' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to add comment. Please try again.')).toBeInTheDocument();
    });
  });

  it('handles user data loading error gracefully', async () => {
    const { getDoc } = require('firebase/firestore');
    getDoc.mockRejectedValue(new Error('Failed to load user'));
    
    render(<VideoCommentsModal {...defaultProps} />);
    
    await waitFor(() => {
      const unknownUserElements = screen.getAllByText('Unknown User');
      expect(unknownUserElements).toHaveLength(2); // Both comments show "Unknown User"
      expect(unknownUserElements[0]).toBeInTheDocument();
    });
  });

  it('prevents submission of empty comments', async () => {
    const { updateDoc } = require('firebase/firestore');
    
    render(<VideoCommentsModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('comment-input')).toBeInTheDocument();
    });
    
    const submitButton = screen.getByTestId('submit-comment');
    fireEvent.click(submitButton);
    
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('enforces comment length limit', async () => {
    render(<VideoCommentsModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('comment-input')).toBeInTheDocument();
    });
    
    const input = screen.getByTestId('comment-input');
    const longComment = 'a'.repeat(301); // Over 300 character limit
    
    fireEvent.change(input, { target: { value: longComment } });
    
    const submitButton = screen.getByTestId('submit-comment');
    
    // Button should be disabled when comment is too long
    expect(submitButton).toBeDisabled();
    
    // Helper text should show the character count exceeding limit
    expect(screen.getByText('301/300')).toBeInTheDocument();
  });

  it('shows error message when submitting overly long comment', async () => {
    render(<VideoCommentsModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('comment-input')).toBeInTheDocument();
    });
    
    const input = screen.getByTestId('comment-input');
    const form = input.closest('form');
    const longComment = 'a'.repeat(301); // Over 300 character limit
    
    fireEvent.change(input, { target: { value: longComment } });
    
    // Submit form directly to bypass button disabled state
    if (form) {
      fireEvent.submit(form);
    }
    
    await waitFor(() => {
      expect(screen.getByText('Comment is too long. Maximum 300 characters.')).toBeInTheDocument();
    });
  });

  it('closes modal when close button is clicked', () => {
    render(<VideoCommentsModal {...defaultProps} />);
    
    const closeButton = screen.getByTestId('close-comments');
    fireEvent.click(closeButton);
    
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('sanitizes comment text before submission', async () => {
    const DOMPurify = require('dompurify');
    const { updateDoc, arrayUnion } = require('firebase/firestore');
    
    updateDoc.mockResolvedValue({});
    arrayUnion.mockReturnValue('mocked-array-union');
    DOMPurify.sanitize.mockReturnValue('sanitized comment');
    
    render(<VideoCommentsModal {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('comment-input')).toBeInTheDocument();
    });
    
    const input = screen.getByTestId('comment-input');
    const submitButton = screen.getByTestId('submit-comment');
    
    fireEvent.change(input, { target: { value: '<script>alert("xss")</script>comment' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(DOMPurify.sanitize).toHaveBeenCalledWith('<script>alert("xss")</script>comment');
    });
  });
});
