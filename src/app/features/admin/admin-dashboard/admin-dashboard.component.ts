import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

interface AdminStats { activeSchools: number; openSessions: number; totalTeachers: number; validatedSlots: number; }
interface SchoolRow {
  id: string; name: string; subscription_plan: string; is_active: boolean;
  directors_count: number; sessions_count: number;
}
interface PlanRow {
  code: string; display_name: string; is_active: boolean;
  limits_json: Record<string, number | null>;
  features_json: Record<string, boolean>;
  validity_days: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
})
export class AdminDashboardComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly stats = signal<AdminStats | null>(null);
  readonly schools = signal<SchoolRow[]>([]);
  readonly plans = signal<PlanRow[]>([]);
  readonly togglingId = signal('');
  readonly activeTab = signal<'schools' | 'plans'>('schools');
  readonly editingPlan = signal<string | null>(null);
  readonly planEditBuffer = signal<PlanRow | null>(null);
  readonly savingPlan = signal(false);
  readonly selectedSchoolId = signal<string | null>(null);

  readonly featureKeys = [
    'pdfExport', 'jpgExport', 'csvImport',
    'slotGenerator', 'gridDuplicate', 'slotNegotiations', 'whatsappNotifications',
  ] as const;

  readonly featureLabels: Record<string, string> = {
    pdfExport: 'Export PDF',
    jpgExport: 'Export JPG',
    csvImport: 'Import CSV enseignants',
    slotGenerator: 'Générateur de grille',
    gridDuplicate: 'Duplication de grille',
    slotNegotiations: 'Négociations de créneaux',
    whatsappNotifications: 'Partage WhatsApp',
  };

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
      },
      error: () => this.togglingId.set(''),
    });
  }

  updateSubscription(schoolId: string, planCode: string): void {
    this.api.put(`/admin/schools/${schoolId}/subscription`, { planCode }).subscribe({
      next: () => {
        this.toast.success('Abonnement mis à jour.');
        this.loadData();
      },
      error: (e) => this.toast.error(e.error?.error ?? 'Erreur'),
    });
  }

  openEditPlan(plan: PlanRow): void {
    this.editingPlan.set(plan.code);
    this.planEditBuffer.set(JSON.parse(JSON.stringify(plan)));
  }

  cancelEditPlan(): void {
    this.editingPlan.set(null);
    this.planEditBuffer.set(null);
  }

  toggleFeature(key: string): void {
    const buf = this.planEditBuffer();
    if (!buf) return;
    this.planEditBuffer.set({
      ...buf,
      features_json: { ...buf.features_json, [key]: !buf.features_json[key] },
    });
  }

  updateLimit(key: string, value: string): void {
    const buf = this.planEditBuffer();
    if (!buf) return;
    const num = value === '' || value === '0' ? null : Number(value);
    this.planEditBuffer.set({
      ...buf,
      limits_json: { ...buf.limits_json, [key]: num },
    });
  }

  savePlan(): void {
    const buf = this.planEditBuffer();
    if (!buf || this.savingPlan()) return;
    this.savingPlan.set(true);
    this.api.put(`/admin/plans/${buf.code}`, {
      displayName: buf.display_name,
      limitsJson: buf.limits_json,
      featuresJson: buf.features_json,
      validityDays: buf.validity_days,
    }).subscribe({
      next: () => {
        this.savingPlan.set(false);
        this.toast.success(`Plan "${buf.display_name}" mis à jour.`);
        this.editingPlan.set(null);
        this.planEditBuffer.set(null);
        this.loadData();
      },
      error: (e) => {
        this.savingPlan.set(false);
        this.toast.error(e.error?.error ?? 'Erreur lors de la sauvegarde.');
      },
    });
  }

  planBadgeClass(plan: string): string {
    return {
      standard: 'bg-steel/60 text-navy/60',
      pro: 'bg-brick/10 text-brick',
      premium: 'bg-navy/10 text-navy',
    }[plan] ?? 'bg-steel/60 text-navy/60';
  }

  limitKeys(plan: PlanRow): string[] {
    return Object.keys(plan.limits_json);
  }

  limitLabel(key: string): string {
    return {
      maxSchools: 'Max écoles',
      maxSessionsPerSchool: 'Max sessions / école',
      maxTeachersPerSession: 'Max enseignants / session',
    }[key] ?? key;
  }
}
