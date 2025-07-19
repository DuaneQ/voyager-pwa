import { VideoValidationResult, VIDEO_CONSTRAINTS } from '../types/Video';

/**
 * Validates a video file before upload
 */
export const validateVideoFile = async (file: File): Promise<VideoValidationResult> => {
  const errors: string[] = [];

  // Debug logging to help identify mobile MIME type issues
  console.log('Video file validation - File type:', file.type, 'File name:', file.name);

  // Check file type
  if (!VIDEO_CONSTRAINTS.SUPPORTED_FORMATS.includes(file.type as any)) {
    // Fallback: check file extension for mobile browsers that may not detect MIME type correctly
    const fileName = file.name.toLowerCase();
    const supportedExtensions = ['.mp4', '.mov'];
    const hasValidExtension = supportedExtensions.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExtension) {
      errors.push(`Unsupported file format "${file.type}". Supported formats: ${VIDEO_CONSTRAINTS.SUPPORTED_FORMATS.join(', ')} or files with extensions: ${supportedExtensions.join(', ')}`);
    } else {
      console.log('File type not recognized but has valid extension - allowing upload');
    }
  }

  // Check file size
  if (file.size > VIDEO_CONSTRAINTS.MAX_FILE_SIZE) {
    errors.push(`File size too large. Maximum size: ${VIDEO_CONSTRAINTS.MAX_FILE_SIZE / 1024 / 1024}MB`);
  }

  // Check video duration
  try {
    const duration = await getVideoDuration(file);
    if (duration > VIDEO_CONSTRAINTS.MAX_DURATION) {
      errors.push(`Video too long. Maximum duration: ${VIDEO_CONSTRAINTS.MAX_DURATION} seconds`);
    }
  } catch (error) {
    errors.push('Unable to read video duration');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Gets the duration of a video file
 */
export const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };

    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };

    video.src = URL.createObjectURL(file);
  });
};

/**
 * Validates video metadata (title, description)
 */
export const validateVideoMetadata = (title?: string, description?: string): VideoValidationResult => {
  const errors: string[] = [];

  if (title && title.length > VIDEO_CONSTRAINTS.MAX_TITLE_LENGTH) {
    errors.push(`Title too long. Maximum length: ${VIDEO_CONSTRAINTS.MAX_TITLE_LENGTH} characters`);
  }

  if (description && description.length > VIDEO_CONSTRAINTS.MAX_DESCRIPTION_LENGTH) {
    errors.push(`Description too long. Maximum length: ${VIDEO_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} characters`);
  }

  // Basic profanity check (simple implementation for MVP)
  const profanityWords = ['badword1', 'badword2']; // Replace with actual list
  const titleCheck = title?.toLowerCase() || '';
  const descriptionCheck = description?.toLowerCase() || '';

  profanityWords.forEach(word => {
    if (titleCheck.includes(word) || descriptionCheck.includes(word)) {
      errors.push('Content contains inappropriate language');
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Generates a thumbnail from a video file
 */
export const generateVideoThumbnail = (file: File, timeInSeconds: number = 1): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Cannot create canvas context'));
      return;
    }

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    };

    video.onseeked = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate thumbnail'));
        }
        window.URL.revokeObjectURL(video.src);
      }, 'image/jpeg', 0.8);
    };

    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video'));
    };

    video.src = URL.createObjectURL(file);
    video.currentTime = timeInSeconds;
  });
};
