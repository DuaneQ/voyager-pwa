import { useState, useRef, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { storage, db, auth } from '../environments/firebaseConfig';
import { Video, VideoUploadData } from '../types/Video';
import { generateVideoThumbnail } from '../utils/videoValidation';

interface UseVideoUploadResult {
  uploadVideo: (videoData: VideoUploadData) => Promise<Video>;
  isUploading: boolean;
  uploadProgress: number;
  error: string | null;
  processingStatus: string | null;
}

export function useVideoUpload(): UseVideoUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const userId = auth.currentUser?.uid;
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const uploadVideo = async (videoData: VideoUploadData): Promise<Video> => {
    if (!userId) {
      throw new Error('User must be authenticated to upload videos');
    }

    // Validate video format for iOS compatibility
    const allowedTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
    if (!allowedTypes.includes(videoData.file.type)) {
      console.warn(`Video type ${videoData.file.type} may not be compatible with iOS. Recommended: MP4`);
    }

    if (isMounted.current) setIsUploading(true);
    if (isMounted.current) setUploadProgress(0);
    if (isMounted.current) setError(null);
    if (isMounted.current) setProcessingStatus('Initializing...');

    try {
      // Generate unique video ID
      const videoId = `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Upload original video file to Firebase Storage with proper metadata
      if (isMounted.current) setProcessingStatus('Uploading video...');
      const videoRef = ref(storage, `users/${userId}/videos/${videoId}.mp4`);
      if (isMounted.current) setUploadProgress(30);
      
      // Add metadata for better browser compatibility
      const metadata = {
        contentType: 'video/mp4',
        customMetadata: {
          'originalType': videoData.file.type,
          'uploadedAt': new Date().toISOString()
        }
      };
      
      const videoSnapshot = await uploadBytes(videoRef, videoData.file, metadata);
      const videoUrl = await getDownloadURL(videoSnapshot.ref);
      if (isMounted.current) setUploadProgress(60);
      
      // Generate and upload thumbnail (no watermarking)
      if (isMounted.current) setProcessingStatus('Creating thumbnail...');
      const thumbnailBlob = await generateVideoThumbnail(videoData.file);
      
      const thumbnailRef = ref(storage, `users/${userId}/thumbnails/${videoId}.jpg`);
      if (isMounted.current) setUploadProgress(80);
      const thumbnailSnapshot = await uploadBytes(thumbnailRef, thumbnailBlob);
      const thumbnailUrl = await getDownloadURL(thumbnailSnapshot.ref);
      if (isMounted.current) setUploadProgress(90);
      
      // Create video document with meaningful defaults
      if (isMounted.current) setProcessingStatus('Saving video details...');
      const video: Omit<Video, 'id'> = {
        userId,
        title: videoData.title || `Video ${new Date().toLocaleDateString()}`,
        description: videoData.description || '',
        videoUrl,
        thumbnailUrl,
        isPublic: videoData.isPublic,
        likes: [],
        commentCount: 0,
        viewCount: 0,
        duration: 0, // Will be updated when we can extract duration
        fileSize: videoData.file.size,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      // Save to Firestore
      const videoDoc = await addDoc(collection(db, 'videos'), video);
      if (isMounted.current) setUploadProgress(100);
      if (isMounted.current) setProcessingStatus('Upload complete!');
      
      const uploadedVideo: Video = {
        id: videoDoc.id,
        ...video
      };
      
      return uploadedVideo;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Video upload failed';
      if (isMounted.current) setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      if (isMounted.current) {
        setIsUploading(false);
        setProcessingStatus(null);
      }
    }
  };

  return {
    uploadVideo,
    isUploading,
    uploadProgress,
    error,
    processingStatus,
  };
}

