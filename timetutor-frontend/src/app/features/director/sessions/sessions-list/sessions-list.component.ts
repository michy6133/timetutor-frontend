import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import type { Session } from '../../../../core/models';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-sessions-list',
  standalone: true,
  imports: [RouterLink,CommonModule],
  templateUrl: './sessions-list.component.html',
})
export class SessionsListComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly sessions = signal<Session[]>([]);
  readonly loading = signal(true);
  readonly filter = signal<string>('all');

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
    return { draft: 'bg-gray-100 text-gray-600', open: 'bg-green-100 text-green-700', closed: 'bg-yellow-100 text-yellow-700', published: 'bg-blue-100 text-blue-700' }[status] ?? '';
  }

  coveragePct(s: Session): number {
    if (!s.totalSlots) return 0;
    return Math.round(100 * (s.takenSlots ?? 0) / s.totalSlots);
  }
}
