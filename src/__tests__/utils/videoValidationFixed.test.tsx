import { validateVideoMetadata, validateVideoFile, getVideoDuration, generateVideoThumbnail } from '../../utils/videoValidation';
import { VIDEO_CONSTRAINTS } from '../../types/Video';

describe('videoValidation', () => {
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
      expect(result.errors[0]).toContain('Title too long');
    });

    it('should reject description that is too long', () => {
      const longDescription = 'a'.repeat(VIDEO_CONSTRAINTS.MAX_DESCRIPTION_LENGTH + 1);
      
      const result = validateVideoMetadata('Valid Title', longDescription);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Description too long');
    });

    it('should detect inappropriate language in title', () => {
      const result = validateVideoMetadata('badword1 in title', 'Clean description');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content contains inappropriate or spam-like content');
    });

    it('should detect inappropriate language in description', () => {
      const result = validateVideoMetadata('Clean title', 'Description with badword2');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Content contains inappropriate or spam-like content');
    });

    it('should handle undefined title and description', () => {
      const result = validateVideoMetadata();
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateVideoFile and helpers', () => {
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    const originalCreateElement = document.createElement.bind(document);

    afterEach(() => {
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
      document.createElement = originalCreateElement;
      jest.restoreAllMocks();
    });

    it('returns error when no file provided', async () => {
      // @ts-ignore
      const res = await validateVideoFile(undefined);
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('No file provided');
    });

    it('rejects unsupported mime and extension', async () => {
      const file = new File(['content'], 'video.xyz', { type: 'application/octet-stream' });
      const res = await validateVideoFile(file);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => /Unsupported file format/.test(e))).toBeTruthy();
    });

    it('returns error for zero-size file', async () => {
      const file = new File([''], 'video.mp4', { type: 'video/mp4' });
      // hack the size to zero
      Object.defineProperty(file, 'size', { value: 0 });
      const res = await validateVideoFile(file);
      expect(res.isValid).toBe(false);
      expect(res.errors).toContain('File appears to be empty');
    });

    it('returns error for file too large', async () => {
      const file = new File(['a'.repeat(10)], 'big.mp4', { type: 'video/mp4' });
      Object.defineProperty(file, 'size', { value: VIDEO_CONSTRAINTS.MAX_FILE_SIZE + 1024 });
      const res = await validateVideoFile(file);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => /File size too large/.test(e))).toBeTruthy();
    });

    it('reports duration too long when video duration exceeds limit', async () => {
      const file = new File(['content'], 'video.mp4', { type: 'video/mp4' });

      // Mock document.createElement to return a video that reports a long duration
      jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'video') {
          const v: any = {
            preload: '',
            muted: false,
            duration: VIDEO_CONSTRAINTS.MAX_DURATION + 10,
            onloadedmetadata: null as any,
            onerror: null as any,
            src: '',
          } as any;
          // Immediately invoke onloadedmetadata when src is set
          Object.defineProperty(v, 'src', {
            set(_v: string) {
              if (v.onloadedmetadata) v.onloadedmetadata();
            }
          });
          return v as any;
        }
        return originalCreateElement(tag as any);
      });

      URL.createObjectURL = jest.fn().mockReturnValue('blob:fake');
      URL.revokeObjectURL = jest.fn();

      const res = await validateVideoFile(file);
      expect(res.isValid).toBe(false);
      expect(res.errors.some(e => /Video too long/.test(e))).toBeTruthy();
    });

    it('getVideoDuration resolves when metadata loads', async () => {
      // Mock document.createElement to return a controllable video
      let createdVideo: any = {};
      jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'video') {
          createdVideo = {
            preload: '',
            muted: false,
            duration: 4,
            onloadedmetadata: null as any,
            onerror: null as any,
            src: '',
          } as any;
          return createdVideo as any;
        }
        return originalCreateElement(tag as any);
      });

      URL.createObjectURL = jest.fn().mockReturnValue('blob:fake');
      URL.revokeObjectURL = jest.fn();

      const p = getVideoDuration(new File([''], 'v.mp4', { type: 'video/mp4' }));
      // Simulate metadata load
      expect(typeof createdVideo.onloadedmetadata).toBe('function');
      createdVideo.onloadedmetadata();
      const duration = await p;
      expect(duration).toBe(4);
    });

    it('getVideoDuration rejects when createObjectURL throws', async () => {
      URL.createObjectURL = jest.fn().mockImplementation(() => { throw new Error('boom'); });
      URL.revokeObjectURL = jest.fn();
      await expect(getVideoDuration(new File([''], 'v.mp4', { type: 'video/mp4' }))).rejects.toThrow('Failed to create object URL for video file');
    });

    it('generateVideoThumbnail produces a blob on success', async () => {
      // Mock video and canvas behavior
      let createdVideo: any = {};
      let createdCanvas: any = {};
      jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'video') {
          createdVideo = {
            preload: 'metadata',
            muted: true,
            videoWidth: 100,
            videoHeight: 50,
            duration: 5,
            currentTime: 0,
            onloadedmetadata: null as any,
            onseeked: null as any,
            onerror: null as any,
            set src(v: string) {
              // simulate async load
              setTimeout(() => {
                if (createdVideo.onloadedmetadata) createdVideo.onloadedmetadata();
                setTimeout(() => { if (createdVideo.onseeked) createdVideo.onseeked(); }, 0);
              }, 0);
            }
          } as any;
          return createdVideo as any;
        }
        if (tag === 'canvas') {
          createdCanvas = {
            getContext: () => ({ drawImage: () => {} }),
            toBlob: (cb: any) => cb(new Blob(['img'], { type: 'image/jpeg' }))
          } as any;
          return createdCanvas as any;
        }
        return originalCreateElement(tag as any);
      });

      URL.createObjectURL = jest.fn().mockReturnValue('blob:fake');
      URL.revokeObjectURL = jest.fn();

      const blob = await generateVideoThumbnail(new File([''], 'v.mp4', { type: 'video/mp4' }), 1);
      expect(blob).toBeInstanceOf(Blob);
    });

    it('generateVideoThumbnail rejects when canvas context missing', async () => {
      jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
        if (tag === 'video') {
          return { preload: 'metadata', muted: true, videoWidth: 1, videoHeight: 1, duration: 1, onloadedmetadata: null, onseeked: null, set src(v: string) { if (this.onloadedmetadata) this.onloadedmetadata(); if (this.onseeked) this.onseeked(); } } as any;
        }
        if (tag === 'canvas') {
          return { getContext: () => null } as any;
        }
        return originalCreateElement(tag as any);
      });

      URL.createObjectURL = jest.fn().mockReturnValue('blob:fake');
      URL.revokeObjectURL = jest.fn();

      await expect(generateVideoThumbnail(new File([''], 'v.mp4', { type: 'video/mp4' }), 1)).rejects.toThrow('Cannot create canvas context');
    });
  });
});
