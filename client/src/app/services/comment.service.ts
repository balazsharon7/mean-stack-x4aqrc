import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable } from "rxjs"
import { environment } from "../environment"

export interface Comment {
  _id: string
  postId: string
  userId: string
  content: string
  createdAt: Date
  updatedAt?: Date
  likes?: string[]
  parentCommentId?: string
  user?: any // User details will be populated when needed
}

@Injectable({
  providedIn: "root",
})
export class CommentService {
  private apiUrl = environment.apiUrl

  constructor(private http: HttpClient) {}

  // Get all comments for a post
  getPostComments(postId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}/comments/posts/${postId}/comments`)
  }

  // Add a comment to a post
  addComment(postId: string, content: string, parentCommentId?: string): Observable<Comment> {
    return this.http.post<Comment>(`${this.apiUrl}/comments/posts/${postId}/comments`, {
      content,
      parentCommentId,
    })
  }

  // Update a comment
  updateComment(commentId: string, content: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/comments/comments/${commentId}`, { content })
  }

  // Delete a comment
  deleteComment(commentId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/comments/comments/${commentId}`)
  }

  // Like a comment
  likeComment(commentId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/comments/comments/${commentId}/like`, {})
  }

  // Unlike a comment
  unlikeComment(commentId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/comments/comments/${commentId}/like`)
  }

  // Get replies to a comment
  getCommentReplies(commentId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.apiUrl}/comments/comments/${commentId}/replies`)
  }
}
