import { Component, OnInit } from "@angular/core"
import { CommonModule } from "@angular/common"
import { MatCardModule } from "@angular/material/card"
import { MatButtonModule } from "@angular/material/button"
import { MatIconModule } from "@angular/material/icon"
import { MatToolbarModule } from "@angular/material/toolbar"
import { MatSidenavModule } from "@angular/material/sidenav"
import { MatListModule } from "@angular/material/list"
import { MatInputModule } from "@angular/material/input"
import { MatFormFieldModule } from "@angular/material/form-field"
import { MatMenuModule } from "@angular/material/menu"
import { FormsModule } from "@angular/forms"
import { Router, RouterModule, RouterOutlet } from "@angular/router"
import { AuthService } from "../../services/auth.service"
import { User } from "../../models/user"

@Component({
  selector: "app-dashboard",
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatInputModule,
    MatFormFieldModule,
    MatMenuModule,
    FormsModule,
    RouterOutlet,
    RouterModule,
  ],
  template: `
    <div class="dashboard-container">
      <mat-toolbar color="primary">
        <button mat-icon-button (click)="sidenav.toggle()">
          <mat-icon>menu</mat-icon>
        </button>
        <span>Social Connect</span>
        <span class="spacer"></span>
        <button mat-icon-button>
          <mat-icon>notifications</mat-icon>
        </button>
        <button mat-icon-button [matMenuTriggerFor]="userMenuTrigger">
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #userMenuTrigger="matMenu">
          <button mat-menu-item routerLink="/dashboard/profile">
            <mat-icon>account_circle</mat-icon>
            <span>Profile</span>
          </button>
          <button mat-menu-item>
            <mat-icon>settings</mat-icon>
            <span>Settings</span>
          </button>
          <button mat-menu-item (click)="logout()">
            <mat-icon>exit_to_app</mat-icon>
            <span>Logout</span>
          </button>
        </mat-menu>
      </mat-toolbar>

      <mat-sidenav-container class="sidenav-container">
        <mat-sidenav #sidenav mode="side" opened class="sidenav">
          <mat-nav-list>
            <a mat-list-item 
               routerLink="/dashboard/home" 
               routerLinkActive="active-link"
               [routerLinkActiveOptions]="{exact: true}">
              <mat-icon matListItemIcon>home</mat-icon>
              <span matListItemTitle>Home</span>
            </a>
            <a mat-list-item routerLink="/dashboard/profile" routerLinkActive="active-link">
              <mat-icon matListItemIcon>person</mat-icon>
              <span matListItemTitle>Profile</span>
            </a>
            <a mat-list-item routerLink="/dashboard/messages" routerLinkActive="active-link">
              <mat-icon matListItemIcon>message</mat-icon>
              <span matListItemTitle>Messages</span>
            </a>
            <a mat-list-item 
               routerLink="/dashboard/friends" 
               routerLinkActive="active-link">
              <mat-icon matListItemIcon>people</mat-icon>
              <span matListItemTitle>Friends</span>
            </a>
            <a mat-list-item (click)="logout()">
              <mat-icon matListItemIcon>exit_to_app</mat-icon>
              <span matListItemTitle>Logout</span>
            </a>
          </mat-nav-list>
        </mat-sidenav>

        <mat-sidenav-content class="content">
          <router-outlet></router-outlet>
        </mat-sidenav-content>
      </mat-sidenav-container>
    </div>
  `,
  styles: [
    `
    .dashboard-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
    }
    
    .spacer {
      flex: 1 1 auto;
    }
    
    .sidenav-container {
      flex: 1;
    }
    
    .sidenav {
      width: 250px;
    }
    
    .content {
      background-color: #f5f5f5;
    }
    
    .content-container {
      max-width: 800px;
      margin: 20px auto;
      padding: 0 20px;
    }
    
    .post-card {
      margin-bottom: 20px;
    }
    
    .user-avatar {
      background-image: url('/assets/default-avatar.png');
      background-size: cover;
    }
    
    .full-width {
      width: 100%;
    }
    
    .feed-container {
      margin-top: 20px;
    }

    .active-link {
      background-color: rgba(0, 0, 0, 0.04);
      color: #3f51b5;
    }
  `,
  ],
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null
  newPostContent = ""

  constructor(
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Subscribe to the currentUser$ observable instead of calling it as a function
    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user
    })
  }

  logout(): void {
    this.authService.logout()
    this.router.navigate(["/login"])
  }
}
