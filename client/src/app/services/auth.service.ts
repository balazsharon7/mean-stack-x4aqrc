import { HttpClient, HttpHeaders } from "@angular/common/http"
import { BehaviorSubject, Observable, throwError } from "rxjs"
import { catchError, tap } from "rxjs/operators"
import { Router } from "@angular/router"
import { User, AuthResponse } from "../models/user"
import { environment } from "../environment"
import { Injectable, Inject, PLATFORM_ID } from "@angular/core"
import { isPlatformBrowser } from "@angular/common"

@Injectable({
  providedIn: "root",
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/users`
  private currentUserSubject = new BehaviorSubject<User | null>(null)
  public currentUser$ = this.currentUserSubject.asObservable()
  private loggedInSubject = new BehaviorSubject<boolean>(false)
  public isLoggedIn$ = this.loggedInSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router,
     @Inject(PLATFORM_ID) private readonly platformId: Object,
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.loadUserFromStorage()
    }
  }

  // Load user from localStorage with error handling
  private loadUserFromStorage(): void {
    try {
      const storedUser = localStorage.getItem("currentUser")
      const token = localStorage.getItem("token")

      console.log("Loading user from storage:", storedUser ? "User exists" : "No user found")
      console.log("Token in storage:", token ? "Token exists" : "No token found")

      if (storedUser && token) {
        const user = JSON.parse(storedUser)
        this.currentUserSubject.next(user)
        this.loggedInSubject.next(true)
        console.log("User loaded from localStorage:", user.username || user.email)
      }
    } catch (e) {
      console.error("Error loading user from storage:", e)
      this.clearBrowserStorage()
    }
  }

  private clearBrowserStorage(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem("currentUser")
      localStorage.removeItem("token")
      localStorage.removeItem("userId")
      localStorage.removeItem("tokenExpiry")
      console.log("Browser storage cleared")
    }
  }

  // Getter for current user
  get currentUser(): User | null {
    return this.currentUserSubject.value
  }

  // Getter for isLoggedIn
  get isLoggedIn(): boolean {
    return this.loggedInSubject.value
  }

  // Get current user as Observable
  getCurrentUser(): Observable<User | null> {
    return this.currentUser$
  }

  // Register a new user
  register(userData: Partial<User>): Observable<AuthResponse> {
    console.log("Registering user:", userData)
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, userData).pipe(
      tap((response) => {
        console.log("Registration successful:", response)

        // Ensure we have a token and user
        if (!response.token || !response.user) {
          console.error("Registration response missing token or user:", response)
          throw new Error("Invalid registration response")
        }

        this.setSession(response)
        this.currentUserSubject.next(response.user)
        this.loggedInSubject.next(true)

        // Debug: Verify token storage
        setTimeout(() => {
          const storedToken = localStorage.getItem("token")
          console.log("Token stored after registration:", storedToken ? "Yes" : "No")
        }, 100)
      }),
      catchError(this.handleError<AuthResponse>("register")),
    )
  }

  // Login user
  login(email: string, password: string): Observable<AuthResponse> {
    console.log("Logging in user:", email)
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, { email, password }).pipe(
      tap((response) => {
        console.log("Login successful:", response)

        // Ensure we have a token and user
        if (!response.token || !response.user) {
          console.error("Login response missing token or user:", response)
          throw new Error("Invalid login response")
        }

        this.setSession(response)
        this.currentUserSubject.next(response.user)
        this.loggedInSubject.next(true)

        // Debug: Verify token storage
        setTimeout(() => {
          const storedToken = localStorage.getItem("token")
          console.log("Token stored after login:", storedToken ? "Yes" : "No")
        }, 100)
      }),
      catchError(this.handleError<AuthResponse>("login")),
    )
  }

  // Update current user data
  updateCurrentUser(user: User): void {
    this.currentUserSubject.next(user)
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem("currentUser", JSON.stringify(user))
    }
  }

  // Logout user
  logout(): void {
    this.clearBrowserStorage()
    this.currentUserSubject.next(null)
    this.loggedInSubject.next(false)
    this.router.navigate(["/login"])
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false

    const token = localStorage.getItem("token")
    const expiry = localStorage.getItem("tokenExpiry")

    if (!token) {
      console.log("No token found, user is not authenticated")
      return false
    }

    if (expiry) {
      const expiryDate = new Date(expiry)
      const isExpired = expiryDate < new Date()

      if (isExpired) {
        console.log("Token expired, user is not authenticated")
        this.clearBrowserStorage()
        return false
      }
    }

    return true
  }

  // Refresh user data from server
  refreshUserData(): Observable<User> {
    console.log("Refreshing user data from server")

    // Create headers with auth token
    const headers = new HttpHeaders({
      "auth-token": this.getAuthToken() || "",
      "x-auth-token": this.getAuthToken() || "",
    })

    return this.http.get<User>(`${this.apiUrl}/profile`, { headers }).pipe(
      tap((user) => {
        console.log("User data refreshed:", user)
        this.setCurrentUser(user)
      }),
      catchError((error) => {
        console.error("Error refreshing user data:", error)

        // If unauthorized, clear session and redirect to login
        if (error.status === 401) {
          console.log("Unauthorized during refresh, clearing session")
          this.clearBrowserStorage()
          this.router.navigate(["/login"])
        }

        return throwError(() => new Error("Failed to refresh user data"))
      }),
    )
  }

  setSession(authResult: AuthResponse): void {
    if (isPlatformBrowser(this.platformId)) {
      console.log("Setting session with token:", authResult.token ? "Token exists" : "No token")

      if (!authResult.token) {
        console.error("Cannot set session: No token provided")
        return
      }

      localStorage.setItem("token", authResult.token)
      localStorage.setItem("userId", authResult.userId)
      localStorage.setItem("currentUser", JSON.stringify(authResult.user))

      const expiryDate = new Date()
      expiryDate.setHours(expiryDate.getHours() + 24)
      localStorage.setItem("tokenExpiry", expiryDate.toISOString())

      console.log("Session set successfully")
    }
  }

  getCurrentUserId(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null

    const userData = localStorage.getItem("currentUser")
    if (!userData) {
      console.log("No user data in localStorage")
      return null
    }

    try {
      const user = JSON.parse(userData)
      return user._id
    } catch (e) {
      console.error("Error parsing user data:", e)
      return null
    }
  }

  private handleError<T>(operation = "operation", result?: T) {
    return (error: any): Observable<T> => {
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

      // Rethrow the error to be handled by the component
      throw error
    }
  }

  // Get the auth token with debug logging
  getAuthToken(): string | null {
    if (!isPlatformBrowser(this.platformId)) return null

    const token = localStorage.getItem("token")
    console.log("Retrieved auth token:", token ? "Token exists" : "No token found")

    if (!token) {
      console.log("No token found in localStorage")
      return null
    }

    // Check if token is expired
    const expiry = localStorage.getItem("tokenExpiry")
    if (expiry) {
      const expiryDate = new Date(expiry)
      const isExpired = expiryDate < new Date()
      console.log("Token expiry:", expiry, "Is expired:", isExpired)

      if (isExpired) {
        console.log("Token is expired, clearing session")
        this.clearBrowserStorage()
        return null
      }
    }

    return token
  }

  setCurrentUser(user: User): void {
    this.currentUserSubject.next(user)
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem("currentUser", JSON.stringify(user))
      console.log("Current user updated in localStorage:", user.username || user.email)
    }
  }

  // Force token refresh - can be called after login/registration
  refreshToken(): void {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem("token")
      if (token) {
        // Re-save the token to ensure it's properly stored
        localStorage.setItem("token", token)
        console.log("Token refreshed in localStorage")
      }
    }
  }
}
