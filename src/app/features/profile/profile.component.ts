import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
})
export class ProfileComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly saving = signal(false);
  readonly savingPwd = signal(false);

  readonly profileForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: [{ value: '', disabled: true }],
    phone: [''],
  });

  readonly passwordForm = this.fb.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user) {
      this.profileForm.patchValue({
        fullName: user.fullName,
        email: user.email,
      });
    }
    // Load fresh from API to get phone
    this.api.get<{ fullName: string; email: string; phone?: string }>('/auth/me').subscribe({
      next: (u) => this.profileForm.patchValue({ fullName: u.fullName, email: u.email, phone: u.phone ?? '' }),
      error: () => {},
    });
  }

  saveProfile(): void {
    if (this.profileForm.invalid || this.saving()) return;
    this.saving.set(true);
    const { fullName, phone } = this.profileForm.getRawValue();
    this.api.put('/auth/me', { fullName, phone }).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Profil mis à jour.');
        this.auth.loadCurrentUser().subscribe();
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error(e.error?.error ?? 'Erreur lors de la mise à jour.');
      },
    });
  }

  changePassword(): void {
    if (this.passwordForm.invalid || this.savingPwd()) return;
    this.savingPwd.set(true);
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.api.post('/auth/change-password', { currentPassword, newPassword }).subscribe({
      next: () => {
        this.savingPwd.set(false);
        this.passwordForm.reset();
        this.toast.success('Mot de passe mis à jour.');
      },
      error: (e) => {
        this.savingPwd.set(false);
        this.toast.error(e.error?.error ?? 'Erreur lors du changement de mot de passe.');
      },
    });
  }
}
