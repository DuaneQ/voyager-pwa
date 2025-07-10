
import React from "react";
import {
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  ListItemButton,
  Badge,
  IconButton,
  Tooltip,
} from "@mui/material";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import { Connection } from "../../types/Connection";
import { useGetUserProfilePhoto } from "../../hooks/useGetUserProfilePhoto";
import { useRemoveConnection } from "../../hooks/useRemoveConnection";

const DEFAULT_AVATAR = "/default-profile.png";

function getOtherUser(connection: Connection, userId: string) {
  if (!Array.isArray(connection.itineraries)) {
    return {
      username: "Unknown",
      photoURL: DEFAULT_AVATAR,
      uid: "",
    };
  }
  const otherItinerary = connection.itineraries.find(
    (it) => it.userInfo && it.userInfo.uid !== userId
  );
  return (
    otherItinerary?.userInfo || {
      username: "Unknown",
      photoURL: DEFAULT_AVATAR,
      uid: "",
    }
  );
}

function getOtherItinerary(connection: Connection, userId: string) {
  if (!Array.isArray(connection.itineraries)) return undefined;
  return connection.itineraries.find(
    (it) => it.userInfo && it.userInfo.uid !== userId
  );
}


export const ChatListItem: React.FC<{
  conn: Connection;
  userId: string;
  onClick: (photoURL: string) => void;
  unread: boolean;
}> = ({ conn, userId, onClick, unread }) => {
  const otherUser = getOtherUser(conn, userId);
  const otherItinerary = getOtherItinerary(conn, userId);
  // Debug: log the other user for each ChatListItem render
  // eslint-disable-next-line no-console
  console.log('[ChatListItem] Rendered for conn:', conn.id, 'otherUser:', otherUser);
  // Returns the profile slot photo
  const otherUserPhoto = useGetUserProfilePhoto(otherUser.uid);
  const removeConnection = useRemoveConnection();

  const handleUnconnect = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to remove this connection?")) {
      await removeConnection(conn.id);
    }
  };

  return (
    <ListItem
      key={conn.id}
      sx={{
        borderBottom: "1px solid #eee",
        mb: 2,
        boxShadow: 10,
        background: "transparent",
      }}>
      <ListItemButton
        onClick={() => {
          onClick(otherUserPhoto);
        }}>
        <ListItemAvatar>
          <Badge
            color="error"
            variant="dot"
            invisible={!unread}
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>
            <Avatar src={otherUserPhoto} />
          </Badge>
        </ListItemAvatar>
        <ListItemText
          primary={otherUser.username || "Unknown"}
          primaryTypographyProps={{
            style: { color: "white", fontWeight: "bold" },
          }}
          secondary={
            <>
              <span
                style={{
                  fontSize: "0.9em",
                  fontWeight: "bold",
                  color: "white",
                }}>
                {otherItinerary?.destination}
                <span
                  style={{
                    fontSize: "0.9em",
                    fontWeight: "bold",
                    color: "white",
                    marginLeft: 6,
                  }}>
                  {otherItinerary?.startDate && otherItinerary?.endDate
                    ? `(${otherItinerary.startDate} - ${otherItinerary.endDate})`
                    : ""}
                </span>
              </span>
            </>
          }
        />
      </ListItemButton>
      <Tooltip title="Remove Connection">
        <IconButton onClick={handleUnconnect} edge="end" aria-label="unconnect">
          <RemoveCircleOutlineIcon />
        </IconButton>
      </Tooltip>
    </ListItem>
  );
};
