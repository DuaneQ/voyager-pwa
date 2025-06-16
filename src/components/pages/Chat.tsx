import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Badge,
  Modal,
  IconButton,
  TextField,
  Button,
  CircularProgress,
  ListItemButton,
} from "@mui/material";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  addDoc,
  serverTimestamp,
  updateDoc,
  doc,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "../../environments/firebaseConfig";
import useGetUserId from "../../hooks/useGetUserId";
import CloseIcon from "@mui/icons-material/Close";
import ImageIcon from "@mui/icons-material/Image";
import { Connection } from "../../types/Connection";
import { Message } from "../../types/Message";
import { Itinerary } from "../../types/Itinerary";

const db = getFirestore(app);
const storage = getStorage(app);
const DEFAULT_AVATAR = "/default-profile.png";

// Helper to get the other user's info from a connection
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

// Helper to get the other user's itinerary from a connection
function getOtherItinerary(connection: Connection, userId: string) {
  if (!Array.isArray(connection.itineraries)) return undefined;
  return connection.itineraries.find(
    (it) => it.userInfo && it.userInfo.uid !== userId
  );
}

function getUserPhotoURL(user: any): string {
  return typeof user === "object" && user && "photoURL" in user && user.photoURL
    ? user.photoURL
    : DEFAULT_AVATAR;
}

export const Chat: React.FC = () => {
  const userId = useGetUserId();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] =
    useState<Connection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [unread, setUnread] = useState<Record<string, boolean>>({});

  // Fetch connections in real-time
  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, "connections"),
      where("users", "array-contains", userId)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const conns: Connection[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          users: data.users,
          itineraryIds: data.itineraryIds,
          itineraries: data.itineraries,
          createdAt: data.createdAt,
        };
      });
      setConnections(conns);
    });
    return () => unsub();
  }, [userId]);

  // Fetch messages for selected connection in real-time
  useEffect(() => {
    if (!selectedConnection) return;
    const q = query(
      collection(db, "connections", selectedConnection.id, "messages"),
      orderBy("createdAt")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          sender: data.sender,
          text: data.text,
          imageUrl: data.imageUrl,
          createdAt: data.createdAt,
          readBy: data.readBy || [],
        };
      });
      setMessages(msgs);

      // Mark as read (remove unread indicator)
      setUnread((prev) => ({ ...prev, [selectedConnection.id]: false }));

      // Mark all unread messages as read in Firestore
      msgs.forEach((msg) => {
        if (userId && msg.sender !== userId && !msg.readBy?.includes(userId)) {
          updateDoc(
            doc(db, "connections", selectedConnection.id, "messages", msg.id),
            { readBy: [...(msg.readBy || []), userId] }
          );
        }
      });
    });
    return () => unsub();
  }, [selectedConnection, userId]);

  // Listen for new messages in all connections for unread indicator
  useEffect(() => {
    if (!userId) return;
    const unsubscribes: (() => void)[] = [];
    connections.forEach((conn) => {
      const q = query(
        collection(db, "connections", conn.id, "messages"),
        orderBy("createdAt", "desc")
      );
      const unsub = onSnapshot(q, (snapshot) => {
        const latest = snapshot.docs[0]?.data() as Message | undefined;
        if (
          latest &&
          latest.sender !== userId &&
          !latest.readBy?.includes(userId)
        ) {
          setUnread((prev) => ({ ...prev, [conn.id]: true }));
        }
      });
      unsubscribes.push(unsub);
    });
    return () => unsubscribes.forEach((unsub) => unsub());
  }, [connections, userId]);

  // Upload image to Firebase Storage and get URL
  async function uploadImageAndGetUrl(file: File): Promise<string> {
    const storageRef = ref(storage, `chatImages/${Date.now()}_${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  }

  // UI for chat modal
  const ChatModal: React.FC<{
    open: boolean;
    onClose: () => void;
    connection: Connection;
    messages: Message[];
  }> = ({ open, onClose, connection, messages }) => {
    const [messageInput, setMessageInput] = useState<string>("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [sending, setSending] = useState(false);

    // Reset input state when modal opens/closes or connection changes
    useEffect(() => {
      setMessageInput("");
      setImageFile(null);
      setSending(false);
    }, [open, connection]);

    const handleSendMessage = async () => {
      if (!connection || (!messageInput && !imageFile) || !userId) return;
      setSending(true);
      const msg: Omit<Message, "id"> = {
        sender: userId,
        text: messageInput || undefined,
        createdAt: serverTimestamp(),
        readBy: [userId],
      };
      if (imageFile) {
        msg.imageUrl = await uploadImageAndGetUrl(imageFile);
      }
      await addDoc(
        collection(db, "connections", connection.id, "messages"),
        msg
      );
      setMessageInput("");
      setImageFile(null);
      setSending(false);
    };

    const otherUser = getOtherUser(connection, userId!);
    const otherItinerary = getOtherItinerary(connection, userId!);

    return (
      <Modal open={open} onClose={onClose}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 400,
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 2,
            borderRadius: 2,
            maxHeight: "80vh",
            overflowY: "auto",
          }}>
          <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
            <Avatar src={getUserPhotoURL(otherUser)} />
            <Box ml={2}>
              <Typography variant="subtitle1">{otherUser.username}</Typography>
              <Typography variant="caption" color="textSecondary">
                {otherItinerary?.destination} ({otherItinerary?.startDate} -{" "}
                {otherItinerary?.endDate})
              </Typography>
            </Box>
            <IconButton sx={{ ml: "auto" }} onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ mb: 2, maxHeight: "40vh", overflowY: "auto" }}>
            {messages.map((msg) => (
              <Box
                key={msg.id}
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: msg.sender === userId ? "flex-end" : "flex-start",
                  mb: 1,
                }}>
                <Box
                  sx={{
                    bgcolor: msg.sender === userId ? "#1976d2" : "#e0e0e0",
                    color: msg.sender === userId ? "#fff" : "#000",
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    maxWidth: "70%",
                    wordBreak: "break-word",
                  }}>
                  {msg.text}
                  {msg.imageUrl && (
                    <img
                      src={msg.imageUrl}
                      alt="attachment"
                      style={{ maxWidth: 200, marginTop: 8 }}
                    />
                  )}
                </Box>
                <Typography variant="caption" sx={{ mt: 0.5 }}>
                  {msg.createdAt?.toDate
                    ? msg.createdAt.toDate().toLocaleString()
                    : ""}
                </Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <IconButton component="label">
              <ImageIcon />
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              />
            </IconButton>
            <TextField
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type a message"
              fullWidth
              size="small"
              sx={{ mx: 1 }}
              disabled={sending}
            />
            <Button
              variant="contained"
              onClick={handleSendMessage}
              disabled={sending}>
              {sending ? <CircularProgress size={20} /> : "Send"}
            </Button>
          </Box>
        </Box>
      </Modal>
    );
  };

  return (
    <Box
      className="authFormContainer"
      sx={{ maxWidth: 500, mx: "auto", mt: 3 }}>
      <List
        sx={{
          background: "white",
          borderRadius: 2,
          boxShadow: 2,
          p: 1,
          position: "absolute",
          top: 100,
          left: 50,
          minWidth: 340,
          zIndex: 2,
        }}>
        {connections.map((conn) => {
          if (!userId) return null;
          const otherUser = getOtherUser(conn, userId);
          const otherItinerary = getOtherItinerary(conn, userId);
          return (
            <ListItem key={conn.id} sx={{ borderBottom: "1px solid #eee" }}>
              <ListItemButton onClick={() => setSelectedConnection(conn)}>
                <ListItemAvatar>
                  <Badge
                    color="secondary"
                    variant="dot"
                    invisible={!unread[conn.id]}
                    overlap="circular">
                    <Avatar src={getUserPhotoURL(otherUser)} />
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={otherUser.username || "Unknown"}
                  secondary={
                    <>
                      <span style={{ fontSize: "0.9em" }}>
                        {otherItinerary?.destination}
                        <span style={{ fontSize: "0.8em", color: "#666" }}>
                          {" "}
                          ({otherItinerary?.startDate} -{" "}
                          {otherItinerary?.endDate})
                        </span>
                      </span>
                    </>
                  }
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      {selectedConnection && (
        <ChatModal
          open={!!selectedConnection}
          onClose={() => setSelectedConnection(null)}
          connection={selectedConnection}
          messages={messages}
        />
      )}
    </Box>
  );
};

export default Chat;
