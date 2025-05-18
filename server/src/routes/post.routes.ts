import * as express from "express"
import type { Request, Response } from "express"
import { ObjectId } from "mongodb"
import multer from "multer"
import * as path from "path"
import * as fs from "fs"
import { collections } from "../database"
import { authenticateToken } from "../middleware/auth"

export const postRouter = express.Router()
postRouter.use(express.json())

// Multer configuration for post images
const postStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../../uploads/posts")
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    const ext = path.extname(file.originalname)
    cb(null, "post-" + uniqueSuffix + ext)
  },
})

const postUpload = multer({
  storage: postStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb: any) => {
    const filetypes = /jpeg|jpg|png|gif/
    const mimetype = filetypes.test(file.mimetype)
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase())

    if (mimetype && extname) {
      return cb(null, true)
    }
    cb(new Error("Only image files are allowed!"))
  },
})

// Debugging route to check if the router is working
postRouter.get("/test", (req: Request, res: Response): void => {
  res.json({ message: "Post router is working" })
})

// Get posts for feed
postRouter.get("/feed", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).send("User not authenticated")
      return
    }

    console.log("Getting feed for user:", req.user.id)

    // Get user's friend IDs
    const user = await collections.users?.findOne({ _id: new ObjectId(req.user.id) })
    const friendIds = user?.friends || []

    console.log("User friends:", friendIds)

    // Get posts from user and friends
    const posts = await collections.posts
      ?.find({
        userId: { $in: [...friendIds, new ObjectId(req.user.id)] },
      })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray()

    console.log("Found posts:", posts?.length || 0)

    // Populate user info for each post
    const populatedPosts = await Promise.all(
      posts?.map(async (post) => {
        const user = await collections.users?.findOne({ _id: post.userId })

        // Populate user info for comments as well
        const populatedComments = await Promise.all(
          (post.comments || []).map(async (comment: any) => {
            const commentUser = await collections.users?.findOne({ _id: comment.userId })
            return {
              ...comment,
              userId: {
                _id: commentUser?._id,
                fullName: commentUser?.fullName,
                username: commentUser?.username,
                profilePicture: commentUser?.profilePicture,
              },
            }
          }),
        )

        return {
          ...post,
          userId: {
            _id: user?._id,
            fullName: user?.fullName,
            username: user?.username,
            profilePicture: user?.profilePicture,
          },
          comments: populatedComments,
        }
      }) || [],
    )

    res.json(populatedPosts)
  } catch (error) {
    console.error("Error in feed:", error)
    res.status(500).send("Server error")
  }
})

// Get user posts
postRouter.get("/user/:userId", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).send("User not authenticated")
      return
    }

    const userId = req.params.userId
    console.log("Getting posts for user:", userId)

    // Get user's posts
    const posts = await collections.posts
      ?.find({
        userId: new ObjectId(userId),
      })
      .sort({ createdAt: -1 })
      .toArray()

    console.log("Found user posts:", posts?.length || 0)

    // Populate user info for each post
    const populatedPosts = await Promise.all(
      posts?.map(async (post) => {
        const user = await collections.users?.findOne({ _id: post.userId })

        // Populate user info for comments as well
        const populatedComments = await Promise.all(
          (post.comments || []).map(async (comment: any) => {
            const commentUser = await collections.users?.findOne({ _id: comment.userId })
            return {
              ...comment,
              userId: {
                _id: commentUser?._id,
                fullName: commentUser?.fullName,
                username: commentUser?.username,
                profilePicture: commentUser?.profilePicture,
              },
            }
          }),
        )

        return {
          ...post,
          userId: {
            _id: user?._id,
            fullName: user?.fullName,
            username: user?.username,
            profilePicture: user?.profilePicture,
          },
          comments: populatedComments,
        }
      }) || [],
    )

    res.json(populatedPosts)
  } catch (error) {
    console.error("Error getting user posts:", error)
    res.status(500).send("Server error")
  }
})

// Create new post
postRouter.post(
  "/",
  authenticateToken,
  postUpload.single("image"),
  async (req: Request, res: Response): Promise<void> => {
    try {
      console.log("Creating new post, request body:", req.body)
      console.log("File:", req.file)

      if (!req.user?.id) {
        console.log("No user ID in request")
        res.status(401).send("User not authenticated")
        return
      }

      const { content } = req.body

      if (!content && !req.file) {
        console.log("No content or file provided")
        res.status(400).send("Post content or image is required")
        return
      }

      const newPost = {
        userId: new ObjectId(req.user.id),
        content: content || "",
        imageUrl: req.file ? `/uploads/posts/${req.file.filename}` : null,
        likes: [] as ObjectId[],
        comments: [] as any[],
        createdAt: new Date(),
      }

      console.log("New post object:", newPost)

      const result = await collections.posts?.insertOne(newPost)
      console.log("Insert result:", result)

      if (!result?.acknowledged) {
        console.log("Insert not acknowledged")
        res.status(500).send("Failed to create post")
        return
      }

      // Return the created post with user data
      const user = await collections.users?.findOne({ _id: new ObjectId(req.user.id) })
      console.log("Found user:", user?._id)

      const populatedPost = {
        ...newPost,
        _id: result.insertedId,
        userId: {
          _id: user?._id,
          fullName: user?.fullName,
          username: user?.username,
          profilePicture: user?.profilePicture,
        },
      }

      console.log("Sending populated post:", populatedPost._id)
      res.status(201).json(populatedPost)
    } catch (error) {
      console.error("Error creating post:", error)
      res.status(500).send(`Server error: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  },
)

// Delete post
postRouter.delete("/:postId", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).send("User not authenticated")
      return
    }

    const postId = req.params.postId
    const post = await collections.posts?.findOne({ _id: new ObjectId(postId) })

    if (!post) {
      res.status(404).send("Post not found")
      return
    }

    // Check if user is the post owner
    if (post.userId.toString() !== req.user.id) {
      res.status(403).send("Not authorized to delete this post")
      return
    }

    // Delete image file if it exists
    if (post.imageUrl) {
      const imagePath = path.join(__dirname, "../..", post.imageUrl)
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath)
      }
    }

    const deleteResult = await collections.posts?.deleteOne({ _id: new ObjectId(postId) })

    if (deleteResult?.deletedCount) {
      res.json({ message: "Post deleted successfully" })
    } else {
      res.status(500).send("Failed to delete post")
    }
  } catch (error) {
    console.error(error)
    res.status(500).send("Server error")
  }
})

// Toggle like on post
postRouter.post("/:postId/like", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).send("User not authenticated")
      return
    }

    const postId = req.params.postId
    const userId = new ObjectId(req.user.id)
    const post = await collections.posts?.findOne({ _id: new ObjectId(postId) })

    if (!post) {
      res.status(404).send("Post not found")
      return
    }

    // Check if user already liked the post
    const likes = post.likes || []
    const userIdStr = req.user.id
    const likeIndex = likes.findIndex((id: { toString: () => string }) => id.toString() === userIdStr)

    if (likeIndex === -1) {
      // Add like if not already liked
      await collections.posts?.updateOne({ _id: new ObjectId(postId) }, { $push: { likes: userId } as any })
    } else {
      // Remove like if already liked
      await collections.posts?.updateOne({ _id: new ObjectId(postId) }, { $pull: { likes: userId } as any })
    }

    // Get updated post
    const updatedPost = await collections.posts?.findOne({ _id: new ObjectId(postId) })
    res.json({ likes: updatedPost?.likes || [] })
  } catch (error) {
    console.error(error)
    res.status(500).send("Server error")
  }
})

// Get post by ID
postRouter.get("/:id", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const postId = req.params.id
    const post = await collections.posts?.findOne({ _id: new ObjectId(postId) })

    if (!post) {
      res.status(404).json({ message: "Post not found" })
      return
    }

    // Populate user info for the post and comments
    const user = await collections.users?.findOne({ _id: post.userId })
    const populatedPost = {
      ...post,
      userId: {
        _id: user?._id,
        fullName: user?.fullName,
        username: user?.username,
        profilePicture: user?.profilePicture,
      },
      comments: await Promise.all(
        (post.comments || []).map(async (comment: any) => {
          const commentUser = await collections.users?.findOne({ _id: comment.userId })
          return {
            ...comment,
            userId: {
              _id: commentUser?._id,
              fullName: commentUser?.fullName,
              username: commentUser?.username,
              profilePicture: commentUser?.profilePicture,
            },
          }
        }),
      ),
    }

    res.json(populatedPost)
  } catch (error) {
    console.error("Error fetching post:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Add comment to post
postRouter.post("/:postId/comment", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).send("User not authenticated")
      return
    }

    const { content } = req.body
    const postId = req.params.postId

    if (!content) {
      res.status(400).send("Comment content is required")
      return
    }

    const post = await collections.posts?.findOne({ _id: new ObjectId(postId) })

    if (!post) {
      res.status(404).send("Post not found")
      return
    }

    const newComment = {
      _id: new ObjectId(),
      userId: new ObjectId(req.user.id),
      content,
      createdAt: new Date(),
    }

    await collections.posts?.updateOne({ _id: new ObjectId(postId) }, { $push: { comments: newComment } as any })

    // Get updated post
    const updatedPostRaw = await collections.posts?.findOne({ _id: new ObjectId(postId) })

    if (!updatedPostRaw) {
      res.status(404).send("Post not found")
      return
    }

    // Populate user info for each comment
    const populatedComments = await Promise.all(
      (updatedPostRaw.comments || []).map(async (comment: any) => {
        const user = await collections.users?.findOne({ _id: comment.userId })
        return {
          ...comment,
          userId: {
            _id: user?._id,
            fullName: user?.fullName,
            username: user?.username,
            profilePicture: user?.profilePicture,
          },
        }
      }),
    )

    const updatedPost = {
      ...updatedPostRaw,
      comments: populatedComments,
    }

    res.json(updatedPost)
  } catch (error) {
    console.error(error)
    res.status(500).send("Server error")
  }
})

export default postRouter
