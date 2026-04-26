import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './settings.component.html',
})
export class SettingsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly activeTab = signal<'school' | 'account' | 'notifications'>('school');
  readonly saving = signal(false);
  readonly deletingAccount = signal(false);
  readonly deleteConfirmCount = signal(0);
  readonly emailNotifs = signal(true);

  readonly schoolForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    contactEmail: ['', [Validators.email]],
    timezone: ['Africa/Porto-Novo'],
  });

  ngOnInit(): void {
    this.api.get<{ name: string; contact_email?: string; timezone?: string }>('/admin/me/subscription').subscribe({
      next: () => {},
      error: () => {},
    });
    // Load school info from user
    const user = this.auth.currentUser();
    if (user?.schoolId) {
      // We don't have a GET /schools/me, so pre-fill from auth if available
    }
  }

  saveSchool(): void {
    if (this.schoolForm.invalid || this.saving()) return;
    this.saving.set(true);
    const v = this.schoolForm.getRawValue();
    this.api.put('/schools/me', { name: v.name, contactEmail: v.contactEmail, timezone: v.timezone }).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('École mise à jour.');
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error(e.error?.error ?? 'Erreur lors de la mise à jour.');
      },
    });
  }

  deleteAccount(): void {
    const count = this.deleteConfirmCount();
    if (count < 1) {
      this.deleteConfirmCount.set(1);
      this.toast.info('Cliquez à nouveau pour confirmer la suppression définitive.');
      return;
    }
    this.deletingAccount.set(true);
    this.api.delete('/auth/me').subscribe({
      next: () => {
        this.deletingAccount.set(false);
        this.auth.logout();
      },
      error: (e) => {
        this.deletingAccount.set(false);
        this.toast.error(e.error?.error ?? 'Erreur lors de la suppression.');
      },
    });
  }
}
