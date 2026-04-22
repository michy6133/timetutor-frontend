import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import type { Session, Notification } from '../../../core/models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink,CommonModule],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly sessions = signal<Session[]>([]);
  readonly notifications = signal<Notification[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.api.get<Session[]>('/sessions').subscribe({
      next: (s) => { this.sessions.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.api.get<Notification[]>('/admin/notifications').subscribe({
      next: (n) => this.notifications.set(n.slice(0, 5)),
    });
  }

  get activeSessions(): number {
    return this.sessions().filter(s => s.status === 'open').length;
  }

  get totalSlots(): number {
    return this.sessions().reduce((a, s) => a + (s.totalSlots ?? 0), 0);
  }

  get totalTeachers(): number {
    return this.sessions().reduce((a, s) => a + (s.totalTeachers ?? 0), 0);
  }

  statusClass(status: string): string {
    return {
      draft: 'bg-gray-100 text-gray-600',
      open: 'bg-green-100 text-green-700',
      closed: 'bg-yellow-100 text-yellow-700',
      published: 'bg-blue-100 text-blue-700',
    }[status] ?? 'bg-gray-100 text-gray-600';
  }

  statusLabel(status: string): string {
    return { draft: 'Brouillon', open: 'Ouvert', closed: 'Fermé', published: 'Publié' }[status] ?? status;
  }

  coverage(s: Session): number {
    if (!s.totalSlots) return 0;
    return Math.round(100 * (s.takenSlots ?? 0) / s.totalSlots);
  }

  unreadCount(): number {
    return this.notifications().filter(n => !n.isRead).length;
  }
}
