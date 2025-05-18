import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import path from "path"
// Fix imports to match actual exports
import userRoutes from "./routes/user.routes"
import postRoutes from "./routes/post.routes"
import commentRoutes from "./routes/comment.routes"
import likeRoutes from "./routes/like.routes"
import friendRoutes from "./routes/friend.routes"
import messageRoutes from "./routes/message.routes"
import notificationRoutes from "./routes/notification.routes"
import mediaRoutes from "./routes/media.routes"
import { connectToDatabase } from "./database"
// import { requestLogger, errorLogger } from "./middleware/logger"

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5200

// Enhanced CORS configuration
app.use(
  cors({
    origin: ["http://localhost:4200", "http://localhost:5200"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "auth-token", "x-auth-token"],
  }),
)

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Use the request logger middleware
// app.use(requestLogger)

// Serve static files with absolute path
app.use("/uploads", express.static(path.join(__dirname, "../uploads")))

// API routes - use the correct variable names based on what's exported
app.use("/api/users", userRoutes)
app.use("/api/posts", postRoutes)
app.use("/api/comments", commentRoutes)
app.use("/api/likes", likeRoutes)
app.use("/api/notifications", notificationRoutes)
app.use("/api/media", mediaRoutes)
app.use("/api/messages", messageRoutes)
app.use("/api/friends", friendRoutes)

// Database connection - pass the MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/social_media_app"

connectToDatabase(MONGODB_URI)
  .then(() => {
    // Start server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`)
    })
  })
  .catch((error) => {
    console.error("Database connection failed", error)
    process.exit(1)
  })

// Use error logger middleware
// app.use(errorLogger)

// Root route
app.get("/", (req, res) => {
  res.send("Social Media API is running")
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" })
})

export default app
