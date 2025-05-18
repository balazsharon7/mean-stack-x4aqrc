export interface Like {
  _id?: string
  userId: string
  targetType: "post" | "comment"
  targetId: string
  createdAt?: Date
}
