// src/app/user.ts
export interface User {
  _id?: string
  username: string
  email: string
  password?: string // Only used for registration/login
  fullName: string
  profilePicture?: string
  coverPhoto?: string
  bio?: string
  role: "user" | "admin"
  createdAt?: Date
  // Add these profile-related fields from the server version
  workplace?: string
  workplaceRole?: string
  workplaceDuration?: string
  education?: string
  educationDegree?: string
  educationDuration?: string
  location?: string
  relationshipStatus?: string
  birthday?: string
  phone?: string
  website?: string
  // Add these missing properties for online status
  isOnline?: boolean
  lastActive?: Date
}

export interface AuthResponse {
  token: string
  userId: string
  role: string
  user: User
}
