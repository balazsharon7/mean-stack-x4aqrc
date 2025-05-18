import { ObjectId } from 'mongodb';

// Update the Conversation interface to match how it's used in the component
export interface Conversation {
  _id?: string | ObjectId
  participants?: string[] | ObjectId[] // Make participants optional to match implementation
  lastMessage?: {
    content: string
    sender?: string | ObjectId
    timestamp?: Date
    _id?: string // Add _id to match how it's used
  }
  createdAt?: Date
  updatedAt?: Date
  user?: User // The other participant (not the current user)
  messages?: Message[]
  unreadCount?: number
  isTyping?: boolean
}

// Update the Message interface to match how it's used in the component
export interface Message {
  _id?: string | ObjectId
  conversationId: string | ObjectId
  senderId: string | ObjectId
  receiverId: string | ObjectId
  content: string
  timestamp?: Date // For UI display
  createdAt?: Date
  readAt?: Date | null
  attachments?: string[]
  isDeleted?: boolean
  isRead?: boolean
}

export interface User {
  _id: string;
  name: string;
  email: string;
}