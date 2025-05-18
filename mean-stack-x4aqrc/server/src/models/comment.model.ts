import type { ObjectId } from "mongodb"

export interface Comment {
  _id?: ObjectId
  postId: ObjectId
  userId: ObjectId
  content: string
  createdAt: Date
  updatedAt?: Date
  likes: ObjectId[]
  parentCommentId?: ObjectId
}
