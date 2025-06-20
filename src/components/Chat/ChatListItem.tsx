import React from "react";
import {
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  ListItemButton,
  Badge,
} from "@mui/material";
import { Connection } from "../../types/Connection";
import { useGetUserProfilePhoto } from "../../hooks/useGetUserProfilePhoto";

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
  const otherUserPhoto = useGetUserProfilePhoto(otherUser.uid);

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
          console.log("ChatListItem: otherUserPhoto", otherUserPhoto);
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
    </ListItem>
  );
};
