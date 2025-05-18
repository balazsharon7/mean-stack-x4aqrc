import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"
import { FormsModule } from "@angular/forms"
import { MatCardModule } from "@angular/material/card"
import { MatFormFieldModule } from "@angular/material/form-field"
import { MatInputModule } from "@angular/material/input"
import { MatButtonModule } from "@angular/material/button"
import { MatTabsModule } from "@angular/material/tabs"
import { MatIconModule } from "@angular/material/icon"
import { MatSnackBarModule, MatSnackBar } from "@angular/material/snack-bar"
import { MatProgressBarModule } from "@angular/material/progress-bar"
import { Router } from "@angular/router"
import { AuthService } from "../../services/auth.service"

@Component({
  selector: "app-login",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatTabsModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressBarModule,
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <mat-card-title>Social Connect</mat-card-title>
          <mat-card-subtitle>Connect with friends and the world around you</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <mat-tab-group>
            <mat-tab label="Login">
              <form (ngSubmit)="login()" #loginForm="ngForm" class="login-form">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Email</mat-label>
                  <input 
                    matInput 
                    type="email" 
                    name="email" 
                    [(ngModel)]="loginData.email" 
                    required 
                    email
                    placeholder="Enter your email"
                  >
                  <mat-icon matSuffix>email</mat-icon>
                </mat-form-field>
                
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Password</mat-label>
                  <input 
                    matInput 
                    [type]="hidePassword ? 'password' : 'text'" 
                    name="password" 
                    [(ngModel)]="loginData.password" 
                    required
                    placeholder="Enter your password"
                  >
                  <button 
                    type="button"
                    mat-icon-button 
                    matSuffix 
                    (click)="hidePassword = !hidePassword"
                  >
                    <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                  </button>
                </mat-form-field>
                
                <button 
                  mat-raised-button 
                  color="primary" 
                  type="submit" 
                  class="full-width login-button"
                  [disabled]="!loginForm.form.valid || isLoading"
                >
                  Login
                </button>
                
                <mat-progress-bar *ngIf="isLoading" mode="indeterminate" class="login-progress"></mat-progress-bar>
              </form>
            </mat-tab>
            
            <mat-tab label="Register">
              <form (ngSubmit)="register()" #registerForm="ngForm" class="register-form">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Full Name</mat-label>
                  <input 
                    matInput 
                    type="text" 
                    name="fullName" 
                    [(ngModel)]="registerData.fullName" 
                    required
                    placeholder="Enter your full name"
                  >
                  <mat-icon matSuffix>person</mat-icon>
                </mat-form-field>
                
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Username</mat-label>
                  <input 
                    matInput 
                    type="text" 
                    name="username" 
                    [(ngModel)]="registerData.username" 
                    required
                    placeholder="Choose a username"
                  >
                  <mat-icon matSuffix>alternate_email</mat-icon>
                </mat-form-field>
                
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Email</mat-label>
                  <input 
                    matInput 
                    type="email" 
                    name="email" 
                    [(ngModel)]="registerData.email" 
                    required 
                    email
                    placeholder="Enter your email"
                  >
                  <mat-icon matSuffix>email</mat-icon>
                </mat-form-field>
                
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Password</mat-label>
                  <input 
                    matInput 
                    [type]="hideRegisterPassword ? 'password' : 'text'" 
                    name="password" 
                    [(ngModel)]="registerData.password" 
                    required
                    placeholder="Create a password"
                    minlength="6"
                  >
                  <button 
                    type="button"
                    mat-icon-button 
                    matSuffix 
                    (click)="hideRegisterPassword = !hideRegisterPassword"
                  >
                    <mat-icon>{{hideRegisterPassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                  </button>
                </mat-form-field>
                
                <button 
                  mat-raised-button 
                  color="primary" 
                  type="submit" 
                  class="full-width register-button"
                  [disabled]="!registerForm.form.valid || isLoading"
                >
                  Register
                </button>
                
                <mat-progress-bar *ngIf="isLoading" mode="indeterminate" class="register-progress"></mat-progress-bar>
              </form>
            </mat-tab>
          </mat-tab-group>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [
    `
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: #f0f2f5;
    }
    
    .login-card {
      width: 100%;
      max-width: 450px;
      margin: 0 20px;
    }
    
    mat-card-header {
      margin-bottom: 20px;
    }
    
    mat-card-title {
      font-size: 28px;
      color: #1877f2;
      margin-bottom: 10px;
    }
    
    mat-card-subtitle {
      font-size: 16px;
    }
    
    .login-form, .register-form {
      padding: 20px 0;
    }
    
    .full-width {
      width: 100%;
      margin-bottom: 15px;
    }
    
    .login-button, .register-button {
      margin-top: 10px;
      height: 44px;
      font-size: 16px;
    }
    
    .login-progress, .register-progress {
      margin-top: 20px;
    }
    
    @media (max-width: 599px) {
      .login-card {
        margin: 0 10px;
      }
    }
    `,
  ],
})
export class LoginComponent {
  loginData = {
    email: "",
    password: "",
  }

  registerData = {
    fullName: "",
    username: "",
    email: "",
    password: "",
  }

  hidePassword = true
  hideRegisterPassword = true
  isLoading = false

  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
  ) {}

  login(): void {
    if (!this.loginData.email || !this.loginData.password) {
      this.snackBar.open("Please enter both email and password", "Close", { duration: 3000 })
      return
    }

    this.isLoading = true
    console.log("Attempting login with:", this.loginData.email)

    this.authService.login(this.loginData.email, this.loginData.password).subscribe({
      next: (response) => {
        console.log("Login successful:", response)

        // Debug: Check token storage
        setTimeout(() => {
          const token = localStorage.getItem("token")
          console.log("Token after login:", token ? "Token exists" : "No token found")
          console.log("Token value:", token)

          const user = localStorage.getItem("currentUser")
          console.log("User after login:", user ? "User exists" : "No user found")

          // Force token refresh
          if (token) {
            localStorage.setItem("token", token)
            console.log("Token refreshed in localStorage")
          }
        }, 500)

        this.isLoading = false
        this.router.navigate(["/dashboard"])
      },
      error: (error) => {
        console.error("Login error:", error)
        this.isLoading = false

        let errorMessage = "Login failed"
        if (error.error && error.error.message) {
          errorMessage = error.error.message
        } else if (error.status === 401) {
          errorMessage = "Invalid email or password"
        } else if (error.status === 0) {
          errorMessage = "Could not connect to the server"
        }

        this.snackBar.open(errorMessage, "Close", { duration: 5000 })
      },
    })
  }

  register(): void {
    if (
      !this.registerData.fullName ||
      !this.registerData.username ||
      !this.registerData.email ||
      !this.registerData.password
    ) {
      this.snackBar.open("Please fill in all fields", "Close", { duration: 3000 })
      return
    }

    this.isLoading = true
    console.log("Attempting registration with:", this.registerData.email)

    this.authService.register(this.registerData).subscribe({
      next: (response) => {
        console.log("Registration successful:", response)

        // Debug: Check token storage after registration
        setTimeout(() => {
          const token = localStorage.getItem("token")
          console.log("Token after registration:", token ? "Token exists" : "No token found")
          console.log("Token value:", token)

          const user = localStorage.getItem("currentUser")
          console.log("User after registration:", user ? "User exists" : "No user found")

          // Force token refresh
          if (token) {
            localStorage.setItem("token", token)
            console.log("Token refreshed in localStorage")
          }
        }, 500)

        this.isLoading = false
        this.snackBar.open("Registration successful! You can now log in.", "Close", { duration: 3000 })

        // Auto-login after registration
        this.loginData.email = this.registerData.email
        this.loginData.password = this.registerData.password
        this.login()
      },
      error: (error) => {
        console.error("Registration error:", error)
        this.isLoading = false

        let errorMessage = "Registration failed"
        if (error.error && error.error.message) {
          errorMessage = error.error.message
        } else if (error.status === 400) {
          errorMessage = "Email or username already in use"
        } else if (error.status === 0) {
          errorMessage = "Could not connect to the server"
        }

        this.snackBar.open(errorMessage, "Close", { duration: 5000 })
      },
    })
  }
}
