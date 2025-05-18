import { Component,  OnInit, ViewChild,  ElementRef,  OnDestroy } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { MatCardModule } from "@angular/material/card"
import { MatButtonModule } from "@angular/material/button"
import { MatIconModule } from "@angular/material/icon"
import { MatInputModule } from "@angular/material/input"
import { MatFormFieldModule } from "@angular/material/form-field"
import { MatDividerModule } from "@angular/material/divider"
import { MatListModule } from "@angular/material/list"
import { MatBadgeModule } from "@angular/material/badge"
import { MatMenuModule } from "@angular/material/menu"
import { MatTooltipModule } from "@angular/material/tooltip"
import {  MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar"
import { RouterModule, ActivatedRoute, Router } from "@angular/router"
import { AuthService } from "../../services/auth.service"
import { MessageService } from "../../services/message.service"
import { FriendsService } from "../../services/friends.service"
import { UserService } from "../../services/user.service"
import { User } from "../../models/user"
import { Conversation, Message } from "../../models/message"
import { environment } from "../../environment"
import { Subscription, interval } from "rxjs"
import { takeWhile } from "rxjs/operators"

@Component({
  selector: "app-messages",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatDividerModule,
    MatListModule,
    MatBadgeModule,
    MatMenuModule,
    MatTooltipModule,
    MatSnackBarModule,
    RouterModule,
  ],
  template: `
    <div class="messages-container">
      <!-- Conversations List -->
      <div class="conversations-panel">
        <div class="conversations-header">
          <h2>Chats</h2>
          <div class="conversations-actions">
            <button mat-icon-button matTooltip="New Message" (click)="openNewMessageDialog()">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button [matMenuTriggerFor]="optionsMenu" matTooltip="Options">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #optionsMenu="matMenu">
              <button mat-menu-item>
                <mat-icon>settings</mat-icon>
                <span>Message Settings</span>
              </button>
              <button mat-menu-item>
                <mat-icon>archive</mat-icon>
                <span>Archived Chats</span>
              </button>
              <button mat-menu-item>
                <mat-icon>block</mat-icon>
                <span>Blocked Users</span>
              </button>
            </mat-menu>
          </div>
        </div>
        
        <div class="search-container">
          <mat-form-field appearance="outline" class="search-field">
            <mat-icon matPrefix>search</mat-icon>
            <input matInput placeholder="Search messages" [(ngModel)]="searchQuery" (input)="filterConversations()">
            <button *ngIf="searchQuery" matSuffix mat-icon-button aria-label="Clear" (click)="clearSearch()">
              <mat-icon>close</mat-icon>
            </button>
          </mat-form-field>
        </div>
        
        <div class="conversations-list">
          <div 
            *ngFor="let conversation of filteredConversations" 
            class="conversation-item" 
            [class.active]="selectedConversation?._id === conversation._id"
            (click)="selectConversation(conversation)">
            <div class="avatar-container">
              <div 
                class="user-avatar" 
                [style.background-image]="getProfileImageUrl(conversation.user?.profilePicture)"
                [matBadge]="conversation.unreadCount || null" 
                matBadgeColor="primary"
                matBadgeSize="small"
                [matBadgeHidden]="!conversation.unreadCount">
              </div>
              <div class="online-indicator" *ngIf="conversation.user?.isOnline"></div>
            </div>
            <div class="conversation-info">
              <div class="conversation-header">
                <span class="user-name">{{ conversation.user?.fullName || conversation.user?.username || 'Unknown User' }}</span>
                <span class="timestamp">{{ conversation.lastMessage?.timestamp | date:'shortTime' }}</span>
              </div>
              <div class="last-message" [class.unread]="conversation.unreadCount">
                <span class="message-preview">{{ getMessagePreview(conversation.lastMessage) }}</span>
              </div>
            </div>
          </div>
          
          <div *ngIf="filteredConversations.length === 0 && !isLoading" class="empty-state">
            <mat-icon>search_off</mat-icon>
            <p *ngIf="searchQuery">No conversations found</p>
            <p *ngIf="!searchQuery">No conversations yet</p>
            <button *ngIf="!searchQuery" mat-raised-button color="primary" (click)="openNewMessageDialog()">
              <mat-icon>edit</mat-icon>
              Start a conversation
            </button>
          </div>

          <div *ngIf="isLoading" class="loading-state">
            <mat-icon>sync</mat-icon>
            <p>Loading conversations...</p>
          </div>
        </div>
      </div>
      
      <!-- Chat Window -->
      <div class="chat-panel" *ngIf="selectedConversation; else selectConversationPrompt">
        <div class="chat-header">
          <div class="user-info">
            <div 
              class="user-avatar" 
              [style.background-image]="getProfileImageUrl(selectedConversation.user?.profilePicture)">
            </div>
            <div class="user-details">
              <span class="user-name">{{ selectedConversation.user?.fullName || selectedConversation.user?.username || 'Unknown User' }}</span>
              <span class="user-status" *ngIf="selectedConversation.user?.isOnline">Active Now</span>
              <span class="user-status" *ngIf="!selectedConversation.user?.isOnline">
                Last active {{ selectedConversation.user?.lastActive | date:'shortTime' }}
              </span>
            </div>
          </div>
          <div class="chat-actions">
            <button mat-icon-button matTooltip="View Profile" 
                    [routerLink]="['/dashboard/profile', getPartnerId(selectedConversation)]">
              <mat-icon>person</mat-icon>
            </button>
            <button mat-icon-button [matMenuTriggerFor]="chatMenu" matTooltip="More Options">
              <mat-icon>more_vert</mat-icon>
            </button>
            <mat-menu #chatMenu="matMenu">
              <button mat-menu-item (click)="deleteConversation()">
                <mat-icon>delete</mat-icon>
                <span>Delete Conversation</span>
              </button>
            </mat-menu>
          </div>
        </div>
        
        <div class="messages-container" #messagesContainer>
          <div class="messages-list">
            <div *ngIf="!selectedConversation.messages || selectedConversation.messages.length === 0" class="empty-messages">
              <p>No messages yet. Start the conversation!</p>
            </div>
            
            <!-- Enhanced message list section -->
            <ng-container *ngIf="selectedConversation.messages && selectedConversation.messages.length > 0">
              <div class="message-date-divider">
                <span>{{ selectedConversation.messages[0].timestamp | date:'mediumDate' }}</span>
              </div>
              
              <div *ngFor="let message of selectedConversation.messages; let i = index; let isLast = last" 
                   class="message-group">
                
                <!-- Date divider if the date changes -->
                <div *ngIf="i > 0 && shouldShowDateDivider(selectedConversation.messages[i-1], message)" class="message-date-divider">
                  <span>{{ message.timestamp | date:'mediumDate' }}</span>
                </div>
                
                <!-- Message with sender avatar for received messages -->
                <div class="message-wrapper" [class.own-message-wrapper]="message.senderId === currentUser?._id">
                  <!-- Avatar for received messages -->
                  <div *ngIf="message.senderId !== currentUser?._id" class="message-avatar">
                    <div class="user-avatar-small" 
                         [style.background-image]="getProfileImageUrl(selectedConversation.user?.profilePicture)">
                    </div>
                  </div>
                  
                  <div class="message-bubble-container">
                    <div class="message-bubble" 
                         [class.own-message]="message.senderId?.toString() === currentUser?._id?.toString()">
                      <div class="message-content">
                        {{ message.content }}
                      </div>
                      <div class="message-footer">
                        <span class="message-time">{{ message.timestamp | date:'shortTime' }}</span>
                        <mat-icon *ngIf="message.senderId === currentUser?._id" class="read-status">
                          {{ message.isRead ? 'done_all' : 'done' }}
                        </mat-icon>
                      </div>
                    </div>
                    
                    <button 
                      mat-icon-button 
                      class="message-action" 
                      [matMenuTriggerFor]="messageMenu" 
                      (click)="$event.stopPropagation()">
                      <mat-icon>more_vert</mat-icon>
                    </button>
                    <mat-menu #messageMenu="matMenu">
                      <button mat-menu-item (click)="deleteMessage(message)">
                        <mat-icon>delete</mat-icon>
                        <span>Delete</span>
                      </button>
                    </mat-menu>
                  </div>
                  
                  <!-- Placeholder for own messages to maintain alignment -->
                  <div *ngIf="message.senderId === currentUser?._id" class="message-avatar-placeholder"></div>
                </div>
                
                <!-- Show typing indicator after the last message if user is typing -->
                <div *ngIf="isLast && selectedConversation.isTyping" class="typing-indicator-container">
                  <div class="message-avatar">
                    <div class="user-avatar-small" 
                         [style.background-image]="getProfileImageUrl(selectedConversation.user?.profilePicture)">
                    </div>
                  </div>
                  <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            </ng-container>
          </div>
        </div>
        
        <div class="message-input-container">
          <button mat-icon-button matTooltip="Add Files">
            <mat-icon>add_circle</mat-icon>
          </button>
          <button mat-icon-button matTooltip="Photo/Video">
            <mat-icon>photo</mat-icon>
          </button>
          <button mat-icon-button matTooltip="Emoji">
            <mat-icon>emoji_emotions</mat-icon>
          </button>
          
          <mat-form-field appearance="outline" class="message-input">
            <input 
              matInput 
              placeholder="Aa" 
              [(ngModel)]="newMessage" 
              (keyup.enter)="sendMessage()"
              (input)="onTyping()">
          </mat-form-field>
          
          <button 
            mat-icon-button 
            color="primary" 
            [disabled]="!newMessage.trim()" 
            (click)="sendMessage()"
            matTooltip="Send">
            <mat-icon>send</mat-icon>
          </button>
        </div>
      </div>
      
      <!-- Empty state when no conversation is selected -->
      <ng-template #selectConversationPrompt>
        <div class="empty-chat-panel">
          <div class="empty-chat-content">
            <mat-icon class="large-icon">chat</mat-icon>
            <h2>Your Messages</h2>
            <p>Send private messages to a friend</p>
            <button mat-raised-button color="primary" (click)="openNewMessageDialog()">
              <mat-icon>edit</mat-icon>
              New Message
            </button>
          </div>
        </div>
      </ng-template>
    </div>

    <!-- New Message Dialog -->
    <div *ngIf="showNewMessageDialog" class="new-message-dialog">
      <div class="dialog-content">
        <div class="dialog-header">
          <h2>New Message</h2>
          <button mat-icon-button (click)="closeNewMessageDialog()">
            <mat-icon>close</mat-icon>
          </button>
        </div>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Search friends</mat-label>
          <input matInput [(ngModel)]="friendSearchQuery" (input)="filterFriends()" placeholder="Search by name or username">
          <button *ngIf="friendSearchQuery" matSuffix mat-icon-button aria-label="Clear" (click)="clearFriendSearch()">
            <mat-icon>close</mat-icon>
          </button>
        </mat-form-field>
        
        <div class="friends-list">
          <div *ngIf="isLoadingFriends" class="loading-state">
            <mat-icon>sync</mat-icon>
            <p>Loading friends...</p>
          </div>
          
          <div *ngIf="!isLoadingFriends && filteredFriends.length === 0" class="empty-state">
            <mat-icon>people_outline</mat-icon>
            <p>No friends found</p>
            <button mat-raised-button color="primary" routerLink="/dashboard/friends">
              <mat-icon>person_add</mat-icon>
              Add Friends
            </button>
          </div>
          
          <div 
            *ngFor="let friend of filteredFriends" 
            class="friend-item"
            (click)="startConversation(friend)">
            <div 
              class="user-avatar" 
              [style.background-image]="getProfileImageUrl(friend.profilePicture)">
            </div>
            <div class="friend-info">
              <span class="friend-name">{{ friend.fullName }}</span>
              <span class="friend-username">&#64;{{ friend.username || 'no_username' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
    .messages-container {
      display: flex;
      height: calc(100vh - 64px);
      background-color: #f0f2f5;
    }
    
    /* Conversations Panel Styles */
    .conversations-panel {
      width: 360px;
      border-right: 1px solid #dddfe2;
      display: flex;
      flex-direction: column;
      background-color: white;
    }
    
    .conversations-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #dddfe2;
    }
    
    .conversations-header h2 {
      margin: 0;
      font-size: 24px;
      font-weight: bold;
    }
    
    .conversations-actions {
      display: flex;
      gap: 8px;
    }
    
    .search-container {
      padding: 8px 16px;
      border-bottom: 1px solid #dddfe2;
    }
    
    .search-field {
      width: 100%;
    }
    
    .conversations-list {
      flex: 1;
      overflow-y: auto;
      padding: 8px 0;
    }
    
    .conversation-item {
      display: flex;
      padding: 8px 16px;
      cursor: pointer;
      border-radius: 8px;
      margin: 0 8px 4px 8px;
    }
    
    .conversation-item:hover {
      background-color: #f0f2f5;
    }
    
    .conversation-item.active {
      background-color: #e7f3ff;
    }
    
    .avatar-container {
      position: relative;
      margin-right: 12px;
    }
    
    .user-avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background-color: #e4e6eb;
      background-size: cover;
      background-position: center;
      background-image: url('/assets/default-avatar.png');
    }
    
    .online-indicator {
      position: absolute;
      bottom: 2px;
      right: 2px;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background-color: #31a24c;
      border: 2px solid white;
    }
    
    .conversation-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    
    .conversation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    
    .user-name {
      font-weight: 500;
      font-size: 15px;
    }
    
    .timestamp {
      font-size: 12px;
      color: #65676b;
    }
    
    .last-message {
      font-size: 13px;
      color: #65676b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .last-message.unread {
      color: #050505;
      font-weight: 500;
    }
    
    .message-preview {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .empty-state, .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px 0;
      color: #65676b;
    }
    
    .empty-state mat-icon, .loading-state mat-icon {
      font-size: 48px;
      height: 48px;
      width: 48px;
      margin-bottom: 16px;
    }
    
    .loading-state mat-icon {
      animation: spin 2s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    /* Chat Panel Styles */
    .chat-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      background-color: white;
    }
    
    .chat-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      border-bottom: 1px solid #dddfe2;
    }
    
    .user-info {
      display: flex;
      align-items: center;
    }
    
    .user-details {
      display: flex;
      flex-direction: column;
      margin-left: 12px;
    }
    
    .user-status {
      font-size: 12px;
      color: #65676b;
    }
    
    .chat-actions {
      display: flex;
      gap: 8px;
    }
    
    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      background-color: #f0f2f5;
    }
    
    .messages-list {
      display: flex;
      flex-direction: column;
    }
    
    .empty-messages {
      display: flex;
      justify-content: center;
      padding: 40px 0;
      color: #65676b;
    }
    
    .message-date-divider {
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 16px 0;
      color: #65676b;
      font-size: 12px;
      position: relative;
    }
    
    .message-date-divider span {
      background-color: #f0f2f5;
      padding: 0 8px;
      position: relative;
      z-index: 1;
    }
    
    .message-date-divider::before {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      height: 1px;
      background-color: #dddfe2;
    }
    
    /* Enhanced Message Styling */
    .message-group {
      margin-bottom: 8px;
    }
    
    .message-wrapper {
      display: flex;
      align-items: flex-end;
      margin-bottom: 2px;
      width: 100%;
    }

    .own-message-wrapper {
      flex-direction: row-reverse;
    }
    
    .message-avatar {
      margin: 0 8px;
      flex-shrink: 0;
    }
    
    .message-avatar-placeholder {
      width: 28px;
      margin: 0 8px;
      flex-shrink: 0;
    }
    
    .user-avatar-small {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background-color: #e4e6eb;
      background-size: cover;
      background-position: center;
      background-image: url('/assets/default-avatar.png');
    }
    
    .message-bubble-container {
      display: flex;
      align-items: center;
      max-width: 65%;
    }
    
    .message-bubble {
      padding: 8px 12px;
      border-radius: 18px 18px 18px 4px;
      background-color: #e4e6eb; /* Gray color for received messages */
      position: relative;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
    
    .message-bubble.own-message {
      background-color: #0084ff; /* Blue color for sent messages */
      color: white;
      border-radius: 18px 18px 4px 18px;
    }
    
    .message-content {
      font-size: 15px;
      line-height: 1.4;
      word-wrap: break-word;
    }
    
    .message-footer {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      margin-top: 4px;
    }
    
    .message-time {
      font-size: 11px;
      opacity: 0.7;
      margin-right: 4px;
    }
    
    .read-status {
      font-size: 14px;
      height: 14px;
      width: 14px;
      opacity: 0.7;
    }
    
    .message-action {
      opacity: 0;
      transition: opacity 0.2s;
      margin: 0 4px;
      width: 24px;
      height: 24px;
      line-height: 24px;
    }
    
    .message-bubble-container:hover .message-action {
      opacity: 0.7;
    }
    
    .typing-indicator-container {
      display: flex;
      align-items: flex-end;
      margin-top: 8px;
    }
    
    .typing-indicator {
      display: flex;
      align-items: center;
      background-color: #e4e6eb;
      padding: 8px 12px;
      border-radius: 18px 18px 18px 4px;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
    
    .typing-indicator span {
      height: 8px;
      width: 8px;
      margin: 0 1px;
      background-color: #65676b;
      border-radius: 50%;
      display: inline-block;
      animation: typing 1.4s infinite both;
    }
    
    .typing-indicator span:nth-child(2) {
      animation-delay: 0.2s;
    }
    
    .typing-indicator span:nth-child(3) {
      animation-delay: 0.4s;
    }
    
    @keyframes typing {
      0% {
        transform: translateY(0px);
      }
      28% {
        transform: translateY(-6px);
      }
      44% {
        transform: translateY(0px);
      }
    }
    
    .message-input-container {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      border-top: 1px solid #dddfe2;
    }
    
    .message-input {
      flex: 1;
      margin: 0 8px;
    }
    
    .empty-chat-panel {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: white;
    }
    
    .empty-chat-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      max-width: 320px;
    }
    
    .large-icon {
      font-size: 64px;
      height: 64px;
      width: 64px;
      color: #0084ff;
      margin-bottom: 16px;
    }
    
    .empty-chat-content h2 {
      font-size: 24px;
      margin-bottom: 8px;
    }
    
    .empty-chat-content p {
      color: #65676b;
      margin-bottom: 24px;
    }
    
    /* New Message Dialog */
    .new-message-dialog {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }
    
    .dialog-content {
      background-color: white;
      border-radius: 8px;
      width: 400px;
      max-width: 90%;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }
    
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px;
      border-bottom: 1px solid #dddfe2;
    }
    
    .dialog-header h2 {
      margin: 0;
      font-size: 20px;
    }
    
    .full-width {
      width: 100%;
      padding: 0 16px;
    }
    
    .friends-list {
      overflow-y: auto;
      max-height: 400px;
      padding: 0 0 16px 0;
    }
    
    .friend-item {
      display: flex;
      align-items: center;
      padding: 8px 16px;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    
    .friend-item:hover {
      background-color: #f0f2f5;
    }
    
    .friend-info {
      margin-left: 12px;
      display: flex;
      flex-direction: column;
    }
    
    .friend-name {
      font-weight: 500;
    }
    
    .friend-username {
      font-size: 12px;
      color: #65676b;
    }
  `,
  ],
})
export class MessagesComponent implements OnInit, OnDestroy {
  @ViewChild("messagesContainer") private messagesContainer!: ElementRef

  currentUser: User | null = null
  conversations: Conversation[] = []
  filteredConversations: Conversation[] = []
  selectedConversation: Conversation | null = null
  searchQuery = ""
  newMessage = ""
  typingTimeout: any
  apiUrl = environment.apiUrl
  isLoading = true

  // New message dialog
  showNewMessageDialog = false
  friendSearchQuery = ""
  friends: User[] = []
  filteredFriends: User[] = []
  isLoadingFriends = false

  // Subscriptions
  private subscriptions: Subscription[] = []
  private pollingSubscription?: Subscription

  constructor(
    private authService: AuthService,
    private messageService: MessageService,
    private friendsService: FriendsService,
    private userService: UserService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  ngOnInit(): void {
    // Get current user
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user
      console.log("Current user loaded:", user)
    })

    // Subscribe to conversations
    this.subscriptions.push(
      this.messageService.conversations$.subscribe((conversations) => {
        this.conversations = conversations
        this.filterConversations()
        this.isLoading = false
        console.log("Conversations loaded:", conversations)
      }),
    )

    // Load conversations
    this.loadConversations()

    // Check for userId in route params to open a specific conversation
    this.subscriptions.push(
      this.route.queryParams.subscribe((params) => {
        if (params["userId"]) {
          console.log("Opening conversation with user:", params["userId"])
          this.openConversationWithUser(params["userId"])
        }
      }),
    )

    // Set up polling for new messages
    this.startPolling()
  }

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach((sub) => sub.unsubscribe())

    if (this.pollingSubscription) {
      this.pollingSubscription.unsubscribe()
    }

    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout)
    }
  }

  startPolling(): void {
    // Poll for new messages every 10 seconds
    this.pollingSubscription = interval(10000)
      .pipe(takeWhile(() => this.authService.isLoggedIn))
      .subscribe(() => {
        console.log("Refreshing conversations...")
        this.messageService.refreshConversations()
      })
  }

  loadConversations(): void {
    this.isLoading = true
    this.messageService.getConversations().subscribe({
      next: (conversations) => {
        console.log("Conversations loaded:", conversations)
        this.isLoading = false
      },
      error: (error) => {
        console.error("Error loading conversations:", error)
        this.isLoading = false
        this.snackBar.open("Error loading conversations", "Close", { duration: 3000 })
      },
    })
  }

  openConversationWithUser(userId: string): void {
    this.messageService.getConversationWithUser(userId).subscribe({
      next: (conversation) => {
        console.log("Conversation opened:", conversation)
        // Check if conversation exists in our list
        const existingConversation = this.conversations.find((c) => c._id === conversation._id)

        if (!existingConversation) {
          // Add to conversations list if not already there
          this.conversations = [conversation, ...this.conversations]
          this.filterConversations()
        }

        this.selectConversation(conversation)
      },
      error: (error) => {
        console.error("Error opening conversation:", error)

        // If conversation doesn't exist, create a new one
        this.userService.getUserById(userId).subscribe({
          next: (user: User) => {
            this.createNewConversation(user)
          },
          error: (userError: any) => {
            console.error("Error getting user:", userError)
            this.snackBar.open("Error opening conversation", "Close", { duration: 3000 })
          },
        })
      },
    })
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

  filterConversations(): void {
    if (!this.searchQuery.trim()) {
      this.filteredConversations = [...this.conversations]
      return
    }

    const query = this.searchQuery.toLowerCase()
    this.filteredConversations = this.conversations.filter(
      (conversation) =>
        conversation.user?.fullName?.toLowerCase().includes(query) ||
        (conversation.lastMessage?.content?.toLowerCase().includes(query) ?? false),
    )
  }

  clearSearch(): void {
    this.searchQuery = ""
    this.filterConversations()
  }

  selectConversation(conversation: Conversation): void {
    console.log("Selecting conversation:", conversation)

    // Ensure the conversation has a valid user object
    if (!conversation.user || !conversation.user.fullName) {
      // Try to find the other participant
      if (conversation.participants && conversation.participants.length > 0) {
        const otherParticipant = conversation.participants.find(
          (p) => p._id?.toString() !== this.currentUser?._id?.toString(),
        )
        if (otherParticipant) {
          conversation.user = {
            _id: otherParticipant._id || "",
            fullName: otherParticipant.fullName || otherParticipant.username || "Unknown User",
            username: otherParticipant.username || "unknown",
            profilePicture: otherParticipant.profilePicture,
          }
          console.log("Set user from participant:", conversation.user)
        }
      }
    }

    this.selectedConversation = conversation

    // Make a copy to avoid modifying the original reference
    this.selectedConversation = { ...conversation }

    // Ensure the conversation has a valid user object
    if (!this.selectedConversation.user || !this.selectedConversation.user.fullName) {
      // Try to find the other participant
      if (this.selectedConversation.participants && this.selectedConversation.participants.length > 0) {
        const otherParticipant = this.selectedConversation.participants.find(
          (p) => p._id?.toString() !== this.currentUser?._id?.toString(),
        )

        if (otherParticipant) {
          this.selectedConversation.user = otherParticipant
          console.log("Set conversation user from participants:", otherParticipant)
        }
      }
    }

    // Ha a beszélgetésnek nincs betöltött üzenete, vagy újra kell tölteni őket
    if (!this.selectedConversation.messages || this.selectedConversation.messages.length === 0) {
      if (this.selectedConversation._id) {
        console.log("Loading messages for conversation:", this.selectedConversation._id)
        this.messageService.getMessages(this.selectedConversation._id).subscribe({
          next: (messages) => {
            console.log("Messages loaded:", messages)
            if (this.selectedConversation && this.selectedConversation._id === conversation._id) {
              // Biztosítsuk, hogy a senderId megfelelő formátumban legyen
              this.selectedConversation.messages = messages.map((msg) => {
                // Konvertáljuk a senderId-t string-gé a biztonságos összehasonlításhoz
                return {
                  ...msg,
                  senderId: msg.senderId?.toString() || msg.senderId?.toString(),
                }
              })

              console.log("Current user ID:", this.currentUser?._id?.toString())
              console.log(
                "Processed messages with senderIds:",
                this.selectedConversation.messages.map((m) => m.senderId),
              )

              // Scroll to bottom after messages are loaded
              setTimeout(() => {
                this.scrollToBottom()
              }, 100)
            }
          },
          error: (error) => {
            console.error("Error loading messages:", error)
            this.snackBar.open("Error loading messages", "Close", { duration: 3000 })
          },
        })
      }
    }

    // Mark messages as read when selecting a conversation
    if (
      this.selectedConversation.unreadCount &&
      this.selectedConversation.unreadCount > 0 &&
      this.selectedConversation._id
    ) {
      this.messageService.markConversationAsRead(this.selectedConversation._id).subscribe({
        error: (error) => {
          console.error("Error marking conversation as read:", error)
        },
      })
    }

    // Scroll to bottom of messages
    setTimeout(() => {
      this.scrollToBottom()
    }, 100)
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedConversation || !this.currentUser) return

    console.log("Sending message:", this.newMessage)
    const message: Partial<Message> = {
      conversationId: this.selectedConversation._id,
      senderId: this.currentUser._id?.toString() || "",
      receiverId: this.selectedConversation.user?._id?.toString() || "",
      content: this.newMessage.trim(),
      timestamp: new Date(),
      isRead: false,
    }

    // Add message to UI immediately for better UX
    if (this.selectedConversation && this.selectedConversation.messages) {
      this.selectedConversation.messages.push(message as Message)
    } else if (this.selectedConversation) {
      this.selectedConversation.messages = [message as Message]
    }

    // Clear input field
    this.newMessage = ""

    // Scroll to bottom
    setTimeout(() => {
      this.scrollToBottom()
    }, 100)

    // Send message to server
    this.messageService.sendMessage(message).subscribe({
      next: (response) => {
        console.log("Message sent successfully:", response)

        // Update the message in the UI with the server response
        if (this.selectedConversation && this.selectedConversation.messages) {
          const index = this.selectedConversation.messages.findIndex((m) => m.content === message.content && !m._id)
          if (index !== -1) {
            // Ensure we preserve the senderId when updating the message
            const currentUserId = this.currentUser?._id?.toString() || ""
            this.selectedConversation.messages[index] = {
              ...response,
              senderId: currentUserId, // Explicitly set the senderId to ensure it matches the current user
            }

            // Log to verify the sender ID is correct
            console.log("Updated message with sender ID:", this.selectedConversation.messages[index].senderId)
            console.log("Current user ID:", currentUserId)
          }
        }
      },
      error: (error) => {
        console.error("Error sending message:", error)
        this.snackBar.open("Error sending message", "Close", { duration: 3000 })

        // Remove the message from UI if sending failed
        if (this.selectedConversation && this.selectedConversation.messages) {
          this.selectedConversation.messages = this.selectedConversation.messages.filter((m) => m._id || m !== message)
        }
      },
    })
  }

  getMessagePreview(message?: any): string {
    if (!message) return "No messages yet"

    // If current user sent the message, prefix with "You: "
    const prefix = message.senderId === this.currentUser?._id ? "You: " : ""
    return prefix + message.content
  }

  deleteMessage(message: Message): void {
    if (!message || !message._id || !this.selectedConversation) return

    this.messageService.deleteMessage(message._id).subscribe({
      next: () => {
        // Filter out the deleted message
        if (this.selectedConversation?.messages) {
          this.selectedConversation.messages = this.selectedConversation.messages.filter((m) => m._id !== message._id)

          // Update user data if needed
          if (!this.selectedConversation.user) {
            const otherParticipant = this.selectedConversation.participants?.find(
              (p) => p._id?.toString() !== this.currentUser?._id?.toString(),
            )
            if (otherParticipant) {
              this.selectedConversation.user = otherParticipant
            }
          }
        }
        this.snackBar.open("Message deleted", "Close", { duration: 3000 })
      },
      error: (error) => {
        console.error("Error deleting message:", error)
        this.snackBar.open("Error deleting message", "Close", { duration: 3000 })
      },
    })
  }

  deleteConversation(): void {
    if (!this.selectedConversation || !this.selectedConversation._id) return

    if (confirm("Are you sure you want to delete this conversation?")) {
      this.messageService.deleteConversation(this.selectedConversation._id).subscribe({
        next: () => {
          console.log("Conversation deleted successfully")
          // Remove the conversation from the list
          this.conversations = this.conversations.filter((c) => c._id !== this.selectedConversation?._id)
          this.filterConversations()
          this.selectedConversation = null
          this.snackBar.open("Conversation deleted", "Close", { duration: 3000 })
        },
        error: (error) => {
          console.error("Error deleting conversation:", error)
          this.snackBar.open("Error deleting conversation", "Close", { duration: 3000 })
        },
      })
    }
  }

  shouldShowDateDivider(prevMessage: Message, currentMessage: Message): boolean {
    if (!prevMessage || !currentMessage) return false

    // Fix the Date handling by ensuring timestamp is not undefined
    if (!prevMessage.timestamp || !currentMessage.timestamp) return false

    const prevDate = new Date(prevMessage.timestamp)
    const currentDate = new Date(currentMessage.timestamp)

    return prevDate.toDateString() !== currentDate.toDateString()
  }

  onTyping(): void {
    if (!this.selectedConversation || !this.currentUser) return

    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout)
    }

    // Notify server that user is typing
    if (this.selectedConversation._id) {
      this.messageService.sendTypingStatus(this.selectedConversation._id, true)

      // Set timeout to stop typing indicator after 2 seconds of inactivity
      this.typingTimeout = setTimeout(() => {
        if (this.selectedConversation?._id) {
          this.messageService.sendTypingStatus(this.selectedConversation._id, false)
        }
      }, 2000)
    }
  }

  openNewMessageDialog(): void {
    this.showNewMessageDialog = true
    this.isLoadingFriends = true

    // Check if user is logged in
    if (!this.authService.isLoggedIn) {
      this.snackBar.open("Please log in first", "Close", { duration: 3000 })
      return
    }

    this.friendsService.getFriends().subscribe({
      next: (friends) => {
        console.log("Friends loaded:", friends)
        this.friends = friends
        this.filteredFriends = [...friends]
        this.isLoadingFriends = false
        this.filterFriends()
      },
      error: (error) => {
        console.error("Error loading friends:", error)
        this.isLoadingFriends = false
        this.snackBar.open(error.error?.message || "Error loading friends", "Close", { duration: 3000 })
      },
    })
  }

  filterFriends(): void {
    if (!this.friendSearchQuery.trim()) {
      this.filteredFriends = [...this.friends]
      return
    }

    const query = this.friendSearchQuery.toLowerCase()
    this.filteredFriends = this.friends.filter(
      (friend) =>
        friend.fullName?.toLowerCase().includes(query) ||
        friend.username?.toLowerCase().includes(query) ||
        friend.email?.toLowerCase().includes(query),
    )
  }

  startConversation(friend: User): void {
    if (!friend || !friend._id) {
      this.snackBar.open("Cannot start conversation: Invalid user", "Close", { duration: 3000 })
      return
    }

    console.log("Starting conversation with friend:", friend)
    this.closeNewMessageDialog()
    this.isLoading = true

    // Check if conversation already exists
    const existingConversation = this.conversations.find((c) => c.user?._id?.toString() === friend._id?.toString())

    if (existingConversation) {
      console.log("Conversation already exists, selecting it:", existingConversation)
      this.selectConversation(existingConversation)
      this.isLoading = false
      return
    }

    // Create new conversation with better error handling
    this.messageService.createConversation(friend._id.toString()).subscribe({
      next: (conversation) => {
        console.log("Conversation created successfully:", conversation)

        // Make sure the user object is properly set in the conversation
        if (!conversation.user && friend) {
          conversation.user = friend
        }

        // Add the new conversation to the top of the list
        this.conversations = [conversation, ...this.conversations]
        this.filterConversations()
        this.selectConversation(conversation)
        this.isLoading = false
      },
      error: (error) => {
        console.error("Error creating conversation:", error)
        this.snackBar.open(`Error starting conversation: ${error.error?.message || "Unknown error"}`, "Close", {
          duration: 5000,
        })
        this.isLoading = false
      },
    })
  }

  closeNewMessageDialog(): void {
    this.showNewMessageDialog = false
    this.friendSearchQuery = ""
    this.filteredFriends = []
  }

  createNewConversation(user: User): void {
    if (!user || !user._id) {
      this.snackBar.open("Cannot start conversation: Invalid user", "Close", { duration: 3000 })
      return
    }

    console.log("Creating new conversation with user:", user)
    this.messageService.createConversation(user._id.toString()).subscribe({
      next: (conversation) => {
        console.log("Conversation created successfully:", conversation)
        this.selectConversation(conversation)
      },
      error: (error) => {
        console.error("Error creating conversation:", error)
        this.snackBar.open("Error starting conversation", "Close", { duration: 3000 })
      },
    })
  }

  clearFriendSearch(): void {
    this.friendSearchQuery = ""
    this.filterFriends()
  }

  getPartnerName(conversation: Conversation | null): string {
    if (!conversation) return "Unknown User"

    // First try to get name from the user object
    if (conversation.user?.fullName) {
      return conversation.user.fullName
    }

    // If no user object or no fullName, try to find the other participant
    if (conversation.participants && conversation.participants.length > 0) {
      const otherParticipant = conversation.participants.find(
        (p) => p._id?.toString() !== this.currentUser?._id?.toString(),
      )

      if (otherParticipant) {
        return otherParticipant.fullName || otherParticipant.username || "Unknown User"
      }
    }

    return "Unknown User"
  }

  getPartnerId(conversation: Conversation | null): string {
    if (!conversation) return ""

    // First try to get ID from the user object
    if (conversation.user?._id) {
      return conversation.user._id.toString()
    }

    // If no user object, try to find the other participant
    if (conversation.participants && conversation.participants.length > 0) {
      const otherParticipant = conversation.participants.find(
        (p) => p._id?.toString() !== this.currentUser?._id?.toString(),
      )

      if (otherParticipant && otherParticipant._id) {
        return otherParticipant._id.toString()
      }
    }

    return ""
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer && this.messagesContainer.nativeElement) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight
      }
    } catch (err) {
      console.error("Error scrolling to bottom:", err)
    }
  }
}
