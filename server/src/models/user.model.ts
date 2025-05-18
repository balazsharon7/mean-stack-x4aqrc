import { ObjectId } from 'mongodb';

export interface User {
  _id: string | ObjectId
  username: string
  email: string
  password: string
  fullName: string
  role: string
  createdAt: Date
  profilePicture?: string
  coverPhoto?: string
  bio?: string
  friends?: ObjectId[]
  workplace?: string
  education?: string
  location?: string
  relationshipStatus?: string
  birthday?: Date | string
  phone?: string
  website?: string
  workplaceRole?: string
  workplaceDuration?: string
  educationDegree?: string
  educationDuration?: string
  isOnline?: boolean
  lastActive?: Date
}

export interface AuthResponse {
  token: string
  userId: string
  user: User
}
