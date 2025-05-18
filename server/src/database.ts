import * as mongodb from "mongodb"
import type { ObjectId } from "mongodb"

// User model
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
}

// Post model
export interface Post {
  _id?: ObjectId
  userId: ObjectId
  content: string
  imageUrl?: string | null
  likes: ObjectId[]
  comments: Comment[]
  createdAt: Date
}

// Comment model
export interface Comment {
  _id?: ObjectId
  userId: ObjectId
  postId: ObjectId
  content: string
  createdAt: Date
  updatedAt?: Date
  likes?: ObjectId[]
  parentCommentId?: ObjectId
}

// Message model
export interface Message {
  _id?: ObjectId
  conversationId: ObjectId
  sender: ObjectId
  content: string
  createdAt: Date
  isRead: boolean
}

// Conversation model
export interface Conversation {
  _id?: ObjectId
  participants: ObjectId[]
  lastMessage?: {
    content: string
    sender: ObjectId
    timestamp: Date
  }
  createdAt: Date
  updatedAt: Date
}

// Friend Request model
export interface FriendRequest {
  _id?: ObjectId
  sender: ObjectId
  recipient: ObjectId
  status: "pending" | "accepted" | "rejected"
  createdAt: Date
}

// Notification model
export interface Notification {
  _id?: ObjectId
  userId: ObjectId
  type: string
  referenceId?: ObjectId
  content: string
  isRead: boolean
  createdAt: Date
  sourceUserId?: ObjectId
  actorId?: ObjectId
  targetId?: ObjectId
  read?: boolean
}

// Media model
export interface Media {
  _id?: ObjectId
  userId: ObjectId
  type: string
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

// Like model
export interface Like {
  _id?: ObjectId
  userId: ObjectId
  targetId: ObjectId
  targetType: "post" | "comment"
  createdAt: Date
}

// Database collections
export interface DatabaseCollections {
  users: mongodb.Collection<User>
  posts: mongodb.Collection<Post>
  messages: mongodb.Collection<Message>
  conversations: mongodb.Collection<Conversation>
  friendRequests: mongodb.Collection<FriendRequest>
  notifications: mongodb.Collection<Notification>
  media: mongodb.Collection<Media>
  likes: mongodb.Collection<Like>
  comments: mongodb.Collection<Comment>
}

// Export collections
export const collections: DatabaseCollections = {} as DatabaseCollections

let dbInstance: mongodb.Db
let client: mongodb.MongoClient

// Initialize MongoDB connection
export async function connectToDatabase(uri: string) {
  try {
    console.log("Connecting to MongoDB...")

    // Create a new MongoClient
    client = new mongodb.MongoClient(uri)

    // Connect to the MongoDB server
    await client.connect()
    console.log("Connected to MongoDB server")

    // Get the database instance
    dbInstance = client.db("socialMediaDB")

    // Initialize collections with proper error handling
    collections.users = dbInstance.collection<User>("users")
    collections.posts = dbInstance.collection<Post>("posts")
    collections.messages = dbInstance.collection<Message>("messages")
    collections.conversations = dbInstance.collection<Conversation>("conversations")
    collections.friendRequests = dbInstance.collection<FriendRequest>("friendRequests")
    collections.notifications = dbInstance.collection<Notification>("notifications")
    collections.media = dbInstance.collection<Media>("media")
    collections.likes = dbInstance.collection<Like>("likes")
    collections.comments = dbInstance.collection<Comment>("comments")

    // Test the connection by running a simple query
    const usersCount = await collections.users.countDocuments()
    console.log(`Successfully connected to database: socialMediaDB (${usersCount} users)`)

    // Set up indexes for better performance
    await setupIndexes()

    return dbInstance
  } catch (error) {
    console.error("Database connection error:", error)
    throw error
  }
}

// Set up database indexes for better performance
async function setupIndexes() {
  try {
    // Users collection indexes
    await collections.users.createIndex({ email: 1 }, { unique: true })
    await collections.users.createIndex({ username: 1 }, { unique: true })

    // Posts collection indexes
    await collections.posts.createIndex({ userId: 1 })
    await collections.posts.createIndex({ createdAt: -1 })

    // Friend requests collection indexes
    await collections.friendRequests.createIndex({ sender: 1, recipient: 1 }, { unique: true })
    await collections.friendRequests.createIndex({ recipient: 1, status: 1 })

    // Messages collection indexes
    await collections.messages.createIndex({ conversationId: 1 })
    await collections.messages.createIndex({ sender: 1 })

    // Conversations collection indexes
    await collections.conversations.createIndex({ participants: 1 })
    await collections.conversations.createIndex({ updatedAt: -1 })

    console.log("Database indexes set up successfully")
  } catch (error) {
    console.warn("Error setting up database indexes:", error)
    // Continue even if index creation fails
  }
}

export function getDb(): mongodb.Db {
  if (!dbInstance) {
    throw new Error("Database not initialized. Call connectToDatabase first.")
  }
  return dbInstance
}

// Close database connection
export async function closeDatabase() {
  if (client) {
    await client.close()
    console.log("Database connection closed")
  }
}

// Handle application shutdown
process.on("SIGINT", async () => {
  await closeDatabase()
  process.exit(0)
})

process.on("SIGTERM", async () => {
  await closeDatabase()
  process.exit(0)
})
