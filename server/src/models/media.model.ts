import type { ObjectId } from "mongodb"

export interface Media {
  _id?: ObjectId
  userId: ObjectId
  type: "image" | "video" | "audio" | "document"
  url: string
  filename: string
  size: number
  mimeType: string
  createdAt: Date
  postId?: ObjectId
  albumId?: ObjectId
  description?: string
  tags?: string[]
}
