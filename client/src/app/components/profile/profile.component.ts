import { Component, OnInit, ViewChild } from "@angular/core"
import { CommonModule } from "@angular/common"
import { MatTabsModule, MatTabGroup } from "@angular/material/tabs"
import { MatCardModule } from "@angular/material/card"
import { MatButtonModule } from "@angular/material/button"
import { MatIconModule } from "@angular/material/icon"
import { MatDividerModule } from "@angular/material/divider"
import { MatMenuModule } from "@angular/material/menu"
import { MatListModule } from "@angular/material/list"
import { MatInputModule } from "@angular/material/input"
import { MatFormFieldModule } from "@angular/material/form-field"
import { MatProgressBarModule } from "@angular/material/progress-bar"
import { MatSnackBar } from "@angular/material/snack-bar"
import { MatDialogModule, MatDialog } from "@angular/material/dialog"
import { FormsModule } from "@angular/forms"
import { RouterModule, ActivatedRoute, Router } from "@angular/router"
import { AuthService } from "../../services/auth.service"
import { User } from "../../models/user"
import { UserService } from "../../services/user.service"
import { PostService, Post } from "../../services/post.service"
import { FriendsService } from "../../services/friends.service"
import { environment } from "../../environment"
import { FormBuilder } from "@angular/forms"
import { ProfileEditDialogComponent } from "../profile-edit-dialog/profile-edit-dialog.component"
import { ProfilePictureDialogComponent } from "../profile-picture-dialog/profile-picture-dialog.component"
import { CoverPhotoDialogComponent } from "../cover-photo-dialog/cover-photo-dialog.component"

@Component({
  selector: "app-profile",
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatMenuModule,
    MatListModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressBarModule,
    MatDialogModule,
    FormsModule,
    RouterModule,
  ],
  template: `
    <div class="profile-container">
      <!-- Cover Photo Section -->
      <div class="cover-photo" [style.background-image]="getCoverPhotoUrl()">
        <div class="cover-photo-actions" *ngIf="isOwnProfile">
          <button mat-mini-fab color="primary" class="edit-cover-btn" (click)="openCoverPhotoDialog()">
            <mat-icon>photo_camera</mat-icon>
          </button>
        </div>
      </div>
      
      <!-- Profile Info Section -->
      <div class="profile-info-container">
        <div class="profile-picture-container">
          <div class="profile-picture" [style.background-image]="getProfileImageUrl()">
            <button mat-mini-fab color="primary" class="edit-profile-pic-btn" *ngIf="isOwnProfile" (click)="openProfilePictureDialog()">
              <mat-icon>photo_camera</mat-icon>
            </button>
          </div>
        </div>
        
        <div class="profile-details">
          <h1 class="profile-name">{{ profileUser?.fullName || 'User Name' }}</h1>
          <p class="profile-bio">{{ profileUser?.bio || (isOwnProfile ? 'No bio yet. Click to add a bio.' : 'No bio available.') }}</p>
          
          <div class="profile-actions">
            <button mat-raised-button color="primary" *ngIf="isOwnProfile" (click)="openEditProfileDialog()">
              <mat-icon>edit</mat-icon> Edit Profile
            </button>
            
            <!-- Friend actions for other users' profiles -->
            <ng-container *ngIf="!isOwnProfile">
              <button mat-raised-button color="primary" *ngIf="!isFriend && !isPendingFriend" (click)="addFriend()">
                <mat-icon>person_add</mat-icon> Add Friend
              </button>
              <button mat-raised-button color="primary" disabled *ngIf="isPendingFriend">
                <mat-icon>pending</mat-icon> Friend Request Sent
              </button>
              <button mat-raised-button color="primary" *ngIf="isFriend" (click)="removeFriend()">
                <mat-icon>how_to_reg</mat-icon> Friends
              </button>
              <button mat-raised-button color="primary" *ngIf="isFriend" (click)="sendMessage()">
                <mat-icon>message</mat-icon> Message
              </button>
            </ng-container>
            
            <button mat-button color="primary" *ngIf="isOwnProfile">
              <mat-icon>visibility</mat-icon> View As
            </button>
            <button mat-icon-button [matMenuTriggerFor]="profileMenu">
              <mat-icon>more_horiz</mat-icon>
            </button>
            <mat-menu #profileMenu="matMenu">
              <button mat-menu-item *ngIf="isOwnProfile">
                <mat-icon>lock</mat-icon> Privacy Settings
              </button>
              <button mat-menu-item *ngIf="isOwnProfile">
                <mat-icon>notifications</mat-icon> Notification Settings
              </button>
              <button mat-menu-item *ngIf="!isOwnProfile">
                <mat-icon>block</mat-icon> Block User
              </button>
              <button mat-menu-item *ngIf="!isOwnProfile">
                <mat-icon>flag</mat-icon> Report User
              </button>
            </mat-menu>
          </div>
        </div>
      </div>
      
      <mat-divider></mat-divider>
      
      <!-- Profile Navigation Tabs -->
      <mat-tab-group #tabGroup animationDuration="0ms" class="profile-tabs">
        <mat-tab label="Posts">
          <div class="tab-content">
            <!-- Left Column - About & Photos -->
            <div class="left-column">
              <mat-card class="about-card">
                <mat-card-header>
                  <mat-card-title>About</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="about-item">
                    <mat-icon>work</mat-icon>
                    <span>Works at {{ profileUser?.workplace || 'Not specified' }}</span>
                  </div>
                  <div class="about-item">
                    <mat-icon>school</mat-icon>
                    <span>Studied at {{ profileUser?.education || 'Not specified' }}</span>
                  </div>
                  <div class="about-item">
                    <mat-icon>home</mat-icon>
                    <span>Lives in {{ profileUser?.location || 'Not specified' }}</span>
                  </div>
                  <div class="about-item">
                    <mat-icon>favorite</mat-icon>
                    <span>{{ profileUser?.relationshipStatus || 'Not specified' }}</span>
                  </div>
                  <div class="about-item">
                    <mat-icon>cake</mat-icon>
                    <span>Born on {{ profileUser?.birthday || 'Not specified' }}</span>
                  </div>
                </mat-card-content>
                <mat-card-actions *ngIf="isOwnProfile">
                  <button mat-button color="primary" (click)="openEditProfileDialog()">Edit Details</button>
                </mat-card-actions>
              </mat-card>
              
              <mat-card class="friends-card">
                <mat-card-header>
                  <mat-card-title>Friends</mat-card-title>
                  <div class="spacer"></div>
                  <button mat-button color="primary" routerLink="/dashboard/friends">See All Friends</button>
                </mat-card-header>
                <mat-card-content>
                  <div *ngIf="isLoadingFriends" class="loading-friends">
                    <mat-progress-bar mode="indeterminate"></mat-progress-bar>
                    <p>Loading friends...</p>
                  </div>
                  
                  <div *ngIf="userFriends.length === 0 && !isLoadingFriends" class="empty-friends">
                    <p>No friends to show</p>
                  </div>
                  
                  <div class="friends-grid" *ngIf="userFriends.length > 0">
                    <div class="friend-item" *ngFor="let friend of userFriends.slice(0, 9)" (click)="navigateToProfile(friend)">
                      <div class="friend-avatar" [style.background-image]="getProfileImageUrlForUser(friend)"></div>
                      <span class="friend-name">{{ friend.fullName }}</span>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
            
            <!-- Right Column - Posts -->
            <div class="right-column">
              <!-- Create Post Card (only for own profile) -->
              <mat-card class="create-post-card" *ngIf="isOwnProfile">
                <mat-card-content>
                  <div class="create-post-header">
                    <div class="user-avatar" [style.background-image]="getProfileImageUrl()"></div>
                    <mat-form-field appearance="outline" class="post-input">
                      <input matInput placeholder="What's on your mind?" [(ngModel)]="newPostContent" />
                    </mat-form-field>
                  </div>
                  <mat-divider></mat-divider>
                  <div class="create-post-actions">
                    <input type="file" #fileInput style="display: none" accept="image/*" (change)="onFileSelected($event)" />
                    <button mat-button (click)="fileInput.click()">
                      <mat-icon>photo_library</mat-icon> Photo/Video
                    </button>
                    <button mat-button>
                      <mat-icon>tag_faces</mat-icon> Feeling/Activity
                    </button>
                    <button mat-raised-button color="primary" [disabled]="!newPostContent && !selectedImage" (click)="createPost()">
                      Post
                    </button>
                  </div>
                  
                  <div *ngIf="selectedImage" class="image-preview">
                    <img [src]="selectedImagePreview" alt="Selected image" />
                    <button mat-icon-button color="warn" class="remove-image" (click)="removeSelectedImage()">
                      <mat-icon>close</mat-icon>
                    </button>
                  </div>
                  
                  <mat-progress-bar *ngIf="isPosting" mode="indeterminate"></mat-progress-bar>
                </mat-card-content>
              </mat-card>
              
              <!-- Posts List -->
              <div class="posts-list">
                <div *ngIf="isLoadingPosts" class="loading-posts">
                  <mat-progress-bar mode="indeterminate"></mat-progress-bar>
                  <p>Loading posts...</p>
                </div>
                
                <mat-card class="post-card" *ngFor="let post of userPosts">
                  <mat-card-header>
                    <div mat-card-avatar class="post-avatar" [style.background-image]="getPostUserProfileImageUrl(post)"></div>
                    <mat-card-title>{{ post.userId.fullName }}</mat-card-title>
                    <mat-card-subtitle>{{ post.createdAt | date:'medium' }}</mat-card-subtitle>
                    <div class="spacer"></div>
                    <button mat-icon-button [matMenuTriggerFor]="postMenu" *ngIf="post.userId._id === currentUser?._id">
                      <mat-icon>more_horiz</mat-icon>
                    </button>
                    <mat-menu #postMenu="matMenu">
                      <button mat-menu-item>
                        <mat-icon>edit</mat-icon> Edit Post
                      </button>
                      <button mat-menu-item (click)="deletePost(post)">
                        <mat-icon>delete</mat-icon> Delete Post
                      </button>
                    </mat-menu>
                  </mat-card-header>
                  <mat-card-content>
                    <p>{{ post.content }}</p>
                    <img *ngIf="post.imageUrl" [src]="getPostImageUrl(post)" class="post-image" alt="Post image" />
                  </mat-card-content>
                  <mat-divider></mat-divider>
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
                  </mat-card-actions>
                  
                  <!-- Comments section -->
                  <mat-card-content *ngIf="post.comments.length > 0 || showCommentInput[post._id]">
                    <mat-divider></mat-divider>
                    
                    <!-- Comment input -->
                    <div *ngIf="showCommentInput[post._id]" class="comment-input">
                      <div class="user-avatar small" [style.background-image]="getProfileImageUrl()"></div>
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
                        <div class="user-avatar small" [style.background-image]="getCommentUserProfilePicture(comment)"></div>
                        <div class="comment-content">
                          <div class="comment-bubble">
                            <span class="comment-author">{{ getCommentUserName(comment) }}</span>
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
                
                <div *ngIf="userPosts.length === 0 && !isLoadingPosts" class="empty-feed">
                  <mat-icon class="empty-icon">post_add</mat-icon>
                  <p>No posts to show.</p>
                </div>
              </div>
            </div>
          </div>
        </mat-tab>
        
        <mat-tab label="About">
          <!-- About tab content -->
          <div class="about-tab-content">
            <mat-card class="about-detail-card">
              <mat-card-header>
                <mat-card-title>Overview</mat-card-title>
                <div class="spacer"></div>
                <button mat-button color="primary" *ngIf="isOwnProfile" (click)="openEditProfileDialog()">Edit</button>
              </mat-card-header>
              <mat-card-content>
                <div class="about-detail-item">
                  <mat-icon>work</mat-icon>
                  <div class="about-detail-content">
                    <h3>Work</h3>
                    <p>{{ profileUser?.workplace || 'No workplace information' }}</p>
                    <p *ngIf="profileUser?.workplaceRole">{{ profileUser?.workplaceRole }}</p>
                    <p *ngIf="profileUser?.workplaceDuration">{{ profileUser?.workplaceDuration }}</p>
                  </div>
                </div>
                
                <div class="about-detail-item">
                  <mat-icon>school</mat-icon>
                  <div class="about-detail-content">
                    <h3>Education</h3>
                    <p>{{ profileUser?.education || 'No education information' }}</p>
                    <p *ngIf="profileUser?.educationDegree">{{ profileUser?.educationDegree }}</p>
                    <p *ngIf="profileUser?.educationDuration">{{ profileUser?.educationDuration }}</p>
                  </div>
                </div>
                
                <div class="about-detail-item">
                  <mat-icon>home</mat-icon>
                  <div class="about-detail-content">
                    <h3>Current City</h3>
                    <p>{{ profileUser?.location || 'No location information' }}</p>
                  </div>
                </div>
                
                <div class="about-detail-item">
                  <mat-icon>favorite</mat-icon>
                  <div class="about-detail-content">
                    <h3>Relationship Status</h3>
                    <p>{{ profileUser?.relationshipStatus || 'No relationship information' }}</p>
                  </div>
                </div>
                
                <div class="about-detail-item">
                  <mat-icon>cake</mat-icon>
                  <div class="about-detail-content">
                    <h3>Birthday</h3>
                    <p>{{ profileUser?.birthday || 'No birthday information' }}</p>
                  </div>
                </div>
                
                <div class="about-detail-item" *ngIf="profileUser?.phone || isOwnProfile">
                  <mat-icon>phone</mat-icon>
                  <div class="about-detail-content">
                    <h3>Phone</h3>
                    <p>{{ profileUser?.phone || 'No phone information' }}</p>
                  </div>
                </div>
                
                <div class="about-detail-item" *ngIf="profileUser?.website || isOwnProfile">
                  <mat-icon>language</mat-icon>
                  <div class="about-detail-content">
                    <h3>Website</h3>
                    <p>{{ profileUser?.website || 'No website information' }}</p>
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          </div>
        </mat-tab>
        
        <mat-tab label="Friends">
          <!-- Friends tab content -->
          <div class="friends-tab-content">
            <div class="friends-header">
              <h2>Friends</h2>
              <div class="friends-search">
                <mat-form-field appearance="outline">
                  <mat-label>Search Friends</mat-label>
                  <input matInput [(ngModel)]="friendSearchQuery" placeholder="Search by name">
                  <button *ngIf="friendSearchQuery" matSuffix mat-icon-button aria-label="Clear" (click)="friendSearchQuery=''">
                    <mat-icon>close</mat-icon>
                  </button>
                </mat-form-field>
              </div>
            </div>
            
            <div *ngIf="isLoadingFriends" class="loading-friends">
              <mat-progress-bar mode="indeterminate"></mat-progress-bar>
              <p>Loading friends...</p>
            </div>
            
            <div *ngIf="userFriends.length === 0 && !isLoadingFriends" class="empty-friends-tab">
              <mat-icon>people_outline</mat-icon>
              <p>{{ isOwnProfile ? "You don't have any friends yet" : "This user doesn't have any friends yet" }}</p>
              <button mat-raised-button color="primary" routerLink="/dashboard/friends" *ngIf="isOwnProfile">
                <mat-icon>person_add</mat-icon> Find Friends
              </button>
            </div>
            
            <div class="friends-grid-large" *ngIf="userFriends.length > 0">
              <mat-card class="friend-card" *ngFor="let friend of filteredFriends">
                <div class="friend-card-content" (click)="navigateToProfile(friend)">
                  <div class="friend-avatar-large" [style.background-image]="friend.profilePicture ? 'url(' + apiUrl + friend.profilePicture + ')' : ''"></div>
                  <h3 class="friend-name">{{ friend.fullName }}</h3>
                </div>
                <mat-card-actions *ngIf="isOwnProfile">
                  <button mat-button color="primary" (click)="sendMessageToFriend(friend)">
                    <mat-icon>message</mat-icon> Message
                  </button>
                  <button mat-button color="warn" (click)="removeFriendById(friend._id)">
                    <mat-icon>person_remove</mat-icon> Remove
                  </button>
                </mat-card-actions>
              </mat-card>
            </div>
          </div>
        </mat-tab>
        
        <mat-tab label="Photos">
          <!-- Photos tab content -->
          <div class="photos-tab-content">
            <h2>Photos</h2>
            <p>Photo gallery will be implemented in a future update.</p>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [
    `
    .profile-container {
      max-width: 1200px;
      margin: 0 auto;
      padding-bottom: 40px;
    }
    
    .cover-photo {
      height: 300px;
      background-color: #1877f2;
      background-image: linear-gradient(to bottom right, #1877f2, #3b5998);
      background-size: cover;
      background-position: center;
      border-radius: 0 0 8px 8px;
      position: relative;
      margin-bottom: 80px;
    }
    
    .cover-photo-actions {
      position: absolute;
      bottom: 16px;
      right: 16px;
    }
    
    .profile-info-container {
      display: flex;
      margin-top: -80px;
      padding: 0 16px;
      position: relative;
      z-index: 1;
    }
    
    .profile-picture-container {
      margin-right: 24px;
    }
    
    .profile-picture {
      width: 168px;
      height: 168px;
      border-radius: 50%;
      border: 4px solid white;
      background-color: #e4e6eb;
      background-size: cover;
      background-position: center;
      position: relative;
    }
    
    .edit-profile-pic-btn {
      position: absolute;
      bottom: 8px;
      right: 8px;
    }
    
    .profile-details {
      flex: 1;
      padding-top: 40px;
    }
    
    .profile-name {
      font-size: 32px;
      font-weight: 700;
      margin: 0 0 8px 0;
      color: #1c1e21;
    }
    
    .profile-bio {
      font-size: 15px;
      color: #65676b;
      margin: 0 0 16px 0;
    }
    
    .profile-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    
    .profile-tabs {
      margin-top: 16px;
    }
    
    .tab-content {
      display: flex;
      gap: 16px;
      padding: 16px;
    }
    
    .left-column {
      width: 360px;
      flex-shrink: 0;
    }
    
    .right-column {
      flex: 1;
    }
    
    .about-card, .photos-card, .friends-card, .create-post-card, .post-card {
      margin-bottom: 16px;
      border-radius: 8px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
    
    .about-item {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .about-item mat-icon {
      margin-right: 12px;
      color: #65676b;
    }
    
    .photos-grid, .friends-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    
    .photo-placeholder {
      width: 100%;
      padding-bottom: 100%;
      background-color: #e4e6eb;
      border-radius: 4px;
    }
    
    .friend-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
    }
    
    .friend-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #e4e6eb;
      background-size: cover;
      background-position: center;
      margin-bottom: 4px;
    }
    
    .friend-name {
      font-size: 12px;
      text-align: center;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .create-post-header {
      display: flex;
      align-items: center;
      margin-bottom: 12px;
    }
    
    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #e4e6eb;
      background-size: cover;
      background-position: center;
      margin-right: 12px;
      flex-shrink: 0;
    }
    
    .user-avatar.small {
      width: 32px;
      height: 32px;
    }
    
    .post-input {
      flex: 1;
    }
    
    .create-post-actions {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    
    .post-avatar {
      background-color: #e4e6eb;
      background-size: cover;
      background-position: center;
    }
    
    .spacer {
      flex: 1;
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
    
    .post-image {
      width: 100%;
      max-height: 500px;
      object-fit: contain;
      margin: 12px 0;
      border-radius: 8px;
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
    
    .empty-feed, .loading-feed, .loading-posts, .loading-friends {
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
    
    .friends-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    
    .friend-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
    }
    
    .friend-avatar {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background-color: #e4e6eb;
      background-size: cover;
      background-position: center;
      margin-bottom: 4px;
    }
    
    .friend-name {
      font-size: 12px;
      text-align: center;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .empty-friends {
      text-align: center;
      padding: 20px 0;
      color: #65676b;
    }
    
    /* Friends tab styles */
    .friends-tab-content {
      padding: 20px;
    }
    
    .friends-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    
    .friends-search {
      width: 300px;
    }
    
    .friends-grid-large {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }
    
    .friend-card {
      cursor: pointer;
    }
    
    .friend-card-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 16px;
    }
    
    .friend-avatar-large {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background-color: #e4e6eb;
      background-size: cover;
      background-position: center;
      margin-bottom: 12px;
    }
    
    .empty-friends-tab {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 0;
      color: #65676b;
    }
    
    .empty-friends-tab mat-icon {
      font-size: 64px;
      height: 64px;
      width: 64px;
      margin-bottom: 16px;
    }
    
    /* About tab styles */
    .about-tab-content {
      padding: 20px;
    }
    
    .about-detail-card {
      margin-bottom: 20px;
    }
    
    .about-detail-item {
      display: flex;
      margin-bottom: 24px;
    }
    
    .about-detail-item mat-icon {
      margin-right: 16px;
      color: #65676b;
    }
    
    .about-detail-content h3 {
      margin: 0 0 8px 0;
      font-weight: 500;
    }
    
    .about-detail-content p {
      margin: 0 0 4px 0;
      color: #65676b;
    }
    
    .spacer {
      flex: 1;
    }
    
    /* Responsive styles */
    @media (max-width: 768px) {
      .tab-content {
        flex-direction: column;
      }
      
      .left-column {
        width: 100%;
      }
      
      .profile-info-container {
        flex-direction: column;
        align-items: center;
        text-align: center;
      }
      
      .profile-picture-container {
        margin-right: 0;
        margin-bottom: 16px;
      }
      
      .profile-actions {
        justify-content: center;
      }
      
      .friends-header {
        flex-direction: column;
        gap: 16px;
      }
      
      .friends-search {
        width: 100%;
      }
    }
    `,
  ],
})
export class ProfileComponent implements OnInit {
  currentUser: User | null = null
  profileUser: User | null = null
  userPosts: Post[] = []
  userFriends: User[] = []
  newPostContent = ""
  selectedImage: File | null = null
  selectedImagePreview: string | null = null
  isPosting = false
  isLoadingPosts = true
  isLoadingFriends = true
  showCommentInput: { [key: string]: boolean } = {}
  newComments: { [key: string]: string } = {}
  apiUrl = environment.apiUrl
  isOwnProfile = true
  isFriend = false
  isPendingFriend = false
  friendSearchQuery = ""

  @ViewChild("tabGroup") tabGroup!: MatTabGroup

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private postService: PostService,
    private friendsService: FriendsService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
    public dialog: MatDialog,
    private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    // Subscribe to the currentUser$ observable
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user
      console.log("Current user:", user)

      this.route.params.subscribe((params) => {
        const userId = params["id"]
        console.log("Profile user ID from route:", userId)

        if (userId && userId !== this.currentUser?._id) {
          // Viewing someone else's profile
          this.isOwnProfile = false
          this.loadUserProfile(userId)
          this.checkFriendshipStatus(userId)
        } else {
          // Viewing own profile
          this.isOwnProfile = true
          this.profileUser = this.currentUser
          if (this.currentUser && this.currentUser._id) {
            this.loadUserPosts(this.currentUser._id.toString())
            this.loadUserFriends(this.currentUser._id.toString())
          }
        }
      })
    })
  }

  loadUserProfile(userId: string): void {
    console.log("Loading user profile for:", userId)
    this.userService.getUserById(userId).subscribe({
      next: (user) => {
        console.log("User profile loaded:", user)
        this.profileUser = user
        this.loadUserPosts(userId)
        this.loadUserFriends(userId)
      },
      error: (error) => {
        console.error("Error loading user profile:", error)
        this.snackBar.open("Error loading user profile", "Close", { duration: 3000 })
      },
    })
  }

  checkFriendshipStatus(userId: string): void {
    this.friendsService.checkFriendship(userId).subscribe({
      next: (result: { isFriend: boolean; isPending: boolean }) => {
        console.log("Friendship status:", result)
        this.isFriend = result.isFriend
        this.isPendingFriend = result.isPending
      },
      error: (error: any) => {
        console.error("Error checking friendship status:", error)
      },
    })
  }

  loadUserPosts(userId: string): void {
    this.isLoadingPosts = true
    console.log("Loading posts for user:", userId)
    this.postService.getUserPosts(userId).subscribe({
      next: (posts) => {
        console.log("Loaded user posts:", posts)
        this.userPosts = posts
        this.isLoadingPosts = false
      },
      error: (error) => {
        console.error("Error loading user posts:", error)
        this.isLoadingPosts = false
        this.snackBar.open("Error loading posts", "Close", { duration: 3000 })
      },
    })
  }

  loadUserFriends(userId: string): void {
    this.isLoadingFriends = true
    console.log("Loading friends for user:", userId)
    this.userService.getUserFriends(userId).subscribe({
      next: (friends) => {
        console.log("Loaded user friends:", friends)
        this.userFriends = friends
        this.isLoadingFriends = false
      },
      error: (error) => {
        console.error("Error loading user friends:", error)
        this.isLoadingFriends = false
        this.snackBar.open("Error loading friends", "Close", { duration: 3000 })
      },
    })
  }

  get filteredFriends(): User[] {
    if (!this.friendSearchQuery) {
      return this.userFriends
    }

    const query = this.friendSearchQuery.toLowerCase()
    return this.userFriends.filter(
      (friend) =>
        friend.fullName.toLowerCase().includes(query) ||
        friend.email.toLowerCase().includes(query) ||
        friend.username.toLowerCase().includes(query),
    )
  }

  // Fixed image URL methods
  getProfileImageUrl(): string {
    if (!this.profileUser?.profilePicture) {
      return 'url("/assets/default-avatar.png")'
    }
    return `url('${environment.baseUrl}${this.profileUser.profilePicture}')`
  }

  getCoverPhotoUrl(): string {
    if (!this.profileUser?.coverPhoto) {
      return "none"
    }
    return `url('${environment.baseUrl}${this.profileUser.coverPhoto}')`
  }

  getProfileImageUrlForUser(user: User): string {
    if (!user?.profilePicture) {
      return 'url("/assets/default-avatar.png")'
    }

    if (user.profilePicture.startsWith("http")) {
      return `url('${user.profilePicture}')`
    }

    return `url('${this.apiUrl}${user.profilePicture}')`
  }

  getPostUserProfileImageUrl(post: Post): string {
    if (!post.userId?.profilePicture) {
      return 'url("/assets/default-avatar.png")'
    }

    if (post.userId.profilePicture.startsWith("http")) {
      return `url('${post.userId.profilePicture}')`
    }

    return `url('${this.apiUrl}${post.userId.profilePicture}')`
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
        this.userPosts.unshift(post)
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

        // Log the comment structure to help debug
        console.log("Updated post comments:", updatedPost.comments)

        // Refresh the post to ensure we have the latest data with populated user info
        this.refreshPost(post._id)
      },
      error: (error) => {
        console.error("Error adding comment:", error)
        this.snackBar.open("Error adding comment", "Close", { duration: 3000 })
      },
    })
  }

  refreshPost(postId: string): void {
    this.postService.getPostById(postId).subscribe({
      next: (updatedPost) => {
        // Find and replace the post in the userPosts array
        const index = this.userPosts.findIndex((p) => p._id === postId)
        if (index !== -1) {
          this.userPosts[index] = updatedPost
        }
      },
      error: (error) => {
        console.error("Error refreshing post:", error)
      },
    })
  }

  deletePost(post: Post): void {
    if (confirm("Are you sure you want to delete this post?")) {
      this.postService.deletePost(post._id).subscribe({
        next: () => {
          this.userPosts = this.userPosts.filter((p) => p._id !== post._id)
          this.snackBar.open("Post deleted successfully", "Close", { duration: 3000 })
        },
        error: (error) => {
          console.error("Error deleting post:", error)
          this.snackBar.open("Error deleting post", "Close", { duration: 3000 })
        },
      })
    }
  }

  addFriend(): void {
    if (!this.profileUser || !this.profileUser._id) {
      this.snackBar.open("Cannot add friend: Invalid user ID", "Close", { duration: 3000 })
      return
    }

    const userId = this.profileUser._id.toString()
    this.isPendingFriend = true // Optimistic UI update

    this.friendsService.sendFriendRequest(userId).subscribe({
      next: () => {
        this.snackBar.open(`Friend request sent to ${this.profileUser?.fullName}`, "Close", { duration: 3000 })
      },
      error: (error) => {
        this.isPendingFriend = false // Revert optimistic update
        this.snackBar.open("Error sending friend request", "Close", { duration: 3000 })
        console.error("Error sending friend request:", error)
      },
    })
  }

  removeFriend(): void {
    if (!this.profileUser || !this.profileUser._id) {
      this.snackBar.open("Cannot remove friend: Invalid user ID", "Close", { duration: 3000 })
      return
    }

    const friendId = this.profileUser._id.toString()
    this.friendsService.removeFriend(friendId).subscribe({
      next: () => {
        this.isFriend = false
        this.snackBar.open(`Removed ${this.profileUser?.fullName} from friends`, "Close", { duration: 3000 })
      },
      error: (error) => {
        this.snackBar.open("Error removing friend", "Close", { duration: 3000 })
        console.error("Error removing friend:", error)
      },
    })
  }

  removeFriendById(friendId: string | undefined): void {
    if (!friendId) {
      this.snackBar.open("Cannot remove friend: Invalid user ID", "Close", { duration: 3000 })
      return
    }

    this.friendsService.removeFriend(friendId).subscribe({
      next: () => {
        this.userFriends = this.userFriends.filter((f) => f._id && f._id.toString() !== friendId)
        this.snackBar.open("Friend removed successfully", "Close", { duration: 3000 })
      },
      error: (error) => {
        this.snackBar.open("Error removing friend", "Close", { duration: 3000 })
        console.error("Error removing friend:", error)
      },
    })
  }

  sendMessage(): void {
    if (!this.profileUser) {
      this.snackBar.open("Cannot send message: Invalid user", "Close", { duration: 3000 })
      return
    }

    // Navigate to messages with this user
    this.router.navigate(["/dashboard/messages"], { queryParams: { userId: this.profileUser._id } })
  }

  sendMessageToFriend(friend: User): void {
    if (!friend || !friend._id) {
      this.snackBar.open("Cannot send message: Invalid user", "Close", { duration: 3000 })
      return
    }

    // Navigate to messages with this friend
    this.router.navigate(["/dashboard/messages"], { queryParams: { userId: friend._id } })
  }

  navigateToProfile(user: User): void {
    if (!user || !user._id) return
    this.router.navigate(["/dashboard/profile", user._id.toString()])
  }

  openEditProfileDialog(): void {
    const dialogRef = this.dialog.open(ProfileEditDialogComponent, {
      width: "600px",
      data: { user: { ...this.profileUser } }, // Adatok átadása
    })

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Frissítés a szerveren - JAVÍTVA: updateUser helyett updateProfile
        this.userService.updateProfile(result).subscribe({
          next: (updatedUser: User) => {
            // Frissítsük a helyi állapotot azonnal
            this.profileUser = updatedUser

            // Frissítsük a currentUser-t is, ha a saját profilunkat szerkesztjük
            if (this.isOwnProfile) {
              this.authService.setCurrentUser(updatedUser)
            }

            this.snackBar.open("Profile updated!", "Close", { duration: 3000 })
          },
          error: (error) => {
            console.error("Error updating profile:", error)
            this.snackBar.open("Error updating profile", "Close", { duration: 3000 })
          },
        })
      }
    })
  }

  // Módosítsd az openProfilePictureDialog metódust
  openProfilePictureDialog(): void {
    const dialogRef = this.dialog.open(ProfilePictureDialogComponent, {
      width: "500px",
      data: { userId: this.profileUser?._id },
    })

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.success) {
        // Azonnali frissítés
        this.authService.refreshUserData().subscribe((user) => {
          // Frissítsük a helyi állapotot azonnal
          this.profileUser = user

          // Frissítsük a currentUser-t is
          this.authService.setCurrentUser(user)

          // Frissítsük a profilképet megjelenítő elemeket
          if (this.profileUser && this.profileUser._id) {
            this.loadUserProfile(this.profileUser._id.toString())
          }
        })
      }
    })
  }

  openCoverPhotoDialog(): void {
    const dialogRef = this.dialog.open(CoverPhotoDialogComponent, {
      width: "600px",
      maxWidth: "90vw",
    })

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Refresh user data to show new cover photo
        if (this.isOwnProfile) {
          this.authService.refreshUserData().subscribe((user) => {
            // Frissítsük a helyi állapotot azonnal
            this.profileUser = user

            // Frissítsük a currentUser-t is
            this.authService.setCurrentUser(user)
          })
        } else if (this.profileUser && this.profileUser._id) {
          this.loadUserProfile(this.profileUser._id.toString())
        }
      }
    })
  }

  getCommentUserProfilePicture(comment: any): string {
    if (comment.userId?.profilePicture) {
      return `url(${environment.baseUrl}${comment.userId.profilePicture})`
    }
    return 'url("/assets/default-avatar.png")'
  }

  getCommentUserName(comment: any): string {
    if (comment.userId && typeof comment.userId === "object" && comment.userId.fullName) {
      return comment.userId.fullName
    } else if (comment.user && typeof comment.user === "object" && comment.user.fullName) {
      return comment.user.fullName
    } else if (comment.userName) {
      return comment.userName
    } else {
      return "Unknown User"
    }
  }
}
