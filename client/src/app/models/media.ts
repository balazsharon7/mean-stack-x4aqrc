export interface Media {
  _id?: string
  userId: string
  type: "image" | "video" | "audio" | "document"
  url: string
  filename: string
  size: number
  mimeType: string
  createdAt?: Date
  postId?: string
  albumId?: string
  description?: string
  tags?: string[]
}
