import type { Comment } from "./comment"

export interface Post {
  _id?: string
  userId: string
  content: string
  imageUrl?: string | null
  likes: string[] // Array of user IDs
  comments: Comment[]
  createdAt?: Date
  updatedAt?: Date
}
