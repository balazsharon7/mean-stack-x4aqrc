import { Injectable } from "@angular/core"
import { HttpClient } from "@angular/common/http"
import { Observable } from "rxjs"
import { environment } from "../environment"

export interface Media {
  _id: string
  userId: string
  type: "image" | "video" | "audio" | "document"
  url: string
  filename: string
  size: number
  mimeType: string
  createdAt: Date
  postId?: string
  albumId?: string
  tags?: string[]
  description?: string
}

@Injectable({
  providedIn: "root",
})
export class MediaService {
  private apiUrl = environment.apiUrl

  constructor(private http: HttpClient) {}

  // Upload media
  uploadMedia(formData: FormData): Observable<Media> {
    return this.http.post<Media>(`${this.apiUrl}/media/upload`, formData)
  }

  // Get media by ID
  getMediaById(mediaId: string): Observable<Media> {
    return this.http.get<Media>(`${this.apiUrl}/media/${mediaId}`)
  }

  // Get all media for a user
  getUserMedia(userId: string): Observable<Media[]> {
    return this.http.get<Media[]>(`${this.apiUrl}/media/user/${userId}`)
  }

  // Get all media for a post
  getPostMedia(postId: string): Observable<Media[]> {
    return this.http.get<Media[]>(`${this.apiUrl}/media/post/${postId}`)
  }

  // Update media details
  updateMedia(mediaId: string, data: { description?: string; tags?: string }): Observable<any> {
    return this.http.put(`${this.apiUrl}/media/${mediaId}`, data)
  }

  // Delete media
  deleteMedia(mediaId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/media/${mediaId}`)
  }

  // Search media by tags
  searchMediaByTags(tags: string[]): Observable<Media[]> {
    const tagsString = tags.join(",")
    return this.http.get<Media[]>(`${this.apiUrl}/media/search/tags?tags=${tagsString}`)
  }

  // Get full URL for media
  getFullUrl(url: string): string {
    if (url.startsWith("http")) {
      return url
    }
    return `${environment.apiUrl}${url}`
  }
}
