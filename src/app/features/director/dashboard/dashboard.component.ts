import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import type { Session, Notification } from '../../../core/models';
import { CommonModule } from '@angular/common';
import { SvgIconComponent } from '../../../shared/svg-icon.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, CommonModule, SvgIconComponent],
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);

  readonly sessions = signal<Session[]>([]);
  readonly notifications = signal<Notification[]>([]);
  readonly subscription = signal<any | null>(null);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.api.get<Session[]>('/sessions').subscribe({
      next: (s) => { this.sessions.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.api.get<Notification[]>('/admin/notifications').subscribe({
      next: (n) => this.notifications.set(n.slice(0, 5)),
    });
    this.api.get<any>('/admin/me/subscription').subscribe({
      next: (sub) => this.subscription.set(sub),
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
      draft: 'bg-steel/60 text-navy/50',
      open: 'bg-emerald/15 text-emerald',
      closed: 'bg-jasmine/25 text-navy/70',
      published: 'bg-navy/12 text-navy/75',
    }[status] ?? 'bg-steel/60 text-navy/50';
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
