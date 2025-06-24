import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  Modal,
  IconButton,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ImageIcon from "@mui/icons-material/Image";
import { Connection } from "../../types/Connection";
import { Message } from "../../types/Message";
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  doc,
  increment,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { app } from "../../environments/firebaseConfig";
import PullToRefresh from "react-simple-pull-to-refresh";

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

interface ChatModalProps {
  open: boolean;
  onClose: () => void;
  connection: Connection;
  messages: Message[];
  userId: string;
  otherUserPhotoURL: string;
  onPullToRefresh: () => Promise<void>;
  hasMoreMessages: boolean;
}

const ChatModal: React.FC<ChatModalProps> = ({
  open,
  onClose,
  connection,
  messages,
  userId,
  otherUserPhotoURL,
  onPullToRefresh,
  hasMoreMessages,
}) => {
  const [messageInput, setMessageInput] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Ref for the messages container
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessageInput("");
    setUploadingImage(false);
    setSending(false);
  }, [open, connection]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Upload image and create a message immediately
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !connection || !userId) return;
    setUploadingImage(true);

    // 1. Create a placeholder message in Firestore
    const msgRef = await addDoc(
      collection(db, "connections", connection.id, "messages"),
      {
        sender: userId,
        text: "", // No text for image-only message
        createdAt: serverTimestamp(),
        readBy: [userId],
        imageUrl: "", // Placeholder, will update after upload
      }
    );

    // 2. Upload the image to Storage using the message ID
    const storageRef = ref(
      storage,
      `chatImages/${connection.id}/${msgRef.id}_${file.name}`
    );
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    // 3. Update the message with the image URL
    await updateDoc(msgRef, { imageUrl: url });

    setUploadingImage(false);
  };

  // Send text message only
  const handleSendMessage = async () => {
    if (!connection || !messageInput.trim() || !userId) return;
    setSending(true);
    const messageData = {
      sender: userId,
      text: messageInput,
      createdAt: serverTimestamp(),
      readBy: [userId],
    };
    // 1. Add the message to Firestore
    await addDoc(
      collection(db, "connections", connection.id, "messages"),
      messageData
    );

    // 2. Update the recipient's unread message count
    const connectionRef = doc(db, "connections", connection.id);
    const recipientId = connection.users.find((uid) => uid !== userId);
    await updateDoc(connectionRef, {
      [`unreadCounts.${recipientId}`]: increment(1),
    });

    setMessageInput("");
    setSending(false);
  };

  const otherUser = getOtherUser(connection, userId);
  const otherItinerary = getOtherItinerary(connection, userId);

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: { xs: "98vw", sm: 400 },
          bgcolor: "background.paper",
          boxShadow: 24,
          p: { xs: 1, sm: 2 },
          borderRadius: 2,
        }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Avatar src={otherUserPhotoURL || DEFAULT_AVATAR} />
          <Box ml={2}>
            <Typography variant="subtitle1">{otherUser.username}</Typography>
            <Typography variant="caption" color="textSecondary">
              {otherItinerary?.destination} ({otherItinerary?.startDate} -{" "}
              {otherItinerary?.endDate})
            </Typography>
          </Box>
          <IconButton sx={{ ml: "auto" }} onClick={onClose} aria-label="Close">
            <CloseIcon />
          </IconButton>
        </Box>
        <PullToRefresh
          onRefresh={async () => {
            if (hasMoreMessages) {
              await onPullToRefresh();
            }
          }}
          pullingContent={
            <div style={{ textAlign: "center" }}>
              {hasMoreMessages
                ? "↓ Pull to load more messages"
                : "No more messages"}
            </div>
          }
          refreshingContent={
            <div style={{ textAlign: "center" }}>Loading…</div>
          }>
          <Box
            sx={{
              mb: 2,
              maxHeight: "40vh",
              overflowY: "auto",
              background: "#fafafa",
              p: 2,
            }}>
            {messages.map((msg, idx) => {
              return (
                <Box
                  key={msg.id}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems:
                      msg.sender === userId ? "flex-end" : "flex-start",
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
              );
            })}
            <div ref={messagesEndRef} />
          </Box>
        </PullToRefresh>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton component="label" disabled={uploadingImage}>
            <ImageIcon />
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={handleImageChange}
            />
            {uploadingImage && (
              <CircularProgress
                size={20}
                sx={{ position: "absolute", left: 10, top: 10 }}
              />
            )}
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
            disabled={sending || !messageInput.trim()}>
            {sending ? <CircularProgress size={20} /> : "Send"}
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default ChatModal;
