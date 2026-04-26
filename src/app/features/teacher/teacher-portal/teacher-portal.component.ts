import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import type { TeacherSession } from '../../../core/models';
import { CommonModule, DatePipe } from '@angular/common';
import { SvgIconComponent } from '../../../shared/svg-icon.component';

export interface AggregatedScheduleRow {
  slot_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string | null;
  status: string;
  session_id: string;
  session_name: string;
  academic_year: string;
  school_name: string;
  subject_name: string | null;
}

@Component({
  selector: 'app-teacher-portal',
  standalone: true,
  imports: [CommonModule, DatePipe, SvgIconComponent],
  templateUrl: './teacher-portal.component.html',
})
export class TeacherPortalComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly sessions = signal<TeacherSession[]>([]);
  readonly schedule = signal<AggregatedScheduleRow[]>([]);
  readonly loading = signal(true);
  readonly scheduleLoading = signal(true);

  private readonly dayOrder = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  ngOnInit(): void {
    this.api.get<TeacherSession[]>('/teachers/my-sessions').subscribe({
      next: (s) => {
        this.sessions.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.api.get<AggregatedScheduleRow[]>('/teachers/my-schedule').subscribe({
      next: (rows) => {
        this.schedule.set(rows);
        this.scheduleLoading.set(false);
      },
      error: () => this.scheduleLoading.set(false),
    });
  }

  scheduleDays(): string[] {
    const seen = new Set(this.schedule().map((r) => r.day_of_week));
    return this.dayOrder.filter((d) => seen.has(d));
  }

  slotsForDay(day: string): AggregatedScheduleRow[] {
    return this.schedule()
      .filter((r) => r.day_of_week === day)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));
  }

  openSession(s: TeacherSession): void {
    if (s.magicToken) {
      this.router.navigate(['/teacher', s.magicToken]);
    }
  }

  statusBadge(status: string): string {
    return { pending: 'En attente', active: 'Actif', done: 'Terminé' }[status] ?? status;
  }

  statusClass(status: string): string {
    return {
      pending: 'bg-gray-100 text-gray-600',
      active: 'bg-blue-100 text-blue-700',
      done: 'bg-green-100 text-green-700',
    }[status] ?? 'bg-gray-100 text-gray-600';
  }

  sessionStatusBadge(status: string): string {
    return { draft: 'Brouillon', open: 'Ouvert', closed: 'Fermé', published: 'Publié' }[status] ?? status;
  }

  sessionStatusClass(status: string): string {
    return {
      draft: 'bg-gray-100 text-gray-500',
      open: 'bg-green-100 text-green-700',
      closed: 'bg-yellow-100 text-yellow-700',
      published: 'bg-blue-100 text-blue-700',
    }[status] ?? 'bg-gray-100 text-gray-500';
  }

  groupedBySchool(): Array<{ schoolName: string; sessions: TeacherSession[] }> {
    const grouped = new Map<string, TeacherSession[]>();
    for (const session of this.sessions()) {
      const key = session.schoolName || 'École non renseignée';
      const list = grouped.get(key) ?? [];
      list.push(session);
      grouped.set(key, list);
    }
    return Array.from(grouped.entries())
      .map(([schoolName, sessions]) => ({ schoolName, sessions }))
      .sort((a, b) => a.schoolName.localeCompare(b.schoolName));
  }
}
