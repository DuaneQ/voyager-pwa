import { Timestamp } from "firebase/firestore";

export interface Message {
  id: string;
  sender: string;
  text?: string;
  imageUrl?: string;
  createdAt: Timestamp;
  readBy: string[];
}
