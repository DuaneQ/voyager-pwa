# Video Watermarking Setup Instructions

## FFmpeg.wasm Requirements

The new video watermarking feature uses FFmpeg.wasm which requires specific browser headers to work properly.

### Development Setup

For local development, you need to serve the app with COOP/COEP headers. Add this to your `public/index.html` in the `<head>` section:

```html
<meta http-equiv="Cross-Origin-Opener-Policy" content="same-origin">
<meta http-equiv="Cross-Origin-Embedder-Policy" content="require-corp">
```

### Production Setup

For production deployment, configure your web server to send these headers:

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

### Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support  
- Safari: Limited support (may fall back to no watermarking)

### Fallback Behavior

If watermarking is not supported:
- Videos upload without burn-in watermarks
- Thumbnails still get watermarked
- No errors are thrown
- Users see normal upload process

### Performance Notes

- Video watermarking adds 1-2 seconds per MB of video
- Processing happens client-side (no server load)
- Original video quality is preserved
- Watermark is permanently embedded

## Testing

Test the watermarking by:
1. Upload a short video (< 10MB recommended for testing)
2. Check progress indicator shows FFmpeg processing
3. Verify final video has TravalPass.com watermark burned in
4. Share video externally to confirm watermark persists
