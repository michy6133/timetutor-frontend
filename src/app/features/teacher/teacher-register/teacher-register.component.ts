import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-teacher-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './teacher-register.component.html',
})
export class TeacherRegisterComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly error = signal('');

  readonly form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    const v = this.form.value;
    this.auth.registerTeacher({
      fullName: v.fullName!,
      email: v.email!,
      password: v.password!,
    }).subscribe({
      next: () => this.router.navigate(['/teacher/portal']),
      error: (e) => {
        this.error.set(e.error?.error ?? 'Erreur lors de l\'inscription');
        this.loading.set(false);
      },
    });
  }
}
