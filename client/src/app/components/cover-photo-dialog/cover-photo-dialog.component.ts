import { Component } from "@angular/core"
import { CommonModule } from "@angular/common"
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog"
import { MatButtonModule } from "@angular/material/button"
import { MatIconModule } from "@angular/material/icon"
import { MatSnackBar } from "@angular/material/snack-bar"
import { UserService } from "../../services/user.service"
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner"
import { AuthService } from "../../services/auth.service"

@Component({
  selector: "app-cover-photo-dialog",
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <h2 mat-dialog-title>Update Cover Photo</h2>
    <mat-dialog-content>
      <div class="cover-photo-upload">
        <div class="preview-container">
          <img *ngIf="previewUrl" [src]="previewUrl" alt="Cover photo preview" class="preview-image">
          <div *ngIf="!previewUrl" class="no-preview">
            <mat-icon>panorama</mat-icon>
            <p>No image selected</p>
          </div>
        </div>
        
        <div class="upload-controls">
          <input type="file" #fileInput style="display: none" accept="image/*" (change)="onFileSelected($event)">
          <button mat-raised-button color="primary" (click)="fileInput.click()">
            <mat-icon>photo_library</mat-icon> Select Image
          </button>
          <p class="upload-hint">Maximum file size: 5MB. Supported formats: JPG, PNG.</p>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="false">Cancel</button>
      <button mat-raised-button color="primary" [disabled]="!selectedFile || isUploading" (click)="uploadCoverPhoto()">
        <mat-icon *ngIf="!isUploading">cloud_upload</mat-icon>
        <mat-spinner *ngIf="isUploading" diameter="20" style="display: inline-block; margin-right: 8px;"></mat-spinner>
        <span *ngIf="!isUploading">Upload</span>
        <span *ngIf="isUploading">Uploading...</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
    .cover-photo-upload {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }
    
    .preview-container {
      width: 100%;
      height: 150px;
      overflow: hidden;
      background-color: #f0f2f5;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
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
      width: 100%;
    }
    
    .upload-hint {
      font-size: 12px;
      color: #65676b;
      margin: 0;
    }
    
    @media (min-width: 768px) {
      .preview-container {
        height: 200px;
      }
    }
  `,
  ],
})
export class CoverPhotoDialogComponent {
  selectedFile: File | null = null
  previewUrl: string | null = null
  isUploading = false

  constructor(
    private userService: UserService,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<CoverPhotoDialogComponent>,
    private authService: AuthService,
  ) {}

  onFileSelected(event: any): void {
    const file = event.target.files[0]
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.snackBar.open("File is too large. Maximum size is 5MB.", "Close", { duration: 3000 })
        return
      }

      // Check file type
      if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
        this.snackBar.open("Invalid file type. Only JPG and PNG are supported.", "Close", { duration: 3000 })
        return
      }

      this.selectedFile = file
      console.log("Selected file:", file.name, file.type, file.size)

      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        this.previewUrl = reader.result as string
      }
      reader.readAsDataURL(file)
    }
  }

  uploadCoverPhoto(): void {
    if (!this.selectedFile) {
      this.snackBar.open("Please select an image first", "Close", { duration: 3000 })
      return
    }

    this.isUploading = true
    const formData = new FormData()
    formData.append("coverPhoto", this.selectedFile)

    this.userService.uploadCoverPhoto(formData).subscribe({
      next: (response: any) => {
        console.log("Cover photo uploaded:", response)
        this.isUploading = false

        // Frissítsük az authService-ben tárolt felhasználót is
        this.authService.refreshUserData().subscribe()

        this.dialogRef.close({ success: true, coverPhoto: response.coverPhoto })
        this.snackBar.open("Cover photo updated successfully", "Close", { duration: 3000 })
      },
      error: (error: any) => {
        console.error("Error uploading cover photo:", error)
        this.isUploading = false
        this.snackBar.open("Error uploading cover photo", "Close", { duration: 3000 })
      },
    })
  }
}
