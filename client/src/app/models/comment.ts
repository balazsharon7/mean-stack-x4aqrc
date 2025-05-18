export interface Comment {
  _id?: string
  postId: string
  userId: string
  content: string
  createdAt?: Date
  updatedAt?: Date
  likes: string[] // Array of user IDs
  parentCommentId?: string // For replies to comments
}
