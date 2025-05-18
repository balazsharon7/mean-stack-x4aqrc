import { Injectable } from "@angular/core"
import { HttpClient, HttpErrorResponse } from "@angular/common/http"
import { Observable, of, throwError } from "rxjs"
import { catchError, tap } from "rxjs/operators"
import { environment } from "../environment"

// Export the Post interface so it can be imported elsewhere
export interface Post {
  _id: string
  userId: any // This can be string or User object after population
  content: string
  imageUrl?: string
  likes: string[]
  comments: {
    _id: string
    userId: any // This can be string or User object after population
    content: string
    createdAt: Date
  }[]
  createdAt: Date
}

@Injectable({
  providedIn: "root",
})
export class PostService {
  private apiUrl = `${environment.apiUrl}/posts`

  constructor(private http: HttpClient) {}

  // Test API connection
  testApi(): Observable<any> {
    console.log("Testing API connection to:", `${this.apiUrl}/test`)
    return this.http.get(`${this.apiUrl}/test`).pipe(
      tap((response) => console.log("API test response:", response)),
      catchError(this.handleError<any>("testApi")),
    )
  }

  // Get posts for feed
  getFeed(): Observable<Post[]> {
    console.log("Getting feed from:", `${this.apiUrl}/feed`)
    return this.http.get<Post[]>(`${this.apiUrl}/feed`).pipe(
      tap((posts) => console.log("Received posts:", posts.length)),
      catchError(this.handleError<Post[]>("getFeed", [])),
    )
  }

  // Create new post
  createPost(content: string, image?: File): Observable<Post> {
    const formData = new FormData()
    formData.append("content", content)

    if (image) {
      console.log("Appending image to form data:", image.name, image.type, image.size)
      formData.append("image", image)
    }

   return this.http.post<Post>(this.apiUrl, formData).pipe(
      tap((post) => {
        console.log("Post created successfully:", post)
      }),
      catchError(this.handleError<Post>("createPost")),
    )
  }

  // Delete post
  deletePost(postId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${postId}`).pipe(
      tap((_) => console.log(`Deleted post: ${postId}`)),
      catchError(this.handleError<any>("deletePost")),
    )
  }

  // Toggle like on post
  toggleLike(postId: string): Observable<{ likes: string[] }> {
    return this.http.post<{ likes: string[] }>(`${this.apiUrl}/${postId}/like`, {}).pipe(
      tap((result) => console.log(`Toggled like for post ${postId}, likes: ${result.likes.length}`)),
      catchError(this.handleError<{ likes: string[] }>("toggleLike")),
    )
  }

  // Add comment to post
  addComment(postId: string, content: string): Observable<Post> {
    return this.http.post<Post>(`${this.apiUrl}/${postId}/comment`, { content }).pipe(
      tap((post) => console.log(`Added comment to post ${postId}`)),
      catchError(this.handleError<Post>("addComment")),
    )
  }

  // Get user posts
  getUserPosts(userId: string): Observable<Post[]> {
    console.log("Getting posts for user:", userId)
    return this.http.get<Post[]>(`${this.apiUrl}/user/${userId}`).pipe(
      tap((posts) => console.log("Received user posts:", posts.length)),
      catchError(this.handleError<Post[]>("getUserPosts", [])),
    )
  }

  // Get post by ID
  getPostById(postId: string): Observable<Post> {
    return this.http.get<Post>(`${this.apiUrl}/${postId}`).pipe(
      tap((post) => console.log(`Retrieved post: ${post._id}`)),
      catchError(this.handleError<Post>("getPostById")),
    )
  }

  // Get posts by user ID (alias for getUserPosts for compatibility)
  getPostsByUser(userId: string): Observable<Post[]> {
    return this.getUserPosts(userId)
  }

  // Improved error handling
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
      if (operation === "createPost" || operation === "addComment") {
        return throwError(() => error)
      }

      // For other operations, we'll return a safe fallback
      return of(result as T)
    }
  }
}
