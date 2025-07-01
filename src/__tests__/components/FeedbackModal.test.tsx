import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FeedbackModal } from '../../components/modals/FeedbackModal';
import { Context as UserAuthContext } from '../../Context/UserAuthContext';
import { AlertContext } from '../../Context/AlertContext';

// Mock Firebase
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  addDoc: jest.fn(() => Promise.resolve({ id: 'test-feedback-id' })),
}));

jest.mock('../../environments/firebaseConfig', () => ({
  app: {}
}));

// Mock hooks
jest.mock('../../hooks/useGetUserId', () => ({
  __esModule: true,
  default: () => 'test-user-id'
}));

describe('FeedbackModal', () => {
  const mockUser = {
    uid: 'test-user-id',
    email: 'test@example.com'
  };

  const mockShowAlert = jest.fn();
  const mockOnClose = jest.fn();

  const renderWithProviders = (isOpen = true) => {
    return render(
      <UserAuthContext.Provider value={{ user: mockUser, loading: false }}>
        <AlertContext.Provider value={{ showAlert: mockShowAlert }}>
          <FeedbackModal open={isOpen} onClose={mockOnClose} />
        </AlertContext.Provider>
      </UserAuthContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders when open is true', () => {
    renderWithProviders(true);
    expect(screen.getByText('Share Your Feedback')).toBeInTheDocument();
  });

  test('does not render when open is false', () => {
    renderWithProviders(false);
    expect(screen.queryByText('Share Your Feedback')).not.toBeInTheDocument();
  });

  test('renders all basic form fields', () => {
    renderWithProviders();
    
    // Check for form fields by their labels/text
    expect(screen.getByText('Feedback Type')).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
  });

  test('submits feedback successfully', async () => {
    renderWithProviders();
    
    // First select a feedback type by clicking the select component
    const feedbackTypeSelect = screen.getByRole('combobox');
    fireEvent.mouseDown(feedbackTypeSelect);
    
    await waitFor(() => {
      const bugOption = screen.getByText('🐛 Bug Report');
      fireEvent.click(bugOption);
    });
    
    // Fill out the form
    const titleInput = screen.getByLabelText(/title/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    
    fireEvent.change(titleInput, { target: { value: 'Test feedback title' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test feedback description' } });
    
    const submitButton = screen.getByText('Submit Feedback');
    fireEvent.click(submitButton);
    
    // Wait for success message to appear
    await waitFor(() => {
      expect(screen.getByText('Feedback Submitted Successfully! 🎉')).toBeInTheDocument();
    });
  });

  test('shows validation errors for required fields', async () => {
    renderWithProviders();
    
    // Try to submit without filling required fields
    // The submit button should be disabled when required fields are empty
    const submitButton = screen.getByText('Submit Feedback');
    expect(submitButton).toBeDisabled();
  });

  test('shows validation error when partially filled', async () => {
    renderWithProviders();
    
    // Fill only the title, leave type and description empty
    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'Test title' } });
    
    // Submit button should still be disabled
    const submitButton = screen.getByText('Submit Feedback');
    expect(submitButton).toBeDisabled();
  });

  test('closes modal when cancel button is clicked', () => {
    renderWithProviders();
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  test('shows bug-specific fields when bug report is selected', async () => {
    renderWithProviders();
    
    // Select bug report
    const feedbackTypeSelect = screen.getByRole('combobox');
    fireEvent.mouseDown(feedbackTypeSelect);
    
    await waitFor(() => {
      const bugOption = screen.getByText('🐛 Bug Report');
      fireEvent.click(bugOption);
    });
    
    // Check for bug-specific fields
    await waitFor(() => {
      expect(screen.getAllByText('Severity').length).toBeGreaterThan(0);
      expect(screen.getByLabelText(/steps to reproduce/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/expected behavior/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/actual behavior/i)).toBeInTheDocument();
    });
  });

  test('shows rating field for non-bug feedback', async () => {
    renderWithProviders();
    
    // Select feature request
    const feedbackTypeSelect = screen.getByRole('combobox');
    fireEvent.mouseDown(feedbackTypeSelect);
    
    await waitFor(() => {
      const featureOption = screen.getByText('💡 Feature Request');
      fireEvent.click(featureOption);
    });
    
    // Check for rating field
    await waitFor(() => {
      expect(screen.getByText('Overall Experience Rating')).toBeInTheDocument();
    });
  });
});
