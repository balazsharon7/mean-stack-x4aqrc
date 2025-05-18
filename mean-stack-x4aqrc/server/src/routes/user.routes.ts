import express from "express"
import type { Request, Response, NextFunction } from "express"
import { ObjectId } from "mongodb"
import * as bcrypt from "bcrypt"
import * as jwt from "jsonwebtoken"
import multer from "multer"
import * as path from "path"
import * as fs from "fs"
import { collections } from "../database"
import type { User } from "../database"
import { authenticateToken } from "../middleware/auth"

const router = express.Router()
router.use(express.json())

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret"

// Define interface for request with user
export interface AuthRequest extends Request {
  user: {
    id: string
    username: string
    role?: string
  }
}

// Create uploads directory if it doesn't exist
const profilesDir = path.join(__dirname, "../../uploads/profiles")
const coversDir = path.join(__dirname, "../../uploads/covers")

if (!fs.existsSync(profilesDir)) {
  fs.mkdirSync(profilesDir, { recursive: true })
}

if (!fs.existsSync(coversDir)) {
  fs.mkdirSync(coversDir, { recursive: true })
}

// Multer configuration for profile pictures
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilesDir)
  },
  filename: (req, file, cb) => {
    const authReq = req as AuthRequest
    const userId = authReq.user?.id || "unknown"
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, "profile-" + userId + "-" + uniqueSuffix + ext)
  },
})

const profileUpload = multer({
  storage: profileStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb: any) => {
    const filetypes = /jpeg|jpg|png/
    const mimetype = filetypes.test(file.mimetype)
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase())

    if (mimetype && extname) {
      return cb(null, true)
    }
    cb(new Error("Only JPG, JPEG or PNG images are allowed!"))
  },
})

// Multer configuration for cover photos
const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, coversDir)
  },
  filename: (req, file, cb) => {
    const authReq = req as AuthRequest
    const userId = authReq.user?.id || "unknown"
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, "cover-" + userId + "-" + uniqueSuffix + ext)
  },
})

const coverUpload = multer({
  storage: coverStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb: any) => {
    const filetypes = /jpeg|jpg|png/
    const mimetype = filetypes.test(file.mimetype)
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase())

    if (mimetype && extname) {
      return cb(null, true)
    }
    cb(new Error("Only JPG, JPEG or PNG images are allowed!"))
  },
})

// Register a new user
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("Register request received:", req.body)

    // Check if user already exists with this email
    const existingUserByEmail = await collections.users?.findOne({ email: req.body.email })
    if (existingUserByEmail) {
      res.status(400).send("User with this email already exists")
      return
    }

    // Check if username is taken
    const existingUserByUsername = await collections.users?.findOne({ username: req.body.username })
    if (existingUserByUsername) {
      res.status(400).send("Username is already taken")
      return
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(req.body.password, salt)

    // Create new user object
    const user: User = {
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword,
      fullName: req.body.fullName,
      role: "user", // Default role
      createdAt: new Date(),
      profilePicture: req.body.profilePicture || "",
      bio: req.body.bio || "",
      friends: [],
      _id: "",
    }

    // Insert user into database
    const result = await collections.users?.insertOne(user as any)

    if (result?.acknowledged) {
      // Create JWT token
      const token = jwt.sign(
        { id: result.insertedId.toString(), username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }, // Increased token expiry to 24 hours
      )

      // Return success with token (don't include password in response)
      const { password, ...userWithoutPassword } = user
      res.status(201).json({
        message: "User registered successfully",
        token,
        userId: result.insertedId,
        user: {
          ...userWithoutPassword,
          _id: result.insertedId,
        },
      })
    } else {
      res.status(500).send("Failed to create a new user.")
    }
  } catch (error) {
    console.error("Registration error:", error)
    res.status(400).send(error instanceof Error ? error.message : "Unknown error")
  }
})

// Login user
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    console.log("Login request received:", req.body.email)

    // Find user by email
    const user = await collections.users?.findOne({ email: req.body.email })

    if (!user) {
      res.status(400).send("Invalid email or password")
      return
    }

    // Validate password
    const validPassword = await bcrypt.compare(req.body.password, user.password)
    if (!validPassword) {
      res.status(400).send("Invalid email or password")
      return
    }

    // Create and assign token
    const token = jwt.sign({ id: user._id.toString(), username: user.username, role: user.role }, JWT_SECRET, {
      expiresIn: "24h", // Increased token expiry to 24 hours
    })

    // Return user info without password
    const { password, ...userWithoutPassword } = user

    res.status(200).json({
      token,
      userId: user._id,
      role: user.role,
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).send(error instanceof Error ? error.message : "Unknown error")
  }
})

// Get user profile
router.get("/profile/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req?.params?.id
    const query = { _id: new ObjectId(id) }
    const user = await collections.users?.findOne(query)

    if (user) {
      // Don't send password to client
      const { password, ...userWithoutPassword } = user
      res.status(200).send(userWithoutPassword)
    } else {
      res.status(404).send(`Failed to find user: ID ${id}`)
    }
  } catch (error) {
    res.status(404).send(`Failed to find user: ID ${req?.params?.id}`)
  }
})

// Get user's friends
router.get("/profile/:id/friends", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id

    if (!ObjectId.isValid(userId)) {
      res.status(400).json({ message: "Invalid user ID format" })
      return
    }

    const user = await collections.users?.findOne({ _id: new ObjectId(userId) })

    if (!user) {
      res.status(404).json({ message: "User not found" })
      return
    }

    // Get friends details
    const friendIds = user.friends || []
    const friends = await collections.users
      ?.find({
        _id: { $in: friendIds },
      })
      .project({ password: 0 })
      .toArray()

    res.json(friends || [])
  } catch (error) {
    console.error("Error getting user friends:", error)
    res.status(500).json({ message: "Server error while fetching friends" })
  }
})

// Middleware to verify JWT token
export function verifyToken(req: AuthRequest, res: Response, next: NextFunction): void {
  const token = req.header("auth-token") || req.header("x-auth-token")
  if (!token) {
    res.status(401).send("Access Denied")
    return
  }

  try {
    const verified = jwt.verify(token, JWT_SECRET) as { id: string; username: string; role?: string }
    req.user = verified
    next()
  } catch (error) {
    res.status(400).send("Invalid Token")
  }
}

// Protected route example
router.get("/protected", authenticateToken, (req: Request, res: Response): void => {
  res.send({ user: req.user })
})

// Get current user profile
router.get("/profile", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).send("User not authenticated")
      return
    }

    const query = { _id: new ObjectId(req.user.id) }
    const user = await collections.users?.findOne(query)

    if (user) {
      // Don't send password to client
      const { password, ...userWithoutPassword } = user
      res.status(200).send(userWithoutPassword)
    } else {
      res.status(404).send(`Failed to find user: ID ${req.user.id}`)
    }
  } catch (error) {
    res.status(500).send(error instanceof Error ? error.message : "Unknown error")
  }
})

// Search users
router.get("/search", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).send("User not authenticated")
      return
    }

    const query = req.query.q as string
    if (!query) {
      res.status(400).json({ message: "Search query is required" })
      return
    }

    // Find users matching the query, excluding the current user and their friends
    const currentUser = await collections.users?.findOne({ _id: new ObjectId(req.user.id) })
    const friendIds = currentUser?.friends || []

    const users = await collections.users
      ?.find({
        $and: [
          { _id: { $ne: new ObjectId(req.user.id) } }, // Exclude current user
          { _id: { $nin: friendIds } }, // Exclude friends
          {
            $or: [
              { fullName: { $regex: query, $options: "i" } },
              { email: { $regex: query, $options: "i" } },
              { username: { $regex: query, $options: "i" } },
            ],
          },
        ],
      })
      .project({ password: 0 })
      .toArray() // Exclude password from results

    res.json(users)
  } catch (error) {
    console.error(error)
    res.status(500).send(error instanceof Error ? error.message : "Unknown error")
  }
})

// List all users (for admin or testing)
router.get("/list", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).send("User not authenticated")
      return
    }

    // Only allow admins to list all users in production
    if (process.env.NODE_ENV === "production") {
      const user = await collections.users?.findOne({ _id: new ObjectId(req.user.id) })
      if (user?.role !== "admin") {
        res.status(403).send("Access denied: Admin role required")
        return
      }
    }

    // Get all users except the current user
    const users = await collections.users
      ?.find({
        _id: { $ne: new ObjectId(req.user.id) }, // Exclude current user
      })
      .project({ password: 0 }) // Don't return passwords
      .toArray()

    res.json(users || [])
  } catch (error) {
    console.error("Error getting users:", error)
    res.status(500).send("Server error")
  }
})

// Update profile picture
router.post(
  "/profile-picture",
  authenticateToken,
  profileUpload.single("profilePicture"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      console.log("Profile picture upload request received")

      if (!req.user?.id) {
        res.status(401).send("User not authenticated")
        return
      }

      if (!req.file) {
        res.status(400).send("No file uploaded")
        return
      }

      console.log("File uploaded:", req.file.filename)

      const query = { _id: new ObjectId(req.user.id) }
      const user = await collections.users?.findOne(query)

      if (!user) {
        res.status(404).send(`Failed to find user: ID ${req.user.id}`)
        return
      }

      // Delete old profile picture if it exists and is stored in uploads
      if (user.profilePicture && user.profilePicture.startsWith("/uploads/")) {
        const oldImagePath = path.join(__dirname, "../..", user.profilePicture)
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath)
        }
      }

      // Update profile picture path
      const profilePicturePath = `/uploads/profiles/${req.file.filename}`
      console.log("New profile picture path:", profilePicturePath)

      const updateResult = await collections.users?.updateOne(query, { $set: { profilePicture: profilePicturePath } })

      if (updateResult?.modifiedCount) {
        console.log("Profile picture updated successfully")
        res.status(200).json({
          message: "Profile picture updated successfully",
          profilePicture: profilePicturePath,
        })
      } else {
        console.log("Failed to update profile picture in database")
        res.status(500).send("Failed to update profile picture")
      }
    } catch (error) {
      console.error("Error in profile picture upload:", error)
      res.status(500).send(error instanceof Error ? error.message : "Unknown error")
    }
  },
)

// Update cover photo
router.post(
  "/cover-photo",
  authenticateToken,
  coverUpload.single("coverPhoto"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      console.log("Cover photo upload request received")

      if (!req.user?.id) {
        res.status(401).send("User not authenticated")
        return
      }

      if (!req.file) {
        res.status(400).send("No file uploaded")
        return
      }

      console.log("File uploaded:", req.file.filename)

      const query = { _id: new ObjectId(req.user.id) }
      const user = await collections.users?.findOne(query)

      if (!user) {
        res.status(404).send(`Failed to find user: ID ${req.user.id}`)
        return
      }

      // Delete old cover photo if it exists and is stored in uploads
      if (user.coverPhoto && user.coverPhoto.startsWith("/uploads/")) {
        const oldImagePath = path.join(__dirname, "../..", user.coverPhoto)
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath)
        }
      }

      // Update cover photo path
      const coverPhotoPath = `/uploads/covers/${req.file.filename}`
      console.log("New cover photo path:", coverPhotoPath)

      const updateResult = await collections.users?.updateOne(query, { $set: { coverPhoto: coverPhotoPath } })

      if (updateResult?.modifiedCount) {
        console.log("Cover photo updated successfully")
        res.status(200).json({
          message: "Cover photo updated successfully",
          coverPhoto: coverPhotoPath,
        })
      } else {
        console.log("Failed to update cover photo in database")
        res.status(500).send("Failed to update cover photo")
      }
    } catch (error) {
      console.error("Error in cover photo upload:", error)
      res.status(500).send(error instanceof Error ? error.message : "Unknown error")
    }
  },
)

// Update user profile
router.put("/profile", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).send("User not authenticated")
      return
    }

    const query = { _id: new ObjectId(req.user.id) }
    const user = await collections.users?.findOne(query)

    if (!user) {
      res.status(404).send(`Failed to find user: ID ${req.user.id}`)
      return
    }

    // Fields that can be updated
    const updatableFields = [
      "fullName",
      "bio",
      "workplace",
      "education",
      "location",
      "relationshipStatus",
      "birthday",
      "phone",
      "website",
      "workplaceRole",
      "workplaceDuration",
      "educationDegree",
      "educationDuration",
    ]

    // Create update object with only allowed fields
    const updateData: Record<string, any> = {}

    for (const field of updatableFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field]
      }
    }

    // Only update if there are fields to update
    if (Object.keys(updateData).length === 0) {
      res.status(400).send("No valid fields to update")
      return
    }

    const updateResult = await collections.users?.updateOne(query, { $set: updateData })

    if (updateResult?.modifiedCount) {
      // Get updated user
      const updatedUser = await collections.users?.findOne(query)

      if (updatedUser) {
        // Don't send password to client
        const { password, ...userWithoutPassword } = updatedUser
        res.status(200).json(userWithoutPassword)
      } else {
        res.status(404).send(`Failed to find updated user: ID ${req.user.id}`)
      }
    } else {
      res.status(500).send("Failed to update profile")
    }
  } catch (error) {
    console.error(error)
    res.status(500).send(error instanceof Error ? error.message : "Unknown error")
  }
})

// Export the router as default
export default router
