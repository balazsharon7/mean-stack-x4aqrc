import { Injectable } from "@angular/core"
import { HttpClient, HttpErrorResponse } from "@angular/common/http"
import { BehaviorSubject, type Observable, of, throwError } from "rxjs"
import { catchError, tap, map } from "rxjs/operators"
import { User } from "../models/user"
import { environment } from "../environment"
import { AuthService } from "./auth.service"

@Injectable({
  providedIn: "root",
})
export class FriendsService {
  // Fix the API URL - remove the double /api if it exists in environment.apiUrl
  private apiUrl = environment.apiUrl.endsWith("/api")
    ? `${environment.apiUrl}/friends`
    : `${environment.apiUrl}/api/friends`

  private usersApiUrl = environment.apiUrl.endsWith("/api")
    ? `${environment.apiUrl}/users`
    : `${environment.apiUrl}/api/users`

  private friendsSubject = new BehaviorSubject<User[]>([])
  friends$ = this.friendsSubject.asObservable()

  private friendRequestsSubject = new BehaviorSubject<User[]>([])
  friendRequests$ = this.friendRequestsSubject.asObservable()

  // Track pending friend requests to update UI immediately
  private pendingRequestsSubject = new BehaviorSubject<Set<string>>(new Set<string>())
  pendingRequests$ = this.pendingRequestsSubject.asObservable()

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {
    // Refresh friends list when service is initialized if user is logged in
    if (this.authService.isLoggedIn) {
      this.refreshFriends()
      this.refreshFriendRequests()
    }
  }

  // Add a helper method to get HTTP options with auth headers
  private getAuthHeaders() {
    const token = this.authService.getAuthToken()
    return {
      headers: {
        "auth-token": token || "",
        "x-auth-token": token || "",
      },
    }
  }

  // Test API connection
  testApi(): Observable<any> {
    console.log(`Testing API connection: ${this.apiUrl}/test`)
    return this.http.get<any>(`${this.apiUrl}/test`, this.getAuthHeaders()).pipe(
      tap((response) => {
        console.log("API test successful:", response)
        return of({ status: "ok" })
      }),
      catchError((error) => {
        console.error("API test failed:", error)
        return of({ error: true, message: error.message || "API connection failed" })
      }),
    )
  }

  refreshFriends(): void {
    this.getFriends().subscribe({
      next: (friends) => console.log("Friends refreshed:", friends.length),
      error: (err) => console.error("Error refreshing friends:", err),
    })
  }

  refreshFriendRequests(): void {
    this.getFriendRequests().subscribe({
      next: (requests) => console.log("Friend requests refreshed:", requests.length),
      error: (err) => console.error("Error refreshing friend requests:", err),
    })
  }

  getFriends(): Observable<User[]> {
    console.log(`Requesting friends from: ${this.apiUrl}/list`)

    return this.http.get<User[]>(`${this.apiUrl}/list`, this.getAuthHeaders()).pipe(
      tap((friends) => {
        console.log("Friends received:", friends)
        this.friendsSubject.next(friends || [])
      }),
      catchError(this.handleError<User[]>("getFriends", [])),
    )
  }

  // Get friend requests
  getFriendRequests(): Observable<User[]> {
    console.log(`Requesting friend requests from: ${this.apiUrl}/requests`)

    return this.http.get<User[]>(`${this.apiUrl}/requests`, this.getAuthHeaders()).pipe(
      tap((requests) => {
        console.log("Friend requests received:", requests)
        this.friendRequestsSubject.next(requests || [])
      }),
      catchError(this.handleError<User[]>("getFriendRequests", [])),
    )
  }

  // Alias for backward compatibility with getReceivedFriendRequests
  getReceivedFriendRequests(): Observable<User[]> {
    return this.getFriendRequests()
  }

  searchUsers(query: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/search?q=${query}`, this.getAuthHeaders()).pipe(
      tap((users) => console.log("Search results:", users)),
      catchError(this.handleError<User[]>("searchUsers", [])),
    )
  }

  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.usersApiUrl}/list`, this.getAuthHeaders()).pipe(
      tap((users) => {
        console.log("All users:", users.length)
        // Fix profile picture URLs
        users.forEach((user) => {
          if (user.profilePicture && !user.profilePicture.startsWith("http")) {
            if (!user.profilePicture.startsWith("/")) {
              user.profilePicture = `/${user.profilePicture}`
            }
          }
        })
      }),
      // Filter out the current user
      map((users) => {
        const currentUserId = this.authService.currentUser?._id
        return users.filter((user) => user._id?.toString() !== currentUserId?.toString())
      }),
      catchError(this.handleError<User[]>("getAllUsers", [])),
    )
  }

  // Check if a friend request is pending
  isPendingFriendRequest(userId: string): Observable<boolean> {
    return this.pendingRequests$.pipe(map((pendingSet) => pendingSet.has(userId)))
  }

  // Add to pending requests set
  addToPendingRequests(userId: string): void {
    const currentSet = this.pendingRequestsSubject.value
    currentSet.add(userId)
    this.pendingRequestsSubject.next(currentSet)
  }

  // Remove from pending requests set
  removeFromPendingRequests(userId: string): void {
    const currentSet = this.pendingRequestsSubject.value
    currentSet.delete(userId)
    this.pendingRequestsSubject.next(currentSet)
  }

  sendFriendRequest(userId: string): Observable<any> {
    console.log(`Sending friend request to user: ${userId}`)

    if (!userId) {
      console.error("Cannot send friend request: Invalid user ID")
      return throwError(() => new Error("Invalid user ID"))
    }

    // Check if trying to add self as friend
    const currentUserId = this.authService.currentUser?._id
    if (userId === currentUserId?.toString()) {
      console.error("Cannot send friend request to yourself")
      return throwError(() => new Error("Cannot send friend request to yourself"))
    }

    // Add to pending set immediately for UI feedback
    this.addToPendingRequests(userId)

    return this.http.post(`${this.apiUrl}/request`, { userId }, this.getAuthHeaders()).pipe(
      tap((response) => {
        console.log("Friend request sent successfully:", response)
      }),
      catchError((error: HttpErrorResponse) => {
        console.error("Error sending friend request:", error)

        // Remove from pending set if there was an error
        this.removeFromPendingRequests(userId)

        if (error.error) {
          console.error("Error details:", error.error)
        }

        // If it's already a friend request, we can handle it gracefully
        if (error.status === 400 && error.error?.message === "Friend request already exists") {
          // Keep it in pending state since the request does exist
          this.addToPendingRequests(userId)
          return of({ message: "Friend request already exists" })
        }

        return throwError(() => error)
      }),
    )
  }

  acceptFriendRequest(userId: string): Observable<any> {
    console.log(`Accepting friend request from user: ${userId}`)
    return this.http.post(`${this.apiUrl}/accept`, { userId }, this.getAuthHeaders()).pipe(
      tap((response) => {
        console.log("Friend request accepted:", response)
        // Refresh both friends and requests after accepting
        this.refreshFriends()
        this.refreshFriendRequests()
      }),
      catchError(this.handleError<any>("acceptFriendRequest")),
    )
  }

  rejectFriendRequest(userId: string): Observable<any> {
    console.log(`Rejecting friend request from user: ${userId}`)
    return this.http.post(`${this.apiUrl}/reject`, { userId }, this.getAuthHeaders()).pipe(
      tap((response) => {
        console.log("Friend request rejected and removed:", response)
        // Remove from pending requests
        this.removeFromPendingRequests(userId)
        // Refresh requests after rejecting
        this.refreshFriendRequests()
      }),
      catchError(this.handleError<any>("rejectFriendRequest")),
    )
  }

  removeFriend(friendId: string): Observable<any> {
    console.log(`Removing friend: ${friendId}`)
    return this.http.delete(`${this.apiUrl}/${friendId}`, this.getAuthHeaders()).pipe(
      tap((response) => {
        console.log("Friend removed:", response)
        // Update the local friends list
        const currentFriends = this.friendsSubject.value
        const updatedFriends = currentFriends.filter((friend) => friend._id !== friendId)
        this.friendsSubject.next(updatedFriends)

        // Also remove from pending requests if there were any
        this.removeFromPendingRequests(friendId)
      }),
      catchError(this.handleError<any>("removeFriend")),
    )
  }

  checkFriendship(userId: string): Observable<{ isFriend: boolean; isPending: boolean }> {
    return this.http
      .get<{ isFriend: boolean; isPending: boolean }>(`${this.apiUrl}/check/${userId}`, this.getAuthHeaders())
      .pipe(
        tap((result) => {
          console.log(`Friendship check with ${userId}:`, result)
          // If pending, add to pending set
          if (result.isPending) {
            this.addToPendingRequests(userId)
          } else {
            // Make sure it's not in pending set
            this.removeFromPendingRequests(userId)
          }
        }),
        catchError(
          this.handleError<{ isFriend: boolean; isPending: boolean }>("checkFriendship", {
            isFriend: false,
            isPending: false,
          }),
        ),
      )
  }

  private handleError<T>(operation = "operation", result?: T) {
    return (error: HttpErrorResponse): Observable<T> => {
      console.error(`${operation} failed:`, error)

      // Log more details about the error
      if (error.error instanceof ErrorEvent) {
        // Client-side error
        console.error(`Client error: ${error.error.message}`)
      } else {
        // Server-side error
        console.error(`Server error: ${error.status} ${error.statusText}`)
        console.error(`Error body:`, error.error)
      }

      // For certain operations, we want to propagate the error
      if (
        operation === "sendFriendRequest" ||
        operation === "acceptFriendRequest" ||
        operation === "rejectFriendRequest" ||
        operation === "removeFriend"
      ) {
        return throwError(() => error)
      }

      // For other operations, we'll return a safe fallback
      return of(result as T)
    }
  }
}
