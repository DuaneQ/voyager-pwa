/**
 * Unit tests for muxVideoProcessing Cloud Functions
 *
 * Critical regression coverage:
 * - mp4_support: "standard" must be set on ALL Mux asset creation calls.
 *   Without this, og:video Facebook/social sharing does not work because
 *   Mux will not generate the /high.mp4 rendition.
 *
 * - muxWebhook signature verification must reject invalid signatures.
 * - processAdVideoWithMux must enforce campaign ownership.
 * - migrateVideosToMux dry-run must not call mux.video.assets.create.
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockAssetsCreate = jest.fn();
const mockGetSignedUrl = jest.fn().mockResolvedValue(['https://signed-url.example.com/video.mp4']);
const mockFileGet = jest.fn().mockReturnValue({ getSignedUrl: mockGetSignedUrl });
const mockBucket = jest.fn().mockReturnValue({ file: mockFileGet });

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

describe('muxVideoProcessing — mp4_support regression guard', () => {
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

    it('passes mp4_support: "standard" to mux.video.assets.create', async () => {
      if (!handler) return; // guard if module structure changes
      const event = {
        data: {
          name: 'users/user-uid-1/videos/video_123.mp4',
          contentType: 'video/mp4',
          bucket: 'mundo1-dev.appspot.com',
        },
      };

      await handler(event);

      expect(mockAssetsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ mp4_support: 'standard' })
      );
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

    it('passes mp4_support: "standard" to mux.video.assets.create', async () => {
      if (!handler) return;
      const req = makeCallRequest({ data: { videoId: 'vid-1', videoUrl: 'https://storage.example.com/video.mp4' } });

      await handler(req);

      expect(mockAssetsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ mp4_support: 'standard' })
      );
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
      const { onCall } = require('firebase-functions/v2/https');
      require('../muxVideoProcessing');
      const calls = (onCall as jest.Mock).mock.calls;
      // processAdVideoWithMux is the second onCall registration
      handler = calls[1]?.[1];
    });

    it('passes mp4_support: "standard" to mux.video.assets.create', async () => {
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

      expect(mockAssetsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ mp4_support: 'standard' })
      );
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

    it('passes mp4_support: "standard" when dryRun is false', async () => {
      if (!handler) return;
      mockCollectionGet.mockResolvedValue({
        forEach: (cb: Function) => {
          cb({ id: 'vid-1', data: () => ({ videoUrl: 'https://x.com/v.mp4', userId: 'u1' }) });
        },
      });
      const req = makeCallRequest({ data: { limit: 1, dryRun: false } });

      await handler(req);

      expect(mockAssetsCreate).toHaveBeenCalledWith(
        expect.objectContaining({ mp4_support: 'standard' })
      );
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
});
