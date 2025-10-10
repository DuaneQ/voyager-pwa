import React, { useEffect, useState, useRef } from "react";
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
import { ViewProfileModal } from "./ViewProfileModal";
import { AddUserToChatModal } from "./AddUserToChatModal";
import { addUserToConnection, removeUserFromConnection } from "../../utils/connectionUtils";
import ManageChatMembersModal from "./ManageChatMembersModal";
import DOMPurify from 'dompurify';

const db = getFirestore(app);
const storage = getStorage(app);
const DEFAULT_AVATAR = "/default-profile.png";

interface ChatModalProps {
  open: boolean;
  onClose: () => void;
  connection: import("../../types/Connection").Connection;
  messages: import("../../types/Message").Message[];
  userId: string;
  onPullToRefresh: () => Promise<void>;
  hasMoreMessages: boolean;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  open,
  onClose,
  connection,
  messages,
  userId,
  onPullToRefresh,
  hasMoreMessages,
}) => {
  const [messageInput, setMessageInput] = useState<string>("");
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [addUserModalOpen, setAddUserModalOpen] = useState(false);
  const [manageMembersOpen, setManageMembersOpen] = useState(false);
  const [addUserLoading, setAddUserLoading] = useState<boolean>(false);
  const [removeUserLoading, setRemoveUserLoading] = useState<string | null>(null);

  // Ref for the messages container
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // UserId -> Username map (includes added users)
  const [userIdToUsername, setUserIdToUsername] = useState<Record<string, string>>({});
  // UserId -> Avatar URL map (fixes hook-in-loop bug)
  const [userIdToAvatar, setUserIdToAvatar] = useState<Record<string, string>>({});

  // Helper to build userId -> username map and avatar map (for all senders)
  useEffect(() => {
    let isMounted = true;
    async function buildUserMaps() {
      if (!connection) return;
      // Collect all UIDs from connection.users and all message senders
      const allUids = new Set<string>();
      if (Array.isArray(connection.users)) {
        connection.users.forEach((uid) => allUids.add(uid));
      }
      if (Array.isArray(messages)) {
        messages.forEach((msg) => {
          if (msg.sender) allUids.add(msg.sender);
        });
      }
      const map: Record<string, string> = {};
      // 1. From itineraries
      if (Array.isArray(connection.itineraries)) {
        connection.itineraries.forEach((it) => {
          if (it.userInfo && it.userInfo.uid && it.userInfo.username) {
            map[it.userInfo.uid] = it.userInfo.username;
          }
        });
      }
      // 2. For users not in itineraries, fetch from Firestore
      const missingUids = Array.from(allUids).filter((uid) => !map[uid]);
      if (missingUids.length > 0) {
        const db = getFirestore(app);
        const userDocs = await Promise.all(
          missingUids.map(async (uid) => {
            try {
              const docSnap = await import("firebase/firestore").then(({ doc, getDoc }) => getDoc(doc(db, "users", uid)));
              if (docSnap.exists()) {
                const data = docSnap.data();
                return { uid, username: data.username || uid };
              }
            } catch (e) {}
            return { uid, username: uid };
          })
        );
        userDocs.forEach(({ uid, username }) => {
          map[uid] = username;
        });
      }
      if (isMounted) setUserIdToUsername(map);

      // Avatar URLs (call hook outside of render)
      const avatarMap: Record<string, string> = {};
      await Promise.all(Array.from(allUids).map(async (uid) => {
        try {
          // Use the hook logic manually (simulate what the hook does)
          // This assumes useGetUserProfilePhoto is a wrapper for a Firestore/storage fetch
          // If it's async, you may want to refactor to a utility function for avatar fetching
          // For now, fallback to DEFAULT_AVATAR
          // @ts-ignore
          const url = await (window.__getUserProfilePhoto ? window.__getUserProfilePhoto(uid) : undefined);
          avatarMap[uid] = url || DEFAULT_AVATAR;
        } catch {
          avatarMap[uid] = DEFAULT_AVATAR;
        }
      }));
      if (isMounted) setUserIdToAvatar(avatarMap);
    }
    buildUserMaps();
    return () => {
      isMounted = false;
    };
  }, [connection, messages]);

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
    const sanitizedMessage = DOMPurify.sanitize(messageInput);
    const messageData = {
      sender: userId,
      text: sanitizedMessage,
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
    const recipientId = connection.users.find((uid: string) => uid !== userId);
    await updateDoc(connectionRef, {
      [`unreadCounts.${recipientId}`]: increment(1),
    });

    setMessageInput("");
    setSending(false);
  };


  // For user avatars in header
  const [viewProfileOpen, setViewProfileOpen] = useState(false);
  const [viewProfileUserId, setViewProfileUserId] = useState<string | null>(null);

  return (
    <>
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
          {/* --- Chat Header with user avatars and remove buttons --- */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 2, minHeight: 56 }}>
            {/* Ellipsis menu for managing members */}
            <IconButton sx={{ ml: 0.5 }} onClick={() => setManageMembersOpen(true)} aria-label="Manage Members">
              <span style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>⋯</span>
            </IconButton>
            {/* Avatars for all users in the chat */}
            <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, justifyContent: 'center', gap: 1 }}>
              {connection.users.map((uid) => (
                <Avatar
                  key={uid}
                  src={userIdToAvatar[uid] || DEFAULT_AVATAR}
                  alt={userIdToUsername[uid] || uid}
                  sx={{ width: 32, height: 32, cursor: 'pointer', border: uid === userId ? '2px solid #1976d2' : '2px solid #fff' }}
                  onClick={() => {
                    setViewProfileUserId(uid);
                    setViewProfileOpen(true);
                  }}
                  title={userIdToUsername[uid] || uid}
                >
                  {(userIdToUsername[uid] || uid)[0]}
                </Avatar>
              ))}
            </Box>
            <IconButton sx={{ ml: 1 }} onClick={onClose} aria-label="Close">
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
              {/* Group messages by day */}
              {(() => {
                if (!messages.length) return null;
                // Helper to format date as YYYY-MM-DD
                const formatDay = (date: Date) =>
                  date.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  });
                // Group messages by day
                const groups: { [day: string]: Message[] } = {};
                messages.forEach((msg) => {
                  const d = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date();
                  const day = formatDay(d);
                  if (!groups[day]) groups[day] = [];
                  groups[day].push(msg);
                });
                const dayOrder = Object.keys(groups);

                return dayOrder.map((day) => (
                  <React.Fragment key={day}>
                    <Box sx={{ textAlign: "center", my: 2 }}>
                      <Typography variant="caption" sx={{ bgcolor: "#e0e0e0", px: 2, py: 0.5, borderRadius: 2, color: "#555" }}>
                        {day}
                      </Typography>
                    </Box>
                    {groups[day].map((msg: Message) => {
                      const senderName = userIdToUsername[msg.sender] || msg.sender;
                      return (
                        <Box
                          key={msg.id}
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: msg.sender === userId ? "flex-end" : "flex-start",
                            mb: 1,
                          }}>
                          <Typography variant="caption" sx={{ fontWeight: 600, color: msg.sender === userId ? '#1976d2' : '#333', mb: 0.2 }}>
                            {senderName}
                          </Typography>
                          <Box
                            data-testid="message-bubble"
                            className={
                              msg.sender === userId
                                ? "current-user-message"
                                : "other-user-message"
                            }
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
                                loading="lazy"
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
                  </React.Fragment>
                ));
              })()}
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
          {/* Show profile modal for any user */}
          <ViewProfileModal
            open={viewProfileOpen}
            onClose={() => setViewProfileOpen(false)}
            userId={viewProfileUserId || userId}
          />
        </Box>
      </Modal>
      {/* Manage Members Modal (add/remove users) */}
      <ManageChatMembersModal
        open={manageMembersOpen}
        onClose={() => setManageMembersOpen(false)}
        users={connection.users.map((uid) => {
          let addedBy = undefined;
          if (Array.isArray(connection.addedUsers)) {
            // eslint-disable-next-line no-console
            const entry = connection.addedUsers.find((au) => String(au.userId).trim() === String(uid).trim());
            if (entry) addedBy = entry.addedBy;
          }
          const userObj = {
            uid,
            username: userIdToUsername[uid] || uid,
            avatarUrl: userIdToAvatar[uid] || DEFAULT_AVATAR,
            addedBy,
          };
          // eslint-disable-next-line no-console
          return userObj;
        })}
        currentUserId={userId}
        removeUserLoading={removeUserLoading}
        onRemove={async (uid) => {
          // eslint-disable-next-line no-console
          if (!window.confirm(`Remove ${userIdToUsername[uid] || uid} from chat?`)) return;
          setRemoveUserLoading(uid);
          try {
            await removeUserFromConnection(connection.id, uid, userId);
          } catch (e) {
            alert('Failed to remove user: ' + (e as Error).message);
          } finally {
            setRemoveUserLoading(null);
          }
        }}
        onAddClick={() => {
          // eslint-disable-next-line no-console
          setManageMembersOpen(false);
          setAddUserModalOpen(true);
        }}
        onViewProfile={(uid: string) => {
          setViewProfileUserId(uid);
          setViewProfileOpen(true);
        }}
      />
      {/* Add User Modal (opened from manage members modal) */}
      <AddUserToChatModal
        open={addUserModalOpen}
        onClose={() => setAddUserModalOpen(false)}
        currentUserId={userId}
        currentChatUserIds={connection.users}
        onAdd={async (userIds) => {
          // eslint-disable-next-line no-console
          setAddUserLoading(true);
          try {
            for (const uid of userIds) {
              await addUserToConnection(connection.id, uid, userId);
            }
          } catch (e) {
            alert("Failed to add user: " + (e as Error).message);
          } finally {
            setAddUserLoading(false);
            setAddUserModalOpen(false);
          }
        }}
      />
    </>
  );
};

export default ChatModal;
