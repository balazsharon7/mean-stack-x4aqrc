import type { ObjectId } from "mongodb"

export interface Notification {
  _id?: ObjectId
  userId: ObjectId
  type: "like" | "comment" | "friend_request" | "message" | "tag"
  referenceId: ObjectId
  createdAt: Date
  isRead: boolean
  content: string
  sourceUserId?: ObjectId
  actorId?: ObjectId
  targetId?: ObjectId
  read?: boolean
}
