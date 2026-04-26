import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

interface SchoolClassRow {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  is_system_template: boolean;
}

@Component({
  selector: 'app-school-classes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './school-classes.component.html',
})
export class SchoolClassesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);

  readonly classes = signal<SchoolClassRow[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(120)]],
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.get<SchoolClassRow[]>('/school-classes?includeInactive=1').subscribe({
      next: (rows) => {
        this.classes.set(
          rows.sort((a, b) =>
            a.sort_order !== b.sort_order ? a.sort_order - b.sort_order : a.name.localeCompare(b.name)
          )
        );
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Impossible de charger les classes.');
      },
    });
  }

  toggleActive(row: SchoolClassRow): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.api.patch(`/school-classes/${row.id}`, { isActive: !row.is_active }).subscribe({
      next: () => {
        this.classes.update((list) => list.map((c) => (c.id === row.id ? { ...c, is_active: !c.is_active } : c)));
        this.saving.set(false);
        this.toast.success(row.is_active ? 'Classe masquée pour les nouvelles sessions.' : 'Classe réactivée.');
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error(e.error?.error ?? 'Erreur');
      },
    });
  }

  addClass(): void {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    const name = this.form.get('name')?.value?.trim() ?? '';
    this.api.post<{ id: string }>('/school-classes', { name }).subscribe({
      next: () => {
        this.form.reset({ name: '' });
        this.saving.set(false);
        this.toast.success('Classe ajoutée.');
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error(e.error?.error ?? 'Erreur');
      },
    });
  }

  remove(row: SchoolClassRow): void {
    if (row.is_system_template) {
      this.toast.info('Les classes du référentiel se désactivent, elles ne se suppriment pas.');
      return;
    }
    if (!confirm(`Supprimer la classe « ${row.name} » ?`)) return;
    if (this.saving()) return;
    this.saving.set(true);
    this.api.delete(`/school-classes/${row.id}`).subscribe({
      next: () => {
        this.saving.set(false);
        this.toast.success('Classe supprimée.');
        this.load();
      },
      error: (e) => {
        this.saving.set(false);
        this.toast.error(e.error?.error ?? 'Erreur');
      },
    });
  }
}
