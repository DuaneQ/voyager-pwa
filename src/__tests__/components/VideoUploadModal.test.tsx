import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VideoUploadModal } from '../../components/modals/VideoUploadModal';
import { VideoUploadData } from '../../types/Video';
import * as videoValidation from '../../utils/videoValidation';

// Mock the video validation utilities
jest.mock('../../utils/videoValidation');

const mockValidateVideoFile = videoValidation.validateVideoFile as jest.MockedFunction<typeof videoValidation.validateVideoFile>;
const mockValidateVideoMetadata = videoValidation.validateVideoMetadata as jest.MockedFunction<typeof videoValidation.validateVideoMetadata>;

describe('VideoUploadModal', () => {
  const mockOnClose = jest.fn();
  const mockOnUpload = jest.fn();

  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onUpload: mockOnUpload
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidateVideoFile.mockResolvedValue({ isValid: true, errors: [] });
    mockValidateVideoMetadata.mockReturnValue({ isValid: true, errors: [] });
  });

  it('should render when open', () => {
    render(<VideoUploadModal {...defaultProps} />);
    
    expect(screen.getByTestId('video-upload-modal')).toBeInTheDocument();
    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByTestId('file-input')).toBeInTheDocument();
    expect(screen.getByTestId('title-input')).toBeInTheDocument();
    expect(screen.getByTestId('description-input')).toBeInTheDocument();
    expect(screen.getByTestId('public-checkbox')).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(<VideoUploadModal {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByTestId('video-upload-modal')).not.toBeInTheDocument();
  });

  it('should close modal when close button is clicked', () => {
    render(<VideoUploadModal {...defaultProps} />);
    
    fireEvent.click(screen.getByTestId('close-button'));
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should close modal when cancel button is clicked', () => {
    render(<VideoUploadModal {...defaultProps} />);
    
    fireEvent.click(screen.getByTestId('cancel-button'));
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should handle file selection', async () => {
    render(<VideoUploadModal {...defaultProps} />);
    
    const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
    const fileInput = screen.getByTestId('file-input');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(mockValidateVideoFile).toHaveBeenCalledWith(file);
      expect(screen.getByTestId('file-info')).toBeInTheDocument();
      expect(screen.getByText(/Selected: test.mp4/)).toBeInTheDocument();
    });
  });

  it('should show validation errors for invalid file', async () => {
    const validationErrors = ['File too large', 'Unsupported format'];
    mockValidateVideoFile.mockResolvedValue({ isValid: false, errors: validationErrors });
    
    render(<VideoUploadModal {...defaultProps} />);
    
    const file = new File(['video content'], 'test.avi', { type: 'video/avi' });
    const fileInput = screen.getByTestId('file-input');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByTestId('error-messages')).toBeInTheDocument();
      expect(screen.getByText('File too large')).toBeInTheDocument();
      expect(screen.getByText('Unsupported format')).toBeInTheDocument();
    });
  });

  it('should update form fields', () => {
    render(<VideoUploadModal {...defaultProps} />);
    
    const titleInput = screen.getByTestId('title-input');
    const descriptionInput = screen.getByTestId('description-input');
    const publicCheckbox = screen.getByTestId('public-checkbox');
    
    fireEvent.change(titleInput, { target: { value: 'Test Title' } });
    fireEvent.change(descriptionInput, { target: { value: 'Test Description' } });
    fireEvent.click(publicCheckbox); // Toggle to false
    
    expect(titleInput).toHaveValue('Test Title');
    expect(descriptionInput).toHaveValue('Test Description');
    expect(publicCheckbox).not.toBeChecked();
  });

  it('should prevent submission without file', async () => {
    render(<VideoUploadModal {...defaultProps} />);
    
    const uploadButton = screen.getByTestId('upload-button');
    expect(uploadButton).toBeDisabled(); // Should be disabled when no file is selected
    expect(mockOnUpload).not.toHaveBeenCalled();
  });

  it('should handle successful upload', async () => {
    render(<VideoUploadModal {...defaultProps} />);
    
    const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
    const fileInput = screen.getByTestId('file-input');
    
    // Select file
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByTestId('file-info')).toBeInTheDocument();
    });
    
    // Fill form
    fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'Test Video' } });
    fireEvent.change(screen.getByTestId('description-input'), { target: { value: 'Test Description' } });
    
    // Submit
    fireEvent.click(screen.getByTestId('upload-button'));
    
    await waitFor(() => {
      expect(mockValidateVideoMetadata).toHaveBeenCalledWith('Test Video', 'Test Description');
      expect(mockOnUpload).toHaveBeenCalledWith({
        title: 'Test Video',
        description: 'Test Description',
        isPublic: true,
        file
      });
    });
  });

  it('should handle upload failure', async () => {
    const uploadError = new Error('Upload failed');
    mockOnUpload.mockRejectedValue(uploadError);
    
    render(<VideoUploadModal {...defaultProps} />);
    
    const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
    const fileInput = screen.getByTestId('file-input');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByTestId('file-info')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByTestId('upload-button'));
    
    await waitFor(() => {
      expect(screen.getByText('Upload failed')).toBeInTheDocument();
    });
  });

  it('should show metadata validation errors', async () => {
    const metadataErrors = ['Title too long'];
    mockValidateVideoMetadata.mockReturnValue({ isValid: false, errors: metadataErrors });
    
    render(<VideoUploadModal {...defaultProps} />);
    
    const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
    const fileInput = screen.getByTestId('file-input');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByTestId('file-info')).toBeInTheDocument();
    });
    
    fireEvent.change(screen.getByTestId('title-input'), { target: { value: 'Very long title that exceeds limits' } });
    fireEvent.click(screen.getByTestId('upload-button'));
    
    await waitFor(() => {
      expect(screen.getByText('Title too long')).toBeInTheDocument();
      expect(mockOnUpload).not.toHaveBeenCalled();
    });
  });

  it('should disable form during upload', async () => {
    mockOnUpload.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));
    
    render(<VideoUploadModal {...defaultProps} />);
    
    const file = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
    const fileInput = screen.getByTestId('file-input');
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(screen.getByTestId('file-info')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByTestId('upload-button'));
    
    await waitFor(() => {
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
      expect(screen.getByTestId('file-input')).toBeDisabled();
      expect(screen.getByTestId('title-input')).toBeDisabled();
      expect(screen.getByTestId('description-input')).toBeDisabled();
      expect(screen.getByTestId('public-checkbox')).toBeDisabled();
      expect(screen.getByTestId('close-button')).toBeDisabled();
      expect(screen.getByTestId('cancel-button')).toBeDisabled();
    });
  });
});
