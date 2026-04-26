import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly error = signal('');

  readonly form = this.fb.group({
    schoolName: ['', [Validators.required, Validators.minLength(2)]],
    schoolSlug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    gdprAccepted: [false, Validators.requiredTrue],
  });

  autoSlug(): void {
    const name = this.form.get('schoolName')?.value ?? '';
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    this.form.get('schoolSlug')?.setValue(slug);
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    const v = this.form.value;
    this.auth.register({
      schoolName: v.schoolName!,
      schoolSlug: v.schoolSlug!,
      fullName: v.fullName!,
      email: v.email!,
      password: v.password!,
      gdprAccepted: true,
    }).subscribe({
      next: () => {
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        this.router.navigateByUrl(returnUrl || '/director/dashboard');
      },
      error: (e) => {
        this.error.set(e.error?.error ?? 'Erreur lors de l\'inscription');
        this.loading.set(false);
      },
    });
  }
}
