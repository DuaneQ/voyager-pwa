import { Timestamp } from 'firebase/firestore';

export interface Video {
  id: string;
  userId: string;
  title?: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl: string;
  isPublic: boolean;
  likes: string[]; // Array of user IDs who liked
  commentCount: number;
  viewCount: number;
  duration: number; // in seconds
  fileSize: number; // in bytes
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface VideoComment {
  id: string;
  videoId: string;
  userId: string;
  text: string;
  createdAt: Timestamp;
}

export interface VideoUploadData {
  title?: string;
  description?: string;
  isPublic: boolean;
  file: File;
}

export interface VideoValidationResult {
  isValid: boolean;
  errors: string[];
}

// Constants for video validation
export const VIDEO_CONSTRAINTS = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  MAX_DURATION: 60, // seconds
  SUPPORTED_FORMATS: ['video/mp4', 'video/mov'] as const,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 200, // Reduced for better mobile display
} as const;
