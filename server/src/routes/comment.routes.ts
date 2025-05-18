import express from "express"
import { ObjectId } from "mongodb"
import { collections } from "../database"
import { authenticateToken } from "../middleware/auth"
import type { Request, Response } from "express"

export const commentRouter = express.Router()

// Middleware
commentRouter.use(express.json())
commentRouter.use(authenticateToken)

// Get all comments for a post
commentRouter.get("/posts/:postId/comments", async (req: Request, res: Response) => {
  try {
    const postId = new ObjectId(req.params.postId)

    const comments = await collections.comments.find({ postId }).sort({ createdAt: -1 }).toArray()

    res.status(200).json(comments)
  } catch (error) {
    console.error("Error getting comments:", error)
    res.status(500).json({ message: "Failed to get comments" })
  }
})

// Add a comment to a post
commentRouter.post("/posts/:postId/comments", async (req: Request, res: Response) => {
  try {
    const postId = new ObjectId(req.params.postId)
    const userId = new ObjectId(req.user.id)
    const { content, parentCommentId } = req.body

    if (!content || content.trim() === "") {
      res.status(400).json({ message: "Comment content is required" })
      return
    }

    // Check if post exists
    const post = await collections.posts.findOne({ _id: postId })
    if (!post) {
      res.status(404).json({ message: "Post not found" })
      return
    }

    const newComment = {
      postId,
      userId,
      content,
      createdAt: new Date(),
      likes: [],
      ...(parentCommentId && { parentCommentId: new ObjectId(parentCommentId) }),
    }

    const result = await collections.comments.insertOne(newComment)

    // Create notification for post owner if it's not the same user
    if (post.userId.toString() !== userId.toString()) {
      const notification = {
        userId: post.userId,
        type: "comment",
        referenceId: postId,
        createdAt: new Date(),
        isRead: false,
        content: `Someone commented on your post`,
        sourceUserId: userId,
      }

      await collections.notifications.insertOne(notification)
    }

    res.status(201).json({ ...newComment, _id: result.insertedId })
  } catch (error) {
    console.error("Error adding comment:", error)
    res.status(500).json({ message: "Failed to add comment" })
  }
})

// Update a comment
commentRouter.put("/comments/:commentId", async (req: Request, res: Response) => {
  try {
    const commentId = new ObjectId(req.params.commentId)
    const userId = new ObjectId(req.user.id)
    const { content } = req.body

    if (!content || content.trim() === "") {
      res.status(400).json({ message: "Comment content is required" })
      return
    }

    // Check if comment exists and belongs to user
    const comment = await collections.comments.findOne({ _id: commentId })
    if (!comment) {
      res.status(404).json({ message: "Comment not found" })
      return
    }

    if (comment.userId.toString() !== userId.toString()) {
      res.status(403).json({ message: "Not authorized to update this comment" })
      return
    }

    const result = await collections.comments.updateOne(
      { _id: commentId },
      {
        $set: {
          content,
          updatedAt: new Date(),
        },
      },
    )

    if (result.modifiedCount === 0) {
      res.status(404).json({ message: "Comment not found or not modified" })
      return
    }

    res.status(200).json({ message: "Comment updated successfully" })
  } catch (error) {
    console.error("Error updating comment:", error)
    res.status(500).json({ message: "Failed to update comment" })
  }
})

// Delete a comment
commentRouter.delete("/comments/:commentId", async (req: Request, res: Response) => {
  try {
    const commentId = new ObjectId(req.params.commentId)
    const userId = new ObjectId(req.user.id)

    // Check if comment exists and belongs to user
    const comment = await collections.comments.findOne({ _id: commentId })
    if (!comment) {
      res.status(404).json({ message: "Comment not found" })
      return
    }

    // Allow comment owner or post owner to delete
    const post = await collections.posts.findOne({ _id: comment.postId })
    if (comment.userId.toString() !== userId.toString() && post && post.userId.toString() !== userId.toString()) {
      res.status(403).json({ message: "Not authorized to delete this comment" })
      return
    }

    const result = await collections.comments.deleteOne({ _id: commentId })

    if (result.deletedCount === 0) {
      res.status(404).json({ message: "Comment not found or not deleted" })
      return
    }

    // Also delete any replies to this comment
    await collections.comments.deleteMany({ parentCommentId: commentId })

    // Delete any notifications related to this comment
    await collections.notifications.deleteMany({
      type: "comment",
      referenceId: commentId,
    })

    res.status(200).json({ message: "Comment deleted successfully" })
  } catch (error) {
    console.error("Error deleting comment:", error)
    res.status(500).json({ message: "Failed to delete comment" })
  }
})

// Like a comment
commentRouter.post("/comments/:commentId/like", async (req: Request, res: Response) => {
  try {
    const commentId = new ObjectId(req.params.commentId)
    const userId = new ObjectId(req.user.id)

    // Check if comment exists
    const comment = await collections.comments.findOne({ _id: commentId })
    if (!comment) {
      res.status(404).json({ message: "Comment not found" })
      return
    }

    // Check if user already liked the comment
    const alreadyLiked = await collections.likes.findOne({
      userId,
      targetId: commentId,
      targetType: "comment",
    })

    if (alreadyLiked) {
      res.status(400).json({ message: "You already liked this comment" })
      return
    }

    // Add like
    const like = {
      userId,
      targetId: commentId,
      targetType: "comment" as const,
      createdAt: new Date(),
    }

    await collections.likes.insertOne(like)

    // Update comment likes array
    await collections.comments.updateOne({ _id: commentId }, { $addToSet: { likes: userId } })

    // Create notification for comment owner if it's not the same user
    if (comment.userId.toString() !== userId.toString()) {
      const notification = {
        userId: comment.userId,
        type: "like",
        referenceId: commentId,
        createdAt: new Date(),
        isRead: false,
        content: `Someone liked your comment`,
        sourceUserId: userId,
      }

      await collections.notifications.insertOne(notification)
    }

    res.status(200).json({ message: "Comment liked successfully" })
  } catch (error) {
    console.error("Error liking comment:", error)
    res.status(500).json({ message: "Failed to like comment" })
  }
})

// Unlike a comment
commentRouter.delete("/comments/:commentId/like", async (req: Request, res: Response) => {
  try {
    const commentId = new ObjectId(req.params.commentId)
    const userId = new ObjectId(req.user.id)

    // Check if comment exists
    const comment = await collections.comments.findOne({ _id: commentId })
    if (!comment) {
      res.status(404).json({ message: "Comment not found" })
      return
    }

    // Remove like
    const result = await collections.likes.deleteOne({
      userId,
      targetId: commentId,
      targetType: "comment",
    })

    if (result.deletedCount === 0) {
      res.status(404).json({ message: "Like not found" })
      return
    }

    // Update comment likes array
    await collections.comments.updateOne({ _id: commentId }, { $pull: { likes: userId } })

    // Delete notification
    await collections.notifications.deleteOne({
      sourceUserId: userId,
      type: "like",
      referenceId: commentId,
    })

    res.status(200).json({ message: "Comment unliked successfully" })
  } catch (error) {
    console.error("Error unliking comment:", error)
    res.status(500).json({ message: "Failed to unlike comment" })
  }
})

// Get replies to a comment
commentRouter.get("/comments/:commentId/replies", async (req: Request, res: Response) => {
  try {
    const parentCommentId = new ObjectId(req.params.commentId)

    const replies = await collections.comments.find({ parentCommentId }).sort({ createdAt: 1 }).toArray()

    res.status(200).json(replies)
  } catch (error) {
    console.error("Error getting comment replies:", error)
    res.status(500).json({ message: "Failed to get comment replies" })
  }
})
export default commentRouter
