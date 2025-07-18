import { renderHook, act, waitFor } from '@testing-library/react';
import { useVideoUpload } from '../../hooks/useVideoUpload';
import { VideoUploadData } from '../../types/Video';
import * as firebaseStorage from 'firebase/storage';
import * as firebaseFirestore from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import * as videoValidation from '../../utils/videoValidation';

// Mock Firebase modules
jest.mock('firebase/storage', () => ({
  ref: jest.fn(),
  uploadBytes: jest.fn(),
  getDownloadURL: jest.fn(),
  getStorage: jest.fn().mockReturnValue({}),
}));
jest.mock('firebase/firestore', () => ({
  addDoc: jest.fn(),
  collection: jest.fn(),
  Timestamp: {
    now: jest.fn(),
  },
}));
jest.mock('../../utils/videoValidation');

jest.mock('../../environments/firebaseConfig', () => ({
  db: {},
  auth: {
    currentUser: {
      uid: 'test-user-123'
    }
  },
  storage: {},
}));

let mockUploadBytes: jest.SpyInstance;
let mockGetDownloadURL: jest.SpyInstance;
let mockRef: jest.SpyInstance;
const mockAddDoc = firebaseFirestore.addDoc as jest.MockedFunction<typeof firebaseFirestore.addDoc>;
const mockCollection = firebaseFirestore.collection as jest.MockedFunction<typeof firebaseFirestore.collection>;
const mockGenerateVideoThumbnail = videoValidation.generateVideoThumbnail as jest.MockedFunction<typeof videoValidation.generateVideoThumbnail>;

// Import the mocked auth object
import { auth } from '../../environments/firebaseConfig';

describe('useVideoUpload', () => {
  const mockUserId = 'test-user-123';
  const mockVideoFile = new File(['video content'], 'test.mp4', { type: 'video/mp4' });
  const mockThumbnailBlob = new Blob(['thumbnail'], { type: 'image/jpeg' });
  
  const mockVideoData: VideoUploadData = {
    title: 'Test Video',
    description: 'Test Description',
    isPublic: true,
    file: mockVideoFile
  };

beforeEach(() => {
  jest.clearAllMocks();

  // Reset auth to have a user by default
  (auth as any).currentUser = { uid: mockUserId };

  // Mock Firebase Storage using jest.spyOn
  mockRef = jest.spyOn(firebaseStorage, 'ref').mockImplementation((storage: any, path: string) => ({ fullPath: path } as any));
  let uploadCount = 0;
  mockUploadBytes = jest.spyOn(firebaseStorage, 'uploadBytes').mockImplementation(() => {
    uploadCount++;
    if (uploadCount === 1) {
      return Promise.resolve({ ref: { fullPath: 'video-path' } });
    } else {
      return Promise.resolve({ ref: { fullPath: 'thumbnail-path' } });
    }
  });
  mockGetDownloadURL = jest.spyOn(firebaseStorage, 'getDownloadURL').mockImplementation((ref: any) => {
    if (ref.fullPath === 'video-path') {
      return Promise.resolve('https://example.com/video.mp4');
    }
    if (ref.fullPath === 'thumbnail-path') {
      return Promise.resolve('https://example.com/thumbnail.jpg');
    }
    return Promise.resolve('https://example.com/other.jpg');
  });

  // Mock Firestore
  mockCollection.mockReturnValue({ id: 'videos' } as any);
  mockAddDoc.mockResolvedValue({ id: 'video-doc-123' } as any);

  // Mock thumbnail generation
  mockGenerateVideoThumbnail.mockResolvedValue(mockThumbnailBlob);

  // Mock Timestamp.now to return a fixed value
  jest.spyOn(Timestamp, 'now').mockReturnValue('MOCK_TIMESTAMP' as any);
});

  it('should upload video successfully', async () => {
    const { result } = renderHook(() => useVideoUpload());
    
    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadProgress).toBe(0);
    expect(result.current.error).toBe(null);

    let uploadedVideo: any;
    await act(async () => {
      uploadedVideo = await result.current.uploadVideo(mockVideoData);
    });

    expect(uploadedVideo).toEqual({
      id: 'video-doc-123',
      userId: mockUserId,
      title: 'Test Video',
      description: 'Test Description',
      videoUrl: 'https://example.com/video.mp4',
      thumbnailUrl: 'https://example.com/thumbnail.jpg',
      isPublic: true,
      likes: [],
      comments: [],
      viewCount: 0,
      duration: 0,
      fileSize: mockVideoFile.size,
      createdAt: 'MOCK_TIMESTAMP',
      updatedAt: 'MOCK_TIMESTAMP'
    });

    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadProgress).toBe(100);
    expect(result.current.error).toBe(null);
  });

  it('should throw error when user is not authenticated', async () => {
    // Mock no user
    (auth as any).currentUser = null;
    
    const { result } = renderHook(() => useVideoUpload());
    await act(async () => {
      await expect(result.current!.uploadVideo(mockVideoData)).rejects.toThrow(
        'User must be authenticated to upload videos'
      );
    });
  });

  it('should handle video upload error', async () => {
    mockUploadBytes.mockRejectedValue(new Error('Storage upload failed'));
    
    const { result } = renderHook(() => useVideoUpload());

    await act(async () => {
      await expect(result.current.uploadVideo(mockVideoData)).rejects.toThrow(
        'Storage upload failed'
      );
    });

    expect(result.current.error).toBe('Storage upload failed');
    expect(result.current.isUploading).toBe(false);
  });

  it('should handle thumbnail generation error', async () => {
    mockGenerateVideoThumbnail.mockRejectedValue(new Error('Thumbnail generation failed'));
    
    const { result } = renderHook(() => useVideoUpload());

    await act(async () => {
      await expect(result.current.uploadVideo(mockVideoData)).rejects.toThrow(
        'Thumbnail generation failed'
      );
    });

    expect(result.current.error).toBe('Thumbnail generation failed');
  });

  it('should handle Firestore save error', async () => {
    mockAddDoc.mockRejectedValue(new Error('Firestore save failed'));
    
    const { result } = renderHook(() => useVideoUpload());

    await act(async () => {
      await expect(result.current.uploadVideo(mockVideoData)).rejects.toThrow(
        'Firestore save failed'
      );
    });

    expect(result.current.error).toBe('Firestore save failed');
  });

  it('should update upload progress during upload', async () => {
    const { result } = renderHook(() => useVideoUpload());
    expect(result.current).not.toBeNull();
    
    // Store resolver functions
    const resolvers: any = {};
    
    // Mock thumbnail generation to be controlled
    mockGenerateVideoThumbnail.mockImplementation(() => {
      return new Promise(resolve => {
        resolvers.thumbnailGeneration = resolve;
      });
    });
    
    mockUploadBytes
      .mockImplementationOnce(() => {
        return new Promise(resolve => {
          resolvers.videoUpload = resolve;
        });
      })
      .mockImplementationOnce(() => {
        return new Promise(resolve => {
          resolvers.thumbnailUpload = resolve;
        });
      });
    mockAddDoc.mockImplementation(() => {
      return new Promise(resolve => {
        resolvers.firestore = resolve;
      });
    });
    
    // Start upload
    let uploadPromise: Promise<any>;
    act(() => {
      uploadPromise = result.current!.uploadVideo(mockVideoData);
    });
    
    // Wait for isUploading to become true and progress to be at 30 (after ref creation)
    await waitFor(() => expect(result.current!.isUploading).toBe(true), { timeout: 1000 });
    expect(result.current!.uploadProgress).toBe(30);
    
    // Complete video upload (this will set progress to 60)
    await waitFor(() => expect(resolvers.videoUpload).toBeDefined(), { timeout: 1000 });
    act(() => {
      resolvers.videoUpload({ ref: { fullPath: 'video-path' } });
    });
    
    await waitFor(() => expect(result.current!.uploadProgress).toBe(60), { timeout: 1000 });
    
    // Complete thumbnail generation (this will set progress to 80)
    await waitFor(() => expect(resolvers.thumbnailGeneration).toBeDefined(), { timeout: 1000 });
    act(() => {
      resolvers.thumbnailGeneration(mockThumbnailBlob);
    });
    
    await waitFor(() => expect(result.current!.uploadProgress).toBe(80), { timeout: 1000 });
    
    // Complete thumbnail upload (this will set progress to 90)
    await waitFor(() => expect(resolvers.thumbnailUpload).toBeDefined(), { timeout: 1000 });
    act(() => {
      resolvers.thumbnailUpload({ ref: { fullPath: 'thumbnail-path' } });
    });
    
    await waitFor(() => expect(result.current!.uploadProgress).toBe(90), { timeout: 1000 });
    
    // Complete Firestore save
    await waitFor(() => expect(resolvers.firestore).toBeDefined(), { timeout: 1000 });
    act(() => {
      resolvers.firestore({ id: 'video-doc-123' });
    });
    
    await act(async () => {
      await uploadPromise!;
    });
    
    expect(result.current!.uploadProgress).toBe(100);
    expect(result.current!.isUploading).toBe(false);
  });

  it('should create correct storage paths', async () => {
    const { result } = renderHook(() => useVideoUpload());
    
    await act(async () => {
      await result.current.uploadVideo(mockVideoData);
    });
    
    expect(mockRef).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringMatching(`users/${mockUserId}/videos/video_\\d+_\\w+\\.mp4`)
    );
    expect(mockRef).toHaveBeenCalledWith(
      expect.anything(),
      expect.stringMatching(`users/${mockUserId}/thumbnails/video_\\d+_\\w+\\.jpg`)
    );
  });

  it('should handle optional title and description', async () => {
    const minimalVideoData: VideoUploadData = {
      isPublic: false,
      file: mockVideoFile
    };
    const { result } = renderHook(() => useVideoUpload());
    
    let uploadedVideo: any;
    await act(async () => {
      uploadedVideo = await result.current.uploadVideo(minimalVideoData);
    });
    
    expect(uploadedVideo.title).toMatch(/^Video \d{1,2}\/\d{1,2}\/\d{4}$/); // Default title format
    expect(uploadedVideo.description).toBe(''); // Empty string, not undefined
    expect(uploadedVideo.isPublic).toBe(false);
  });
});
