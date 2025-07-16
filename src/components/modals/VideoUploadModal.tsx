import React, { useState } from 'react';
import { VideoUploadData } from '../../types/Video';
import { validateVideoFile, validateVideoMetadata } from '../../utils/videoValidation';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (videoData: VideoUploadData) => Promise<void>;
  isUploading?: boolean;
  uploadProgress?: number;
  processingStatus?: string | null;
}

export const VideoUploadModal: React.FC<VideoUploadModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  isUploading: externalIsUploading = false,
  uploadProgress: externalUploadProgress = 0,
  processingStatus = null
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Use external uploading state if provided
  const actualIsUploading = externalIsUploading || isUploading;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrors([]);
    const validation = await validateVideoFile(file);
    
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!selectedFile) {
      setErrors(['Please select a video file']);
      return;
    }

    // Validate metadata - only if values are provided
    const metadataValidation = validateVideoMetadata(
      title.trim() || undefined, 
      description.trim() || undefined
    );
    if (!metadataValidation.isValid) {
      setErrors(metadataValidation.errors);
      return;
    }

    setIsUploading(true);
    setErrors([]);

    try {
      // Generate default title if none provided
      const defaultTitle = title.trim() || `Video ${new Date().toLocaleDateString()}`;
      const defaultDescription = description.trim() || `Uploaded on ${new Date().toLocaleDateString()}`;
      
      await onUpload({
        title: defaultTitle,
        description: defaultDescription,
        isPublic,
        file: selectedFile
      });
      
      // Reset form
      setSelectedFile(null);
      setTitle('');
      setDescription('');
      setIsPublic(true);
      onClose();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Upload failed']);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!actualIsUploading) {
      setSelectedFile(null);
      setTitle('');
      setDescription('');
      setIsPublic(true);
      setErrors([]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="video-upload-modal-overlay" data-testid="video-upload-modal">
      <div className="video-upload-modal">
        <div className="modal-header">
          <h2>Upload Video</h2>
          <button 
            onClick={handleClose} 
            disabled={actualIsUploading}
            className="close-button"
            data-testid="close-button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="upload-form">
          {errors.length > 0 && (
            <div className="error-messages" data-testid="error-messages">
              {errors.map((error, index) => (
                <div key={index} className="error-message">{error}</div>
              ))}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="video-file">Video File</label>
            <input
              id="video-file"
              type="file"
              accept="video/mp4,video/mov"
              onChange={handleFileSelect}
              disabled={actualIsUploading}
              data-testid="file-input"
            />
            {selectedFile && (
              <div className="file-info" data-testid="file-info">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="video-title">Title (Optional)</label>
            <input
              id="video-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={actualIsUploading}
              maxLength={100}
              data-testid="title-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="video-description">
              Description (Optional) - {description.length}/200 characters
            </label>
            <textarea
              id="video-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={actualIsUploading}
              maxLength={200}
              rows={3}
              data-testid="description-input"
              placeholder="Describe your video... (TravalPass.com branding appears when shared)"
            />
            <div className="form-help">
              Videos upload faster without watermarks! TravalPass.com branding appears only when shared (like TikTok/Facebook).
            </div>
          </div>

          <div className="form-group">
            <label className="privacy-label">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                disabled={actualIsUploading}
                data-testid="public-checkbox"
              />
              Make this video public (unchecked = private, only connections can see)
            </label>
          </div>

          {/* Progress indicator and status */}
          {actualIsUploading && (
            <div className="upload-progress" data-testid="upload-progress">
              <div className="progress-info">
                <div className="progress-status">
                  {processingStatus || 'Processing...'}
                </div>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${externalUploadProgress}%` }}
                ></div>
              </div>
              <div className="progress-text">
                {Math.round(externalUploadProgress)}%
              </div>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              onClick={handleClose}
              disabled={actualIsUploading}
              className="cancel-button"
              data-testid="cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedFile || actualIsUploading}
              className="modal-upload-button"
              data-testid="upload-button"
            >
              {isUploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
