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
import favicon from "../../assets/images/ic-like.png";
import noLikeIcon from "../../assets/images/ic-nolike.png";
import { Itinerary } from "../../types/Itinerary";
import { ViewProfileModal } from "../modals/ViewProfileModal";
import { useGetUserProfilePhoto } from "../../hooks/useGetUserProfilePhoto";

export interface ItineraryCardProps {
  itinerary: Itinerary;
  onLike: (itinerary: Itinerary) => void;
  onDislike: (itinerary: Itinerary) => void;
}

const ItineraryCard: React.FC<ItineraryCardProps> = ({
  itinerary,
  onLike,
  onDislike,
}) => {
  const [viewProfileOpen, setViewProfileOpen] = useState(false);
  // Returns the profile slot photo
  const profilePhoto = useGetUserProfilePhoto(itinerary.userInfo?.uid);

  const startDate = itinerary.startDate
    ? new Date(itinerary.startDate).toLocaleDateString()
    : "N/A";
  const endDate = itinerary.endDate
    ? new Date(itinerary.endDate).toLocaleDateString()
    : "N/A";

  return (
    <>
      <Card
        sx={{
          margin: { xs: "16px auto", sm: "30px auto" },
          maxWidth: { xs: 320, sm: 400 },
          boxShadow: 3,
          borderRadius: 2,
          padding: { xs: 1, sm: 2 },
          backgroundColor: "#f5f5f5",
          position: "relative",
        }}>
        <CardContent>
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
          <Box mt={2} sx={{ textAlign: "center" }}>
            <Typography
              variant="body2"
              sx={{
                fontStyle: "italic",
                fontSize: { xs: "0.95rem", sm: "1rem" },
              }}>
              {itinerary.description || "No description provided."}
            </Typography>
          </Box>
          {itinerary.activities && itinerary.activities.length > 0 && (
            <Box mt={2} sx={{ textAlign: "center" }}>
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
                }}>
                {itinerary.activities.map((activity, index) => (
                  <li key={index}>{activity}</li>
                ))}
              </ul>
            </Box>
          )}
        </CardContent>
        <CardActions
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px",
          }}>
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
