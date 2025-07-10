import React, { useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  Modal,
  IconButton,
  Button,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PersonRemoveIcon from "@mui/icons-material/PersonRemove";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { removeUserFromConnection } from "../../utils/connectionUtils";

const DEFAULT_AVATAR = "/default-profile.png";

interface ManageChatMembersModalProps {
  open: boolean;
  onClose: () => void;
  users: { uid: string; username: string; avatarUrl: string; addedBy?: string }[];
  currentUserId: string;
  onRemove: (uid: string) => Promise<void>;
  onAddClick: () => void;
  removeUserLoading: string | null;
}

export const ManageChatMembersModal: React.FC<ManageChatMembersModalProps> = ({
  open,
  onClose,
  users,
  currentUserId,
  onRemove,
  onAddClick,
  removeUserLoading,
}) => {
  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="manage-chat-members-title"
      aria-describedby="manage-chat-members-desc"
    >
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 340,
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 2,
          borderRadius: 2,
          outline: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Typography id="manage-chat-members-title" variant="h6" sx={{ flex: 1 }}>
            Travel Buddies
          </Typography>
          <IconButton onClick={onClose} aria-label="Close dialog" tabIndex={0}>
            <CloseIcon />
          </IconButton>
        </Box>
        <Box id="manage-chat-members-desc" sx={{ maxHeight: 260, overflowY: "auto", mb: 2 }} role="list" aria-live="polite">
          {users.length === 0 ? (
            <Typography variant="body2" color="text.secondary" align="center" sx={{ my: 3 }}>
              No members in this chat yet.
            </Typography>
          ) : (
            users.map((user) => (
              <Box
                key={user.uid}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mb: 1,
                  p: 1,
                  borderRadius: 1,
                  bgcolor: user.uid === currentUserId ? "#f5f5f5" : undefined,
                  outline: 0,
                  transition: 'background 0.2s',
                  '&:hover': user.uid !== currentUserId ? { bgcolor: '#f0f4ff' } : undefined,
                  boxShadow: user.uid === currentUserId ? 0 : '0 1px 2px rgba(0,0,0,0.03)',
                }}
                tabIndex={0}
                role="listitem"
                aria-label={user.username + (user.uid === currentUserId ? " (You)" : "")}
                onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 2px #1976d2'}
                onBlur={e => e.currentTarget.style.boxShadow = user.uid === currentUserId ? '0' : '0 1px 2px rgba(0,0,0,0.03)'}
              >
                <Avatar
                  src={user.avatarUrl || DEFAULT_AVATAR}
                  alt={user.username}
                  sx={{ mr: 2, width: 36, height: 36 }}
                >
                  {user.username[0]}
                </Avatar>
                <Typography
                  variant="body2"
                  sx={{ flex: 1, fontWeight: user.uid === currentUserId ? 600 : 400, ml: 1 }}
                >
                  {user.username}
                  {user.uid === currentUserId && (
                    <span style={{ color: '#888', fontSize: 12, marginLeft: 4 }}>(You)</span>
                  )}
                </Typography>
                {/* Only show remove button if current user added this user */}
                {user.uid !== currentUserId && user.addedBy === currentUserId && (
                  <IconButton
                    size="small"
                    aria-label={`Remove ${user.username}`}
                    aria-disabled={removeUserLoading === user.uid}
                    disabled={removeUserLoading === user.uid}
                    onClick={() => onRemove(user.uid)}
                    tabIndex={0}
                    sx={{ ml: 1 }}
                    title={`Remove ${user.username} (You added them)`}
                  >
                    {removeUserLoading === user.uid ? (
                      <CircularProgress size={16} />
                    ) : (
                      <PersonRemoveIcon fontSize="small" />
                    )}
                  </IconButton>
                )}
              </Box>
            ))
          )}
        </Box>
        <Box sx={{ borderBottom: '1px solid #eee', mb: 2 }} />
        <Button
          variant="outlined"
          startIcon={<PersonAddIcon />}
          onClick={onAddClick}
          fullWidth
          sx={{ mt: 1, py: 1.2, fontWeight: 600, fontSize: 16 }}
        >
          Add Existing Connections
        </Button>
      </Box>
    </Modal>
  );
};

export default ManageChatMembersModal;
