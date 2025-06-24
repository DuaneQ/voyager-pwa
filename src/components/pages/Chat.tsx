import React, { useEffect, useState } from "react";
import { Box, List } from "@mui/material";
import {
  getFirestore,
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  Timestamp,
  doc,
  updateDoc,
  QueryDocumentSnapshot,
  DocumentData,
  limit,
  startAfter,
  getDocs,
} from "firebase/firestore";
import { app } from "../../environments/firebaseConfig";
import useGetUserId from "../../hooks/useGetUserId";
import { Connection } from "../../types/Connection";
import { Message } from "../../types/Message";
import ChatModal from "../modals/ChatModal";
import BottomNav from "../../components/layout/BottomNavigation";
import { useNewConnection } from "../../Context/NewConnectionContext";
import { ChatListItem } from "../../components/Chat/ChatListItem";

const db = getFirestore(app);

export const Chat: React.FC = () => {
  const userId = useGetUserId();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] =
    useState<Connection | null>(null);
  const [latestMessages, setLatestMessages] = useState<Message[]>([]);
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [lastMessageDoc, setLastMessageDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const { setHasNewConnection } = useNewConnection();
  const [unreadMap, setUnreadMap] = useState<Record<string, boolean>>({});
  const [selectedPhotoURL, setSelectedPhotoURL] = useState<string>("");

  // Fetch connections and unread status
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
          createdAt: data.createdAt as Timestamp,
          unreadCounts: data.unreadCounts || {},
        };
      });
      setConnections(conns);

      // Build unreadMap for badges
      const unreadStatus: Record<string, boolean> = {};
      conns.forEach((conn) => {
        unreadStatus[conn.id] = (conn.unreadCounts?.[userId] || 0) > 0;
      });
      setUnreadMap(unreadStatus);

      // Set global indicator if any connection has unread
      setHasNewConnection(Object.values(unreadStatus).some(Boolean));
    });
    return () => unsub();
  }, [userId, setHasNewConnection]);

  // Clear the indicator when Chat mounts
  useEffect(() => {
    setHasNewConnection(false);
  }, [setHasNewConnection]);

  // Fetch latest 10 messages for selected connection
  useEffect(() => {
    if (!selectedConnection || !userId) return;

    const q = query(
      collection(db, "connections", selectedConnection.id, "messages"),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = snapshot.docs
        .map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            sender: data.sender,
            text: data.text,
            imageUrl: data.imageUrl,
            createdAt: data.createdAt as Timestamp,
            readBy: data.readBy || [],
          };
        })
        .reverse(); // oldest at top
      setLatestMessages(msgs);
      setLastMessageDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMoreMessages(snapshot.docs.length === 10);
    });

    // Reset unread count for this user on this connection
    const connectionRef = doc(db, "connections", selectedConnection.id);
    updateDoc(connectionRef, {
      [`unreadCounts.${userId}`]: 0,
    });

    // Reset older messages when switching chats
    setOlderMessages([]);

    return () => unsub();
  }, [selectedConnection, userId]);

  // Check unread status and update global indicator
  useEffect(() => {
    if (!Object.values(unreadMap).some(Boolean)) {
      setHasNewConnection(false);
    }
  }, [unreadMap, setHasNewConnection]);

  const loadMoreMessages = async () => {
    if (!selectedConnection || !lastMessageDoc || !userId) return;
    const q = query(
      collection(db, "connections", selectedConnection.id, "messages"),
      orderBy("createdAt", "desc"),
      startAfter(lastMessageDoc),
      limit(10)
    );
    const snapshot = await getDocs(q);
    const moreMsgs: Message[] = snapshot.docs
      .map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          sender: data.sender,
          text: data.text,
          imageUrl: data.imageUrl,
          createdAt: data.createdAt as Timestamp,
          readBy: data.readBy || [],
        };
      })
      .reverse();
    setOlderMessages((prev) => [...moreMsgs, ...prev]);
    setLastMessageDoc(
      snapshot.docs[snapshot.docs.length - 1] || lastMessageDoc
    );
    setHasMoreMessages(snapshot.docs.length === 10);
  };

  return (
    <div className="authFormContainer">
      <Box
        sx={{
          maxWidth: 500,
          mx: "auto",
          mt: -20,
          background: "transparent",
          boxShadow: "none",
          border: "none",
          p: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        }}>
        {/* Page Header */}
        <Box sx={{ mb: 10 }}></Box>
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            minHeight: 0,
          }}>
          <List
            sx={{
              background: "transparent",
              minWidth: 140,
              p: 0,
              m: 0,
              boxShadow: "none",
              border: "none",
              mt: 0,
            }}>
            {connections.map((conn) => {
              if (!userId) return null;
              return (
                <ChatListItem
                  key={conn.id}
                  conn={conn}
                  userId={userId}
                  onClick={(photoURL: string) => {
                    setSelectedConnection(conn);
                    setSelectedPhotoURL(photoURL);
                  }}
                  unread={!!unreadMap[conn.id]}
                />
              );
            })}
          </List>
        </Box>
        {selectedConnection && (
          <ChatModal
            open={!!selectedConnection}
            onClose={() => setSelectedConnection(null)}
            connection={selectedConnection}
            messages={[...olderMessages, ...latestMessages]}
            userId={userId!}
            otherUserPhotoURL={selectedPhotoURL}
            onPullToRefresh={loadMoreMessages}
            hasMoreMessages={hasMoreMessages}
          />
        )}
      </Box>
      <BottomNav />
    </div>
  );
};

export default Chat;
