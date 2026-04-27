import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { SvgIconComponent } from '../../../shared/svg-icon.component';

interface RosterTeacher {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  createdAt: string;
}

@Component({
  selector: 'app-roster',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, SvgIconComponent],
  templateUrl: './roster.component.html',
})
export class RosterComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly teachers = signal<RosterTeacher[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly importing = signal(false);
  readonly showAddForm = signal(false);
  readonly showConflictGuide = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly search = signal('');

  readonly addForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
  });

  readonly editForm = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    phone: [''],
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.api.get<RosterTeacher[]>('/schools/roster').subscribe({
      next: (t) => { this.teachers.set(t); this.loading.set(false); },
      error: () => { this.loading.set(false); this.toast.error('Impossible de charger le répertoire.'); },
    });
  }

  filtered(): RosterTeacher[] {
    const q = this.search().toLowerCase().trim();
    if (!q) return this.teachers();
    return this.teachers().filter(t =>
      t.fullName.toLowerCase().includes(q) || t.email.toLowerCase().includes(q) || (t.phone ?? '').includes(q)
    );
  }

  addTeacher(): void {
    if (this.addForm.invalid || this.saving()) return;
    this.saving.set(true);
    const v = this.addForm.value;
    this.api.post<RosterTeacher>('/schools/roster', { fullName: v.fullName, email: v.email, phone: v.phone || null }).subscribe({
      next: (t) => {
        this.teachers.update(list => [...list, t]);
        this.addForm.reset();
        this.showAddForm.set(false);
        this.saving.set(false);
        this.toast.success('Enseignant ajouté au répertoire.');
      },
      error: (e) => { this.saving.set(false); this.toast.error(e.error?.error ?? 'Erreur ajout.'); },
    });
  }

  openEdit(t: RosterTeacher): void {
    this.editingId.set(t.id);
    this.editForm.reset({ fullName: t.fullName, email: t.email, phone: t.phone ?? '' });
  }

  saveEdit(): void {
    const id = this.editingId();
    if (!id || this.editForm.invalid || this.saving()) return;
    this.saving.set(true);
    const v = this.editForm.value;
    this.api.put(`/schools/roster/${id}`, { fullName: v.fullName, email: v.email, phone: v.phone || null }).subscribe({
      next: () => {
        this.teachers.update(list => list.map(t => t.id === id
          ? { ...t, fullName: v.fullName!, email: v.email!, phone: v.phone || null }
          : t
        ));
        this.editingId.set(null);
        this.saving.set(false);
        this.toast.success('Enseignant mis à jour.');
      },
      error: (e) => { this.saving.set(false); this.toast.error(e.error?.error ?? 'Erreur mise à jour.'); },
    });
  }

  deleteTeacher(id: string): void {
    if (this.deletingId()) return;
    this.deletingId.set(id);
    this.api.delete(`/schools/roster/${id}`).subscribe({
      next: () => {
        this.teachers.update(list => list.filter(t => t.id !== id));
        this.deletingId.set(null);
        this.toast.success('Enseignant supprimé du répertoire.');
      },
      error: (e) => { this.deletingId.set(null); this.toast.error(e.error?.error ?? 'Erreur suppression.'); },
    });
  }

  importCsv(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.importing.set(true);
    const form = new FormData();
    form.append('file', file);
    this.api.post<{ imported: number }>('/schools/roster/import', form).subscribe({
      next: (r) => {
        this.importing.set(false);
        this.toast.success(`${r.imported} enseignant(s) importé(s).`);
        this.load();
      },
      error: (e) => { this.importing.set(false); this.toast.error(e.error?.error ?? 'Erreur import CSV.'); },
    });
    (event.target as HTMLInputElement).value = '';
  }

  initials(name: string): string {
    const parts = name.trim().split(' ');
    return (parts[0]?.[0] ?? '') + (parts[parts.length - 1]?.[0] ?? '');
  }
}
