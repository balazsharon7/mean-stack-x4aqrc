import { Injectable } from "@angular/core"
import { HttpClient, HttpHeaders } from "@angular/common/http"
import { Observable, throwError } from "rxjs"
import { catchError, tap } from "rxjs/operators"
import { User } from "../models/user"
import { environment } from "../environment"

interface ProfilePictureResponse {
  message: string
  profilePicture: string
}

interface CoverPhotoResponse {
  message: string
  coverPhoto: string
}

@Injectable({
  providedIn: "root",
})
export class UserService {
  private apiUrl = `${environment.apiUrl}/users`

  constructor(private http: HttpClient) {}

  // Get user by ID
  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/profile/${id}`).pipe(
      tap((user) => console.log("Fetched user:", user.username)),
      catchError(this.handleError<User>("getUserById")),
    )
  }

  // Get current user profile
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/profile`).pipe(
      tap((user) => console.log("Fetched current user:", user.username)),
      catchError(this.handleError<User>("getCurrentUser")),
    )
  }

  // Get user's friends
  getUserFriends(userId: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/profile/${userId}/friends`).pipe(
      tap((friends) => {
        console.log("Fetched user friends:", friends.length)
        // Ellenőrizzük és javítjuk a profilképek URL-jeit
        friends.forEach((friend) => {
          if (friend.profilePicture && !friend.profilePicture.startsWith("http")) {
            // Csak akkor adjuk hozzá az API URL-t, ha még nem tartalmazza
            if (!friend.profilePicture.startsWith("/")) {
              friend.profilePicture = `/${friend.profilePicture}`
            }
          }
        })
      }),
      catchError(this.handleError<User[]>("getUserFriends", [])),
    )
  }

  // Update user profile
  updateProfile(userData: Partial<User>): Observable<User> {
    const headers = new HttpHeaders({
      "Content-Type": "application/json",
    })

    console.log("Sending profile update:", userData)

    return this.http.put<User>(`${this.apiUrl}/profile`, userData, { headers }).pipe(
      tap((user) => console.log("Updated user profile:", user.username)),
      catchError(this.handleError<User>("updateProfile")),
    )
  }

  // Update profile picture
  uploadProfilePicture(formData: FormData): Observable<ProfilePictureResponse> {
    return this.http.post<ProfilePictureResponse>(`${this.apiUrl}/profile-picture`, formData).pipe(
      tap((response) => console.log("Updated profile picture:", response)),
      catchError(this.handleError<ProfilePictureResponse>("uploadProfilePicture")),
    )
  }

  // Update cover photo
  uploadCoverPhoto(formData: FormData): Observable<CoverPhotoResponse> {
    return this.http.post<CoverPhotoResponse>(`${this.apiUrl}/cover-photo`, formData).pipe(
      tap((response) => console.log("Updated cover photo:", response)),
      catchError(this.handleError<CoverPhotoResponse>("uploadCoverPhoto")),
    )
  }

  // Search users
  searchUsers(query: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/search?q=${encodeURIComponent(query)}`).pipe(
      tap((users) => console.log("Search results:", users.length)),
      catchError(this.handleError<User[]>("searchUsers", [])),
    )
  }

private handleError<T>(operation = "operation", result?: T) {
  return (error: any): Observable<T> => {
    // ...

    // JSON parse hiba kezelése
    let errorMessage = 'Unknown error';
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else if (error.status === 0) {
      errorMessage = 'Network error';
    } else {
      // Próbáld meg parsolni a választ, ha nem JSON
      try {
        const parsedError = JSON.parse(error.error);
        errorMessage = parsedError.message || error.statusText;
      } catch (e) {
        errorMessage = error.error || error.statusText;
      }
    }

    console.error(`${operation} failed: ${errorMessage}`);
    
    return throwError(() => new Error(errorMessage));
  };
}
}
