import { Component, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { MatCardModule } from "@angular/material/card"
import { MatButtonModule } from "@angular/material/button"
import { MatIconModule } from "@angular/material/icon"
import { MatInputModule } from "@angular/material/input"
import { MatFormFieldModule } from "@angular/material/form-field"
import { MatProgressBarModule } from "@angular/material/progress-bar"
import { MatSnackBarModule, MatSnackBar } from "@angular/material/snack-bar"
import { MatMenuModule } from "@angular/material/menu"
import { MatDividerModule } from "@angular/material/divider"
import { FormsModule } from "@angular/forms"
import { AuthService } from "../../services/auth.service"
import { PostService, Post } from "../../services/post.service"
import { User } from "../../models/user"
import { environment } from "../../environment"

@Component({
  selector: "app-home",
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatMenuModule,
    MatDividerModule,
    FormsModule,
  ],
  template: `
    <div class="content-container">
      <mat-card class="post-card">
        <mat-card-header>
          <div mat-card-avatar class="user-avatar" [style.background-image]="currentUser?.profilePicture ? 'url(' + apiUrl + currentUser?.profilePicture + ')' : ''"></div>
          <mat-card-title>{{ currentUser?.fullName || 'User' }}</mat-card-title>
          <mat-card-subtitle>What's on your mind?</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <mat-form-field appearance="outline" class="full-width">
            <textarea matInput placeholder="Share your thoughts..." [(ngModel)]="newPostContent" rows="3"></textarea>
          </mat-form-field>
          
          <div *ngIf="selectedImage" class="image-preview">
            <img [src]="selectedImagePreview" alt="Selected image" />
            <button mat-icon-button color="warn" class="remove-image" (click)="removeSelectedImage()">
              <mat-icon>close</mat-icon>
            </button>
          </div>
        </mat-card-content>
        <mat-card-actions align="end">
          <input type="file" #fileInput style="display: none" accept="image/*" (change)="onFileSelected($event)" />
          <button mat-button (click)="fileInput.click()">
            <mat-icon>photo</mat-icon> Photo
          </button>
          <button mat-raised-button color="primary" [disabled]="!newPostContent && !selectedImage" (click)="createPost()">
            Post
          </button>
        </mat-card-actions>
        <mat-progress-bar *ngIf="isPosting" mode="indeterminate"></mat-progress-bar>
      </mat-card>

      <div class="feed-container">
        <mat-card class="post-card" *ngFor="let post of posts">
          <mat-card-header>
            <div mat-card-avatar class="user-avatar" [style.background-image]="getProfileImageUrl(post.userId)"></div>
            <mat-card-title>{{ post.userId.fullName }}</mat-card-title>
            <mat-card-subtitle>{{ post.createdAt | date:'medium' }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <p>{{ post.content }}</p>
            <img *ngIf="post.imageUrl" [src]="getPostImageUrl(post)" class="post-image" alt="Post image" />
          </mat-card-content>
          <mat-card-actions>
            <button mat-button (click)="toggleLike(post)">
              <mat-icon [color]="isLikedByCurrentUser(post) ? 'accent' : ''">thumb_up</mat-icon> 
              {{ post.likes.length }} Like{{ post.likes.length !== 1 ? 's' : '' }}
            </button>
            <button mat-button (click)="showCommentInput[post._id] = !showCommentInput[post._id]">
              <mat-icon>comment</mat-icon> {{ post.comments.length }} Comment{{ post.comments.length !== 1 ? 's' : '' }}
            </button>
            <button mat-button>
              <mat-icon>share</mat-icon> Share
            </button>
            <button mat-icon-button *ngIf="post.userId._id === currentUser?._id" [matMenuTriggerFor]="postMenu">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #postMenu="matMenu">
              <button mat-menu-item (click)="deletePost(post)">
                <mat-icon>delete</mat-icon> Delete
              </button>
            </mat-menu>
          </mat-card-actions>
          
          <!-- Comments section -->
          <mat-card-content *ngIf="post.comments.length > 0 || showCommentInput[post._id]">
            <mat-divider></mat-divider>
            
            <!-- Comment input -->
            <div *ngIf="showCommentInput[post._id]" class="comment-input">
              <div class="user-avatar small" [style.background-image]="currentUser?.profilePicture ? 'url(' + apiUrl + currentUser?.profilePicture + ')' : ''"></div>
              <mat-form-field appearance="outline" class="comment-field">
                <input matInput placeholder="Write a comment..." [(ngModel)]="newComments[post._id]" (keyup.enter)="addComment(post)" />
                <button *ngIf="newComments[post._id]" matSuffix mat-icon-button (click)="addComment(post)">
                  <mat-icon>send</mat-icon>
                </button>
              </mat-form-field>
            </div>
            
            <!-- Comments list -->
            <div class="comments-list">
              <div class="comment" *ngFor="let comment of post.comments">
                <div class="user-avatar small" [style.background-image]="comment.userId.profilePicture ? 'url(' + apiUrl + comment.userId.profilePicture + ')' : ''"></div>
                <div class="comment-content">
                  <div class="comment-bubble">
                    <span class="comment-author">{{ comment.userId.fullName }}</span>
                    <span class="comment-text">{{ comment.content }}</span>
                  </div>
                  <div class="comment-actions">
                    <span class="comment-time">{{ comment.createdAt | date:'shortTime' }}</span>
                    <button mat-button class="comment-like-btn">Like</button>
                    <button mat-button class="comment-reply-btn">Reply</button>
                  </div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
        
        <div *ngIf="posts.length === 0 && !isLoading" class="empty-feed">
          <mat-icon class="empty-icon">sentiment_dissatisfied</mat-icon>
          <p>No posts to show. Start by creating a post or adding friends!</p>
        </div>
        
        <div *ngIf="isLoading" class="loading-feed">
          <mat-progress-bar mode="indeterminate"></mat-progress-bar>
          <p>Loading posts...</p>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    .content-container {
      max-width: 800px;
      margin: 20px auto;
      padding: 0 20px;
    }
    
    .post-card {
      margin-bottom: 20px;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .user-avatar {
      background-image: url('/assets/default-avatar.png');
      background-size: cover;
      background-position: center;
    }
    
    .user-avatar.small {
      width: 32px;
      height: 32px;
      margin-right: 8px;
    }
    
    .full-width {
      width: 100%;
    }
    
    .feed-container {
      margin-top: 20px;
    }
    
    .post-image {
      width: 100%;
      max-height: 500px;
      object-fit: contain;
      margin: 12px 0;
      border-radius: 8px;
    }
    
    .image-preview {
      position: relative;
      margin-top: 12px;
    }
    
    .image-preview img {
      max-width: 100%;
      max-height: 200px;
      border-radius: 8px;
    }
    
    .remove-image {
      position: absolute;
      top: 4px;
      right: 4px;
      background-color: rgba(0, 0, 0, 0.5);
    }
    
    .comment-input {
      display: flex;
      align-items: center;
      margin: 12px 0;
    }
    
    .comment-field {
      flex: 1;
    }
    
    .comments-list {
      margin-top: 12px;
    }
    
    .comment {
      display: flex;
      margin-bottom: 8px;
    }
    
    .comment-content {
      flex: 1;
    }
    
    .comment-bubble {
      background-color: #f0f2f5;
      border-radius: 18px;
      padding: 8px 12px;
      display: inline-block;
      max-width: 100%;
    }
    
    .comment-author {
      font-weight: 500;
      margin-right: 8px;
    }
    
    .comment-actions {
      display: flex;
      align-items: center;
      margin-left: 12px;
      font-size: 12px;
    }
    
    .comment-time {
      color: #65676b;
      margin-right: 8px;
    }
    
    .comment-like-btn, .comment-reply-btn {
      min-width: auto;
      padding: 0 8px;
      font-size: 12px;
      line-height: 20px;
      height: 20px;
    }
    
    .empty-feed, .loading-feed {
      text-align: center;
      padding: 40px 0;
      color: #65676b;
    }
    
    .empty-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      margin-bottom: 16px;
    }
    `,
  ],
})
export class HomeComponent implements OnInit {
  currentUser: User | null = null
  posts: Post[] = []
  newPostContent = ""
  selectedImage: File | null = null
  selectedImagePreview: string | null = null
  isPosting = false
  isLoading = true
  showCommentInput: { [key: string]: boolean } = {}
  newComments: { [key: string]: string } = {}
  apiUrl = environment.apiUrl

  constructor(
    private authService: AuthService,
    private postService: PostService,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    // Subscribe to the currentUser$ observable instead of calling it as a function
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user
    })

    // Test the API connection first
    this.postService.testApi().subscribe({
      next: (response) => {
        console.log("API test successful:", response)
        this.loadPosts()
      },
      error: (error) => {
        console.error("API test failed:", error)
        this.snackBar.open("Could not connect to the server", "Close", { duration: 5000 })
        this.isLoading = false
      },
    })
  }

  loadPosts(): void {
    this.isLoading = true
    this.postService.getFeed().subscribe({
      next: (posts) => {
        console.log("Loaded posts:", posts)
        this.posts = posts
        this.isLoading = false
      },
      error: (error) => {
        console.error("Error loading posts:", error)
        this.isLoading = false
        this.snackBar.open("Error loading posts", "Close", { duration: 3000 })
      },
    })
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0]
    if (file) {
      console.log("File selected:", file.name, file.type, file.size)
      this.selectedImage = file

      // Create a preview
      const reader = new FileReader()
      reader.onload = (e) => {
        this.selectedImagePreview = e.target?.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  removeSelectedImage(): void {
    this.selectedImage = null
    this.selectedImagePreview = null
  }

  createPost(): void {
    if ((!this.newPostContent || this.newPostContent.trim() === "") && !this.selectedImage) {
      return
    }

    console.log("Creating post with content:", this.newPostContent)
    console.log("Selected image:", this.selectedImage?.name)

    this.isPosting = true
    this.postService.createPost(this.newPostContent, this.selectedImage || undefined).subscribe({
      next: (post) => {
        console.log("Post created successfully:", post)
        this.posts.unshift(post)
        this.newPostContent = ""
        this.selectedImage = null
        this.selectedImagePreview = null
        this.isPosting = false
        this.snackBar.open("Post created successfully", "Close", { duration: 3000 })
      },
      error: (error) => {
        console.error("Error creating post:", error)
        this.isPosting = false
        this.snackBar.open("Error creating post: " + (error.message || "Unknown error"), "Close", { duration: 5000 })
      },
    })
  }

  toggleLike(post: Post): void {
    this.postService.toggleLike(post._id).subscribe({
      next: (response) => {
        post.likes = response.likes
      },
      error: (error) => {
        console.error("Error toggling like:", error)
        this.snackBar.open("Error liking post", "Close", { duration: 3000 })
      },
    })
  }

  isLikedByCurrentUser(post: Post): boolean {
    return post.likes.includes(this.currentUser?._id || "")
  }

  addComment(post: Post): void {
    const content = this.newComments[post._id]
    if (!content || content.trim() === "") {
      return
    }

    this.postService.addComment(post._id, content).subscribe({
      next: (updatedPost) => {
        // Update the post with the new comment
        post.comments = updatedPost.comments
        this.newComments[post._id] = ""
      },
      error: (error) => {
        console.error("Error adding comment:", error)
        this.snackBar.open("Error adding comment", "Close", { duration: 3000 })
      },
    })
  }

  deletePost(post: Post): void {
    if (confirm("Are you sure you want to delete this post?")) {
      this.postService.deletePost(post._id).subscribe({
        next: () => {
          this.posts = this.posts.filter((p) => p._id !== post._id)
          this.snackBar.open("Post deleted successfully", "Close", { duration: 3000 })
        },
        error: (error) => {
          console.error("Error deleting post:", error)
          this.snackBar.open("Error deleting post", "Close", { duration: 3000 })
        },
      })
    }
  }

  getPostImageUrl(post: Post): string {
    if (!post.imageUrl) return ""

    // Ha már teljes URL van (pl. CDN esetén)
    if (post.imageUrl.startsWith("http")) {
      return post.imageUrl
    }

    // Statikus fájlokhoz a baseUrl-t használjuk
    return `${environment.baseUrl}${post.imageUrl}`
  }

  getProfileImageUrl(user: any): string {
    if (!user?.profilePicture) {
      return 'url("/assets/default-avatar.png")'
    }

    // If already a full URL (http or https), use it directly
    if (user.profilePicture.startsWith("http")) {
      return `url('${user.profilePicture}')`
    }

    // Make sure the path starts with a slash
    if (!user.profilePicture.startsWith("/")) {
      user.profilePicture = `/${user.profilePicture}`
    }

    // Add the API URL
    return `url('${this.apiUrl}${user.profilePicture}')`
  }
}
