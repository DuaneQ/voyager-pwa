import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  CardActions,
  Avatar,
  IconButton,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import favicon from "../../assets/images/ic-like.png";
import noLikeIcon from "../../assets/images/ic-nolike.png";
import { Itinerary } from "../../types/Itinerary";
import { ViewProfileModal } from "../modals/ViewProfileModal";
import { useGetUserProfilePhoto } from "../../hooks/useGetUserProfilePhoto";
import { auth } from "../../environments/firebaseConfig";

export interface ItineraryCardProps {
  itinerary: Itinerary;
  onLike: (itinerary: Itinerary) => void;
  onDislike: (itinerary: Itinerary) => void;
  // New props for edit/delete functionality
  onEdit?: (itinerary: Itinerary) => void;
  onDelete?: (itinerary: Itinerary) => void;
  showEditDelete?: boolean;
}

const ItineraryCard: React.FC<ItineraryCardProps> = ({
  itinerary,
  onLike,
  onDislike,
  onEdit,
  onDelete,
  showEditDelete = false,
}) => {
  const [viewProfileOpen, setViewProfileOpen] = useState(false);
  // Returns the profile slot photo
  const profilePhoto = useGetUserProfilePhoto(itinerary.userInfo?.uid);
  const currentUserId = auth.currentUser?.uid;

  // Fix timezone issue by creating date at noon UTC to avoid day shifting
  // Robust date parsing: accept Date instances, epoch numbers, ISO datetimes, or YYYY-MM-DD
  const parseToDate = (val: any): Date | null => {
    if (!val && val !== 0) return null;
    // Date object
    if (val instanceof Date) return val;
    // numeric epoch
    if (typeof val === 'number') return new Date(val);
    // numeric string epoch
    if (typeof val === 'string' && /^\d+$/.test(val)) return new Date(Number(val));
    if (typeof val === 'string') {
      // If string already contains time component, parse directly
      if (val.includes('T')) return new Date(val);
      // Otherwise assume YYYY-MM-DD and set midday UTC to avoid timezone shifts
      return new Date(val + 'T12:00:00.000Z');
    }
    return null;
  };

  const _start = parseToDate(itinerary.startDate);
  const _end = parseToDate(itinerary.endDate);
  const startDate = _start ? _start.toLocaleDateString() : 'N/A';
  const endDate = _end ? _end.toLocaleDateString() : 'N/A';

  // Get activities - for AI itineraries, extract from nested structure
  const getActivities = (): string[] => {
    const extendedItinerary = itinerary as any;
    
    // Check if this is an AI-generated itinerary
    if (extendedItinerary.ai_status === 'completed' || extendedItinerary.aiGenerated) {
      // Try to extract from response.data.itinerary.days or dailyPlans
      const aiData = extendedItinerary.response?.data?.itinerary;
      const dailyData = aiData?.days || aiData?.dailyPlans;
      
      if (dailyData && Array.isArray(dailyData) && dailyData.length > 0) {
        const activities: string[] = [];
        dailyData.forEach((day: any) => {
          if (day.activities && Array.isArray(day.activities)) {
            day.activities.forEach((activity: any) => {
              const activityName = activity.name || activity.title || '';
              if (activityName.trim()) {
                activities.push(activityName);
              }
            });
          }
        });
        return activities;
      }
    }
    
    // Fall back to regular activities array for non-AI itineraries
    return itinerary.activities || [];
  };

  const activities = getActivities();

  return (
    <>
      <Card
        sx={{
          margin: { xs: "8px auto", sm: "16px auto" },
          maxWidth: { xs: 300, sm: 400 },
          maxHeight: { xs: "50vh", sm: "60vh" },
          boxShadow: 3,
          borderRadius: 2,
          padding: { xs: 0.5, sm: 1.5 },
          backgroundColor: "#f5f5f5",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}>
        <CardContent
          sx={{
            paddingBottom: { xs: 0.5, sm: 1 },
            paddingTop: { xs: 1, sm: 1.5 },
            paddingX: { xs: 1, sm: 2 },
          }}>
          {/* Profile photo and username */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: { xs: 1, sm: 2 },
            }}>
            <IconButton
              onClick={() => setViewProfileOpen(true)}
              sx={{ p: 0, mr: { xs: 1, sm: 2 } }}
              aria-label="View profile">
              <Avatar
                src={profilePhoto}
                alt={itinerary.userInfo?.username || "Profile"}
                sx={{
                  width: { xs: 40, sm: 56 },
                  height: { xs: 40, sm: 56 },
                  border: "2px solid #fff",
                }}
              />
            </IconButton>
            <Typography
              variant="h6"
              sx={{
                fontWeight: "bold",
                color: "#333",
                fontSize: { xs: "1.1rem", sm: "1.25rem" },
              }}>
              {itinerary.userInfo?.username || "Anonymous"}
            </Typography>
          </Box>
          <Typography
            variant="h5"
            gutterBottom
            sx={{
              textAlign: "center",
              fontWeight: "bold",
              color: "#333",
              fontSize: { xs: "1.2rem", sm: "1.5rem" },
            }}>
            {itinerary.destination || "Unknown Destination"}
          </Typography>
          <Typography
            variant="body1"
            color="textSecondary"
            sx={{
              textAlign: "center",
              marginBottom: { xs: "6px", sm: "10px" },
              fontSize: { xs: "0.95rem", sm: "1rem" },
            }}>
            Start Date: {startDate}
          </Typography>
          <Typography
            variant="body1"
            color="textSecondary"
            sx={{
              textAlign: "center",
              marginBottom: { xs: "6px", sm: "10px" },
              fontSize: { xs: "0.95rem", sm: "1rem" },
            }}>
            End Date: {endDate}
          </Typography>
          {/* Scrollable content area for description and activities */}
          <Box
            sx={{
              maxHeight: { xs: "15vh", sm: "20vh" },
              overflow: "auto",
              mt: 1,
              pr: 1, // padding for scrollbar
            }}>
            <Box sx={{ textAlign: "left" }}>
              <Typography
                variant="body2"
                sx={{
                  fontStyle: "italic",
                  fontSize: { xs: "0.95rem", sm: "1rem" },
                  mb: 2,
                }}>
                {itinerary.description || "No description provided."}
              </Typography>
            </Box>
            {activities && activities.length > 0 && (
              <Box sx={{ textAlign: "left" }}>
                <Typography
                  variant="body2"
                  fontWeight="bold"
                  sx={{
                    marginBottom: { xs: "6px", sm: "10px" },
                    fontSize: { xs: "0.95rem", sm: "1rem" },
                  }}>
                  Activities:
                </Typography>
                <ul
                  style={{
                    listStyleType: "circle",
                    paddingLeft: "20px",
                    fontSize: "0.95rem",
                    margin: 0,
                  }}>
                  {activities.map((activity, index) => (
                    <li key={index}>{activity}</li>
                  ))}
                </ul>
              </Box>
            )}
          </Box>
        </CardContent>
        <CardActions
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: { xs: "6px", sm: "10px" },
            flexShrink: 0,
            minHeight: { xs: "48px", sm: "56px" },
          }}>
          {showEditDelete && currentUserId === itinerary.userInfo?.uid ? (
            // Show edit/delete buttons for user's own itineraries
            <>
              <Button
                sx={{
                  backgroundColor: "transparent",
                  padding: 0,
                  minWidth: "auto",
                  color: "#1976d2",
                }}
                onClick={() => onEdit?.(itinerary)}
                aria-label="Edit itinerary">
                <EditIcon sx={{ width: "32px", height: "32px" }} />
              </Button>
              <Button
                sx={{
                  backgroundColor: "transparent",
                  padding: 0,
                  minWidth: "auto",
                  color: "#d32f2f",
                }}
                onClick={() => onDelete?.(itinerary)}
                aria-label="Delete itinerary">
                <DeleteIcon sx={{ width: "32px", height: "32px" }} />
              </Button>
            </>
          ) : (
            // Show like/dislike buttons for other users' itineraries
            <>
              <Button
                sx={{
                  backgroundColor: "transparent",
                  padding: 0,
                  minWidth: "auto",
                }}
                onClick={() => onDislike(itinerary)}
                aria-label="Dislike">
                <img
                  src={noLikeIcon}
                  alt="No Like Icon"
                  loading="lazy"
                  style={{ width: "40px", height: "40px" }} // smaller on mobile
                />
              </Button>
              <Button
                sx={{
                  backgroundColor: "transparent",
                  padding: 0,
                  minWidth: "auto",
                }}
                onClick={() => onLike(itinerary)}
                aria-label="Like">
                <img
                  src={favicon}
                  alt="Favicon Icon"
                  style={{ width: "40px", height: "40px" }} // smaller on mobile
                />
              </Button>
            </>
          )}
        </CardActions>
      </Card>
      {/* ViewProfileModal for read-only profile view */}
      {itinerary.userInfo?.uid && (
        <ViewProfileModal
          open={viewProfileOpen}
          onClose={() => setViewProfileOpen(false)}
          userId={itinerary.userInfo.uid}
        />
      )}
    </>
  );
};

export default ItineraryCard;
