import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable, BehaviorSubject } from "rxjs"
import { tap } from "rxjs/operators"
import { environment } from "../environment"

export interface Notification {
  _id: string
  userId: string
  type: "like" | "comment" | "friend_request" | "message" | "tag"
  referenceId: string
  createdAt: Date
  isRead: boolean
  content: string
  sourceUserId?: string
  sourceUser?: any // User details will be populated when needed
}

@Injectable({
  providedIn: "root",
})
export class NotificationService {
  private apiUrl = environment.apiUrl
  private unreadCountSubject = new BehaviorSubject<number>(0)
  unreadCount$ = this.unreadCountSubject.asObservable()

  constructor(private http: HttpClient) {
    this.refreshUnreadCount()
  }

  // Get all notifications for the current user
  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/notifications`)
  }

  // Mark a notification as read
  markAsRead(notificationId: string): Observable<any> {
    return this.http
      .put(`${this.apiUrl}/notifications/${notificationId}/read`, {})
      .pipe(tap(() => this.refreshUnreadCount()))
  }

  // Mark all notifications as read
  markAllAsRead(): Observable<any> {
    return this.http
      .put(`${this.apiUrl}/notifications/mark-all-read`, {})
      .pipe(tap(() => this.unreadCountSubject.next(0)))
  }

  // Delete a notification
  deleteNotification(notificationId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/notifications/${notificationId}`).pipe(tap(() => this.refreshUnreadCount()))
  }

  // Get unread notification count
  getUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/notifications/unread-count`)
  }

  // Refresh unread count
  refreshUnreadCount(): void {
    this.getUnreadCount().subscribe(
      (data) => this.unreadCountSubject.next(data.count),
      (error) => console.error("Error fetching unread count:", error),
    )
  }
}
