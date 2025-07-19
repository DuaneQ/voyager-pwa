# Feature Development Template

## 1. Feature Requirements

**Feature Name:** Video Feed

**User Problem Solved:** 
- This new feature will allow users to upload their travel videos for private or public viewing.
- This will increase user engagement.

**User Story:**
AS A user of TravalPass I WANT TO upload videos SO THAT others can see my travel videos and increase engagements.  

**Acceptance Criteria:**
- [ ] Users can upload santizied videos up to a certain file size
- [ ] Users can share those videos externally to other applications like facebook, twitter or instagram.  There should be a link they can use for sharing.
- [ ] There should be a separate Traval page with a video icon to take users to the video feed
- [ ] The Traval video feed page should look like TikTok video feed or Facebook reels.
- [ ] There should be a plus icon the user can click to upload videos.
- [ ] Users should be able to choose between a public video or private.  Only their connections can see their private video feed.  (Connections are made when users like each other's itinerary.  Look at the Chat.tsx for details on connections.)
- [ ] The Traval video feed page should have a heart icon on the side users can click to like the video.
- [ ] The Traval video feed page should have a comment button on the side where users can leave comments on a video.  The comments should be sanitized.
- [ ] The Traval video feed page should have a share icon that users can use to share the videos to other apps.
- [ ] The Traval video feed page should have a follow button to begin following that particular user.
- [ ] The Traval video feed page should have a button that allows them to view the other user's profile.
- [ ] The user profile should have video modal that appears with all of that particular user's videos and allows the other users to watch the videos.
- [ ] This will be a 4th tab on the bottom navigation bar with video icon and text Travals.
- [ ] Routing is /traval
- [ ] Can we restrict inappropriate content?  Violence, Sex
- [ ] If a user blocked someone they should not be able to see.  each other's videos.(The ViewProfileModal provides the blocking ability)
- [ ] Users can have both private and public videos.Tey should define on upload.
- [ ] Users should be able to delete videos
- [ ] Use flat comments

## 2. Data Model Updates

Create the model in the types directory for the video.

**Video Type:**
```typescript
interface Video {
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

interface VideoComment {
  id: string;
  videoId: string;
  userId: string;
  text: string;
  createdAt: Timestamp;
  // replies?: VideoComment[]; // If supporting threaded comments
}
```

**Video Specifications:**
- Maximum file size: 100MB (client-side compression to ~25MB target)
- Supported formats: MP4, MOV (AVI requires conversion)
- Maximum duration: 60 seconds
- Resolution: Up to 1080p (auto-compress to 720p for storage)
- Client-side compression using browser APIs
- Server-side optimization for different quality levels

**Content Moderation Strategy (MVP):**
- Phase 1: Client-side validation (file type, size, duration)
- Basic user reporting system
- Manual review process for reported content
- Simple content filters (profanity detection in descriptions)

**Future Phases:** See `/docs/VIDEO_FEED_FUTURE_PHASES.md` for advanced moderation, video processing, and cost optimization features.

**Firebase Storage:**
We should save videos to firebase storage under `users/{userID}/videos/{videoId}.mp4`
Thumbnails under `users/{userID}/thumbnails/{videoId}.jpg`

3. Component Structure
New Components Needed:

VideoFeed.tsx
A component to see the comments.
Hooks to upload sanitized videos with a size limit
We'll need to update the ViewProfileModal to see videos.
Users should be able to view videos from their profile page
There's currently no like system infrastructure, only rating.

4. Implementation Plan
Step 1: Create Basic Component Structure

Create component files
Define props and state for each component
Step 2: Implement Core Functionality
- Update bottom navigation
- Create component to allow video uploads
- When users navigate to the Traval video feeds they should be able to see the latest uploads.  The user swipes up to see the next video.  (Same behavior as TikTok)
- Hooks to retrieve videos when users navigate to the video feed page. 

Provide new storage rules based on where the images will be uploaded
Provide any new firebase rules for the new route

Implement user interface
Add styling to match app design
Add Error Handling

Identify possible error scenarios (e.g., network issues, validation errors)
Implement error states and fallbacks in the UI
5. Testing Strategy

Unit tests for individual components and functions

## 6. Integration Points
**Affected components:**
- BottomNavigation.tsx (add 4th tab or integrate with existing)
- App.tsx (new route: `/videos`)
- ViewProfileModal.tsx (add video grid section)
- UserProfile type (add videoCount field)

**New Firebase Collections:**
- `videos` collection
- `videoComments` collection  
- `videoLikes` subcollection or field

**Dependencies to add:**
- react-player or similar for video playback
- react-swipeable for swipe gestures
- Video compression library (optional)


7. UI/UX Considerations
Mobile Responsiveness:

Ensure keyboard navigation is possible
Provide text alternatives for non-text content
Ensure sufficient color contrast
8. Deployment Checklist
<input disabled="" type="checkbox"> All tests passing
<input disabled="" type="checkbox"> Feature flags configured if needed
<input disabled="" type="checkbox"> Firebase security rules updated
<input disabled="" type="checkbox"> Performance impact assessed
<input disabled="" type="checkbox"> Analytics tracking added

