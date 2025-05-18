import express, { type Request, type Response } from "express"
import { ObjectId } from "mongodb"
import { collections, type Conversation } from "../database"
import { authenticateToken } from "../middleware/auth"

export const messageRouter = express.Router()

// Middleware
messageRouter.use(express.json())
messageRouter.use(authenticateToken)

// Új beszélgetés létrehozása
messageRouter.post("/conversations", async (req: Request, res: Response) => {
  try {
    const userId = new ObjectId(req.user.id)
    const { participantId } = req.body

    if (!participantId) {
      res.status(400).json({ message: "Participant ID is required" })
      return
    }

    const participantObjectId = new ObjectId(participantId)

    // Ellenőrizzük, hogy a résztvevő létezik-e
    const participant = await collections.users.findOne({ _id: participantObjectId })
    if (!participant) {
      res.status(404).json({ message: "Participant not found" })
      return
    }

    // Ellenőrizzük, hogy már létezik-e beszélgetés a két felhasználó között
    const existingConversation = await collections.conversations.findOne({
      participants: {
        $all: [userId, participantObjectId],
        $size: 2,
      },
    })

    if (existingConversation) {
      res.status(200).json(existingConversation)
      return
    }

    // Új beszélgetés létrehozása
    const newConversation: Conversation = {
      participants: [userId, participantObjectId],
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await collections.conversations.insertOne(newConversation)

    res.status(201).json({
      ...newConversation,
      _id: result.insertedId,
    })
  } catch (error) {
    console.error("Error creating conversation:", error)
    res.status(500).json({ message: "Failed to create conversation" })
  }
})

// Felhasználó beszélgetéseinek lekérése
messageRouter.get("/conversations", async (req: Request, res: Response) => {
  try {
    const userId = new ObjectId(req.user.id)

    const conversations = await collections.conversations
      .find({
        participants: userId,
      })
      .sort({ updatedAt: -1 })
      .toArray()

    // Résztvevők adatainak hozzáadása
    const conversationsWithParticipants = await Promise.all(
      conversations.map(async (conversation: { participants: any[] }) => {
        const participantIds = conversation.participants.filter(
          (participantId) => participantId.toString() !== userId.toString(),
        )

        const participants = await collections.users
          .find({
            _id: { $in: participantIds },
          })
          .project({
            _id: 1,
            username: 1,
            profilePicture: 1,
          })
          .toArray()

        return {
          ...conversation,
          participants: participants,
        }
      }),
    )

    res.status(200).json(conversationsWithParticipants)
  } catch (error) {
    console.error("Error getting conversations:", error)
    res.status(500).json({ message: "Failed to get conversations" })
  }
})

// Beszélgetés részleteinek lekérése
messageRouter.get("/conversations/:conversationId", async (req: Request, res: Response) => {
  try {
    const userId = new ObjectId(req.user.id)
    const conversationId = new ObjectId(req.params.conversationId)

    // Ellenőrizzük, hogy a beszélgetés létezik-e és a felhasználó résztvevője-e
    const conversation = await collections.conversations.findOne({
      _id: conversationId,
      participants: userId,
    })

    if (!conversation) {
      res.status(404).json({ message: "Conversation not found" })
      return
    }

    // Résztvevők adatainak hozzáadása
    const participantIds = conversation.participants.filter(
      (participantId: { toString: () => string }) => participantId.toString() !== userId.toString(),
    )

    const participants = await collections.users
      .find({
        _id: { $in: participantIds },
      })
      .project({
        _id: 1,
        username: 1,
        profilePicture: 1,
      })
      .toArray()

    // Üzenetek lekérése
    const messages = await collections.messages
      .find({
        conversationId,
      })
      .sort({ createdAt: 1 })
      .toArray()

    res.status(200).json({
      ...conversation,
      participants,
      messages,
    })
  } catch (error) {
    console.error("Error getting conversation:", error)
    res.status(500).json({ message: "Failed to get conversation" })
  }
})

// Üzenet küldése
messageRouter.post("/messages", async (req: Request, res: Response) => {
  try {
    const userId = new ObjectId(req.user.id)
    const { conversationId, content } = req.body

    if (!conversationId || !content) {
      res.status(400).json({ message: "Conversation ID and content are required" })
      return
    }

    const conversationObjectId = new ObjectId(conversationId)

    // Ellenőrizzük, hogy a beszélgetés létezik-e és a felhasználó résztvevője-e
    const conversation = await collections.conversations.findOne({
      _id: conversationObjectId,
      participants: userId,
    })

    if (!conversation) {
      res.status(404).json({ message: "Conversation not found" })
      return
    }

    // Új üzenet létrehozása
    const newMessage = {
      conversationId: conversationObjectId,
      sender: userId,
      content,
      createdAt: new Date(),
      isRead: false,
    }

    const result = await collections.messages.insertOne(newMessage)

    // Beszélgetés frissítése az utolsó üzenettel
    await collections.conversations.updateOne(
      { _id: conversationObjectId },
      {
        $set: {
          lastMessage: {
            content,
            sender: userId,
            timestamp: new Date(),
          },
          updatedAt: new Date(),
        },
      },
    )

    // Értesítés küldése a beszélgetés többi résztvevőjének
    const otherParticipants = conversation.participants.filter(
      (participantId: { toString: () => string }) => participantId.toString() !== userId.toString(),
    )

    for (const participantId of otherParticipants) {
      const notification = {
        userId: participantId,
        type: "message",
        referenceId: conversationObjectId,
        createdAt: new Date(),
        isRead: false,
        content: "You have a new message",
        sourceUserId: userId,
      }

      await collections.notifications.insertOne(notification)
    }

    res.status(201).json({
      ...newMessage,
      _id: result.insertedId,
    })
  } catch (error) {
    console.error("Error sending message:", error)
    res.status(500).json({ message: "Failed to send message" })
  }
})

// Beszélgetés üzeneteinek lekérése
messageRouter.get("/conversations/:conversationId/messages", async (req: Request, res: Response) => {
  try {
    const userId = new ObjectId(req.user.id)
    const conversationId = new ObjectId(req.params.conversationId)

    // Ellenőrizzük, hogy a beszélgetés létezik-e és a felhasználó résztvevője-e
    const conversation = await collections.conversations.findOne({
      _id: conversationId,
      participants: userId,
    })

    if (!conversation) {
      res.status(404).json({ message: "Conversation not found" })
      return
    }

    // Üzenetek lekérése
    const messages = await collections.messages
      .find({
        conversationId,
      })
      .sort({ createdAt: 1 })
      .toArray()

    res.status(200).json(messages)
  } catch (error) {
    console.error("Error getting messages:", error)
    res.status(500).json({ message: "Failed to get messages" })
  }
})

// Üzenetek olvasottként jelölése
messageRouter.put("/conversations/:conversationId/read", async (req: Request, res: Response) => {
  try {
    const userId = new ObjectId(req.user.id)
    const conversationId = new ObjectId(req.params.conversationId)

    // Ellenőrizzük, hogy a beszélgetés létezik-e és a felhasználó résztvevője-e
    const conversation = await collections.conversations.findOne({
      _id: conversationId,
      participants: userId,
    })

    if (!conversation) {
      res.status(404).json({ message: "Conversation not found" })
      return
    }

    // Üzenetek olvasottként jelölése
    await collections.messages.updateMany(
      {
        conversationId,
        sender: { $ne: userId },
        isRead: false,
      },
      {
        $set: {
          isRead: true,
        },
      },
    )

    // Értesítések olvasottként jelölése
    await collections.notifications.updateMany(
      {
        userId,
        type: "message",
        referenceId: conversationId,
        isRead: false,
      },
      {
        $set: {
          isRead: true,
        },
      },
    )

    res.status(200).json({ message: "Messages marked as read" })
  } catch (error) {
    console.error("Error marking messages as read:", error)
    res.status(500).json({ message: "Failed to mark messages as read" })
  }
})

// Üzenet törlése
messageRouter.delete("/messages/:messageId", async (req: Request, res: Response) => {
  try {
    const userId = new ObjectId(req.user.id)
    const messageId = new ObjectId(req.params.messageId)

    // Ellenőrizzük, hogy az üzenet létezik-e és a felhasználó a küldője-e
    const message = await collections.messages.findOne({
      _id: messageId,
      sender: userId,
    })

    if (!message) {
      res.status(404).json({ message: "Message not found or you are not the sender" })
      return
    }

    // Üzenet törlése
    await collections.messages.deleteOne({ _id: messageId })

    // Ha ez volt az utolsó üzenet a beszélgetésben, frissítsük a beszélgetést
    const lastMessage = await collections.messages
      .find({
        conversationId: message.conversationId,
      })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray()

    if (lastMessage.length > 0) {
      await collections.conversations.updateOne(
        { _id: message.conversationId },
        {
          $set: {
            lastMessage: {
              content: lastMessage[0].content,
              sender: lastMessage[0].sender,
              timestamp: lastMessage[0].createdAt,
            },
          },
        },
      )
    } else {
      await collections.conversations.updateOne(
        { _id: message.conversationId },
        {
          $unset: {
            lastMessage: "",
          },
        },
      )
    }

    res.status(200).json({ message: "Message deleted successfully" })
  } catch (error) {
    console.error("Error deleting message:", error)
    res.status(500).json({ message: "Failed to delete message" })
  }
})

// Olvasatlan üzenetek számának lekérése
messageRouter.get("/unread-count", async (req: Request, res: Response) => {
  try {
    const userId = new ObjectId(req.user.id)

    const count = await collections.messages.countDocuments({
      participants: userId,
      sender: { $ne: userId },
      isRead: false,
    })

    res.status(200).json({ count })
  } catch (error) {
    console.error("Error getting unread message count:", error)
    res.status(500).json({ message: "Failed to get unread message count" })
  }
})

// Üzenet keresése
messageRouter.get("/search", async (req: Request, res: Response) => {
  try {
    const userId = new ObjectId(req.user.id)
    const { query } = req.query

    if (!query || typeof query !== "string") {
      res.status(400).json({ message: "Search query is required" })
      return
    }

    // Beszélgetések lekérése, amelyekben a felhasználó részt vesz
    const conversations = await collections.conversations
      .find({
        participants: userId,
      })
      .toArray()

    const conversationIds = conversations.map((conversation: { _id: any }) => conversation._id)

    // Üzenetek keresése a beszélgetésekben
    const messages = await collections.messages
      .find({
        conversationId: { $in: conversationIds },
        content: { $regex: query, $options: "i" },
      })
      .sort({ createdAt: -1 })
      .toArray()

    // Beszélgetések adatainak hozzáadása az üzenetekhez
    const messagesWithConversations = await Promise.all(
      messages.map(async (message: { conversationId: { toString: () => any } }) => {
        const conversation = conversations.find(
          (conv: { _id: { toString: () => any } }) => conv._id.toString() === message.conversationId.toString(),
        )

        if (!conversation) return message

        const otherParticipantIds = conversation.participants.filter(
          (participantId: { toString: () => string }) => participantId.toString() !== userId.toString(),
        )

        const participants = await collections.users
          .find({
            _id: { $in: otherParticipantIds },
          })
          .project({
            _id: 1,
            username: 1,
            profilePicture: 1,
          })
          .toArray()

        return {
          ...message,
          conversation: {
            _id: conversation._id,
            participants,
          },
        }
      }),
    )

    res.status(200).json(messagesWithConversations)
  } catch (error) {
    console.error("Error searching messages:", error)
    res.status(500).json({ message: "Failed to search messages" })
  }
})
export default messageRouter