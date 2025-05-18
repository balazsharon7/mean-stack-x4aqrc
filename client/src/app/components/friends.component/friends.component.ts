import { Component,  OnInit, OnDestroy } from "@angular/core"
import { CommonModule } from "@angular/common"
import { MatCardModule } from "@angular/material/card"
import { MatButtonModule } from "@angular/material/button"
import { MatIconModule } from "@angular/material/icon"
import { MatInputModule } from "@angular/material/input"
import { MatFormFieldModule } from "@angular/material/form-field"
import { MatTabsModule } from "@angular/material/tabs"
import { MatDividerModule } from "@angular/material/divider"
import { MatListModule } from "@angular/material/list"
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar"
import { MatProgressBarModule } from "@angular/material/progress-bar"
import { FormsModule } from "@angular/forms"
import { FriendsService } from "../../services/friends.service"
import { User } from "../../models/user"
import { environment } from "../../environment"
import { Router } from "@angular/router"
import { Subscription } from "rxjs"
import { AuthService } from "../../services/auth.service"

@Component({
  selector: "app-friends",
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatTabsModule,
    MatDividerModule,
    MatListModule,
    MatSnackBarModule,
    MatProgressBarModule,
    FormsModule,
  ],
  template: `
    <div class="friends-container">
      <mat-card class="friends-card">
        <mat-card-header>
          <mat-card-title>Friends</mat-card-title>
        </mat-card-header>
        
        <mat-card-content>
          <mat-tab-group>
            <mat-tab label="My Friends">
              <div class="search-container">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Search friends</mat-label>
                  <input matInput [(ngModel)]="friendSearchQuery" placeholder="Search by name">
                  <button *ngIf="friendSearchQuery" matSuffix mat-icon-button aria-label="Clear" (click)="friendSearchQuery=''">
                    <mat-icon>close</mat-icon>
                  </button>
                </mat-form-field>
              </div>
              
              <div *ngIf="isLoading" class="loading-state">
                <mat-progress-bar mode="indeterminate"></mat-progress-bar>
                <p>Loading friends...</p>
              </div>
              
              <div *ngIf="myFriends.length === 0 && !isLoading" class="empty-state">
                <mat-icon>people_outline</mat-icon>
                <p>You don't have any friends yet</p>
              </div>
              
              <mat-list *ngIf="myFriends.length > 0">
                <mat-list-item *ngFor="let friend of filteredFriends">
                  <div matListItemIcon class="avatar-container">
                    <div class="user-avatar" [style.background-image]="getProfileImageUrl(friend.profilePicture)"></div>
                  </div>
                  <div matListItemTitle>{{friend.fullName}}</div>
                  <div matListItemLine>{{friend.email}} ({{friend.username}})</div>
                  <div matListItemMeta>
                    <button mat-icon-button color="primary" (click)="viewProfile(friend)">
                      <mat-icon>person</mat-icon>
                    </button>
                    <button mat-icon-button color="primary" (click)="sendMessage(friend)">
                      <mat-icon>message</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" (click)="removeFriend(friend)">
                      <mat-icon>person_remove</mat-icon>
                    </button>
                  </div>
                </mat-list-item>
              </mat-list>
            </mat-tab>
            
            <mat-tab label="Find Friends">
              <div class="search-container">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Find new friends</mat-label>
                  <input matInput [(ngModel)]="userSearchQuery" placeholder="Search by name, email or username" 
                         (keyup.enter)="searchUsers()">
                  <button matSuffix mat-icon-button aria-label="Search" (click)="searchUsers()">
                    <mat-icon>search</mat-icon>
                  </button>
                </mat-form-field>
              </div>
              
              <div *ngIf="isSearching" class="loading-state">
                <mat-progress-bar mode="indeterminate"></mat-progress-bar>
                <p>Searching for users...</p>
              </div>
              
              <div *ngIf="searchResults.length === 0 && hasSearched && !isSearching" class="empty-state">
                <mat-icon>search_off</mat-icon>
                <p>No users found matching your search</p>
              </div>
              
              <mat-list *ngIf="searchResults.length > 0">
                <mat-list-item *ngFor="let user of searchResults">
                  <div matListItemIcon class="avatar-container">
                    <div class="user-avatar" [style.background-image]="getProfileImageUrl(user.profilePicture)"></div>
                  </div>
                  <div matListItemTitle>{{user.fullName}}</div>
                  <div matListItemLine>{{user.email}} ({{user.username}})</div>
                  <div matListItemMeta>
                    <button mat-icon-button color="primary" (click)="viewProfile(user)">
                      <mat-icon>person</mat-icon>
                    </button>
                    <button mat-raised-button color="primary" 
                            [disabled]="isFriend(user) || isPendingFriend(user)"
                            (click)="addFriend(user)">
                      <mat-icon>{{ isFriend(user) ? 'how_to_reg' : (isPendingFriend(user) ? 'pending' : 'person_add') }}</mat-icon>
                      {{ isFriend(user) ? 'Friends' : (isPendingFriend(user) ? 'Pending' : 'Add Friend') }}
                    </button>
                  </div>
                </mat-list-item>
              </mat-list>
              
              <div class="browse-all-users">
                <mat-divider></mat-divider>
                <h3>Browse All Users</h3>
                
                <div *ngIf="isLoadingAllUsers" class="loading-state">
                  <mat-progress-bar mode="indeterminate"></mat-progress-bar>
                  <p>Loading users...</p>
                </div>
                
                <mat-list *ngIf="allUsers.length > 0">
                  <mat-list-item *ngFor="let user of allUsers">
                    <div matListItemIcon class="avatar-container">
                      <div class="user-avatar" [style.background-image]="getProfileImageUrl(user.profilePicture)"></div>
                    </div>
                    <div matListItemTitle>{{user.fullName}}</div>
                    <div matListItemLine>{{user.email}} ({{user.username}})</div>
                    <div matListItemMeta>
                      <button mat-icon-button color="primary" (click)="viewProfile(user)">
                        <mat-icon>person</mat-icon>
                      </button>
                      <button mat-raised-button color="primary" 
                              [disabled]="isFriend(user) || isPendingFriend(user)"
                              (click)="addFriend(user)">
                        <mat-icon>{{ isFriend(user) ? 'how_to_reg' : (isPendingFriend(user) ? 'pending' : 'person_add') }}</mat-icon>
                        {{ isFriend(user) ? 'Friends' : (isPendingFriend(user) ? 'Pending' : 'Add Friend') }}
                      </button>
                    </div>
                  </mat-list-item>
                </mat-list>
              </div>
            </mat-tab>
            
            <mat-tab label="Friend Requests">
              <div *ngIf="isLoadingRequests" class="loading-state">
                <mat-progress-bar mode="indeterminate"></mat-progress-bar>
                <p>Loading friend requests...</p>
              </div>
              
              <div *ngIf="friendRequests.length === 0 && !isLoadingRequests" class="empty-state">
                <mat-icon>mark_email_unread</mat-icon>
                <p>You don't have any friend requests</p>
              </div>
              
              <mat-list *ngIf="friendRequests.length > 0">
                <mat-list-item *ngFor="let request of friendRequests">
                  <div matListItemIcon class="avatar-container">
                    <div class="user-avatar" [style.background-image]="getProfileImageUrl(request.profilePicture)"></div>
                  </div>
                  <div matListItemTitle>{{request.fullName}}</div>
                  <div matListItemLine>{{request.email}} ({{request.username}})</div>
                  <div matListItemMeta>
                    <button mat-icon-button color="primary" (click)="viewProfile(request)">
                      <mat-icon>person</mat-icon>
                    </button>
                    <button mat-raised-button color="primary" (click)="acceptRequest(request)">
                      <mat-icon>check</mat-icon>
                      Accept
                    </button>
                    <button mat-button color="warn" (click)="rejectRequest(request)">
                      <mat-icon>close</mat-icon>
                      Decline
                    </button>
                  </div>
                </mat-list-item>
              </mat-list>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
    .friends-container {
      max-width: 800px;
      margin: 20px auto;
      padding: 0 20px;
    }
    
    .friends-card {
      width: 100%;
    }
    
    .full-width {
      width: 100%;
    }
    
    .search-container {
      padding: 16px 0;
    }
    
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 0;
      color: #888;
    }
    
    .empty-state mat-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      margin-bottom: 16px;
    }
    
    .loading-state {
      padding: 20px 0;
      text-align: center;
      color: #888;
    }
    
    .avatar-container {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-image: url('/assets/default-avatar.png');
      background-size: cover;
      background-position: center;
    }
    
    mat-list-item {
      margin-bottom: 8px;
    }
    
    .browse-all-users {
      margin-top: 24px;
      padding-top: 16px;
    }
    
    .browse-all-users h3 {
      margin: 16px 0;
      color: #555;
      font-weight: 500;
    }
  `,
  ],
})
export class FriendsComponent implements OnInit, OnDestroy {
  myFriends: User[] = []
  friendRequests: User[] = []
  searchResults: User[] = []
  allUsers: User[] = []
  pendingFriendRequests: Set<string> = new Set()

  friendSearchQuery = ""
  userSearchQuery = ""
  hasSearched = false
  isLoading = false
  isSearching = false
  isLoadingRequests = false
  isLoadingAllUsers = false
  apiUrl = environment.apiUrl

  private subscriptions: Subscription[] = []

  constructor(
    private friendsService: FriendsService,
    private snackBar: MatSnackBar,
    private router: Router,
    private authService: AuthService, // Add this line
  ) {}

  ngOnInit(): void {
    // Subscribe to the pending requests
    this.subscriptions.push(
      this.friendsService.pendingRequests$.subscribe((pendingSet) => {
        this.pendingFriendRequests = pendingSet
      }),
    )

    // Test API connection
    this.friendsService.testApi().subscribe({
      next: (response: any) => {
        console.log("Friend API connection successful:", response)
        this.loadFriends()
        this.loadFriendRequests()
        this.loadAllUsers()
      },
      error: (error: any) => {
        console.error("Friend API connection failed:", error)
        this.snackBar.open("Could not connect to the server", "Close", { duration: 5000 })
      },
    })
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions
    this.subscriptions.forEach((sub) => sub.unsubscribe())
  }

  getProfileImageUrl(profilePicture: string | undefined): string {
    if (!profilePicture) return 'url("/assets/default-avatar.png")'

    // If already a full URL (http or https), use it directly
    if (profilePicture.startsWith("http")) {
      return `url('${profilePicture}')`
    }

    // Make sure the path starts with a slash
    if (!profilePicture.startsWith("/")) {
      profilePicture = `/${profilePicture}`
    }

    // Add the API URL
    return `url('${this.apiUrl}${profilePicture}')`
  }

  get filteredFriends(): User[] {
    if (!this.friendSearchQuery) {
      return this.myFriends
    }

    const query = this.friendSearchQuery.toLowerCase()
    return this.myFriends.filter(
      (friend) =>
        friend.fullName?.toLowerCase().includes(query) ||
        friend.email?.toLowerCase().includes(query) ||
        friend.username?.toLowerCase().includes(query),
    )
  }

  loadFriends(): void {
    this.isLoading = true
    this.friendsService.getFriends().subscribe({
      next: (friends) => {
        this.myFriends = friends
        this.isLoading = false
        console.log("Loaded friends:", friends)
      },
      error: (error: any) => {
        this.snackBar.open("Error loading friends", "Close", { duration: 3000 })
        console.error("Error loading friends:", error)
        this.isLoading = false
      },
    })
  }

  loadFriendRequests(): void {
    this.isLoadingRequests = true
    this.friendsService.getFriendRequests().subscribe({
      next: (requests: User[]) => {
        this.friendRequests = requests
        this.isLoadingRequests = false
        console.log("Loaded friend requests:", requests)
      },
      error: (error: any) => {
        this.snackBar.open("Error loading friend requests", "Close", { duration: 3000 })
        console.error("Error loading friend requests:", error)
        this.isLoadingRequests = false
      },
    })
  }

  loadAllUsers(): void {
    this.isLoadingAllUsers = true
    this.friendsService.getAllUsers().subscribe({
      next: (users: User[]) => {
        this.allUsers = users
        this.isLoadingAllUsers = false
        console.log("Loaded all users:", users)

        // Check friendship status for each user
        users.forEach((user) => {
          if (user._id) {
            this.checkFriendshipStatus(user._id.toString())
          }
        })
      },
      error: (error: any) => {
        this.snackBar.open("Error loading users", "Close", { duration: 3000 })
        console.error("Error loading users:", error)
        this.isLoadingAllUsers = false
      },
    })
  }

  checkFriendshipStatus(userId: string): void {
    this.friendsService.checkFriendship(userId).subscribe({
      next: (result) => {
        console.log(`Friendship status with ${userId}:`, result)
        // No need to update pendingFriendRequests here as it's handled in the service
      },
      error: (error) => {
        console.error(`Error checking friendship status with ${userId}:`, error)
      },
    })
  }

  searchUsers(): void {
    if (!this.userSearchQuery) return

    this.hasSearched = true
    this.isSearching = true
    this.searchResults = []

    console.log("Searching for users with query:", this.userSearchQuery)

    this.friendsService.searchUsers(this.userSearchQuery).subscribe({
      next: (users: User[]) => {
        console.log("Search results received:", users)
        this.searchResults = users
        this.isSearching = false

        // Check friendship status for each search result
        users.forEach((user) => {
          if (user._id) {
            this.checkFriendshipStatus(user._id.toString())
          }
        })
      },
      error: (error: any) => {
        this.snackBar.open("Error searching users", "Close", { duration: 3000 })
        console.error("Error searching users:", error)
        this.isSearching = false
      },
    })
  }

  isFriend(user: User): boolean {
    if (!user || !user._id) return false

    // Store the ID in a local variable after the null check
    const userId = user._id.toString()

    return this.myFriends.some((friend) => {
      return friend._id && friend._id.toString() === userId
    })
  }

  isPendingFriend(user: User): boolean {
    if (!user || !user._id) return false
    return this.pendingFriendRequests.has(user._id.toString())
  }

  // Modify the addFriend method to prevent adding self as friend
  addFriend(user: User): void {
    if (!user || !user._id) {
      this.snackBar.open("Cannot add friend: Invalid user ID", "Close", { duration: 3000 })
      return
    }

    // Check if trying to add self as friend
    const currentUserId = this.authService?.currentUser?._id
    if (user._id.toString() === currentUserId?.toString()) {
      this.snackBar.open("Cannot add yourself as a friend", "Close", { duration: 3000 })
      return
    }

    // Convert ObjectId to string if needed
    const userId = user._id.toString()

    // The service will handle adding to pending set
    this.friendsService.sendFriendRequest(userId).subscribe({
      next: (response) => {
        if (response.message === "Friend request already exists") {
          this.snackBar.open(`Friend request to ${user.fullName} already exists`, "Close", { duration: 3000 })
        } else {
          this.snackBar.open(`Friend request sent to ${user.fullName}`, "Close", { duration: 3000 })
        }
      },
      error: (error) => {
        // Handle specific error for self-friend request
        if (error.message === "Cannot send friend request to yourself") {
          this.snackBar.open("Cannot add yourself as a friend", "Close", { duration: 3000 })
          return
        }

        // Error handling is done in the service
        if (error.status !== 400 || error.error?.message !== "Friend request already exists") {
          this.snackBar.open("Error sending friend request", "Close", { duration: 3000 })
        } else {
          this.snackBar.open(`Friend request to ${user.fullName} already exists`, "Close", { duration: 3000 })
        }
        console.error("Error sending friend request:", error)
      },
    })
  }

  removeFriend(friend: User): void {
    if (!friend || !friend._id) {
      this.snackBar.open("Cannot remove friend: Invalid user ID", "Close", { duration: 3000 })
      return
    }

    // Convert ObjectId to string if needed
    const friendId = friend._id.toString()

    this.friendsService.removeFriend(friendId).subscribe({
      next: () => {
        this.myFriends = this.myFriends.filter((f) => f._id && f._id.toString() !== friend._id?.toString())
        this.snackBar.open(`Removed ${friend.fullName} from friends`, "Close", { duration: 3000 })

        // Refresh all users to update their status
        this.loadAllUsers()
      },
      error: (error) => {
        this.snackBar.open("Error removing friend", "Close", { duration: 3000 })
        console.error("Error removing friend:", error)
      },
    })
  }

  acceptRequest(user: User): void {
    if (!user || !user._id) {
      this.snackBar.open("Cannot accept request: Invalid user ID", "Close", { duration: 3000 })
      return
    }

    // Convert ObjectId to string if needed
    const userId = user._id.toString()

    this.friendsService.acceptFriendRequest(userId).subscribe({
      next: () => {
        this.friendRequests = this.friendRequests.filter((r) => r._id && r._id.toString() !== user._id?.toString())
        this.myFriends.push(user)
        this.snackBar.open(`You are now friends with ${user.fullName}`, "Close", { duration: 3000 })
      },
      error: (error) => {
        this.snackBar.open("Error accepting friend request", "Close", { duration: 3000 })
        console.error("Error accepting friend request:", error)
      },
    })
  }

  rejectRequest(user: User): void {
    if (!user || !user._id) {
      this.snackBar.open("Cannot reject request: Invalid user ID", "Close", { duration: 3000 })
      return
    }

    // Convert ObjectId to string if needed
    const userId = user._id.toString()

    this.friendsService.rejectFriendRequest(userId).subscribe({
      next: () => {
        // Remove from friend requests list
        this.friendRequests = this.friendRequests.filter((r) => r._id && r._id.toString() !== user._id?.toString())

        // Remove from pending requests set
        if (user._id) {
          this.friendsService.removeFromPendingRequests(user._id.toString())
        }

        this.snackBar.open(`Friend request from ${user.fullName} declined`, "Close", { duration: 3000 })

        // Refresh all users to update their status
        this.loadAllUsers()
      },
      error: (error) => {
        this.snackBar.open("Error rejecting friend request", "Close", { duration: 3000 })
        console.error("Error rejecting friend request:", error)
      },
    })
  }

  sendMessage(friend: User): void {
    if (!friend) {
      this.snackBar.open("Cannot send message: Invalid user", "Close", { duration: 3000 })
      return
    }

    // Navigate to the messages component with this friend selected
    console.log("Navigate to messages with friend:", friend)
    this.snackBar.open(`Opening chat with ${friend.fullName}`, "Close", { duration: 3000 })
    this.router.navigate(["/dashboard/messages"], { queryParams: { userId: friend._id } })
  }

  viewProfile(user: User): void {
    if (!user || !user._id) {
      this.snackBar.open("Cannot view profile: Invalid user ID", "Close", { duration: 3000 })
      return
    }

    // Navigate to user profile
    this.router.navigate(["/dashboard/profile", user._id.toString()])
  }
}
