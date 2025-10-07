import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Checkbox,
  CircularProgress,
  TextField,
  Tooltip,
} from "@mui/material";
import { getEligibleUsersForChat } from "../../utils/getEligibleUsersForChat";
import { useGetUserProfilePhoto } from "../../hooks/useGetUserProfilePhoto";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "../../environments/firebaseConfig";

interface UserOption {
  userId: string;
  profile?: any;
}

interface AddUserToChatModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (userIds: string[]) => void;
  currentUserId: string;
  currentChatUserIds: string[];
}

export const AddUserToChatModal: React.FC<AddUserToChatModalProps> = ({
  open,
  onClose,
  onAdd,
  currentUserId,
  currentChatUserIds,
}) => {
  const [loading, setLoading] = useState(false);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    // eslint-disable-next-line no-console
  // fetching eligible users for modal
    getEligibleUsersForChat(currentUserId, currentChatUserIds)
      .then(async (users) => {
        const db = getFirestore(app);
        const withProfiles = await Promise.all(
          users.map(async (u) => {
            try {
              const snap = await getDoc(doc(db, "users", u.userId));
              return snap.exists() ? { ...u, profile: snap.data() } : u;
            } catch (err) {
              // preserve error logging
              console.error('[AddUserToChatModal] Error fetching user profile:', u.userId, err);
              return u;
            }
          })
        );
        setUserOptions(withProfiles);
        setUserOptions(withProfiles);
      })
      .finally(() => setLoading(false));
  }, [open, currentUserId, currentChatUserIds]);

  const handleToggle = (userId: string) => {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };


  const filteredOptions = userOptions.filter((u) => {
    const username = u.profile?.username || "";
    return (
      !search.trim() ||
      username.toLowerCase().includes(search.trim().toLowerCase())
    );
  });

  // Child component to safely use hooks
  const UserListItem: React.FC<{
    option: UserOption;
    checked: boolean;
    onToggle: (userId: string) => void;
  }> = ({ option, checked, onToggle }) => {
    const photoUrl = useGetUserProfilePhoto(option.userId);
    const username = option.profile?.username || option.userId;
    // Use initials from username if available, else from userId
    const initials = username
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase();
    return (
      <ListItem
        key={option.userId}
        secondaryAction={
          <Checkbox
            edge="end"
            checked={checked}
            onChange={() => onToggle(option.userId)}
          />
        }
        disablePadding
      >
        <ListItemAvatar>
          <Tooltip title={username}>
            <Avatar src={photoUrl}>{initials}</Avatar>
          </Tooltip>
        </ListItemAvatar>
        <ListItemText primary={username} />
      </ListItem>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add User to Chat</DialogTitle>
      <DialogContent>
        <TextField
          label="Search by username"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          margin="dense"
        />
        {loading ? (
          <CircularProgress sx={{ mt: 2 }} />
        ) : (
          <List>
            {filteredOptions.length === 0 && (
              <ListItem>
                <ListItemText primary="No eligible users found." />
              </ListItem>
            )}
            {filteredOptions.map((option) => (
              <UserListItem
                key={option.userId}
                option={option}
                checked={selected.includes(option.userId)}
                onToggle={handleToggle}
              />
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
          // silent in production
            onAdd(selected);
            setSelected([]);
            onClose();
          }}
          disabled={selected.length === 0}
          variant="contained"
        >
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
};
