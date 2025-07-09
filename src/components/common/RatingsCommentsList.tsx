
import React, { useRef, useCallback } from "react";
import { Box, Typography } from "@mui/material";
import Rating from "@mui/material/Rating";

// Lightweight virtualization for user reviews
const ITEM_HEIGHT = 64; // px, estimated height per review item
const VISIBLE_COUNT = 6; // How many items to render at once (180px/30px per item ~6)

interface RatingsCommentsListProps {
  profile: any;
  currentUserId: string;
}


const RatingsCommentsList: React.FC<RatingsCommentsListProps> = ({ profile, currentUserId }) => {
  // Always call hooks at the top level
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = React.useState(0);
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setScrollTop(scrollRef.current.scrollTop);
    }
  }, []);

  // Only proceed if ratings exist
  if (!profile?.ratings?.ratedBy) return null;
  const entries = Object.entries(profile.ratings.ratedBy)
    .filter(([uid, entry]: any) => entry.comment && entry.comment.trim());

  const total = entries.length;
  const startIdx = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT));
  const endIdx = Math.min(total, startIdx + VISIBLE_COUNT + 2); // +2 buffer
  const visibleEntries = entries.slice(startIdx, endIdx);
  const paddingTop = startIdx * ITEM_HEIGHT;
  const paddingBottom = (total - endIdx) * ITEM_HEIGHT;

  return (
    <Box sx={{ mt: 3, mb: 2 }}>
      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        User Reviews
      </Typography>
      <Box
        ref={scrollRef}
        sx={{ maxHeight: 180, overflowY: "auto", pr: 1 }}
        onScroll={handleScroll}
      >
        {total > 0 ? (
          <Box sx={{ position: "relative" }}>
            <Box sx={{ height: `${paddingTop}px` }} />
            {visibleEntries.map(([uid, entry]: any) => (
              <Box key={uid} sx={{ mb: 2, p: 1, borderBottom: "1px solid #eee", minHeight: `${ITEM_HEIGHT - 8}px` }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                  <Rating value={entry.rating} readOnly size="small" sx={{ mr: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    {entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : ""}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  {entry.comment}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {uid === currentUserId ? "You" : `User: ${uid.slice(0, 6)}...`}
                </Typography>
              </Box>
            ))}
            <Box sx={{ height: `${paddingBottom}px` }} />
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">No reviews yet.</Typography>
        )}
      </Box>
    </Box>
  );
};

export default RatingsCommentsList;
