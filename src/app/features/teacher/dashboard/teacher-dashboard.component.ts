import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

interface TeacherSession {
  id: string;
  name: string;
  academic_year: string;
  status: string;
  school_name: string;
  teacher_status: string;
}

interface ScheduleSlot {
  session_id: string;
  session_name: string;
  school_name: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string | null;
  subject_name: string | null;
}

const DAY_ORDER: Record<string, number> = {
  Lundi: 1, Mardi: 2, Mercredi: 3, Jeudi: 4, Vendredi: 5, Samedi: 6,
};

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './teacher-dashboard.component.html',
})
export class TeacherDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly sessions = signal<TeacherSession[]>([]);
  readonly schedule = signal<ScheduleSlot[]>([]);
  readonly loading = signal(true);

  readonly days = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  ngOnInit(): void {
    this.loading.set(true);
    this.api.get<TeacherSession[]>('/teachers/my-sessions').subscribe({
      next: (sessions) => this.sessions.set(sessions),
      error: () => this.toast.error('Impossible de charger les sessions.'),
    });
    this.api.get<ScheduleSlot[]>('/teachers/my-schedule').subscribe({
      next: (slots) => {
        const sorted = [...slots].sort((a, b) =>
          (DAY_ORDER[a.day_of_week] ?? 9) - (DAY_ORDER[b.day_of_week] ?? 9) ||
          a.start_time.localeCompare(b.start_time)
        );
        this.schedule.set(sorted);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Impossible de charger l\'emploi du temps.');
      },
    });
  }

  slotsForDay(day: string): ScheduleSlot[] {
    return this.schedule().filter((s) => s.day_of_week === day);
  }
}
