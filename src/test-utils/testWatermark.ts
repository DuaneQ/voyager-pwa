/**
 * Test utility for verifying video watermarking functionality
 */

import { addWatermarkToVideo } from '../utils/videoWatermark';

// Create a simple test video blob (minimal MP4)
function createTestVideoBlob(): Blob {
  // This is a minimal valid MP4 file (just headers, no actual video content)
  const testData = new Uint8Array([
    0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70,
    0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
    0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
    0x61, 0x76, 0x63, 0x31, 0x6d, 0x70, 0x34, 0x31
  ]);
  
  return new Blob([testData], { type: 'video/mp4' });
}

export async function testWatermarkingSystem(): Promise<void> {
  console.log('🧪 Testing watermarking system...');
  
  try {
    // Check if SharedArrayBuffer is available
    if (typeof SharedArrayBuffer === 'undefined') {
      console.warn('⚠️ SharedArrayBuffer not available - watermarking will not work');
      console.log('Need to serve with proper COOP/COEP headers');
      return;
    }
    
    console.log('✅ SharedArrayBuffer is available');
    
    // Create test video
    const testVideo = createTestVideoBlob();
    console.log(`📹 Created test video blob: ${testVideo.size} bytes`);
    
    // Convert blob to File for testing
    const testVideoFile = new File([testVideo], 'test-video.mp4', {
      type: 'video/mp4',
      lastModified: Date.now()
    });
    
    // Test watermarking
    console.log('🔄 Adding watermark...');
    
    const onProgress = (progress: number) => {
      console.log(`📊 Progress: ${Math.round(progress * 100)}%`);
    };
    
    const watermarkedVideo = await addWatermarkToVideo(
      testVideoFile, 
      {
        text: 'TravalPass.com',
        position: 'bottom-right',
        fontSize: 28,
        opacity: 0.8,
        color: '#FFFFFF',
        padding: 20
      },
      onProgress
    );
    
    if (watermarkedVideo) {
      console.log(`✅ Watermarking successful! Output size: ${watermarkedVideo.size} bytes`);
      
      // Create download link for testing
      const url = URL.createObjectURL(watermarkedVideo);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'test-watermarked-video.mp4';
      link.textContent = 'Download Test Video';
      link.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4CAF50;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        text-decoration: none;
        z-index: 10000;
        font-family: Arial, sans-serif;
      `;
      
      document.body.appendChild(link);
      
      // Auto-remove after 30 seconds
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 30000);
      
    } else {
      console.error('❌ Watermarking failed - returned null');
    }
    
  } catch (error) {
    console.error('❌ Error testing watermarking:', error);
  }
}

// Auto-run test in development
if (process.env.NODE_ENV === 'development') {
  // Wait for page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(testWatermarkingSystem, 2000);
    });
  } else {
    setTimeout(testWatermarkingSystem, 2000);
  }
}
