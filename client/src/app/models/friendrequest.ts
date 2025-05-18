export interface FriendRequest {
  _id?: string
  sender: string
  recipient: string
  status: "pending" | "accepted" | "rejected"
  createdAt?: Date
}
