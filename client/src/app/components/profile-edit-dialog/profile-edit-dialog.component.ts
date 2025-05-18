import { Component,  OnInit, Inject } from "@angular/core"
import { CommonModule } from "@angular/common"
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog"
import { MatButtonModule } from "@angular/material/button"
import { MatFormFieldModule } from "@angular/material/form-field"
import { MatInputModule } from "@angular/material/input"
import { MatSelectModule } from "@angular/material/select"
import { MatDatepickerModule } from "@angular/material/datepicker"
import { MatNativeDateModule } from "@angular/material/core"
import { MatSnackBar, MatSnackBarModule } from "@angular/material/snack-bar"
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from "@angular/forms"
import { UserService } from "../../services/user.service"
import { User } from "../../models/user"

@Component({
  selector: "app-profile-edit-dialog",
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ReactiveFormsModule,
    MatSnackBarModule,
  ],
  template: `
    <h2 mat-dialog-title>Edit Profile</h2>
    <mat-dialog-content>
      <form [formGroup]="profileForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Full Name</mat-label>
          <input matInput formControlName="fullName" placeholder="Your full name">
          <mat-error *ngIf="profileForm.get('fullName')?.hasError('required')">
            Full name is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Bio</mat-label>
          <textarea matInput formControlName="bio" placeholder="Tell us about yourself" rows="3"></textarea>
        </mat-form-field>

        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Location</mat-label>
            <input matInput formControlName="location" placeholder="Where do you live?">
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Relationship Status</mat-label>
            <mat-select formControlName="relationshipStatus">
              <mat-option value="">Not specified</mat-option>
              <mat-option value="Single">Single</mat-option>
              <mat-option value="In a relationship">In a relationship</mat-option>
              <mat-option value="Engaged">Engaged</mat-option>
              <mat-option value="Married">Married</mat-option>
              <mat-option value="It's complicated">It's complicated</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Workplace</mat-label>
            <input matInput formControlName="workplace" placeholder="Where do you work?">
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Job Title</mat-label>
            <input matInput formControlName="workplaceRole" placeholder="Your job title">
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Education</mat-label>
            <input matInput formControlName="education" placeholder="Where did you study?">
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Degree</mat-label>
            <input matInput formControlName="educationDegree" placeholder="Your degree">
          </mat-form-field>
        </div>

        <div class="form-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Birthday</mat-label>
            <input matInput [matDatepicker]="picker" formControlName="birthday" placeholder="Your birthday">
            <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Phone</mat-label>
            <input matInput formControlName="phone" placeholder="Your phone number">
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Website</mat-label>
          <input matInput formControlName="website" placeholder="Your website">
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" [disabled]="profileForm.invalid || isSubmitting" (click)="saveProfile()">
        Save Changes
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
    .full-width {
      width: 100%;
      margin-bottom: 15px;
    }
    .form-row {
      display: flex;
      gap: 15px;
      margin-bottom: 15px;
    }
    .half-width {
      width: 50%;
    }
    mat-dialog-content {
      min-width: 500px;
      max-width: 100%;
    }
    @media (max-width: 600px) {
      .form-row {
        flex-direction: column;
        gap: 0;
      }
      .half-width {
        width: 100%;
      }
      mat-dialog-content {
        min-width: auto;
      }
    }
  `,
  ],
})
export class ProfileEditDialogComponent implements OnInit {
  profileForm!: FormGroup
  isSubmitting = false
  user!: User;

  constructor(
    private fb: FormBuilder,
    private userService: UserService,
    private dialogRef: MatDialogRef<ProfileEditDialogComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: { user: User }
  ) { }

  public ngOnInit(): void {
    if (this.data?.user) {
      this.user = this.data.user
    }
    this.initForm()
  }

  initForm(): void {
    this.profileForm = this.fb.group({
      fullName: [this.user?.fullName || "", Validators.required],
      bio: [this.user?.bio || ""],
      location: [this.user?.location || ""],
      relationshipStatus: [this.user?.relationshipStatus || ""],
      workplace: [this.user?.workplace || ""],
      workplaceRole: [this.user?.workplaceRole || ""],
      education: [this.user?.education || ""],
      educationDegree: [this.user?.educationDegree || ""],
      birthday: [this.user?.birthday ? new Date(this.user.birthday) : null],
      phone: [this.user?.phone || ""],
      website: [this.user?.website || ""],
    })
  }

  saveProfile(): void {
    if (this.profileForm.invalid) return

    this.isSubmitting = true
    const formData = this.profileForm.value

    // Format the birthday if it exists
    if (formData.birthday) {
      formData.birthday = formData.birthday.toISOString().split("T")[0]
    }

    console.log("Saving profile data:", formData)

    // Only send the form data, not the entire user object
    this.userService.updateProfile(formData).subscribe({
      next: (response) => {
        console.log("Profile update response:", response)

        if (!response) {
          this.snackBar.open("Profile may have been updated but couldn't retrieve the latest data", "Close", {
            duration: 3000,
          })
          this.isSubmitting = false
          return
        }

        this.snackBar.open("Profile updated successfully", "Close", { duration: 3000 })
        this.dialogRef.close(response)
      },
      error: (error) => {
        console.error("Error updating profile:", error)
        let errorMessage = "Error updating profile"

        // Try to extract a more specific error message
        if (error.error && error.error.message) {
          errorMessage += ": " + error.error.message
        }

        this.snackBar.open(errorMessage, "Close", { duration: 5000 })
        this.isSubmitting = false
      },
    })
  }
}
