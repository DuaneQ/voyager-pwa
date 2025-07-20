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
 * Gets the duration of a video file with timeout handling
 */
export const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    // Set timeout to prevent hanging on large/corrupted files
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Unable to read video duration - file may be too large or corrupted'));
    }, 15000); // 15 second timeout

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;

    const cleanup = () => {
      clearTimeout(timeoutId);
      if (video.src) {
        window.URL.revokeObjectURL(video.src);
      }
    };

    video.onloadedmetadata = () => {
      cleanup();
      resolve(video.duration);
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Failed to load video metadata'));
    };

    try {
      video.src = URL.createObjectURL(file);
    } catch (error) {
      cleanup();
      reject(new Error('Failed to create object URL for video file'));
    }
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
 * Generates a thumbnail from a video file with better error handling and timeouts
 */
export const generateVideoThumbnail = (file: File, timeInSeconds: number = 1): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    // Set a timeout to prevent hanging on large files
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Thumbnail generation timed out. File may be too large or corrupted.'));
    }, 30000); // 30 second timeout

    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const cleanup = () => {
      clearTimeout(timeoutId);
      if (video.src) {
        window.URL.revokeObjectURL(video.src);
      }
    };

    if (!ctx) {
      cleanup();
      reject(new Error('Cannot create canvas context'));
      return;
    }

    // Add additional error handling for large files
    video.preload = 'metadata';
    video.muted = true; // Ensure muted for autoplay policies

    video.onloadedmetadata = () => {
      // Limit canvas size to prevent memory issues with very large videos
      const maxDimension = 1280;
      const aspectRatio = video.videoWidth / video.videoHeight;
      
      if (video.videoWidth > maxDimension || video.videoHeight > maxDimension) {
        if (aspectRatio > 1) {
          // Landscape
          canvas.width = maxDimension;
          canvas.height = maxDimension / aspectRatio;
        } else {
          // Portrait
          canvas.height = maxDimension;
          canvas.width = maxDimension * aspectRatio;
        }
      } else {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Ensure we don't seek beyond video duration
      const seekTime = Math.min(timeInSeconds, video.duration - 0.1);
      video.currentTime = Math.max(0, seekTime);
    };

    video.onseeked = () => {
      try {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert to blob with compression
        canvas.toBlob((blob) => {
          cleanup();
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to generate thumbnail blob'));
          }
        }, 'image/jpeg', 0.7); // Reduced quality for smaller file size
      } catch (error) {
        cleanup();
        reject(new Error(`Failed to draw video frame: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    video.onerror = (error) => {
      cleanup();
      reject(new Error('Failed to load video for thumbnail generation. File may be corrupted or unsupported.'));
    };

    video.onloadstart = () => {
      console.log('Video loading started for thumbnail generation');
    };

    // Create object URL and start loading
    try {
      video.src = URL.createObjectURL(file);
    } catch (error) {
      cleanup();
      reject(new Error('Failed to create object URL for video file'));
    }
  });
};
