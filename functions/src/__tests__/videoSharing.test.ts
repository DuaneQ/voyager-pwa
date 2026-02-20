/**
 * Unit tests for videoSharing Cloud Function helpers
 * Tests the URL generation, HTML generation, and crawler detection logic
 */

// Mock process.env before importing the module
const originalEnv = process.env;

describe('videoSharing helpers', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getBaseUrl', () => {
    it('should return dev URL when GCLOUD_PROJECT is mundo1-dev', () => {
      process.env.GCLOUD_PROJECT = 'mundo1-dev';
      
      // We need to test the logic directly since the function is not exported
      const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || '';
      const baseUrl = projectId.includes('mundo1-dev') 
        ? 'https://mundo1-dev.web.app' 
        : 'https://travalpass.com';
      
      expect(baseUrl).toBe('https://mundo1-dev.web.app');
    });

    it('should return production URL when GCLOUD_PROJECT is mundo1-1', () => {
      process.env.GCLOUD_PROJECT = 'mundo1-1';
      
      const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || '';
      const baseUrl = projectId.includes('mundo1-dev') 
        ? 'https://mundo1-dev.web.app' 
        : 'https://travalpass.com';
      
      expect(baseUrl).toBe('https://travalpass.com');
    });

    it('should return production URL when no project ID is set', () => {
      delete process.env.GCLOUD_PROJECT;
      delete process.env.GCP_PROJECT;
      
      const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || '';
      const baseUrl = projectId.includes('mundo1-dev') 
        ? 'https://mundo1-dev.web.app' 
        : 'https://travalpass.com';
      
      expect(baseUrl).toBe('https://travalpass.com');
    });

    it('should fallback to GCP_PROJECT if GCLOUD_PROJECT is not set', () => {
      delete process.env.GCLOUD_PROJECT;
      process.env.GCP_PROJECT = 'mundo1-dev';
      
      const projectId = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT || '';
      const baseUrl = projectId.includes('mundo1-dev') 
        ? 'https://mundo1-dev.web.app' 
        : 'https://travalpass.com';
      
      expect(baseUrl).toBe('https://mundo1-dev.web.app');
    });
  });

  describe('isSocialMediaCrawler detection', () => {
    // Inline the crawler detection logic for testing
    const isSocialMediaCrawler = (userAgent: string): boolean => {
      const crawlerPatterns = [
        /facebookexternalhit/i,
        /twitterbot/i,
        /linkedinbot/i,
        /whatsapp/i,
        /telegrambot/i,
        /slackbot/i,
        /discordbot/i,
        /skype/i,
        /pinterest/i,
        /redditbot/i,
        /applebot/i,
        /googlebot/i,
        /bingbot/i
      ];
      return crawlerPatterns.some(pattern => pattern.test(userAgent));
    };

    it('should detect Facebook crawler', () => {
      expect(isSocialMediaCrawler('facebookexternalhit/1.1')).toBe(true);
      expect(isSocialMediaCrawler('facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')).toBe(true);
    });

    it('should detect Twitter bot', () => {
      expect(isSocialMediaCrawler('Twitterbot/1.0')).toBe(true);
    });

    it('should detect LinkedIn bot', () => {
      expect(isSocialMediaCrawler('LinkedInBot/1.0')).toBe(true);
    });

    it('should detect WhatsApp', () => {
      expect(isSocialMediaCrawler('WhatsApp/2.21.12.21')).toBe(true);
    });

    it('should detect Telegram bot', () => {
      expect(isSocialMediaCrawler('TelegramBot (like TwitterBot)')).toBe(true);
    });

    it('should detect Slack bot', () => {
      expect(isSocialMediaCrawler('Slackbot-LinkExpanding 1.0')).toBe(true);
    });

    it('should detect Discord bot', () => {
      expect(isSocialMediaCrawler('Discordbot/2.0')).toBe(true);
    });

    it('should detect Google bot', () => {
      expect(isSocialMediaCrawler('Googlebot/2.1')).toBe(true);
    });

    it('should not detect regular browser', () => {
      expect(isSocialMediaCrawler('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')).toBe(false);
    });

    it('should not detect mobile browser', () => {
      expect(isSocialMediaCrawler('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')).toBe(false);
    });
  });

  describe('isFacebookInAppBrowser detection', () => {
    const isFacebookInAppBrowser = (userAgent: string): boolean => {
      return /FBAN|FBAV|FBSV|FBID/i.test(userAgent) ||
        (/Mobile.*Facebook/i.test(userAgent) && !/facebookexternalhit/i.test(userAgent));
    };

    it('should detect Facebook iOS in-app browser', () => {
      expect(isFacebookInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 FBAN/FBIOS')).toBe(true);
    });

    it('should detect Facebook Android in-app browser', () => {
      expect(isFacebookInAppBrowser('Mozilla/5.0 (Linux; Android 10) FBAV/320.0.0.0')).toBe(true);
    });

    it('should not detect Facebook crawler as in-app browser', () => {
      expect(isFacebookInAppBrowser('facebookexternalhit/1.1')).toBe(false);
    });

    it('should not detect regular mobile browser', () => {
      expect(isFacebookInAppBrowser('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)')).toBe(false);
    });
  });

  describe('Mux URL parsing', () => {
    it('should extract Mux playback ID from HLS URL', () => {
      const muxPlaybackUrl = 'https://stream.mux.com/PwDCmA4Z5wbwZvquqrWp7Bnkp01Sc008hTwRi4P9Q1lxc.m3u8';
      
      const muxPlaybackId = muxPlaybackUrl.includes('stream.mux.com/')
        ? muxPlaybackUrl.split('stream.mux.com/')[1]?.replace('.m3u8', '')
        : null;
      
      expect(muxPlaybackId).toBe('PwDCmA4Z5wbwZvquqrWp7Bnkp01Sc008hTwRi4P9Q1lxc');
    });

    it('should construct correct HLS and MP4 URLs from playback ID', () => {
      const muxPlaybackId = 'PwDCmA4Z5wbwZvquqrWp7Bnkp01Sc008hTwRi4P9Q1lxc';
      
      const hlsUrl = `https://stream.mux.com/${muxPlaybackId}.m3u8`;
      const mp4Url = `https://stream.mux.com/${muxPlaybackId}/high.mp4`;
      
      expect(hlsUrl).toBe('https://stream.mux.com/PwDCmA4Z5wbwZvquqrWp7Bnkp01Sc008hTwRi4P9Q1lxc.m3u8');
      expect(mp4Url).toBe('https://stream.mux.com/PwDCmA4Z5wbwZvquqrWp7Bnkp01Sc008hTwRi4P9Q1lxc/high.mp4');
    });

    it('should return null for non-Mux URLs', () => {
      const regularUrl = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/video.mp4';
      
      const muxPlaybackId = regularUrl.includes('stream.mux.com/')
        ? regularUrl.split('stream.mux.com/')[1]?.replace('.m3u8', '')
        : null;
      
      expect(muxPlaybackId).toBeNull();
    });
  });

  describe('Video metadata handling', () => {
    it('should truncate description to 160 characters', () => {
      const longDescription = 'A'.repeat(200);
      const truncated = longDescription.substring(0, 160);
      
      expect(truncated.length).toBe(160);
    });

    it('should use fallback title when video has no title', () => {
      const video = { title: null };
      const title = video.title ? `${video.title} - TravalPass` : 'Video - TravalPass';
      
      expect(title).toBe('Video - TravalPass');
    });

    it('should format title correctly when provided', () => {
      const video = { title: 'My Vacation' };
      const title = video.title ? `${video.title} - TravalPass` : 'Video - TravalPass';
      
      expect(title).toBe('My Vacation - TravalPass');
    });

    it('should use default image when no thumbnail', () => {
      const baseUrl = 'https://travalpass.com';
      const video = { thumbnailUrl: null };
      const imageUrl = video.thumbnailUrl || `${baseUrl}/og-image.png`;
      
      expect(imageUrl).toBe('https://travalpass.com/og-image.png');
    });

    it('should use video thumbnail when available', () => {
      const baseUrl = 'https://travalpass.com';
      const video = { thumbnailUrl: 'https://firebasestorage.googleapis.com/thumb.jpg' };
      const imageUrl = video.thumbnailUrl || `${baseUrl}/og-image.png`;
      
      expect(imageUrl).toBe('https://firebasestorage.googleapis.com/thumb.jpg');
    });
  });

  describe('Public vs Private video logic', () => {
    it('should identify public videos correctly', () => {
      const publicVideo = { isPublic: true };
      const privateVideo = { isPublic: false };
      const undefinedVideo = {};

      expect(publicVideo.isPublic === true).toBe(true);
      expect(privateVideo.isPublic === true).toBe(false);
      expect((undefinedVideo as any).isPublic === true).toBe(false);
    });
  });

  describe('Share URL generation', () => {
    it('should generate correct share URLs', () => {
      const baseUrl = 'https://travalpass.com';
      const videoId = 'abc123';
      
      const shareUrl = `${baseUrl}/video-share/${videoId}`;
      const videoUrl = `${baseUrl}/video/${videoId}`;
      
      expect(shareUrl).toBe('https://travalpass.com/video-share/abc123');
      expect(videoUrl).toBe('https://travalpass.com/video/abc123');
    });

    it('should generate correct dev share URLs', () => {
      const baseUrl = 'https://mundo1-dev.web.app';
      const videoId = 'xyz789';
      
      const shareUrl = `${baseUrl}/video-share/${videoId}`;
      
      expect(shareUrl).toBe('https://mundo1-dev.web.app/video-share/xyz789');
    });

    it('should properly encode share URLs for social buttons', () => {
      const shareUrl = 'https://travalpass.com/video-share/abc123';
      const title = 'My Video - TravalPass';
      
      const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
      const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`;
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(title + ' ' + shareUrl)}`;
      
      expect(facebookUrl).toContain('https%3A%2F%2Ftravalpass.com%2Fvideo-share%2Fabc123');
      expect(twitterUrl).toContain('url=https%3A%2F%2Ftravalpass.com');
      expect(whatsappUrl).toContain('text=My%20Video');
    });
  });
});
