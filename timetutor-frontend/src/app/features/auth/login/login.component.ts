import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly loading = signal(false);
  readonly error = signal('');

  readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    const { email, password } = this.form.value;
    this.auth.login(email!, password!).subscribe({
      next: (res) => {
        const role = res.user?.role ?? this.auth.currentUser()?.role;
        if (role === 'teacher') this.router.navigate(['/teacher/portal']);
        else if (role === 'super_admin') this.router.navigate(['/admin']);
        else this.router.navigate(['/director/dashboard']);
      },
      error: (e) => {
        this.error.set(e.error?.error ?? 'Erreur de connexion');
        this.loading.set(false);
      },
    });
  }
}
