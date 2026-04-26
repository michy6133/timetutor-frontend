import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import type { Session } from '../../../../core/models';
import { CommonModule } from '@angular/common';
import { SvgIconComponent } from '../../../../shared/svg-icon.component';

interface SchoolTeacher {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: 'pending' | 'active' | 'done';
  invitation_sent_at: string | null;
  session_id: string;
  session_name: string;
  academic_year: string;
  session_status: string;
  slots_selected: number;
}

@Component({
  selector: 'app-sessions-list',
  standalone: true,
  imports: [RouterLink, CommonModule, SvgIconComponent],
  templateUrl: './sessions-list.component.html',
})
export class SessionsListComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly sessions = signal<Session[]>([]);
  readonly loading = signal(true);
  readonly filter = signal<string>('all');

  readonly teacherQuery = signal('');
  readonly teacherResults = signal<SchoolTeacher[]>([]);
  readonly searchingTeachers = signal(false);
  readonly searchPerformed = signal(false);

  readonly invitingSessionId = signal<string>('');

  readonly totalTeachers = computed(() =>
    this.sessions().reduce((acc, s) => acc + (s.totalTeachers ?? 0), 0)
  );
  readonly totalSlots = computed(() =>
    this.sessions().reduce((acc, s) => acc + (s.totalSlots ?? 0), 0)
  );
  readonly openSessions = computed(() =>
    this.sessions().filter(s => s.status === 'open').length
  );

  ngOnInit(): void {
    this.api.get<Session[]>('/sessions').subscribe({
      next: (s) => { this.sessions.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  filtered(): Session[] {
    if (this.filter() === 'all') return this.sessions();
    return this.sessions().filter(s => s.status === this.filter());
  }

  statusClass(status: string): string {
    return {
      draft: 'badge-draft',
      open: 'badge-open',
      closed: 'badge-closed',
      published: 'badge-published',
    }[status] ?? '';
  }

  statusLabel(status: string): string {
    return { draft: 'Brouillon', open: 'Ouvert', closed: 'Fermé', published: 'Publié' }[status] ?? status;
  }

  coveragePct(s: Session): number {
    if (!s.totalSlots) return 0;
    return Math.round(100 * (s.takenSlots ?? 0) / s.totalSlots);
  }

  searchTeachers(): void {
    const q = this.teacherQuery().trim();
    this.searchingTeachers.set(true);
    this.searchPerformed.set(true);
    this.api.get<SchoolTeacher[]>(`/teachers/search?q=${encodeURIComponent(q)}`).subscribe({
      next: (rows) => {
        this.teacherResults.set(rows);
        this.searchingTeachers.set(false);
      },
      error: () => {
        this.teacherResults.set([]);
        this.searchingTeachers.set(false);
      },
    });
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.searchTeachers();
    }
  }

  clearSearch(): void {
    this.teacherQuery.set('');
    this.teacherResults.set([]);
    this.searchPerformed.set(false);
  }

  inviteAll(sessionId: string, event?: Event): void {
    event?.stopPropagation();
    event?.preventDefault();
    if (this.invitingSessionId()) return;
    this.invitingSessionId.set(sessionId);
    this.api.post<{ invited: number; failed: number; total: number }>(
      `/sessions/${sessionId}/teachers/invite-all`, {}
    ).subscribe({
      next: (res) => {
        this.invitingSessionId.set('');
        this.toast.success(`Invitations envoyées : ${res.invited}/${res.total}${res.failed ? ` (échecs : ${res.failed})` : ''}`);
        this.api.get<Session[]>('/sessions').subscribe(s => this.sessions.set(s));
      },
      error: (e) => {
        this.invitingSessionId.set('');
        this.toast.error(e.error?.error ?? "Erreur d'invitation groupée");
      },
    });
  }

  isInvitingSession(sessionId: string): boolean {
    return this.invitingSessionId() === sessionId;
  }

  teacherStatusLabel(status: string): string {
    return { pending: 'En attente', active: 'Actif', done: 'Terminé' }[status] ?? status;
  }

  teacherStatusClass(status: string): string {
    return {
      pending: 'badge-pending',
      active: 'badge-active',
      done: 'badge-done',
    }[status] ?? '';
  }
}
