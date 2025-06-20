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
  getDocs,
  writeBatch,
  arrayUnion,
  doc,
  updateDoc,
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
  const [messages, setMessages] = useState<Message[]>([]);
  const { setHasNewConnection } = useNewConnection();
  const [unreadMap, setUnreadMap] = useState<Record<string, boolean>>({});

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

  // Combined: Fetch messages for selected connection in real-time and mark as read
  useEffect(() => {
    if (!selectedConnection || !userId) return;
    const q = query(
      collection(db, "connections", selectedConnection.id, "messages"),
      orderBy("createdAt")
    );
    const unsub = onSnapshot(q, async (snapshot) => {
      const msgs: Message[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          sender: data.sender,
          text: data.text,
          imageUrl: data.imageUrl,
          createdAt: data.createdAt as Timestamp,
          readBy: data.readBy || [],
        };
      });
      setMessages(msgs);

      // Find unread messages for this user
      const unreadDocs = snapshot.docs.filter((docSnap) => {
        const msg = docSnap.data();
        return (
          msg.sender !== userId && (!msg.readBy || !msg.readBy.includes(userId))
        );
      });

      // Mark unread messages as read
      if (unreadDocs.length > 0) {
        const batch = writeBatch(db);
        unreadDocs.forEach((docSnap) => {
          batch.update(docSnap.ref, {
            readBy: arrayUnion(userId),
          });
        });
        await batch.commit();

        // Immediately update unreadMap for this connection
        setUnreadMap((prev) => ({
          ...prev,
          [selectedConnection.id]: false,
        }));
      }
    });
    return () => unsub();
  }, [selectedConnection, userId]);

  // Check unread status and update global indicator
  useEffect(() => {
    if (!Object.values(unreadMap).some(Boolean)) {
      setHasNewConnection(false);
    }
  }, [unreadMap, setHasNewConnection]);

  // Reset unread count when a connection is selected
  useEffect(() => {
    if (!selectedConnection || !userId) return;
    const connectionRef = doc(db, "connections", selectedConnection.id);
    updateDoc(connectionRef, {
      [`unreadCounts.${userId}`]: 0,
    });
  }, [selectedConnection, userId]);

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
                  onClick={() => setSelectedConnection(conn)}
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
            messages={messages}
            userId={userId!}
          />
        )}
      </Box>
      <BottomNav />
    </div>
  );
};

export default Chat;
