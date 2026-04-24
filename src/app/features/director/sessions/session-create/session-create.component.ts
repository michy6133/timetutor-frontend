import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';

@Component({
  selector: 'app-session-create',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './session-create.component.html',
})
export class SessionCreateComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly step = signal(1);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    academicYear: ['2025-2026', Validators.required],
    deadline: [''],
    minSlotsPerTeacher: [1, [Validators.required, Validators.min(1)]],
    maxSlotsPerTeacher: [18, [Validators.required, Validators.min(1)]],
    allowContactRequest: [true],
    notifyDirectorOnSelection: [true],
  });

  nextStep(): void {
    if (this.step() < 2) this.step.set(this.step() + 1);
  }

  prevStep(): void {
    if (this.step() > 1) this.step.set(this.step() - 1);
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    this.loading.set(true);
    const v = this.form.value;
    const body = {
      name: v.name,
      academicYear: v.academicYear,
      deadline: v.deadline ? new Date(v.deadline!).toISOString() : undefined,
      rules: {
        minSlotsPerTeacher: v.minSlotsPerTeacher,
        maxSlotsPerTeacher: v.maxSlotsPerTeacher,
        allowContactRequest: v.allowContactRequest,
        notifyDirectorOnSelection: v.notifyDirectorOnSelection,
      },
    };
    this.api.post<{ id: string }>('/sessions', body).subscribe({
      next: (s) => this.router.navigate(['/director/sessions', s.id]),
      error: (e) => {
        this.error.set(e.error?.error ?? 'Erreur lors de la création');
        this.loading.set(false);
      },
    });
  }
}
