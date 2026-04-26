import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import type { Subject } from '../../../core/models';

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './subjects.component.html',
})
export class SubjectsComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly subjects = signal<Subject[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly editingId = signal<string | null>(null);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    color: ['#2563ff', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
  });

  readonly editForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    color: ['#2563ff', [Validators.required, Validators.pattern(/^#[0-9A-Fa-f]{6}$/)]],
  });

  ngOnInit(): void {
    this.loadSubjects();
  }

  loadSubjects(): void {
    this.loading.set(true);
    this.api.get<Subject[]>('/subjects').subscribe({
      next: (subjects) => {
        this.subjects.set(subjects);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Impossible de charger les matières.');
      },
    });
  }

  createSubject(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.api.post<Subject>('/subjects', this.form.value).subscribe({
      next: (subject) => {
        this.subjects.update((list) => [...list, subject].sort((a, b) => a.name.localeCompare(b.name)));
        this.form.reset({ name: '', color: '#2563ff' });
        this.saving.set(false);
        this.toast.success('Matière ajoutée.');
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error(e.error?.error ?? 'Erreur lors de la création.');
      },
    });
  }

  startEdit(subject: Subject): void {
    this.editingId.set(subject.id);
    this.editForm.reset({ name: subject.name, color: subject.color });
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  saveEdit(): void {
    const id = this.editingId();
    if (!id || this.editForm.invalid || this.saving()) return;
    this.saving.set(true);
    this.api.put<Subject>(`/subjects/${id}`, this.editForm.value).subscribe({
      next: (updated) => {
        this.subjects.update((list) =>
          list.map((item) => (item.id === id ? updated : item)).sort((a, b) => a.name.localeCompare(b.name))
        );
        this.editingId.set(null);
        this.saving.set(false);
        this.toast.success('Matière mise à jour.');
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error(e.error?.error ?? 'Erreur de mise à jour.');
      },
    });
  }

  deleteSubject(subjectId: string): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.api.delete(`/subjects/${subjectId}`).subscribe({
      next: () => {
        this.subjects.update((list) => list.filter((subject) => subject.id !== subjectId));
        this.saving.set(false);
        this.toast.success('Matière supprimée.');
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error(e.error?.error ?? 'Suppression impossible.');
      },
    });
  }
}
