import { validateVideoFile, validateVideoMetadata, getVideoDuration, generateVideoThumbnail } from '../../utils/videoValidation';
import { VIDEO_CONSTRAINTS } from '../../types/Video';

// Mock video element for testing
const mockVideo = {
  duration: 30,
  videoWidth: 1280,
  videoHeight: 720,
  currentTime: 0,
  preload: '',
  muted: false,
  src: '',
  onloadedmetadata: null as any,
  onseeked: null as any,
  onerror: null as any,
  onloadstart: null as any
};

// Mock canvas context for thumbnail generation
const mockContext = {
  drawImage: jest.fn(),
  canvas: {
    width: 0,
    height: 0,
    toBlob: jest.fn()
  }
};

// Mock DOM APIs
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: jest.fn(() => 'mock-blob-url'),
    revokeObjectURL: jest.fn()
  }
});

describe('videoValidation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mock video
    Object.assign(mockVideo, {
      duration: 30,
      videoWidth: 1280,
      videoHeight: 720,
      currentTime: 0
    });

    // Mock document.createElement
    jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'video') {
        return mockVideo as any;
      }
      if (tagName === 'canvas') {
        return {
          ...mockContext.canvas,
          getContext: () => mockContext
        } as any;
      }
      return {} as any;
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateVideoFile', () => {
    const createMockFile = (options: {
      name?: string;
      type?: string;
      size?: number;
    } = {}) => {
      return new File(['mock content'], options.name || 'test.mp4', {
        type: options.type || 'video/mp4',
        lastModified: Date.now()
      });
    };

    it('should return error for null/undefined file', async () => {
      const result = await validateVideoFile(null as any);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No file provided');
    });

    it('should validate correct video file', async () => {
      const file = createMockFile({
        name: 'test.mp4',
        type: 'video/mp4',
        size: 1024 * 1024 // 1MB
      });

      // Mock successful duration check
      setTimeout(() => {
        if (mockVideo.onloadedmetadata) {
          mockVideo.onloadedmetadata({} as any);
        }
      }, 0);

      const result = await validateVideoFile(file);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unsupported file formats', async () => {
      const file = createMockFile({
        name: 'test.txt',
        type: 'text/plain',
        size: 1024
      });

      const result = await validateVideoFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Unsupported file format');
    });

    it('should accept files with valid extensions but unknown MIME types', async () => {
      const file = createMockFile({
        name: 'test.mp4',
        type: '', // Empty MIME type (mobile browser scenario)
        size: 1024
      });

      // Mock successful duration check
      setTimeout(() => {
        if (mockVideo.onloadedmetadata) {
          mockVideo.onloadedmetadata({} as any);
        }
      }, 0);

      const result = await validateVideoFile(file);
      expect(result.isValid).toBe(true);
    });

    it('should reject files that are too large', async () => {
      const file = createMockFile({
        size: VIDEO_CONSTRAINTS.MAX_FILE_SIZE + 1
      });

      const result = await validateVideoFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('File size too large'))).toBe(true);
    });

    it('should reject empty files', async () => {
      const file = createMockFile({ size: 0 });

      const result = await validateVideoFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('File appears to be empty'))).toBe(true);
    });

    it('should reject videos that are too long', async () => {
      const file = createMockFile();
      mockVideo.duration = VIDEO_CONSTRAINTS.MAX_DURATION + 10;

      setTimeout(() => {
        if (mockVideo.onloadedmetadata) {
          mockVideo.onloadedmetadata({} as any);
        }
      }, 0);

      const result = await validateVideoFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Video too long');
    });

    it('should handle video duration read errors', async () => {
      const file = createMockFile();

      setTimeout(() => {
        if (mockVideo.onerror) {
          mockVideo.onerror({} as any);
        }
      }, 0);

      const result = await validateVideoFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Unable to read video duration');
    });
  });

  describe('validateVideoMetadata', () => {
    it('should validate correct metadata', () => {
      const result = validateVideoMetadata('Valid Title', 'Valid description');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty title when provided', () => {
      const result = validateVideoMetadata('   ', 'Valid description');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Title cannot be empty');
    });

    it('should reject titles that are too long', () => {
      const longTitle = 'x'.repeat(VIDEO_CONSTRAINTS.MAX_TITLE_LENGTH + 1);
      const result = validateVideoMetadata(longTitle);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Title too long');
    });

    it('should reject descriptions that are too long', () => {
      const longDescription = 'x'.repeat(VIDEO_CONSTRAINTS.MAX_DESCRIPTION_LENGTH + 1);
      const result = validateVideoMetadata('Valid Title', longDescription);
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Description too long');
    });

    it('should detect spam-like content', () => {
      const result = validateVideoMetadata('Click here for free money!', 'Get rich quick scheme');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('inappropriate or spam-like content');
    });

    it('should detect repeated character spam', () => {
      const result = validateVideoMetadata('aaaaaaaaaaaaaa', 'Normal description');
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('inappropriate or spam-like content');
    });

    it('should allow undefined title and description', () => {
      const result = validateVideoMetadata(undefined, undefined);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('getVideoDuration', () => {
    it('should return video duration on success', async () => {
      const file = new File(['mock content'], 'test.mp4', { type: 'video/mp4' });
      
      setTimeout(() => {
        if (mockVideo.onloadedmetadata) {
          mockVideo.onloadedmetadata({} as any);
        }
      }, 0);

      const duration = await getVideoDuration(file);
      expect(duration).toBe(30);
    });

    it('should handle video load errors', async () => {
      const file = new File(['mock content'], 'test.mp4', { type: 'video/mp4' });
      
      setTimeout(() => {
        if (mockVideo.onerror) {
          mockVideo.onerror({} as any);
        }
      }, 0);

      await expect(getVideoDuration(file)).rejects.toThrow('Failed to load video metadata');
    });

    it('should handle timeout for large files', async () => {
      const file = new File(['mock content'], 'test.mp4', { type: 'video/mp4' });
      
      // Don't call any callbacks to simulate timeout
      
      await expect(getVideoDuration(file)).rejects.toThrow('Unable to read video duration - file may be too large or corrupted');
    }, 16000); // Increase timeout for this test
  });

  describe('generateVideoThumbnail', () => {
    beforeEach(() => {
      mockContext.canvas.toBlob = jest.fn((callback) => {
        setTimeout(() => callback(new Blob(['mock'], { type: 'image/jpeg' })), 0);
      });
    });

    it('should generate thumbnail successfully', async () => {
      const file = new File(['mock content'], 'test.mp4', { type: 'video/mp4' });
      
      setTimeout(() => {
        if (mockVideo.onloadedmetadata) {
          mockVideo.onloadedmetadata({} as any);
        }
      }, 0);

      setTimeout(() => {
        if (mockVideo.onseeked) {
          mockVideo.onseeked({} as any);
        }
      }, 10);

      const thumbnail = await generateVideoThumbnail(file, 1);
      expect(thumbnail).toBeInstanceOf(Blob);
      expect(mockContext.drawImage).toHaveBeenCalled();
    });

    it('should handle canvas context creation failure', async () => {
      const file = new File(['mock content'], 'test.mp4', { type: 'video/mp4' });
      
      // Mock failed context creation
      jest.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return { getContext: () => null } as any;
        }
        return mockVideo as any;
      });

      await expect(generateVideoThumbnail(file)).rejects.toThrow('Cannot create canvas context');
    });

    it('should limit canvas size for large videos', async () => {
      const file = new File(['mock content'], 'test.mp4', { type: 'video/mp4' });
      mockVideo.videoWidth = 3840; // 4K width
      mockVideo.videoHeight = 2160; // 4K height
      
      setTimeout(() => {
        if (mockVideo.onloadedmetadata) {
          mockVideo.onloadedmetadata({} as any);
        }
      }, 0);

      setTimeout(() => {
        if (mockVideo.onseeked) {
          mockVideo.onseeked({} as any);
        }
      }, 10);

      await generateVideoThumbnail(file);
      
      // Canvas should be limited to maxDimension (1280)
      expect(mockContext.canvas.width).toBeLessThanOrEqual(1280);
      expect(mockContext.canvas.height).toBeLessThanOrEqual(1280);
    });

    it('should handle thumbnail generation timeout', async () => {
      const file = new File(['mock content'], 'test.mp4', { type: 'video/mp4' });
      
      // Don't trigger any callbacks to simulate timeout
      
      await expect(generateVideoThumbnail(file)).rejects.toThrow('Thumbnail generation timed out');
    }, 31000); // Increase timeout for this test
  });
});
