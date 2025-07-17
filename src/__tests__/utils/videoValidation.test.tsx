import {
  validateVideoFile,
  validateVideoMetadata,
  generateVideoThumbnail,
  getVideoDuration
} from '../../utils/videoValidation';
import { VIDEO_CONSTRAINTS } from '../../types/Video';

// Mock URL.createObjectURL and revokeObjectURL
Object.defineProperty(window.URL, 'createObjectURL', {
  writable: true,
  value: jest.fn(() => 'mock-object-url')
});

Object.defineProperty(window.URL, 'revokeObjectURL', {
  writable: true,
  value: jest.fn()
});

// Mock HTMLVideoElement
class MockHTMLVideoElement {
  duration = 0;
  src = '';
  preload = '';
  onloadedmetadata: (() => void) | null = null;
  onerror: (() => void) | null = null;
  
  constructor() {
    // Simulate successful loading after a short delay
    setTimeout(() => {
      if (this.onloadedmetadata) {
        this.onloadedmetadata();
      }
    }, 10);
  }
}

// Mock HTMLCanvasElement
class MockHTMLCanvasElement {
  width = 0;
  height = 0;
  
  getContext(contextType: string) {
    if (contextType === '2d') {
      return {
        drawImage: jest.fn(),
      };
    }
    return null;
  }
  
  toBlob(callback: (blob: Blob | null) => void) {
    // Simulate successful blob creation
    setTimeout(() => {
      const mockBlob = new Blob(['mock-image-data'], { type: 'image/jpeg' });
      callback(mockBlob);
    }, 10);
  }
}

// Mock document.createElement
const originalCreateElement = document.createElement;
beforeAll(() => {
  document.createElement = jest.fn((tagName: string) => {
    if (tagName === 'video') {
      return new MockHTMLVideoElement() as any;
    }
    if (tagName === 'canvas') {
      return new MockHTMLCanvasElement() as any;
    }
    return originalCreateElement.call(document, tagName);
  });
});

afterAll(() => {
  document.createElement = originalCreateElement;
});

describe('videoValidation', () => {
  describe('validateVideoFile', () => {
    const createMockVideoFile = (
      size: number = 10 * 1024 * 1024, // 10MB
      type: string = 'video/mp4',
      name: string = 'test.mp4'
    ) => {
      return new File(['mock-video-content'], name, { type });
    };

    it('should validate a correct video file', async () => {
      const file = createMockVideoFile();
      
      // Mock video duration
      (document.createElement as jest.Mock).mockImplementationOnce(() => ({
        ...new MockHTMLVideoElement(),
        duration: 30 // 30 seconds
      }));
      
      const result = await validateVideoFile(file);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unsupported file format', async () => {
      const file = createMockVideoFile(10 * 1024 * 1024, 'video/avi', 'test.avi');
      
      const result = await validateVideoFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('Unsupported file format')
      );
    });

    it('should reject files that are too large', async () => {
      const file = createMockVideoFile(VIDEO_CONSTRAINTS.MAX_FILE_SIZE + 1);
      
      const result = await validateVideoFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('File size too large')
      );
    });

    it('should reject videos that are too long', async () => {
      const file = createMockVideoFile();
      
      // Mock video duration longer than max
      (document.createElement as jest.Mock).mockImplementationOnce(() => ({
        ...new MockHTMLVideoElement(),
        duration: VIDEO_CONSTRAINTS.MAX_DURATION + 10
      }));
      
      const result = await validateVideoFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('Video too long')
      );
    });

    it('should handle video metadata loading error', async () => {
      const file = createMockVideoFile();
      
      // Mock video element that fails to load
      (document.createElement as jest.Mock).mockImplementationOnce(() => ({
        preload: '',
        src: '',
        onloadedmetadata: null,
        onerror: null,
        constructor: function() {
          setTimeout(() => {
            if (this.onerror) {
              this.onerror();
            }
          }, 10);
        }
      }));
      
      const result = await validateVideoFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Unable to read video duration');
    });

    it('should handle multiple validation errors', async () => {
      const file = createMockVideoFile(
        VIDEO_CONSTRAINTS.MAX_FILE_SIZE + 1,
        'video/avi',
        'test.avi'
      );
      
      const result = await validateVideoFile(file);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain(
        expect.stringContaining('Unsupported file format')
      );
      expect(result.errors).toContain(
        expect.stringContaining('File size too large')
      );
    });
  });

  describe('getVideoDuration', () => {
    it('should return video duration for valid file', async () => {
      const file = new File(['mock-video'], 'test.mp4', { type: 'video/mp4' });
      
      (document.createElement as jest.Mock).mockImplementationOnce(() => ({
        ...new MockHTMLVideoElement(),
        duration: 45.5
      }));
      
      const duration = await getVideoDuration(file);
      
      expect(duration).toBe(45.5);
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(file);
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('mock-object-url');
    });

    it('should reject when video fails to load', async () => {
      const file = new File(['mock-video'], 'test.mp4', { type: 'video/mp4' });
      
      (document.createElement as jest.Mock).mockImplementationOnce(() => {
        const mockVideo = new MockHTMLVideoElement();
        // Override to simulate error
        setTimeout(() => {
          if (mockVideo.onerror) {
            mockVideo.onerror();
          }
        }, 10);
        return mockVideo;
      });
      
      await expect(getVideoDuration(file)).rejects.toThrow(
        'Failed to load video metadata'
      );
    });
  });

  describe('validateVideoMetadata', () => {
    it('should validate correct metadata', () => {
      const result = validateVideoMetadata('Valid Title', 'Valid description');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject title that is too long', () => {
      const longTitle = 'a'.repeat(VIDEO_CONSTRAINTS.MAX_TITLE_LENGTH + 1);
      
      const result = validateVideoMetadata(longTitle, 'Valid description');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('Title too long')
      );
    });

    it('should reject description that is too long', () => {
      const longDescription = 'a'.repeat(VIDEO_CONSTRAINTS.MAX_DESCRIPTION_LENGTH + 1);
      
      const result = validateVideoMetadata('Valid Title', longDescription);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        expect.stringContaining('Description too long')
      );
    });

    it('should handle undefined title and description', () => {
      const result = validateVideoMetadata(undefined, undefined);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle empty title and description', () => {
      const result = validateVideoMetadata('', '');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect inappropriate content', () => {
      const result = validateVideoMetadata('Title with badword1', 'Clean description');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content contains inappropriate language');
    });

    it('should detect inappropriate content in description', () => {
      const result = validateVideoMetadata('Clean title', 'Description with badword2');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content contains inappropriate language');
    });

    it('should be case insensitive for profanity detection', () => {
      const result = validateVideoMetadata('Title with BADWORD1', 'description');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content contains inappropriate language');
    });
  });

  describe('generateVideoThumbnail', () => {
    it('should generate thumbnail from video file', async () => {
      const file = new File(['mock-video'], 'test.mp4', { type: 'video/mp4' });
      
      const thumbnail = await generateVideoThumbnail(file, 1);
      
      expect(thumbnail).toBeInstanceOf(Blob);
      expect(thumbnail.type).toBe('image/jpeg');
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(file);
    });

    it('should use default time if not specified', async () => {
      const file = new File(['mock-video'], 'test.mp4', { type: 'video/mp4' });
      
      const thumbnail = await generateVideoThumbnail(file);
      
      expect(thumbnail).toBeInstanceOf(Blob);
    });

    it('should handle canvas context creation failure', async () => {
      const file = new File(['mock-video'], 'test.mp4', { type: 'video/mp4' });
      
      // Mock canvas that returns null context
      (document.createElement as jest.Mock).mockImplementationOnce((tagName: string) => {
        if (tagName === 'canvas') {
          return {
            getContext: () => null
          };
        }
        return new MockHTMLVideoElement();
      });
      
      await expect(generateVideoThumbnail(file)).rejects.toThrow(
        'Cannot create canvas context'
      );
    });

    it('should handle video loading error during thumbnail generation', async () => {
      const file = new File(['mock-video'], 'test.mp4', { type: 'video/mp4' });
      
      // Mock video element that fails to load
      (document.createElement as jest.Mock).mockImplementationOnce((tagName: string) => {
        if (tagName === 'video') {
          const mockVideo = new MockHTMLVideoElement();
          // Override to simulate error
          setTimeout(() => {
            if (mockVideo.onerror) {
              mockVideo.onerror();
            }
          }, 10);
          return mockVideo;
        }
        return new MockHTMLCanvasElement();
      });
      
      await expect(generateVideoThumbnail(file)).rejects.toThrow(
        'Failed to load video for thumbnail generation'
      );
    });

    it('should handle canvas toBlob failure', async () => {
      const file = new File(['mock-video'], 'test.mp4', { type: 'video/mp4' });
      
      // Mock canvas that fails to create blob
      (document.createElement as jest.Mock).mockImplementationOnce((tagName: string) => {
        if (tagName === 'canvas') {
          return {
            width: 0,
            height: 0,
            getContext: () => ({
              drawImage: jest.fn(),
            }),
            toBlob: (callback: (blob: Blob | null) => void) => {
              callback(null);
            }
          };
        }
        return new MockHTMLVideoElement();
      });
      
      await expect(generateVideoThumbnail(file)).rejects.toThrow(
        'Failed to generate thumbnail blob'
      );
    });
  });

  describe('Integration tests', () => {
    it('should validate complete video upload flow', async () => {
      const file = new File(['mock-video'], 'travel-video.mp4', { 
        type: 'video/mp4' 
      });
      const title = 'My Amazing Travel Video';
      const description = 'A wonderful journey through the mountains';
      
      // Mock successful video duration
      (document.createElement as jest.Mock).mockImplementationOnce(() => ({
        ...new MockHTMLVideoElement(),
        duration: 60
      }));
      
      const fileValidation = await validateVideoFile(file);
      const metadataValidation = validateVideoMetadata(title, description);
      
      expect(fileValidation.isValid).toBe(true);
      expect(metadataValidation.isValid).toBe(true);
      
      // Should be able to generate thumbnail
      const thumbnail = await generateVideoThumbnail(file);
      expect(thumbnail).toBeInstanceOf(Blob);
    });

    it('should handle complete validation failure', async () => {
      const file = new File(['mock-video'], 'bad-video.avi', { 
        type: 'video/avi' 
      });
      const title = 'a'.repeat(VIDEO_CONSTRAINTS.MAX_TITLE_LENGTH + 1);
      const description = 'Description with badword1';
      
      const fileValidation = await validateVideoFile(file);
      const metadataValidation = validateVideoMetadata(title, description);
      
      expect(fileValidation.isValid).toBe(false);
      expect(metadataValidation.isValid).toBe(false);
      
      expect([...fileValidation.errors, ...metadataValidation.errors]).toContain(
        expect.stringContaining('Unsupported file format')
      );
      expect([...fileValidation.errors, ...metadataValidation.errors]).toContain(
        expect.stringContaining('Title too long')
      );
      expect([...fileValidation.errors, ...metadataValidation.errors]).toContain(
        expect.stringContaining('inappropriate language')
      );
    });
  });

  describe('Mobile-specific behavior', () => {
    beforeEach(() => {
      // Mock mobile environment
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15'
      });
    });

    it('should handle mobile video constraints', async () => {
      const file = new File(['mock-video'], 'mobile-video.mp4', { 
        type: 'video/mp4' 
      });
      
      // Mock mobile-typical video duration
      (document.createElement as jest.Mock).mockImplementationOnce(() => ({
        ...new MockHTMLVideoElement(),
        duration: 15 // Short mobile video
      }));
      
      const result = await validateVideoFile(file);
      
      expect(result.isValid).toBe(true);
    });

    it('should generate mobile-optimized thumbnails', async () => {
      const file = new File(['mock-video'], 'mobile-video.mp4', { 
        type: 'video/mp4' 
      });
      
      const thumbnail = await generateVideoThumbnail(file, 0.5);
      
      expect(thumbnail).toBeInstanceOf(Blob);
      expect(thumbnail.type).toBe('image/jpeg');
    });
  });
});
