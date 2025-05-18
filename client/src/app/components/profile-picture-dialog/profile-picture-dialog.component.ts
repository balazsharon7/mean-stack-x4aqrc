import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"
import { MatDialogModule, MatDialog, MatDialogRef } from "@angular/material/dialog"
import { MatButtonModule } from "@angular/material/button"
import { MatIconModule } from "@angular/material/icon"
import { MatSnackBar } from "@angular/material/snack-bar"
import { UserService } from "../../services/user.service"
import { AuthService } from "../../services/auth.service"

@Component({
  selector: "app-profile-picture-dialog",
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Update Profile Picture</h2>
    <mat-dialog-content>
      <div class="profile-picture-upload">
        <div class="preview-container">
          <img *ngIf="previewUrl" [src]="previewUrl" alt="Profile picture preview" class="preview-image">
          <div *ngIf="!previewUrl" class="no-preview">
            <mat-icon>account_circle</mat-icon>
            <p>No image selected</p>
          </div>
        </div>
        
        <div class="upload-controls">
          <input type="file" #fileInput style="display: none" accept="image/*" (change)="onFileSelected($event)">
          <button mat-raised-button color="primary" (click)="fileInput.click()">
            <mat-icon>photo_library</mat-icon> Select Image
          </button>
          <p class="upload-hint">Maximum file size: 2MB. Supported formats: JPG, PNG.</p>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [disabled]="!selectedFile || isUploading" (click)="uploadProfilePicture()">
        <mat-icon *ngIf="isUploading">sync</mat-icon>
        <span *ngIf="!isUploading">Upload</span>
        <span *ngIf="isUploading">Uploading...</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
    .profile-picture-upload {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }
    
    .preview-container {
      width: 200px;
      height: 200px;
      border-radius: 50%;
      overflow: hidden;
      background-color: #f0f2f5;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .preview-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .no-preview {
      display: flex;
      flex-direction: column;
      align-items: center;
      color: #65676b;
    }
    
    .no-preview mat-icon {
      font-size: 64px;
      height: 64px;
      width: 64px;
      margin-bottom: 8px;
    }
    
    .upload-controls {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    
    .upload-hint {
      font-size: 12px;
      color: #65676b;
      margin: 0;
    }
    
    @media (min-width: 768px) {
      .profile-picture-upload {
        flex-direction: row;
        align-items: flex-start;
      }
      
      .upload-controls {
        align-items: flex-start;
      }
    }
  `,
  ],
})
export class ProfilePictureDialogComponent {
  selectedFile: File | null = null
  previewUrl: string | null = null
  isUploading = false

  constructor(
    private userService: UserService,
    private snackBar: MatSnackBar,
    public dialog: MatDialog,
    private authService: AuthService,
    public dialogRef: MatDialogRef<ProfilePictureDialogComponent>,
  ) {}

  onFileSelected(event: any): void {
    const file = event.target.files[0]
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        this.snackBar.open("File is too large. Maximum size is 2MB.", "Close", { duration: 3000 })
        return
      }

      // Check file type
      if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
        this.snackBar.open("Invalid file type. Only JPG and PNG are supported.", "Close", { duration: 3000 })
        return
      }

      this.selectedFile = file

      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        this.previewUrl = reader.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  uploadProfilePicture(): void {
    if (!this.selectedFile) {
      this.snackBar.open("Please select an image first", "Close", { duration: 3000 })
      return
    }

    this.isUploading = true
    const formData = new FormData()
    formData.append("profilePicture", this.selectedFile)

    this.userService.uploadProfilePicture(formData).subscribe({
      next: (response: any) => {
        console.log("Profile picture uploaded:", response)
        this.isUploading = false

        // Frissítsük az authService-ben tárolt felhasználót is
        this.authService.refreshUserData().subscribe()

        this.dialogRef.close({ success: true, profilePicture: response.profilePicture })
        this.snackBar.open("Profile picture updated successfully", "Close", { duration: 3000 })
      },
      error: (error: any) => {
        console.error("Error uploading profile picture:", error)
        this.isUploading = false
        this.snackBar.open("Error uploading profile picture", "Close", { duration: 3000 })
      },
    })
  }
}
