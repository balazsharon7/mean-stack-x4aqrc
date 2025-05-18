import express, { type Request, type Response } from "express"
import { ObjectId } from "mongodb"
import multer, { type FileFilterCallback } from "multer"
import path from "path"
import fs from "fs"
import { collections } from "../database"
import { authenticateToken } from "../middleware/auth"

export const mediaRouter = express.Router()

// Middleware
mediaRouter.use(express.json())
mediaRouter.use(authenticateToken)

// Configure multer for media uploads
const mediaStorage = multer.diskStorage({
  destination: (
    req: express.Request,
    file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void,
  ) => {
    const mediaType = getMediaType(file.mimetype)
    const uploadDir = path.join(__dirname, `../../uploads/${mediaType}s`)

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    cb(null, uploadDir)
  },
  filename: (req: express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`)
  },
})

// File filter to validate media types
const fileFilter = (req: express.Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  const allowedMimeTypes = [
    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    // Videos
    "video/mp4",
    "video/webm",
    "video/quicktime",
    // Audio
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    // Documents
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error("Invalid file type. Only images, videos, audio, and documents are allowed."))
  }
}

// Helper function to determine media type
function getMediaType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image"
  if (mimeType.startsWith("video/")) return "video"
  if (mimeType.startsWith("audio/")) return "audio"
  return "document"
}

// Configure multer upload
const upload = multer({
  storage: mediaStorage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
})

// Upload media
mediaRouter.post("/upload", upload.single("media"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" })
      return
    }

    const userId = new ObjectId(req.user.id)
    const { postId, albumId, description, tags } = req.body

    // Create media record
    const mediaType = getMediaType(req.file.mimetype)
    const mediaUrl = `/uploads/${mediaType}s/${req.file.filename}`

    const newMedia = {
      userId,
      type: mediaType,
      url: mediaUrl,
      filename: req.file.filename,
      size: req.file.size,
      mimeType: req.file.mimetype,
      createdAt: new Date(),
      ...(postId && { postId: new ObjectId(postId) }),
      ...(albumId && { albumId: new ObjectId(albumId) }),
      ...(description && { description }),
      ...(tags && { tags: typeof tags === "string" ? tags.split(",").map((tag: string) => tag.trim()) : [] }),
    }

    const result = await collections.media.insertOne(newMedia)

    res.status(201).json({
      ...newMedia,
      _id: result.insertedId,
    })
  } catch (error) {
    console.error("Error uploading media:", error)
    res.status(500).json({ message: "Failed to upload media" })
  }
})

// Get media by ID
mediaRouter.get("/:mediaId", async (req: Request, res: Response) => {
  try {
    const mediaId = new ObjectId(req.params.mediaId)

    const media = await collections.media.findOne({ _id: mediaId })

    if (!media) {
      res.status(404).json({ message: "Media not found" })
      return
    }

    res.status(200).json(media)
  } catch (error) {
    console.error("Error getting media:", error)
    res.status(500).json({ message: "Failed to get media" })
  }
})

// Get all media for a user
mediaRouter.get("/user/:userId", async (req: Request, res: Response) => {
  try {
    const userId = new ObjectId(req.params.userId)

    const media = await collections.media.find({ userId }).sort({ createdAt: -1 }).toArray()

    res.status(200).json(media)
  } catch (error) {
    console.error("Error getting user media:", error)
    res.status(500).json({ message: "Failed to get user media" })
  }
})

// Get all media for a post
mediaRouter.get("/post/:postId", async (req: Request, res: Response) => {
  try {
    const postId = new ObjectId(req.params.postId)

    const media = await collections.media.find({ postId }).sort({ createdAt: 1 }).toArray()

    res.status(200).json(media)
  } catch (error) {
    console.error("Error getting post media:", error)
    res.status(500).json({ message: "Failed to get post media" })
  }
})

// Update media details
mediaRouter.put("/:mediaId", async (req: Request, res: Response) => {
  try {
    const mediaId = new ObjectId(req.params.mediaId)
    const userId = new ObjectId(req.user.id)
    const { description, tags } = req.body as { description?: string; tags?: string }

    // Check if media exists and belongs to user
    const media = await collections.media.findOne({ _id: mediaId })

    if (!media) {
      res.status(404).json({ message: "Media not found" })
      return
    }

    if (media.userId.toString() !== userId.toString()) {
      res.status(403).json({ message: "Not authorized to update this media" })
      return
    }

    const updateData: { description?: string; tags?: string[] } = {}
    if (description !== undefined) updateData.description = description
    if (tags !== undefined) {
      // Javítás: Ellenőrizzük, hogy a tags string-e, és csak akkor hívjuk meg a split-et
      if (typeof tags === "string") {
        updateData.tags = tags.split(",").map((tag) => tag.trim())
      } else if (Array.isArray(tags)) {
        updateData.tags = tags
      }
    }

    const result = await collections.media.updateOne({ _id: mediaId }, { $set: updateData })

    if (result.modifiedCount === 0) {
      res.status(404).json({ message: "Media not found or not modified" })
      return
    }

    res.status(200).json({ message: "Media updated successfully" })
  } catch (error) {
    console.error("Error updating media:", error)
    res.status(500).json({ message: "Failed to update media" })
  }
})

// Delete media
mediaRouter.delete("/:mediaId", async (req: Request, res: Response) => {
  try {
    const mediaId = new ObjectId(req.params.mediaId)
    const userId = new ObjectId(req.user.id)

    // Check if media exists and belongs to user
    const media = await collections.media.findOne({ _id: mediaId })

    if (!media) {
      res.status(404).json({ message: "Media not found" })
      return
    }

    if (media.userId.toString() !== userId.toString()) {
      res.status(403).json({ message: "Not authorized to delete this media" })
      return
    }

    // Delete the file from the filesystem
    const filePath = path.join(__dirname, `../..${media.url}`)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    // Delete the media record
    const result = await collections.media.deleteOne({ _id: mediaId })

    if (result.deletedCount === 0) {
      res.status(404).json({ message: "Media not found or not deleted" })
      return
    }

    res.status(200).json({ message: "Media deleted successfully" })
  } catch (error) {
    console.error("Error deleting media:", error)
    res.status(500).json({ message: "Failed to delete media" })
  }
})

// Search media by tags
mediaRouter.get("/search/tags", async (req: Request, res: Response) => {
  try {
    const { tags } = req.query

    if (!tags) {
      res.status(400).json({ message: "Tags parameter is required" })
      return
    }

    // Javítás: Biztonságos konverzió és ellenőrzés
    let tagArray: string[] = []
    
    if (Array.isArray(tags)) {
      // Ha tags egy tömb, akkor az első elemet használjuk (ha string)
      if (typeof tags[0] === "string") {
        tagArray = tags[0].split(",").map(tag => tag.trim())
      }
    } else if (typeof tags === "string") {
      // Ha tags egy string, akkor közvetlenül használjuk
      tagArray = tags.split(",").map(tag => tag.trim())
    }

    const media = await collections.media
      .find({ tags: { $in: tagArray } })
      .sort({ createdAt: -1 })
      .toArray()

    res.status(200).json(media)
  } catch (error) {
    console.error("Error searching media by tags:", error)
    res.status(500).json({ message: "Failed to search media" })
  }
})
export default mediaRouter