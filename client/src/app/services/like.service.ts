import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable } from "rxjs"
import { environment } from "../environment"

export interface Like {
  _id: string
  userId: string
  targetType: "post" | "comment"
  targetId: string
  createdAt: Date
  user?: any // User details will be populated when needed
}

export interface LikeDetails {
  _id: string
  createdAt: Date
  user: any
}

@Injectable({
  providedIn: "root",
})
export class LikeService {
  private apiUrl = environment.apiUrl

  constructor(private http: HttpClient) {}

  // Like a post
  likePost(postId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/likes/posts/${postId}/like`, {})
  }

  // Unlike a post
  unlikePost(postId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/likes/posts/${postId}/like`)
  }

  // Get users who liked a post
  getPostLikes(postId: string): Observable<LikeDetails[]> {
    return this.http.get<LikeDetails[]>(`${this.apiUrl}/likes/posts/${postId}/likes`)
  }

  // Check if user liked a post
  checkPostLiked(postId: string): Observable<{ liked: boolean }> {
    return this.http.get<{ liked: boolean }>(`${this.apiUrl}/likes/posts/${postId}/liked`)
  }

  // Get all likes by a user
  getUserLikes(userId: string): Observable<Like[]> {
    return this.http.get<Like[]>(`${this.apiUrl}/likes/users/${userId}/likes`)
  }
}
