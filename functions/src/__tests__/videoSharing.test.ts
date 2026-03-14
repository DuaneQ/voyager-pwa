import * as admin from 'firebase-admin';
import { 
  isSocialMediaCrawler, 
  isFacebookInAppBrowser, 
  generatePublicVideoPlayerHTML,
  getBaseUrl
} from '../videoSharing';

// Mock firebase-admin
jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  firestore: jest.fn(() => ({
    collection: jest.fn(),
  })),
}));

// Mock firebase-functions
jest.mock('firebase-functions/v1', () => ({
  https: {
    onRequest: jest.fn(),
  },
}));

describe('videoSharing Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isSocialMediaCrawler', () => {
    it('should identify Facebook crawler', () => {
      expect(isSocialMediaCrawler('facebookexternalhit/1.1')).toBe(true);
    });

    it('should identify Twitter bot', () => {
      expect(isSocialMediaCrawler('Twitterbot/1.0')).toBe(true);
    });

    it('should return false for regular Chrome', () => {
      expect(isSocialMediaCrawler('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/100.0.0.0')).toBe(false);
    });
  });

  describe('isFacebookInAppBrowser', () => {
    it('should identify Facebook IAB', () => {
      expect(isFacebookInAppBrowser('Mozilla/5.0 ... FBAN/FBIOS ...')).toBe(true);
    });

    it('should return false for regular browsers', () => {
      expect(isFacebookInAppBrowser('Mozilla/5.0 (iPhone; ...)')).toBe(false);
    });
  });

  describe('getBaseUrl', () => {
    it('should return dev url for mundo1-dev', () => {
      process.env.GCLOUD_PROJECT = 'mundo1-dev';
      expect(getBaseUrl()).toBe('https://mundo1-dev.web.app');
    });

    it('should return prod url for other projects', () => {
      process.env.GCLOUD_PROJECT = 'mundo1-1';
      expect(getBaseUrl()).toBe('https://travalpass.com');
    });
  });

  describe('generatePublicVideoPlayerHTML', () => {
    const mockVideo = {
      title: 'Test Video',
      description: 'A test video description',
      thumbnailUrl: 'https://example.com/thumb.jpg',
      videoUrl: 'https://example.com/video.mp4',
      muxPlaybackId: 'test-mux-id'
    };
    const videoId = 'test-video-id';

    it('should include basic OG tags', () => {
      const html = generatePublicVideoPlayerHTML(mockVideo, videoId);
      expect(html).toContain('<meta property="og:title" content="Test Video - TravalPass">');
      expect(html).toContain('<meta property="og:description" content="A test video description">');
      expect(html).toContain('<meta property="og:image" content="https://example.com/thumb.jpg">');
      expect(html).toContain('<meta property="og:type" content="video.other">');
    });

    it('should generate secure video tags with Mux MP4', () => {
        const html = generatePublicVideoPlayerHTML(mockVideo, videoId);
        // Should use Mux high.mp4
        expect(html).toContain('content="https://stream.mux.com/test-mux-id/high.mp4"');
        expect(html).toContain('<meta property="og:video:type" content="video/mp4">');
        expect(html).toContain('<meta property="og:video:secure_url"');
    });

    it('should generate video player source tags', () => {
        const html = generatePublicVideoPlayerHTML(mockVideo, videoId);
        // Should have source tag for MP4
        expect(html).toContain('<source src="https://stream.mux.com/test-mux-id/high.mp4" type="video/mp4">');
        // Should have source tag for HLS
        expect(html).toContain('<source src="https://stream.mux.com/test-mux-id.m3u8" type="application/vnd.apple.mpegurl">');
    });

    it('should fallback to videoUrl if muxPlaybackId is missing', () => {
        const noMuxVideo = { ...mockVideo, muxPlaybackId: null, muxPlaybackUrl: null };
        const html = generatePublicVideoPlayerHTML(noMuxVideo, videoId);
        expect(html).toContain('content="https://example.com/video.mp4"');
        expect(html).toContain('<source src="https://example.com/video.mp4" type="video/mp4">');
    });

    it('should extract muxPlaybackId from muxPlaybackUrl if needed', () => {
        const urlVideo = { 
            ...mockVideo, 
            muxPlaybackId: null, 
            muxPlaybackUrl: 'https://stream.mux.com/extracted-id.m3u8' 
        };
        const html = generatePublicVideoPlayerHTML(urlVideo, videoId);
        expect(html).toContain('content="https://stream.mux.com/extracted-id/high.mp4"');
    });
  });
});
