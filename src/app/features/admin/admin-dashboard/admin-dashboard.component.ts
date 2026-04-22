import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

interface AdminStats { activeSchools: number; openSessions: number; totalTeachers: number; validatedSlots: number; }
interface SchoolRow { id: string; name: string; subscription_plan: string; is_active: boolean; directors_count: number; sessions_count: number; }
interface PlanRow { code: string; display_name: string; }

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly auth = inject(AuthService);
  readonly stats = signal<AdminStats | null>(null);
  readonly schools = signal<SchoolRow[]>([]);
  readonly plans = signal<PlanRow[]>([]);
  readonly togglingId = signal('');

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.api.get<AdminStats>('/admin/stats').subscribe(s => this.stats.set(s));
    this.api.get<SchoolRow[]>('/admin/schools').subscribe(s => this.schools.set(s));
    this.api.get<PlanRow[]>('/admin/plans').subscribe(p => this.plans.set(p));
  }

  toggleSchool(school: SchoolRow): void {
    if (this.togglingId()) return;
    this.togglingId.set(school.id);
    this.api.put<{ isActive: boolean }>(`/admin/schools/${school.id}/toggle`, {}).subscribe({
      next: (r) => {
        this.schools.update(list => list.map(s => s.id === school.id ? { ...s, is_active: r.isActive } : s));
        this.togglingId.set('');
        this.loadData();
      },
      error: () => this.togglingId.set(''),
    });
  }

  planClass(plan: string): string {
    return {
      trial: 'bg-gray-100 text-gray-600',
      starter: 'bg-blue-100 text-blue-700',
      pro: 'bg-purple-100 text-purple-700',
      enterprise: 'bg-amber-100 text-amber-700',
    }[plan] ?? 'bg-gray-100 text-gray-600';
  }

  updateSubscription(schoolId: string, planCode: string): void {
    this.api.put(`/admin/schools/${schoolId}/subscription`, { planCode }).subscribe({
      next: () => this.loadData(),
    });
  }
}
