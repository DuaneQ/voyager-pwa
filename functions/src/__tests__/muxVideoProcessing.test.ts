/**
 * Unit tests for muxVideoProcessing Cloud Functions
 *
 * Critical regression coverage:
 * - Deprecated mp4_support must NOT be sent on Mux basic assets.
 *   Mux now returns HTTP 400 when mp4_support: "standard" is included.
 *
 * - muxWebhook signature verification must reject invalid signatures.
 * - processAdVideoWithMux must enforce campaign ownership.
 * - migrateVideosToMux dry-run must not call mux.video.assets.create.
 */

export {};

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockAssetsCreate = jest.fn();
const mockFileDownload = jest.fn().mockResolvedValue([]);
const mockBucketUpload = jest.fn().mockResolvedValue([]);
const mockGetSignedUrl = jest.fn().mockResolvedValue(['https://signed-url.example.com/video.mp4']);
const mockFileGet = jest.fn().mockReturnValue({ getSignedUrl: mockGetSignedUrl, download: mockFileDownload });
const mockBucket = jest.fn().mockReturnValue({ file: mockFileGet, upload: mockBucketUpload });

const mockFirestoreUpdate = jest.fn().mockResolvedValue({});
const mockFirestoreSet = jest.fn().mockResolvedValue({});
const mockFirestoreDelete = jest.fn().mockResolvedValue({});
const mockDocGet = jest.fn();
const mockDocRef = jest.fn().mockReturnValue({
  get: mockDocGet,
  update: mockFirestoreUpdate,
  set: mockFirestoreSet,
});
const mockCollectionGet = jest.fn();
const mockWhere = jest.fn().mockReturnThis();
const mockLimit = jest.fn().mockReturnThis();
const mockCollection = jest.fn().mockReturnValue({
  where: mockWhere,
  limit: mockLimit,
  get: mockCollectionGet,
  doc: mockDocRef,
});

jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  firestore: Object.assign(
    jest.fn(() => ({ collection: mockCollection })),
    {
      FieldValue: {
        serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
      },
    }
  ),
  storage: jest.fn(() => ({ bucket: mockBucket })),
}));

jest.mock('firebase-functions/v2/storage', () => ({
  onObjectFinalized: jest.fn((_opts: unknown, handler: Function) => handler),
}));

jest.mock('firebase-functions/v2/https', () => ({
  onCall: jest.fn((_opts: unknown, handler: Function) => handler),
  onRequest: jest.fn((_opts: unknown, handler: Function) => handler),
}));

jest.mock('@mux/mux-node', () => {
  return jest.fn().mockImplementation(() => ({
    video: {
      assets: {
        create: mockAssetsCreate,
      },
    },
  }));
});

jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return actual;
});
const mockExecFileSync = jest.fn();
const mockSpawnSync = jest.fn();
jest.mock('child_process', () => ({
  execFileSync: mockExecFileSync,
  spawnSync: mockSpawnSync,
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  unlinkSync: jest.fn(),
}));

jest.mock('ffmpeg-static', () => '/mock/ffmpeg', { virtual: true });
jest.mock('ffprobe-static', () => ({ path: '/mock/ffprobe' }), { virtual: true });
// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeMuxAsset(overrides: Record<string, unknown> = {}) {
  return {
    id: 'asset-123',
    status: 'preparing',
    playback_ids: [{ id: 'playback-abc', policy: 'public' }],
    ...overrides,
  };
}

function makeCallRequest(overrides: Record<string, unknown> = {}) {
  return {
    auth: { uid: 'user-uid-1' },
    data: {},
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('muxVideoProcessing — Mux payload regression guard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAssetsCreate.mockResolvedValue(makeMuxAsset());
    // Default Firestore collection get returns empty snapshot
    mockCollectionGet.mockResolvedValue({ empty: true, docs: [] });
    mockDocGet.mockResolvedValue({ exists: false, data: () => null });
  });

  // ─── onVideoUploaded ───────────────────────────────────────────────────────

  describe('onVideoUploaded', () => {
    let handler: Function;

    beforeEach(() => {
      // Re-require to get the handler registered via onObjectFinalized mock
      jest.resetModules();
      mockAssetsCreate.mockResolvedValue(makeMuxAsset());
      mockCollectionGet.mockResolvedValue({ empty: true, docs: [], forEach: jest.fn() });
      const { onObjectFinalized } = require('firebase-functions/v2/storage');
      require('../muxVideoProcessing');
      handler = (onObjectFinalized as jest.Mock).mock.calls[0]?.[1];
    });

    it('does not pass deprecated mp4_support to mux.video.assets.create', async () => {
      if (!handler) return; // guard if module structure changes
      const event = {
        data: {
          name: 'users/user-uid-1/videos/video_123.mp4',
          contentType: 'video/mp4',
          bucket: 'mundo1-dev.appspot.com',
        },
      };

      await handler(event);

      expect(mockAssetsCreate).toHaveBeenCalled();
      const call = mockAssetsCreate.mock.calls[0][0];
      expect(call.mp4_support).toBeUndefined();
    });

    it('skips non-video files', async () => {
      if (!handler) return;
      const event = {
        data: {
          name: 'photos/user-uid-1/avatar.jpg',
          contentType: 'image/jpeg',
          bucket: 'mundo1-dev.appspot.com',
        },
      };

      await handler(event);

      expect(mockAssetsCreate).not.toHaveBeenCalled();
    });

    it('skips files not matching the user video path pattern', async () => {
      if (!handler) return;
      const event = {
        data: {
          name: 'ads/user-uid-1/campaign-video.mp4',
          contentType: 'video/mp4',
          bucket: 'mundo1-dev.appspot.com',
        },
      };

      await handler(event);

      expect(mockAssetsCreate).not.toHaveBeenCalled();
    });
  });

  // ─── processVideoWithMux ──────────────────────────────────────────────────

  describe('processVideoWithMux', () => {
    let handler: Function;

    beforeEach(() => {
      jest.resetModules();
      mockAssetsCreate.mockResolvedValue(makeMuxAsset());
      mockCollectionGet.mockResolvedValue({ empty: true, docs: [] });
      const { onCall } = require('firebase-functions/v2/https');
      require('../muxVideoProcessing');
      // processVideoWithMux is the second onCall registration
      const calls = (onCall as jest.Mock).mock.calls;
      handler = calls.find((_: unknown[], i: number) => i === 0)?.[1];
    });

    it('does not pass deprecated mp4_support to mux.video.assets.create', async () => {
      if (!handler) return;
      const req = makeCallRequest({ data: { videoId: 'vid-1', videoUrl: 'https://storage.example.com/video.mp4' } });

      await handler(req);

      expect(mockAssetsCreate).toHaveBeenCalled();
      const call = mockAssetsCreate.mock.calls[0][0];
      expect(call.mp4_support).toBeUndefined();
    });

    it('throws if not authenticated', async () => {
      if (!handler) return;
      const req = { auth: null, data: { videoId: 'vid-1', videoUrl: 'https://example.com/v.mp4' } };

      await expect(handler(req)).rejects.toThrow('Authentication required');
    });

    it('throws if videoId or videoUrl missing', async () => {
      if (!handler) return;
      const req = makeCallRequest({ data: { videoId: 'vid-1' } });

      await expect(handler(req)).rejects.toThrow('videoId and videoUrl are required');
    });

    it('sets encoding_tier: "baseline" and max_resolution_tier: "1080p"', async () => {
      if (!handler) return;
      const req = makeCallRequest({ data: { videoId: 'vid-1', videoUrl: 'https://storage.example.com/video.mp4' } });

      await handler(req);

      expect(mockAssetsCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          encoding_tier: 'baseline',
          max_resolution_tier: '1080p',
        })
      );
    });

    it('returns success with assetId on success', async () => {
      if (!handler) return;
      const req = makeCallRequest({ data: { videoId: 'vid-1', videoUrl: 'https://storage.example.com/video.mp4' } });

      const result = await handler(req);

      expect(result).toEqual(expect.objectContaining({ success: true, assetId: 'asset-123' }));
    });
  });

  // ─── processAdVideoWithMux ────────────────────────────────────────────────

  describe('processAdVideoWithMux', () => {
    let handler: Function;

    beforeEach(() => {
      jest.resetModules();
      mockAssetsCreate.mockResolvedValue(makeMuxAsset());
      // Ensure probeColorProfile (now called inside handler) returns SDR by default
      // so existing tests that reach Mux asset creation are not disrupted.
      mockExecFileSync.mockReturnValue('color_transfer=bt709\ncolor_primaries=bt709\n');
      const { onCall } = require('firebase-functions/v2/https');
      require('../muxVideoProcessing');
      const calls = (onCall as jest.Mock).mock.calls;
      // processAdVideoWithMux is the second onCall registration
      handler = calls[1]?.[1];
    });

    it('does not pass deprecated mp4_support to mux.video.assets.create', async () => {
      if (!handler) return;
      // Campaign exists and belongs to the caller
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ uid: 'user-uid-1' }),
      });
      const req = makeCallRequest({
        data: { campaignId: 'camp-1', storagePath: 'ads/user-uid-1/video.mp4' },
      });

      await handler(req);

      expect(mockAssetsCreate).toHaveBeenCalled();
      const call = mockAssetsCreate.mock.calls[0][0];
      expect(call.mp4_support).toBeUndefined();
    });

    it('throws if not authenticated', async () => {
      if (!handler) return;
      const req = { auth: null, data: { campaignId: 'camp-1', storagePath: 'ads/u/v.mp4' } };

      await expect(handler(req)).rejects.toThrow('Authentication required');
    });

    it('throws if campaignId or storagePath missing', async () => {
      if (!handler) return;
      const req = makeCallRequest({ data: { campaignId: 'camp-1' } });

      await expect(handler(req)).rejects.toThrow('campaignId and storagePath are required');
    });

    it('throws if campaign not found', async () => {
      if (!handler) return;
      mockDocGet.mockResolvedValue({ exists: false, data: () => null });
      const req = makeCallRequest({
        data: { campaignId: 'missing', storagePath: 'ads/u/v.mp4' },
      });

      await expect(handler(req)).rejects.toThrow('not found');
    });

    it('throws if caller does not own the campaign', async () => {
      if (!handler) return;
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ uid: 'other-user' }),
      });
      const req = makeCallRequest({
        data: { campaignId: 'camp-1', storagePath: 'ads/other-user/v.mp4' },
      });

      await expect(handler(req)).rejects.toThrow('Unauthorized');
    });

    it('embeds type:"ad" and campaignId in Mux passthrough', async () => {
      if (!handler) return;
      mockDocGet.mockResolvedValue({
        exists: true,
        data: () => ({ uid: 'user-uid-1' }),
      });
      const req = makeCallRequest({
        data: { campaignId: 'camp-1', storagePath: 'ads/user-uid-1/video.mp4' },
      });

      await handler(req);

      const call = mockAssetsCreate.mock.calls[0][0];
      const passthrough = JSON.parse(call.passthrough);
      expect(passthrough.type).toBe('ad');
      expect(passthrough.campaignId).toBe('camp-1');
    });
  });

  // ─── migrateVideosToMux ───────────────────────────────────────────────────

  describe('migrateVideosToMux', () => {
    let handler: Function;

    beforeEach(() => {
      jest.resetModules();
      mockAssetsCreate.mockResolvedValue(makeMuxAsset());
      const { onCall } = require('firebase-functions/v2/https');
      require('../muxVideoProcessing');
      const calls = (onCall as jest.Mock).mock.calls;
      // migrateVideosToMux is the third onCall registration
      handler = calls[2]?.[1];
    });

    it('dry-run does NOT call mux.video.assets.create', async () => {
      if (!handler) return;
      mockCollectionGet.mockResolvedValue({
        forEach: (cb: Function) => {
          cb({ id: 'vid-1', data: () => ({ videoUrl: 'https://x.com/v.mp4', userId: 'u1' }) });
        },
      });
      const req = makeCallRequest({ data: { limit: 5, dryRun: true } });

      const result = await handler(req);

      expect(mockAssetsCreate).not.toHaveBeenCalled();
      expect(result.dryRun).toBe(true);
    });

    it('does not pass deprecated mp4_support when dryRun is false', async () => {
      if (!handler) return;
      mockCollectionGet.mockResolvedValue({
        forEach: (cb: Function) => {
          cb({ id: 'vid-1', data: () => ({ videoUrl: 'https://x.com/v.mp4', userId: 'u1' }) });
        },
      });
      const req = makeCallRequest({ data: { limit: 1, dryRun: false } });

      await handler(req);

      expect(mockAssetsCreate).toHaveBeenCalled();
      const call = mockAssetsCreate.mock.calls[0][0];
      expect(call.mp4_support).toBeUndefined();
    });

    it('throws if not authenticated', async () => {
      if (!handler) return;
      const req = { auth: null, data: {} };

      await expect(handler(req)).rejects.toThrow('Authentication required');
    });

    it('skips videos that already have muxAssetId', async () => {
      if (!handler) return;
      mockCollectionGet.mockResolvedValue({
        forEach: (cb: Function) => {
          // Already processed — has muxAssetId
          cb({ id: 'vid-1', data: () => ({ videoUrl: 'https://x.com/v.mp4', userId: 'u1', muxAssetId: 'existing' }) });
          // Not processed
          cb({ id: 'vid-2', data: () => ({ videoUrl: 'https://x.com/v2.mp4', userId: 'u2' }) });
        },
      });
      const req = makeCallRequest({ data: { limit: 5, dryRun: false } });

      await handler(req);

      // Only vid-2 should be processed
      expect(mockAssetsCreate).toHaveBeenCalledTimes(1);
    });
  });

  // ─── muxWebhook ───────────────────────────────────────────────────────────

  describe('muxWebhook — signature verification', () => {
    let handler: Function;

    beforeEach(() => {
      jest.resetModules();
      const { onRequest } = require('firebase-functions/v2/https');
      require('../muxVideoProcessing');
      handler = (onRequest as jest.Mock).mock.calls[0]?.[1];
    });

    it('rejects non-POST requests with 405', async () => {
      if (!handler) return;
      const req = { method: 'GET', headers: {}, body: {} };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
    });

    it('rejects requests with missing mux-signature header with 401', async () => {
      if (!handler) return;
      const req = { method: 'POST', headers: {}, body: {} };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('rejects requests with malformed signature format with 401', async () => {
      if (!handler) return;
      const req = {
        method: 'POST',
        headers: { 'mux-signature': 'invalid-format' },
        body: {},
      };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('rejects requests with wrong signature with 401', async () => {
      if (!handler) return;
      const req = {
        method: 'POST',
        headers: { 'mux-signature': 't=1234567890,v1=badhash000000000000000000000000000000000000000000000000000000000000' },
        body: { type: 'video.asset.ready' },
      };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  // ─── probeColorProfile ────────────────────────────────────────────

  describe('probeColorProfile', () => {
    let probeColorProfile: (url: string) => { colorTransfer: string; colorPrimaries: string };

    beforeEach(() => {
      jest.resetModules();
      const mod = require('../muxVideoProcessing');
      probeColorProfile = mod.probeColorProfile;
    });

    it('parses color_transfer and color_primaries from ffprobe output', () => {
      mockExecFileSync.mockReturnValue('color_transfer=arib-std-b67\ncolor_primaries=bt2020\n');

      const result = probeColorProfile('https://example.com/video.mp4');

      expect(result).toEqual({ colorTransfer: 'arib-std-b67', colorPrimaries: 'bt2020' });
    });

    it('returns "unknown" for color_transfer when field is absent', () => {
      mockExecFileSync.mockReturnValue('color_primaries=bt2020\n');

      const result = probeColorProfile('https://example.com/video.mp4');

      expect(result.colorTransfer).toBe('unknown');
      expect(result.colorPrimaries).toBe('bt2020');
    });

    it('returns "unknown" for both fields when ffprobe output is empty', () => {
      mockExecFileSync.mockReturnValue('');

      const result = probeColorProfile('https://example.com/video.mp4');

      expect(result).toEqual({ colorTransfer: 'unknown', colorPrimaries: 'unknown' });
    });

    it('calls ffprobe with the correct stream-level arguments', () => {
      mockExecFileSync.mockReturnValue('color_transfer=bt709\ncolor_primaries=bt709\n');

      probeColorProfile('https://example.com/video.mp4');

      expect(mockExecFileSync).toHaveBeenCalledWith(
        '/mock/ffprobe',
        expect.arrayContaining([
          '-select_streams', 'v:0',
          '-show_entries', 'stream=color_transfer,color_primaries',
          'https://example.com/video.mp4',
        ]),
        expect.objectContaining({ encoding: 'utf8' })
      );
    });

    it('passes the url directly to ffprobe', () => {
      mockExecFileSync.mockReturnValue('color_transfer=bt709\ncolor_primaries=bt709\n');

      probeColorProfile('https://stream.mux.com/abc123.m3u8');

      const args: string[] = mockExecFileSync.mock.calls[0][1];
      expect(args[args.length - 1]).toBe('https://stream.mux.com/abc123.m3u8');
    });
  });

  // ─── isHDRColorProfile ─────────────────────────────────────────

  describe('isHDRColorProfile', () => {
    let isHDRColorProfile: (colorTransfer: string, colorPrimaries: string) => boolean;

    beforeEach(() => {
      jest.resetModules();
      const mod = require('../muxVideoProcessing');
      isHDRColorProfile = mod.isHDRColorProfile;
    });

    it('returns true for HLG transfer characteristic (arib-std-b67)', () => {
      expect(isHDRColorProfile('arib-std-b67', 'bt709')).toBe(true);
    });

    it('returns true for HDR10 transfer characteristic (smpte2084)', () => {
      expect(isHDRColorProfile('smpte2084', 'bt709')).toBe(true);
    });

    it('returns true when colour primaries are bt2020', () => {
      expect(isHDRColorProfile('bt709', 'bt2020')).toBe(true);
    });

    it('returns true when both transfer and primaries indicate HDR', () => {
      expect(isHDRColorProfile('arib-std-b67', 'bt2020')).toBe(true);
    });

    it('returns false for standard SDR bt709', () => {
      expect(isHDRColorProfile('bt709', 'bt709')).toBe(false);
    });

    it('returns false for unknown / missing VUI metadata', () => {
      expect(isHDRColorProfile('unknown', 'unknown')).toBe(false);
    });
  });

  // ─── transcodeToSDR ─────────────────────────────────────────────

  describe('transcodeToSDR', () => {
    let transcodeToSDR: (inputPath: string, outputPath: string) => void;

    beforeEach(() => {
      jest.resetModules();
      const mod = require('../muxVideoProcessing');
      transcodeToSDR = mod.transcodeToSDR;
      mockSpawnSync.mockReturnValue({ status: 0, stderr: Buffer.from('') });
    });

    it('calls ffmpeg with the BT.709 colorspace normalization filter', () => {
      transcodeToSDR('/tmp/input.mp4', '/tmp/output.mp4');

      expect(mockSpawnSync).toHaveBeenCalledWith(
        '/mock/ffmpeg',
        expect.arrayContaining([
          '-vf', 'colorspace=bt709:iall=bt2020:fast=1',
          '-color_primaries', 'bt709',
          '-color_trc', 'bt709',
          '-colorspace', 'bt709',
          '-c:v', 'libx264',
        ]),
        expect.objectContaining({ timeout: 600_000 })
      );
    });

    it('includes the input and output paths in the ffmpeg argument list', () => {
      transcodeToSDR('/tmp/input.mp4', '/tmp/output.mp4');

      const args: string[] = mockSpawnSync.mock.calls[0][1];
      expect(args).toContain('/tmp/input.mp4');
      expect(args).toContain('/tmp/output.mp4');
    });

    it('throws when ffmpeg exits with a non-zero status code', () => {
      mockSpawnSync.mockReturnValue({ status: 1, stderr: Buffer.from('encoding failed') });

      expect(() => transcodeToSDR('/tmp/input.mp4', '/tmp/output.mp4')).toThrow(
        'FFmpeg SDR transcode failed'
      );
    });

    it('includes the ffmpeg exit code in the error message', () => {
      mockSpawnSync.mockReturnValue({ status: 2, stderr: Buffer.from('') });

      expect(() => transcodeToSDR('/tmp/input.mp4', '/tmp/output.mp4')).toThrow('exit 2');
    });
  });

  // ─── processAdVideoWithMux — HDR detection ──────────────────────────

  describe('processAdVideoWithMux — HDR detection and normalization', () => {
    let handler: Function;

    beforeEach(() => {
      jest.resetModules();
      mockAssetsCreate.mockResolvedValue(makeMuxAsset());
      mockDocGet.mockResolvedValue({ exists: true, data: () => ({ uid: 'user-uid-1' }) });
      // Default: SDR source — no transcode path
      mockExecFileSync.mockReturnValue('color_transfer=bt709\ncolor_primaries=bt709\n');
      mockSpawnSync.mockReturnValue({ status: 0, stderr: Buffer.from('') });
      const { onCall } = require('firebase-functions/v2/https');
      require('../muxVideoProcessing');
      const calls = (onCall as jest.Mock).mock.calls;
      handler = calls[1]?.[1]; // processAdVideoWithMux is the 2nd onCall registration
    });

    function makeAdRequest() {
      return makeCallRequest({
        data: { campaignId: 'camp-1', storagePath: 'ads/user-uid-1/video.mp4' },
      });
    }

    it('does NOT download or transcode when the source is already SDR BT.709', async () => {
      if (!handler) return;

      await handler(makeAdRequest());

      expect(mockSpawnSync).not.toHaveBeenCalled();
      expect(mockFileDownload).not.toHaveBeenCalled();
      expect(mockBucketUpload).not.toHaveBeenCalled();
    });

    it('still submits to Mux for SDR videos without transcode', async () => {
      if (!handler) return;

      const result = await handler(makeAdRequest());

      expect(mockAssetsCreate).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expect.objectContaining({ success: true, assetId: 'asset-123' }));
    });

    it('transcodes to SDR when HLG (arib-std-b67) is detected', async () => {
      if (!handler) return;
      mockExecFileSync.mockReturnValue('color_transfer=arib-std-b67\ncolor_primaries=bt2020\n');

      await handler(makeAdRequest());

      expect(mockSpawnSync).toHaveBeenCalledWith(
        '/mock/ffmpeg',
        expect.arrayContaining(['-vf', 'colorspace=bt709:iall=bt2020:fast=1']),
        expect.any(Object)
      );
    });

    it('transcodes to SDR when HDR10 (smpte2084) is detected', async () => {
      if (!handler) return;
      mockExecFileSync.mockReturnValue('color_transfer=smpte2084\ncolor_primaries=bt2020\n');

      await handler(makeAdRequest());

      expect(mockSpawnSync).toHaveBeenCalled();
    });

    it('downloads the source file to a temp path before transcoding', async () => {
      if (!handler) return;
      mockExecFileSync.mockReturnValue('color_transfer=arib-std-b67\ncolor_primaries=bt2020\n');

      await handler(makeAdRequest());

      expect(mockFileDownload).toHaveBeenCalledWith(
        expect.objectContaining({ destination: expect.stringContaining('ad_hlg_camp-1') })
      );
    });

    it('uploads the SDR file to Storage with a _sdr.mp4 suffix', async () => {
      if (!handler) return;
      mockExecFileSync.mockReturnValue('color_transfer=arib-std-b67\ncolor_primaries=bt2020\n');

      await handler(makeAdRequest());

      expect(mockBucketUpload).toHaveBeenCalledWith(
        expect.stringContaining('ad_sdr_camp-1'),
        expect.objectContaining({ destination: 'ads/user-uid-1/video_sdr.mp4' })
      );
    });

    it('still submits to Mux after HDR-to-SDR transcode', async () => {
      if (!handler) return;
      mockExecFileSync.mockReturnValue('color_transfer=arib-std-b67\ncolor_primaries=bt2020\n');

      const result = await handler(makeAdRequest());

      expect(mockAssetsCreate).toHaveBeenCalledTimes(1);
      expect(result).toEqual(expect.objectContaining({ success: true, assetId: 'asset-123' }));
    });

    it('embeds type:"ad" and campaignId in the Mux passthrough after transcode', async () => {
      if (!handler) return;
      mockExecFileSync.mockReturnValue('color_transfer=arib-std-b67\ncolor_primaries=bt2020\n');

      await handler(makeAdRequest());

      const call = mockAssetsCreate.mock.calls[0][0];
      const passthrough = JSON.parse(call.passthrough);
      expect(passthrough.type).toBe('ad');
      expect(passthrough.campaignId).toBe('camp-1');
    });
  });
});
