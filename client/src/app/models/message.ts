export interface Message {
  createdAt: Date
  _id?: string
  conversationId: string
  senderId: string // Ensure this is always a string
  receiverId: string
  content: string
  timestamp: Date
  isRead: boolean
}

export interface Conversation {
  _id?: string
  user?: any // The other user in the conversation
  messages?: Message[]
  lastMessage?: any // The last message in the conversation
  unreadCount?: number
  isTyping?: boolean
  participants?: any[] // Changed from boolean to array to match the actual data structure
}
