import express, { type Request, type Response } from "express"
import { ObjectId } from "mongodb"
import { collections } from "../database"
import { authenticateToken } from "../middleware/auth"

export const likeRouter = express.Router()

// Middleware
likeRouter.use(express.json())
likeRouter.use(authenticateToken)

// Like a post
likeRouter.post("/posts/:postId/like", async (req: Request, res: Response) => {
  try {
    const postId = new ObjectId(req.params.postId)
    const userId = new ObjectId(req.user.id)

    // Check if post exists
    const post = await collections.posts.findOne({ _id: postId })
    if (!post) {
      res.status(404).json({ message: "Post not found" })
      return
    }

    // Check if user already liked the post
    const alreadyLiked = await collections.likes.findOne({
      userId,
      targetId: postId,
      targetType: "post",
    })

    if (alreadyLiked) {
      res.status(400).json({ message: "You already liked this post" })
      return
    }

    // Add like
    const like = {
      userId,
      targetId: postId,
      targetType: "post" as const,
      createdAt: new Date(),
    }

    await collections.likes.insertOne(like)

    // Update post likes array
    await collections.posts.updateOne({ _id: postId }, { $addToSet: { likes: userId } })

    // Create notification for post owner if it's not the same user
    if (post.userId.toString() !== userId.toString()) {
      const notification = {
        userId: post.userId,
        type: "like",
        referenceId: postId,
        createdAt: new Date(),
        isRead: false,
        content: `Someone liked your post`,
        sourceUserId: userId,
      }

      await collections.notifications.insertOne(notification)
    }

    res.status(200).json({ message: "Post liked successfully" })
  } catch (error) {
    console.error("Error liking post:", error)
    res.status(500).json({ message: "Failed to like post" })
  }
})

// Unlike a post
likeRouter.delete("/posts/:postId/like", async (req: Request, res: Response) => {
  try {
    const postId = new ObjectId(req.params.postId)
    const userId = new ObjectId(req.user.id)

    // Check if post exists
    const post = await collections.posts.findOne({ _id: postId })
    if (!post) {
      res.status(404).json({ message: "Post not found" })
      return
    }

    // Remove like
    const result = await collections.likes.deleteOne({
      userId,
      targetId: postId,
      targetType: "post",
    })

    if (result.deletedCount === 0) {
      res.status(404).json({ message: "Like not found" })
      return
    }

    // Update post likes array
    await collections.posts.updateOne({ _id: postId }, { $pull: { likes: userId } })

    // Delete notification
    await collections.notifications.deleteOne({
      sourceUserId: userId,
      type: "like",
      referenceId: postId,
    })

    res.status(200).json({ message: "Post unliked successfully" })
  } catch (error) {
    console.error("Error unliking post:", error)
    res.status(500).json({ message: "Failed to unlike post" })
  }
})

// Get users who liked a post
likeRouter.get("/posts/:postId/likes", async (req: Request, res: Response) => {
  try {
    const postId = new ObjectId(req.params.postId)

    // Check if post exists
    const post = await collections.posts.findOne({ _id: postId })
    if (!post) {
      res.status(404).json({ message: "Post not found" })
      return
    }

    // Get likes
    const likes = await collections.likes.find({ targetId: postId, targetType: "post" }).toArray()

    // Get user details
    const userIds = likes.map((like: { userId: any }) => like.userId)
    const users = await collections.users.find({ _id: { $in: userIds } }, { projection: { password: 0 } }).toArray()

    // Map users to likes
    const likeDetails = likes.map((like: { userId: { toString: () => any }; _id: any; createdAt: any }) => {
      const user = users.find((u: { _id: { toString: () => any } }) => u._id.toString() === like.userId.toString())
      return {
        _id: like._id,
        createdAt: like.createdAt,
        user,
      }
    })

    res.status(200).json(likeDetails)
  } catch (error) {
    console.error("Error getting post likes:", error)
    res.status(500).json({ message: "Failed to get post likes" })
  }
})

// Check if user liked a post
likeRouter.get("/posts/:postId/liked", async (req: Request, res: Response) => {
  try {
    const postId = new ObjectId(req.params.postId)
    const userId = new ObjectId(req.user.id)

    const like = await collections.likes.findOne({
      userId,
      targetId: postId,
      targetType: "post",
    })

    res.status(200).json({ liked: !!like })
  } catch (error) {
    console.error("Error checking if post is liked:", error)
    res.status(500).json({ message: "Failed to check if post is liked" })
  }
})

// Get all likes by a user
likeRouter.get("/users/:userId/likes", async (req: Request, res: Response) => {
  try {
    const userId = new ObjectId(req.params.userId)

    const likes = await collections.likes.find({ userId }).sort({ createdAt: -1 }).toArray()

    // Get post and comment details
    const postIds = likes.filter((like: { targetType: string }) => like.targetType === "post").map((like: { targetId: any }) => like.targetId)

    const commentIds = likes.filter((like: { targetType: string }) => like.targetType === "comment").map((like: { targetId: any }) => like.targetId)

    const posts = await collections.posts.find({ _id: { $in: postIds } }).toArray()

    const comments = await collections.comments.find({ _id: { $in: commentIds } }).toArray()

    // Map details to likes
    const likeDetails = likes.map((like: { targetType: string; targetId: { toString: () => any } }) => {
      if (like.targetType === "post") {
        const post = posts.find((p: { _id: { toString: () => any } }) => p._id.toString() === like.targetId.toString())
        return {
          ...like,
          target: post || null,
        }
      } else if (like.targetType === "comment") {
        const comment = comments.find((c: { _id: { toString: () => any } }) => c._id.toString() === like.targetId.toString())
        return {
          ...like,
          target: comment || null,
        }
      }
      return like
    })

    res.status(200).json(likeDetails)
  } catch (error) {
    console.error("Error getting user likes:", error)
    res.status(500).json({ message: "Failed to get user likes" })
  }
})
export default likeRouter
