import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable, of, BehaviorSubject } from "rxjs"
import { catchError, tap, switchMap, map } from "rxjs/operators"
import { environment } from "../environment"
import { Conversation, Message } from "../models/message"
import { AuthService } from "./auth.service"
import { FriendsService } from "./friends.service"
import { UserService } from "./user.service"

@Injectable({
  providedIn: "root",
})
export class MessageService {
  sendTypingStatus(conversationId: string, isTyping: boolean): void {
    console.log(`Sending typing status: ${isTyping} for conversation: ${conversationId}`)

    // Only make the API call if we have a valid conversation ID
    if (!conversationId) {
      console.error("Cannot send typing status: Invalid conversation ID")
      return
    }

    this.sendTypingIndicator(conversationId, isTyping).subscribe({
      error: (error) => {
        console.error("Error sending typing status:", error)
      },
    })
  }

  // Fix: API URL path
  private apiUrl = `${environment.apiUrl}/messages`
  private conversationsSubject = new BehaviorSubject<Conversation[]>([])
  conversations$ = this.conversationsSubject.asObservable()

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private friendsService: FriendsService,
    private userService: UserService,
  ) {
    // Refresh conversations when service is initialized if user is logged in
    if (this.authService.isLoggedIn) {
      this.refreshConversations()
    }

    // Refresh conversations every minute to check for new messages
    setInterval(() => {
      if (this.authService.isLoggedIn) {
        this.refreshConversations()
      }
    }, 60000)
  }

  refreshConversations(): void {
    this.getConversations().subscribe({
      next: (conversations) => console.log("Conversations refreshed:", conversations.length),
      error: (err) => console.error("Error refreshing conversations:", err),
    })
  }

  // Add a method to create conversations with friends if none exist
  ensureConversationsExist(): Observable<boolean> {
    return this.getConversations().pipe(
      switchMap((conversations) => {
        if (conversations.length === 0) {
          // No conversations exist, create some with friends
          return this.friendsService.getFriends().pipe(
            switchMap((friends) => {
              if (friends && friends.length > 0 && friends[0] && friends[0]._id) {
                // Create a conversation with the first friend, with proper null checks
                return this.createConversation(friends[0]._id.toString()).pipe(map(() => true))
              }
              return of(false)
            }),
          )
        }
        return of(true)
      }),
      catchError((error) => {
        console.error("Error ensuring conversations exist:", error)
        return of(false)
      }),
    )
  }

  getConversations(): Observable<Conversation[]> {
    return this.http.get<any[]>(`${this.apiUrl}/conversations`).pipe(
      tap((conversationsData) => {
        console.log("Raw conversations data:", conversationsData)

        // Transform the data to match the expected Conversation format
        const conversations: Conversation[] = conversationsData.map((conv) => {
          // Find the other participant (not the current user)
          const currentUserId = this.authService.currentUser?._id

          // Debug the participants array
          console.log(`Processing conversation ${conv._id}, participants:`, conv.participants)

          let otherParticipant = null

          if (conv.participants && conv.participants.length > 0) {
            // Try to find the other participant
            otherParticipant = conv.participants.find((p: any) => {
              const participantId = p._id?.toString() || p.toString()
              const currentId = currentUserId?.toString()
              const isOtherUser = participantId !== currentId

              console.log(
                `Comparing participant ${participantId} with current user ${currentId}: ${isOtherUser ? "different" : "same"}`,
              )

              return isOtherUser
            })

            console.log("Found other participant:", otherParticipant)
          }

          // If otherParticipant is just an ID (not an object), fetch the user data
          if (otherParticipant && typeof otherParticipant !== "object") {
            console.log("Participant is just an ID, need to fetch user data")
          }

          return {
            _id: conv._id,
            user: otherParticipant
              ? {
                  _id: otherParticipant._id || "",
                  fullName: otherParticipant.fullName || otherParticipant.username || "Unknown User",
                  username: otherParticipant.username || "unknown",
                  profilePicture: otherParticipant.profilePicture,
                }
              : {
                  _id: "",
                  fullName: "Unknown User",
                  username: "unknown",
                },
            messages: [],
            lastMessage: conv.lastMessage,
            unreadCount: 0,
            isTyping: false,
            participants: conv.participants || [],
          }
        })

        // Sort conversations by last message timestamp (newest first)
        conversations.sort((a, b) => {
          const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0
          const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0
          return timeB - timeA
        })

        this.conversationsSubject.next(conversations)
        console.log("Processed conversations:", conversations)
      }),
      map((data) => this.conversationsSubject.value),
      catchError(this.handleError<Conversation[]>("getConversations", [])),
    )
  }

  getConversationWithUser(userId: string): Observable<Conversation> {
    return this.http.get<any>(`${this.apiUrl}/conversations/user/${userId}`).pipe(
      switchMap((data) => {
        console.log("Raw conversation data:", data)

        const currentUserId = this.authService.currentUser?._id

        // Try to find the other participant in the conversation
        let otherParticipant = null
        if (data.participants && data.participants.length > 0) {
          otherParticipant = data.participants.find((p: any) => {
            const participantId = p._id?.toString() || p.toString()
            const currentId = currentUserId?.toString()
            return participantId !== currentId
          })

          console.log("Found conversation partner:", otherParticipant)
        }

        // If we couldn't find a proper user object, fetch the user data
        if (!otherParticipant || typeof otherParticipant !== "object" || !otherParticipant.fullName) {
          console.log("Need to fetch user data for:", userId)

          return this.userService.getUserById(userId).pipe(
            map((user) => {
              console.log("Retrieved user for conversation:", user)
              return {
                _id: data._id,
                user: {
                  _id: user._id,
                  fullName: user.fullName || user.username || "Unknown User",
                  username: user.username || "unknown",
                  profilePicture: user.profilePicture,
                  email: user.email,
                },
                messages: data.messages || [],
                lastMessage: data.lastMessage,
                unreadCount: 0,
                isTyping: false,
                participants: data.participants || [],
              }
            }),
          )
        }

        return of({
          _id: data._id,
          user: otherParticipant,
          messages: data.messages || [],
          lastMessage: data.lastMessage,
          unreadCount: 0,
          isTyping: false,
          participants: data.participants || [],
        })
      }),
      catchError(this.handleError<Conversation>("getConversationWithUser")),
    )
  }

  getMessages(conversationId: string): Observable<Message[]> {
    return this.http.get<any[]>(`${this.apiUrl}/conversations/${conversationId}/messages`).pipe(
      map((messages) => {
        // Konvertáljuk a senderId-t a megfelelő formátumra
        return messages.map((msg) => {
          return {
            ...msg,
            // Használjuk a sender mezőt senderId-ként, ha az létezik
            senderId: msg.senderId || msg.sender,
            // Biztosítsuk, hogy a timestamp megfelelő formátumban legyen
            timestamp: msg.timestamp || msg.createdAt,
          }
        })
      }),
      tap((messages) => console.log("Processed messages in service:", messages)),
      catchError(this.handleError<Message[]>("getMessages", [])),
    )
  }

  sendMessage(message: Partial<Message>): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/messages`, message).pipe(
      map((response) => {
        // Biztosítsuk, hogy a válaszban a senderId megfelelő formátumban legyen
        return {
          ...response,
          senderId: response.senderId || response.senderId,
          timestamp: response.timestamp || response.createdAt,
        }
      }),
      tap((newMessage) => {
        console.log("Message sent with senderId:", newMessage.senderId)

        // Update the conversations list with the new message
        const conversations = this.conversationsSubject.value
        const conversationIndex = conversations.findIndex((c) => c._id === newMessage.conversationId)

        if (conversationIndex !== -1) {
          const updatedConversation = { ...conversations[conversationIndex] }

          // Ensure messages array exists
          if (!updatedConversation.messages) {
            updatedConversation.messages = []
          }

          updatedConversation.messages = [...updatedConversation.messages, newMessage]
          updatedConversation.lastMessage = newMessage

          const updatedConversations = [...conversations]
          updatedConversations[conversationIndex] = updatedConversation

          // Re-sort conversations
          updatedConversations.sort((a, b) => {
            const timeA = a.lastMessage?.timestamp ? new Date(a.lastMessage.timestamp).getTime() : 0
            const timeB = b.lastMessage?.timestamp ? new Date(b.lastMessage.timestamp).getTime() : 0
            return timeB - timeA
          })

          this.conversationsSubject.next(updatedConversations)
        }
      }),
      catchError(this.handleError<Message>("sendMessage")),
    )
  }

  createConversation(userId: string): Observable<Conversation> {
    return this.http.post<any>(`${this.apiUrl}/conversations`, { participantId: userId }).pipe(
      tap((data) => console.log("Create conversation response:", data)),
      switchMap((data) => {
        // After creating the conversation, get the user details
        return this.userService.getUserById(userId).pipe(
          map((user) => {
            console.log("Fetched user for new conversation:", user)

            // Transform to expected Conversation format
            return {
              _id: data._id,
              user: user,
              messages: [],
              lastMessage: undefined,
              unreadCount: 0,
              isTyping: false,
              participants: data.participants || [user], // Add participants property
            }
          }),
        )
      }),
      tap((newConversation) => {
        const conversations = this.conversationsSubject.value
        // Check if this conversation already exists
        const existingIndex = conversations.findIndex((c) => c._id === newConversation._id)
        if (existingIndex !== -1) {
          // Update existing conversation
          conversations[existingIndex] = newConversation
          this.conversationsSubject.next([...conversations])
        } else {
          // Add new conversation
          this.conversationsSubject.next([newConversation, ...conversations])
        }
      }),
      catchError(this.handleError<Conversation>("createConversation")),
    )
  }

  markConversationAsRead(conversationId: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/conversations/${conversationId}/read`, {}).pipe(
      tap(() => {
        // Update the local conversation to mark messages as read
        const conversations = this.conversationsSubject.value
        const conversationIndex = conversations.findIndex((c) => c._id === conversationId)

        if (conversationIndex !== -1) {
          const updatedConversation = { ...conversations[conversationIndex] }
          updatedConversation.unreadCount = 0

          // Ensure messages array exists
          if (updatedConversation.messages) {
            updatedConversation.messages = updatedConversation.messages.map((msg) => {
              if (msg.senderId !== this.authService.currentUser?._id) {
                return { ...msg, isRead: true }
              }
              return msg
            })
          }

          const updatedConversations = [...conversations]
          updatedConversations[conversationIndex] = updatedConversation
          this.conversationsSubject.next(updatedConversations)
        }
      }),
      catchError(this.handleError<any>("markConversationAsRead")),
    )
  }

  sendTypingIndicator(conversationId: string, isTyping: boolean): Observable<any> {
    return this.http
      .post(`${this.apiUrl}/conversations/${conversationId}/typing`, { isTyping })
      .pipe(catchError(this.handleError<any>("sendTypingIndicator")))
  }

  deleteConversation(conversationId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/conversations/${conversationId}`).pipe(
      tap(() => {
        // Remove the conversation from the local list
        const conversations = this.conversationsSubject.value
        const updatedConversations = conversations.filter((c) => c._id !== conversationId)
        this.conversationsSubject.next(updatedConversations)
      }),
      catchError(this.handleError<any>("deleteConversation")),
    )
  }

  deleteMessage(messageId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/messages/${messageId}`).pipe(
      tap(() => {
        // Update the local conversations to remove the message
        const conversations = this.conversationsSubject.value
        const updatedConversations = conversations.map((conversation) => {
          if (!conversation.messages) return conversation

          const messageIndex = conversation.messages.findIndex((m) => m._id === messageId)

          if (messageIndex !== -1) {
            const updatedMessages = conversation.messages.filter((m) => m._id !== messageId)
            const updatedConversation = { ...conversation, messages: updatedMessages }

            // Update lastMessage if needed
            if (conversation.lastMessage && conversation.lastMessage._id === messageId) {
              updatedConversation.lastMessage =
                updatedMessages.length > 0 ? updatedMessages[updatedMessages.length - 1] : undefined
            }

            return updatedConversation
          }

          return conversation
        })

        this.conversationsSubject.next(updatedConversations)
      }),
      catchError(this.handleError<any>("deleteMessage")),
    )
  }

  // Search for users to message (only friends)
  searchFriendsForMessaging(query: string): Observable<any[]> {
    return this.http
      .get<any[]>(`${this.apiUrl}/search-friends?q=${query}`)
      .pipe(catchError(this.handleError<any[]>("searchFriendsForMessaging", [])))
  }

  private handleError<T>(operation = "operation", result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} failed:`, error)

      // Log more details about the error
      if (error.error) {
        console.error("Error details:", error.error)
      }
      if (error.message) {
        console.error("Error message:", error.message)
      }
      if (error.status) {
        console.error("Error status:", error.status)
      }

      // Let the app keep running by returning an empty result
      return of(result as T)
    }
  }

  // Get messages for a specific conversation
  getMessagesNew(conversationId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/conversation/${conversationId}`)
  }

  // Create a new conversation with another user
  createConversationNew(recipientId: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/conversation`, { recipientId })
  }

  // Send a message in a conversation
  sendMessageNew(conversationId: string, content: string): Observable<Message> {
    return this.http.post<Message>(`${this.apiUrl}/conversation/${conversationId}`, { content })
  }

  // Mark messages as read
  markAsReadNew(conversationId: string): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/conversation/${conversationId}/read`, {})
  }

  // Get unread message count
  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread/count`)
  }

  // Start a direct message with a user (creates conversation if needed)
  startDirectMessage(userId: string, initialMessage?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/direct`, {
      recipientId: userId,
      initialMessage,
    })
  }
}
