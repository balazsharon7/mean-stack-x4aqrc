import express, { type Request, type Response } from "express"
import { ObjectId } from "mongodb"
import { collections } from "../database"
import { authenticateToken } from "../middleware/auth"

export const notificationRouter = express.Router()

// Middleware
notificationRouter.use(express.json())
notificationRouter.use(authenticateToken)

// Get all notifications for the current user
notificationRouter.get("/", async (req: Request, res: Response) => {
  try {
    const userId = new ObjectId(req.user.id)

    const notifications = await collections.notifications.find({ userId }).sort({ createdAt: -1 }).toArray()

    // Populate source user details
    const populatedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        if (notification.sourceUserId) {
          const sourceUser = await collections.users.findOne(
            { _id: notification.sourceUserId },
            { projection: { username: 1, fullName: 1, profilePicture: 1 } },
          )

          return {
            ...notification,
            sourceUser: sourceUser || null,
          }
        }
        return notification
      }),
    )

    res.status(200).json(populatedNotifications)
  } catch (error) {
    console.error("Error getting notifications:", error)
    res.status(500).json({ message: "Failed to get notifications" })
  }
})

// Mark a notification as read
notificationRouter.put("/:notificationId/read", async (req: Request, res: Response) => {
  try {
    const notificationId = new ObjectId(req.params.notificationId)
    const userId = new ObjectId(req.user.id)

    const notification = await collections.notifications.findOne({ _id: notificationId })

    if (!notification) {
      res.status(404).json({ message: "Notification not found" })
      return
    }

    // Ensure the notification belongs to the current user
    if (notification.userId.toString() !== userId.toString()) {
      res.status(403).json({ message: "Not authorized to update this notification" })
      return
    }

    const result = await collections.notifications.updateOne({ _id: notificationId }, { $set: { isRead: true } })

    if (result.modifiedCount === 0) {
      res.status(404).json({ message: "Notification not found or not modified" })
      return
    }

    res.status(200).json({ message: "Notification marked as read" })
  } catch (error) {
    console.error("Error marking notification as read:", error)
    res.status(500).json({ message: "Failed to mark notification as read" })
  }
})

// Mark all notifications as read
notificationRouter.put("/mark-all-read", async (req: Request, res: Response) => {
  try {
    const userId = new ObjectId(req.user.id)

    const result = await collections.notifications.updateMany({ userId, isRead: false }, { $set: { isRead: true } })

    res.status(200).json({
      message: "All notifications marked as read",
      count: result.modifiedCount,
    })
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    res.status(500).json({ message: "Failed to mark all notifications as read" })
  }
})

// Delete a notification
notificationRouter.delete("/:notificationId", async (req: Request, res: Response) => {
  try {
    const notificationId = new ObjectId(req.params.notificationId)
    const userId = new ObjectId(req.user.id)

    const notification = await collections.notifications.findOne({ _id: notificationId })

    if (!notification) {
      res.status(404).json({ message: "Notification not found" })
      return
    }

    // Ensure the notification belongs to the current user
    if (notification.userId.toString() !== userId.toString()) {
      res.status(403).json({ message: "Not authorized to delete this notification" })
      return
    }

    const result = await collections.notifications.deleteOne({ _id: notificationId })

    if (result.deletedCount === 0) {
      res.status(404).json({ message: "Notification not found or not deleted" })
      return
    }

    res.status(200).json({ message: "Notification deleted successfully" })
  } catch (error) {
    console.error("Error deleting notification:", error)
    res.status(500).json({ message: "Failed to delete notification" })
  }
})

// Get unread notification count
notificationRouter.get("/unread-count", async (req: Request, res: Response) => {
  try {
    const userId = new ObjectId(req.user.id)

    const count = await collections.notifications.countDocuments({
      userId,
      isRead: false,
    })

    res.status(200).json({ count })
  } catch (error) {
    console.error("Error getting unread notification count:", error)
    res.status(500).json({ message: "Failed to get unread notification count" })
  }
})
export default notificationRouter
