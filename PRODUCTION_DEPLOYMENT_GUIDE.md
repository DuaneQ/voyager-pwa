# Production Deployment Guide for Video Sharing

## Overview
This guide covers deploying the video sharing functionality to production with the correct domains and configurations.

## Production Domains
- **Primary**: `travalpass.com` (Custom domain)
- **Firebase**: `mundo1-1.web.app` (Default)
- **Firebase Alt**: `mundo1-1.firebaseapp.com` (Default)

## Files Updated for Production

### 1. Firebase Cloud Function (`/functions/src/videoSharing.ts`)
✅ **REQUIRED FOR DEPLOYMENT**

**Updates Made:**
- Changed base URL from `https://mundo1-dev.web.app` to `https://travalpass.com`
- Updated branding from "Voyager" to "TravalPass"
- Updated redirects to use production domain

**Purpose:** This function serves optimized HTML pages with proper meta tags for social media crawlers (Facebook, Twitter, WhatsApp, etc.) and redirects regular users to the main app.

### 2. Client-side Utility (`/src/utils/videoSharing.ts`)
✅ **ALREADY PRODUCTION-READY**

**Status:** No changes needed - already uses dynamic URLs with `window.location.origin` and correct TravalPass.com branding.

### 3. Documentation File (`/src/utils/serverSideSharing.ts`)
❌ **NOT NEEDED FOR DEPLOYMENT**

**Status:** This is a documentation/template file showing examples for different backend implementations. It's not used in the actual application and can be safely ignored for deployment.

### 4. Firebase Console Link (`/functions/src/index.ts`)
✅ **UPDATED**

**Updates Made:**
- Changed Firebase console link from `mundo1-dev` to `mundo1-1` project

### 4. Firebase Configuration (`firebase.json`)
✅ **UPDATED**

**Updates Made:**
- Updated CSP headers to reference production Firebase storage bucket (`mundo1-1.firebasestorage.app`)
- Verified video sharing rewrite rule is correctly configured

## Deployment Steps

### 1. Deploy Firebase Functions
```bash
# Navigate to the project root
cd /workspaces/voyager-pwa

# Build and deploy functions to production
firebase use mundo1-1  # Switch to production project
firebase deploy --only functions
```

### 2. Verify Video Sharing Function
After deployment, the video sharing function will be available at:
```
https://us-central1-mundo1-1.cloudfunctions.net/videoShare
```

### 3. Test Social Media Sharing
Test the video sharing URLs with these tools:
- **Facebook**: https://developers.facebook.com/tools/debug/
- **Twitter**: https://cards-dev.twitter.com/validator
- **LinkedIn**: https://www.linkedin.com/post-inspector/

Test URLs should follow this pattern:
```
https://travalpass.com/video-share/{videoId}
```

### 4. Domain Configuration
Ensure that the Firebase Hosting is properly configured to serve the Cloud Function:

In `firebase.json`, verify the rewrites configuration includes:
```json
{
  "hosting": {
    "rewrites": [
      {
        "source": "/video-share/**",
        "function": "videoShare"
      }
    ]
  }
}
```

## How It Works

### For Social Media Crawlers:
1. Crawler visits `https://travalpass.com/video-share/{videoId}`
2. Firebase Cloud Function detects crawler user-agent
3. Function fetches video data from Firestore
4. Returns HTML with optimized meta tags for sharing
5. Social platform caches the meta tag data

### For Regular Users:
1. User visits `https://travalpass.com/video-share/{videoId}`
2. Function detects regular user
3. Redirects to `https://travalpass.com/video/{videoId}`
4. Main React app loads and shows video

## Security Notes
- Function only serves public video data
- Private videos require authentication in the main app
- No sensitive data is exposed in meta tags
- Function includes proper error handling for missing videos

## Performance Optimization
- Meta tag responses are cached for 5 minutes
- Minimal Firestore reads (one per video share)
- Fast redirect for regular users
- Optimized HTML generation

## Monitoring
After deployment, monitor:
- Function execution logs in Firebase Console
- Error rates for video sharing
- Social media sharing success rates
- Performance metrics

## Troubleshooting
If video sharing doesn't work:
1. Check function deployment status
2. Verify domain configuration in Firebase Hosting
3. Test with social media debugger tools
4. Check function logs for errors
5. Ensure Firestore security rules allow reading public videos

## File Summary
| File | Status | Purpose | Action Required |
|------|--------|---------|-----------------|
| `/functions/src/videoSharing.ts` | ✅ Updated for production | Cloud Function for video sharing | Deploy with functions |
| `/functions/src/index.ts` | ✅ Updated console links | Exports video sharing function | Deploy with functions |
| `/firebase.json` | ✅ Updated CSP headers | Hosting and function configuration | Deploy with hosting |
| `/src/utils/videoSharing.ts` | ✅ Production ready | Client-side sharing utilities | Deploy with hosting |
| `/src/utils/serverSideSharing.ts` | ❌ Documentation only | Examples and templates | No action needed |

## Complete Deployment Command

To deploy everything for video sharing functionality:

```bash
# Switch to production project
firebase use mundo1-1

# Deploy both functions and hosting
firebase deploy --only functions,hosting
```
