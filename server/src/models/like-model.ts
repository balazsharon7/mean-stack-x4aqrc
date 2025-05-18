import type { ObjectId } from "mongodb"

export interface Like {
  _id?: ObjectId
  userId: ObjectId
  targetType: "post" | "comment"
  targetId: ObjectId
  createdAt: Date
}
