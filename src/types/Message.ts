export interface Message {
  id: string;
  sender: string;
  text?: string;
  imageUrl?: string;
  createdAt: any; // Firestore Timestamp
  readBy: string[];
}