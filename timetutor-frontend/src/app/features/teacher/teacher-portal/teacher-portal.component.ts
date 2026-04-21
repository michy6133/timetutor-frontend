import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import type { TeacherSession } from '../../../core/models';
import { CommonModule, DatePipe } from '@angular/common';

@Component({
  selector: 'app-teacher-portal',
  standalone: true,
  imports: [CommonModule, DatePipe],
  templateUrl: './teacher-portal.component.html',
})
export class TeacherPortalComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly sessions = signal<TeacherSession[]>([]);
  readonly loading = signal(true);

  ngOnInit(): void {
    this.api.get<TeacherSession[]>('/teachers/my-sessions').subscribe({
      next: (s) => { this.sessions.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
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
}
