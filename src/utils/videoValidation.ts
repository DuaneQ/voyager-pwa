import { VideoValidationResult, VIDEO_CONSTRAINTS } from '../types/Video';

/**
 * Validates a video file before upload with improved error handling
 */
export const validateVideoFile = async (file: File): Promise<VideoValidationResult> => {
  const errors: string[] = [];

  // Input validation
  if (!file) {
    return { isValid: false, errors: ['No file provided'] };
  }
  // Check file type with better fallback logic
  const isValidMimeType = VIDEO_CONSTRAINTS.SUPPORTED_FORMATS.includes(file.type as any);
  const fileName = file.name.toLowerCase();
  const supportedExtensions = ['.mp4', '.mov', '.avi', '.wmv'];
  const hasValidExtension = supportedExtensions.some(ext => fileName.endsWith(ext));
  
  if (!isValidMimeType && !hasValidExtension) {
    errors.push(`Unsupported file format "${file.type}". Supported formats: ${VIDEO_CONSTRAINTS.SUPPORTED_FORMATS.join(', ')} or files with extensions: ${supportedExtensions.join(', ')}`);
  } else if (!isValidMimeType && hasValidExtension) {
    console.log('File type not recognized but has valid extension - allowing upload');
  }

  // Check file size with better error message
  if (file.size === 0) {
    errors.push('File appears to be empty');
  } else if (file.size > VIDEO_CONSTRAINTS.MAX_FILE_SIZE) {
    const maxSizeMB = VIDEO_CONSTRAINTS.MAX_FILE_SIZE / (1024 * 1024);
    const fileSizeMB = file.size / (1024 * 1024);
    errors.push(`File size too large (${fileSizeMB.toFixed(1)}MB). Maximum size: ${maxSizeMB}MB`);
  }

  // Only check video duration if other validations pass to avoid timeouts
  if (errors.length === 0) {
    try {
      const duration = await getVideoDuration(file);
      if (duration > VIDEO_CONSTRAINTS.MAX_DURATION) {
        errors.push(`Video too long (${Math.round(duration)}s). Maximum duration: ${VIDEO_CONSTRAINTS.MAX_DURATION} seconds`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error reading video duration';
      errors.push(`Unable to read video duration: ${errorMessage}`);
    }
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
 * Validates video metadata (title, description) with comprehensive checks
 */
export const validateVideoMetadata = (title?: string, description?: string): VideoValidationResult => {
  const errors: string[] = [];

  // Title validation
  if (title !== undefined) {
    if (title.trim().length === 0) {
      errors.push('Title cannot be empty');
    } else if (title.length > VIDEO_CONSTRAINTS.MAX_TITLE_LENGTH) {
      errors.push(`Title too long (${title.length} characters). Maximum length: ${VIDEO_CONSTRAINTS.MAX_TITLE_LENGTH} characters`);
    }
  }

  // Description validation
  if (description !== undefined) {
    if (description.length > VIDEO_CONSTRAINTS.MAX_DESCRIPTION_LENGTH) {
      errors.push(`Description too long (${description.length} characters). Maximum length: ${VIDEO_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} characters`);
    }
  }

  // Enhanced content filtering
  if (title || description) {
    const contentCheckResult = checkContentAppropriate(title, description);
    if (!contentCheckResult.isValid) {
      errors.push(...contentCheckResult.errors);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Checks content for inappropriate language and patterns
 */
const checkContentAppropriate = (title?: string, description?: string): VideoValidationResult => {
  const errors: string[] = [];
  
  // Basic profanity and spam detection
  const inappropriatePatterns = [
    /badword1/i, /badword2/i, // Replace with actual patterns
    /spam/i, /click here/i, /free money/i, // Basic spam detection
    /(.)\1{10,}/i // Repeated characters (spam indicator)
  ];

  const titleCheck = title?.toLowerCase() || '';
  const descriptionCheck = description?.toLowerCase() || '';
  const combinedContent = `${titleCheck} ${descriptionCheck}`;

  for (const pattern of inappropriatePatterns) {
    if (pattern.test(combinedContent)) {
      errors.push('Content contains inappropriate or spam-like content');
      break; // Only add the error once
    }
  }

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
