/**
 * Video watermarking utilities for adding TravalPass.com branding to videos
 * 
 * Uses FFmpeg.wasm for reliable video processing with burn-in watermarks
 * that persist when videos are shared outside the app.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface WatermarkOptions {
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  fontSize: number;
  opacity: number;
  color: string;
  backgroundColor?: string;
  padding: number;
}

export const DEFAULT_WATERMARK_OPTIONS: WatermarkOptions = {
  text: 'TravalPass.com',
  position: 'bottom-right',
  fontSize: 24,
  opacity: 0.8,
  color: '#FFFFFF',
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  padding: 20,
};

let ffmpeg: FFmpeg | null = null;
let isFFmpegLoaded = false;

/**
 * Initialize FFmpeg.wasm
 */
const initFFmpeg = async (): Promise<FFmpeg> => {
  if (ffmpeg && isFFmpegLoaded) {
    return ffmpeg;
  }

  ffmpeg = new FFmpeg();
  
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
  
  ffmpeg.on('log', ({ message }) => {
    console.log('[FFmpeg]', message);
  });

  // Load FFmpeg
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
  });

  isFFmpegLoaded = true;
  return ffmpeg;
};

/**
 * Creates FFmpeg filter string for watermark positioning
 */
const getWatermarkFilter = (options: WatermarkOptions): string => {
  const { text, position, fontSize, color, padding } = options;
  
  // Convert hex color to RGB for FFmpeg
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
  };

  const rgb = hexToRgb(color);
  const fontColor = `0x${color.replace('#', '')}`;
  
  // Position calculations for FFmpeg drawtext filter
  let x: string, y: string;
  
  switch (position) {
    case 'top-left':
      x = `${padding}`;
      y = `${padding}`;
      break;
    case 'top-right':
      x = `w-text_w-${padding}`;
      y = `${padding}`;
      break;
    case 'bottom-left':
      x = `${padding}`;
      y = `h-text_h-${padding}`;
      break;
    case 'bottom-right':
      x = `w-text_w-${padding}`;
      y = `h-text_h-${padding}`;
      break;
    case 'center':
      x = `(w-text_w)/2`;
      y = `(h-text_h)/2`;
      break;
    default:
      x = `w-text_w-${padding}`;
      y = `h-text_h-${padding}`;
  }

  return `drawtext=text='${text}':fontsize=${fontSize}:fontcolor=${fontColor}:x=${x}:y=${y}:shadow=1:shadowcolor=black:shadowx=2:shadowy=2`;
};

/**
 * Adds a permanent watermark to a video file using FFmpeg.wasm
 * This creates a new video file with the watermark burned in
 */
export const addWatermarkToVideo = async (
  videoFile: File,
  options: Partial<WatermarkOptions> = {},
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  const watermarkOptions = { ...DEFAULT_WATERMARK_OPTIONS, ...options };
  
  try {
    onProgress?.(10);
    
    // Initialize FFmpeg
    const ffmpegInstance = await initFFmpeg();
    onProgress?.(20);
    
    // Write input file
    const inputName = 'input.mp4';
    const outputName = 'output.mp4';
    
    await ffmpegInstance.writeFile(inputName, await fetchFile(videoFile));
    onProgress?.(30);
    
    // Create watermark filter
    const watermarkFilter = getWatermarkFilter(watermarkOptions);
    onProgress?.(40);
    
    // Run FFmpeg command to add watermark
    await ffmpegInstance.exec([
      '-i', inputName,
      '-vf', watermarkFilter,
      '-c:a', 'copy', // Copy audio without re-encoding
      '-c:v', 'libx264', // Re-encode video with watermark
      '-preset', 'fast', // Balance between speed and compression
      '-crf', '23', // Good quality
      outputName
    ]);
    onProgress?.(80);
    
    // Read output file
    const outputData = await ffmpegInstance.readFile(outputName);
    onProgress?.(90);
    
    // Clean up
    await ffmpegInstance.deleteFile(inputName);
    await ffmpegInstance.deleteFile(outputName);
    onProgress?.(100);
    
    // Convert to blob
    const blob = new Blob([outputData], { type: 'video/mp4' });
    return blob;
    
  } catch (error) {
    console.error('FFmpeg watermarking failed:', error);
    throw new Error(`Video watermarking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Creates a watermarked thumbnail with the TravalPass.com branding
 */
export const addWatermarkToThumbnail = (
  thumbnailBlob: Blob,
  options: Partial<WatermarkOptions> = {}
): Promise<Blob> => {
  const watermarkOptions = { ...DEFAULT_WATERMARK_OPTIONS, ...options };
  
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw the original image
      ctx.drawImage(img, 0, 0);
      
      // Add watermark
      drawWatermark(ctx, canvas.width, canvas.height, watermarkOptions);
      
      // Convert to blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create watermarked thumbnail'));
        }
        window.URL.revokeObjectURL(img.src);
      }, 'image/jpeg', 0.8);
    };
    
    img.onerror = () => {
      window.URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load thumbnail for watermarking'));
    };
    
    img.src = URL.createObjectURL(thumbnailBlob);
  });
};

/**
 * Draws a watermark on the canvas at the specified position
 */
const drawWatermark = (
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  options: WatermarkOptions
) => {
  const { text, position, fontSize, opacity, color, backgroundColor, padding } = options;
  
  // Set font and measure text
  ctx.font = `${fontSize}px Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  
  const textMetrics = ctx.measureText(text);
  const textWidth = textMetrics.width;
  const textHeight = fontSize;
  
  // Calculate position
  let x: number, y: number;
  
  switch (position) {
    case 'top-left':
      x = padding;
      y = padding;
      break;
    case 'top-right':
      x = canvasWidth - textWidth - padding;
      y = padding;
      break;
    case 'bottom-left':
      x = padding;
      y = canvasHeight - textHeight - padding;
      break;
    case 'bottom-right':
      x = canvasWidth - textWidth - padding;
      y = canvasHeight - textHeight - padding;
      break;
    case 'center':
      x = (canvasWidth - textWidth) / 2;
      y = (canvasHeight - textHeight) / 2;
      break;
    default:
      x = canvasWidth - textWidth - padding;
      y = canvasHeight - textHeight - padding;
  }
  
  // Save current context
  ctx.save();
  
  // Set opacity
  ctx.globalAlpha = opacity;
  
  // Draw background if specified
  if (backgroundColor) {
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(x - 8, y - 4, textWidth + 16, textHeight + 8);
  }
  
  // Draw text
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  
  // Restore context
  ctx.restore();
};

/**
 * Check if video watermarking is supported in the current browser
 */
export const isWatermarkingSupported = (): boolean => {
  // Check for required APIs
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
  const hasWorker = typeof Worker !== 'undefined';
  
  return hasSharedArrayBuffer && hasWorker;
};

/**
 * Get estimated processing time for video watermarking
 */
export const estimateProcessingTime = (fileSizeBytes: number): number => {
  // Rough estimate: ~1 second per MB on average hardware
  const fileSizeMB = fileSizeBytes / (1024 * 1024);
  return Math.max(5, Math.round(fileSizeMB * 1.5)); // Minimum 5 seconds
};
