import * as express from "express"
import type { Request, Response } from "express"
import { ObjectId } from "mongodb"
import { collections } from "../database"
import { authenticateToken } from "../middleware/auth"

export const friendRouter = express.Router()
friendRouter.use(express.json())

// Add a test route to verify API connectivity
friendRouter.get("/test", (req: express.Request, res: Response): void => {
  console.log("Friend router test endpoint called")
  res.json({ message: "Friend router is working", timestamp: new Date().toISOString() })
})

// Check friendship status with another user
friendRouter.get("/check/:userId", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).send("User not authenticated")
      return
    }

    const userId = req.params.userId

    // Check if they are already friends
    const user = await collections.users?.findOne({ _id: new ObjectId(req.user.id) })
    const friendIds = user?.friends || []
    const isFriend = friendIds.some((id: any) => id.toString() === userId)

    // Check if there's a pending request
    const pendingRequest = await collections.friendRequests?.findOne({
      $or: [
        { sender: new ObjectId(req.user.id), recipient: new ObjectId(userId), status: "pending" },
        { sender: new ObjectId(userId), recipient: new ObjectId(req.user.id), status: "pending" },
      ],
    })

    res.json({
      isFriend,
      isPending: !!pendingRequest,
    })
  } catch (error) {
    console.error("Error checking friendship status:", error)
    res.status(500).send("Server error")
  }
})

// Get current user's friends
friendRouter.get("/list", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).send("User not authenticated")
      return
    }

    console.log("Getting friends for user:", req.user.id)

    const user = await collections.users?.findOne({ _id: new ObjectId(req.user.id) })

    if (!user) {
      res.status(404).send("User not found")
      return
    }

    // Get friends details
    const friendIds = user.friends || []
    console.log("Friend IDs:", friendIds)

    const friends = await collections.users
      ?.find({
        _id: { $in: friendIds },
      })
      .project({ password: 0 })
      .toArray()

    console.log("Found friends:", friends?.length || 0)
    res.json(friends || [])
  } catch (error) {
    console.error("Error getting friends:", error)
    res.status(500).send("Server error")
  }
})

// Get pending friend requests
friendRouter.get("/requests", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).send("User not authenticated")
      return
    }

    console.log("Getting friend requests for user:", req.user.id)

    const requests = await collections.friendRequests
      ?.find({
        recipient: new ObjectId(req.user.id),
        status: "pending",
      })
      .toArray()

    console.log("Found friend requests:", requests?.length || 0)

    // Get sender details for each request
    const senderIds = requests?.map((request) => request.sender) || []
    const senders = await collections.users
      ?.find({
        _id: { $in: senderIds },
      })
      .project({ password: 0 })
      .toArray()

    res.json(senders || [])
  } catch (error) {
    console.error("Error getting friend requests:", error)
    res.status(500).send("Server error")
  }
})

// Search for users
friendRouter.get("/search", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).send("User not authenticated")
      return
    }

    console.log("Search query:", req.query.q)
    const query = req.query.q as string
    if (!query) {
      res.status(400).json({ message: "Search query is required" })
      return
    }

    // Get current user to exclude them and their friends from search results
    const currentUser = await collections.users?.findOne({ _id: new ObjectId(req.user.id) })
    const friendIds = currentUser?.friends || []

    console.log("Current user:", currentUser?._id)
    console.log("Friend IDs:", friendIds)

    // Modified search logic: search by email, username, and full name
    const users = await collections.users
      ?.find({
        $and: [
          { _id: { $ne: new ObjectId(req.user.id) } }, // Exclude current user
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
      .toArray()

    console.log("Search results:", users?.length || 0)

    // Filter out friends from results
    const filteredUsers =
      users?.filter((user) => !friendIds.some((friendId) => friendId.toString() === user._id.toString())) || []

    console.log("Filtered results:", filteredUsers.length)

    res.json(filteredUsers)
  } catch (error) {
    console.error("Error in search:", error)
    res.status(500).send(`Server error: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
})

// Send friend request
friendRouter.post("/request", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      console.error("User not authenticated")
      res.status(401).send("User not authenticated")
      return
    }

    const { userId } = req.body
    console.log(`Sending friend request from ${req.user.id} to ${userId}`)

    if (!userId) {
      console.error("Missing userId in request body")
      res.status(400).json({ message: "userId is required" })
      return
    }

    // Prevent self-friend requests
    if (userId === req.user.id) {
      console.error("Cannot send friend request to yourself")
      res.status(400).json({ message: "Cannot send friend request to yourself" })
      return
    }

    // Check if user exists
    const recipient = await collections.users?.findOne({ _id: new ObjectId(userId) })
    if (!recipient) {
      console.error(`Recipient user not found: ${userId}`)
      res.status(404).json({ message: "User not found" })
      return
    }

    // Check if request already exists - only check for PENDING requests
    const existingRequest = await collections.friendRequests?.findOne({
      $or: [
        { sender: new ObjectId(req.user.id), recipient: new ObjectId(userId), status: "pending" },
        { sender: new ObjectId(userId), recipient: new ObjectId(req.user.id), status: "pending" },
      ],
    })

    if (existingRequest) {
      console.log(`Friend request already exists between ${req.user.id} and ${userId}`)
      res.status(400).json({ message: "Friend request already exists" })
      return
    }

    // Check if they are already friends
    const user = await collections.users?.findOne({ _id: new ObjectId(req.user.id) })
    const friendIds = user?.friends || []
    if (friendIds.some((id: any) => id.toString() === userId)) {
      console.log(`Users ${req.user.id} and ${userId} are already friends`)
      res.status(400).json({ message: "Already friends with this user" })
      return
    }

    // Create new request
    const newRequest = {
      sender: new ObjectId(req.user.id),
      recipient: new ObjectId(userId),
      status: "pending" as const,
      createdAt: new Date(),
    }

    console.log("Creating new friend request:", newRequest)
    const result = await collections.friendRequests?.insertOne(newRequest)

    if (result?.acknowledged) {
      // Create notification for recipient
      const notification = {
        userId: new ObjectId(userId),
        type: "friend_request",
        referenceId: result.insertedId,
        createdAt: new Date(),
        isRead: false,
        content: "You have a new friend request",
        sourceUserId: new ObjectId(req.user.id),
      }

      await collections.notifications?.insertOne(notification)
      console.log(`Friend request sent successfully from ${req.user.id} to ${userId}`)
      res.json({ message: "Friend request sent successfully" })
    } else {
      console.error("Failed to insert friend request into database")
      res.status(500).json({ message: "Failed to send friend request" })
    }
  } catch (error) {
    console.error("Error sending friend request:", error)
    res.status(500).send(`Server error: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
})

// Accept friend request
friendRouter.post("/accept", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).send("User not authenticated")
      return
    }

    const { userId } = req.body
    console.log(`Accepting friend request from ${userId} by ${req.user.id}`)

    // Find the request
    const request = await collections.friendRequests?.findOne({
      sender: new ObjectId(userId),
      recipient: new ObjectId(req.user.id),
      status: "pending",
    })

    if (!request) {
      res.status(404).json({ message: "Friend request not found" })
      return
    }

    // Update request status
    await collections.friendRequests?.updateOne({ _id: request._id }, { $set: { status: "accepted" as const } })

    // Add users to each other's friends list
    await collections.users?.updateOne(
      { _id: new ObjectId(req.user.id) },
      { $addToSet: { friends: new ObjectId(userId) } as any },
    )

    await collections.users?.updateOne(
      { _id: new ObjectId(userId) },
      { $addToSet: { friends: new ObjectId(req.user.id) } as any },
    )

    // Create notification for sender
    const notification = {
      userId: new ObjectId(userId),
      type: "friend_request",
      referenceId: request._id,
      createdAt: new Date(),
      isRead: false,
      content: "Your friend request was accepted",
      sourceUserId: new ObjectId(req.user.id),
    }

    await collections.notifications?.insertOne(notification)

    res.json({ message: "Friend request accepted" })
  } catch (error) {
    console.error("Error accepting friend request:", error)
    res.status(500).send("Server error")
  }
})

// Reject friend request - MODIFIED to DELETE the request instead of marking as rejected
friendRouter.post("/reject", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).send("User not authenticated")
      return
    }

    const { userId } = req.body
    console.log(`Rejecting friend request from ${userId} by ${req.user.id}`)

    // Find the request first to make sure it exists
    const request = await collections.friendRequests?.findOne({
      sender: new ObjectId(userId),
      recipient: new ObjectId(req.user.id),
      status: "pending",
    })

    if (!request) {
      res.status(404).json({ message: "Friend request not found" })
      return
    }

    // Delete the request instead of updating its status
    const deleteResult = await collections.friendRequests?.deleteOne({
      _id: request._id,
    })

    if (deleteResult?.deletedCount) {
      console.log(`Friend request from ${userId} to ${req.user.id} was deleted`)

      // Optionally, create a notification for the sender that their request was rejected
      const notification = {
        userId: new ObjectId(userId),
        type: "friend_request_rejected",
        createdAt: new Date(),
        isRead: false,
        content: "Your friend request was declined",
        sourceUserId: new ObjectId(req.user.id),
      }

      await collections.notifications?.insertOne(notification)

      res.json({ message: "Friend request rejected and removed" })
    } else {
      res.status(500).json({ message: "Failed to delete friend request" })
    }
  } catch (error) {
    console.error("Error rejecting friend request:", error)
    res.status(500).send("Server error")
  }
})

// Remove friend
friendRouter.delete("/:userId", authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).send("User not authenticated")
      return
    }

    const { userId } = req.params
    console.log(`Removing friend ${userId} by ${req.user.id}`)

    // Remove from both users' friends lists
    await collections.users?.updateOne(
      { _id: new ObjectId(req.user.id) },
      { $pull: { friends: new ObjectId(userId) } as any },
    )

    await collections.users?.updateOne(
      { _id: new ObjectId(userId) },
      { $pull: { friends: new ObjectId(req.user.id) } as any },
    )

    // Also delete any existing friend requests between these users
    await collections.friendRequests?.deleteMany({
      $or: [
        { sender: new ObjectId(req.user.id), recipient: new ObjectId(userId) },
        { sender: new ObjectId(userId), recipient: new ObjectId(req.user.id) },
      ],
    })

    res.json({ message: "Friend removed successfully" })
  } catch (error) {
    console.error("Error removing friend:", error)
    res.status(500).send("Server error")
  }
})

export default friendRouter
