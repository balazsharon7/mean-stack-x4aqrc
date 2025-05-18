export interface Notification {
  _id?: string
  userId: string
  type: "like" | "comment" | "friend_request" | "message" | "tag"
  referenceId: string
  createdAt?: Date
  isRead?: boolean
  content: string
  sourceUserId?: string // User who triggered the notification
  actorId?: string // Alternative name for sourceUserId
  targetId?: string // Target object ID (post, comment, etc.)
}
